const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { sendEmail } = require('../services/emailService');

const upload = multer({ storage: multer.memoryStorage() });

// @route   POST api/invoices
// @desc    Soumettre une nouvelle facture
// @access  Privé (seule une PME peut le faire)
router.post(
  '/',
  [authMiddleware, upload.single('invoicePdf')],
  async (req, res) => {
    const { buyer_id, invoice_number, amount, due_date } = req.body;
    const { id: pme_id, role } = req.user;

    if (role !== 'PME') {
      return res.status(403).json({ msg: 'Accès refusé. Seule une PME peut soumettre une facture.' });
    }
    if (!req.file) {
      return res.status(400).json({ msg: 'Veuillez uploader le fichier PDF de la facture.' });
    }

    const fileName = `${pme_id}-${Date.now()}-${req.file.originalname}`;
    const uploadPath = path.join(__dirname, '..', 'uploads', 'invoices');
    const filePath = path.join(uploadPath, fileName);
    const file_url = `/uploads/invoices/${fileName}`;

    try {
      await fs.ensureDir(uploadPath);
      await fs.writeFile(filePath, req.file.buffer);

      const newInvoice = await pool.query(
        `INSERT INTO invoices (pme_id, buyer_id, invoice_number, amount, due_date, file_url)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [pme_id, buyer_id, invoice_number, amount, due_date, file_url]
      );
      res.status(201).json({
        msg: 'Facture soumise avec succès !',
        invoice: newInvoice.rows[0],
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erreur du serveur');
    }
  }
);

router.get('/my-invoices', authMiddleware, async (req, res) => {
  try {
    const invoices = await pool.query(
      'SELECT * FROM invoices WHERE pme_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(invoices.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// --- ROUTE POUR LES STATS DE L'ACHETEUR ---
router.get('/buyer-stats', authMiddleware, async (req, res) => {
  const { id: buyer_id, role } = req.user;
  if (role !== 'GRAND_GROUPE') {
    return res.status(403).json({ msg: 'Accès refusé.' });
  }
  try {
    const stats = await pool.query(
      `SELECT
         COUNT(*) AS pending_count,
         COALESCE(SUM(amount), 0) AS pending_volume,
         COUNT(DISTINCT pme_id) AS supplier_count
       FROM invoices
       WHERE buyer_id = $1 AND status = 'PENDING_APPROVAL'`,
      [buyer_id]
    );
    res.json(stats.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// --- ROUTE POUR LES FACTURES EN ATTENTE (GROUPÉES) ---
router.get('/pending-approval', authMiddleware, async (req, res) => {
  const { id: buyer_id, role } = req.user;
  if (role !== 'GRAND_GROUPE') {
    return res.status(403).json({ msg: 'Accès refusé.' });
  }
  try {
    const invoicesResult = await pool.query(
      `SELECT i.id, i.invoice_number, i.amount, i.due_date, i.file_url, u.company_name as pme_name
       FROM invoices i
       JOIN users u ON i.pme_id = u.id
       WHERE i.buyer_id = $1 AND i.status = 'PENDING_APPROVAL'
       ORDER BY u.company_name, i.created_at DESC`,
      [buyer_id]
    );

    const groupedInvoices = invoicesResult.rows.reduce((acc, invoice) => {
      const pmeName = invoice.pme_name;
      if (!acc[pmeName]) {
        acc[pmeName] = [];
      }
      acc[pmeName].push(invoice);
      return acc;
    }, {});

    const responseArray = Object.keys(groupedInvoices).map(pmeName => ({
      pme_name: pmeName,
      invoices: groupedInvoices[pmeName]
    }));

    res.json(responseArray);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   PUT api/invoices/:id/approve
router.put('/:id/approve', authMiddleware, async (req, res) => {
  const { id: buyer_id, role } = req.user;
  const { id: invoice_id } = req.params;
  if (role !== 'GRAND_GROUPE') {
    return res.status(403).json({ msg: 'Accès refusé.' });
  }
  try {
    const updatedInvoiceResult = await pool.query(
      `UPDATE invoices SET status = 'APPROVED'
       WHERE id = $1 AND buyer_id = $2 AND status = 'PENDING_APPROVAL'
       RETURNING *`,
      [invoice_id, buyer_id]
    );
    if (updatedInvoiceResult.rows.length === 0) {
      return res.status(404).json({ msg: 'Facture non trouvée ou déjà traitée.' });
    }
    const updatedInvoice = updatedInvoiceResult.rows[0];

    const pmeResult = await pool.query('SELECT email, company_name FROM users WHERE id = $1', [updatedInvoice.pme_id]);
    if (pmeResult.rows.length > 0) {
      const pme = pmeResult.rows[0];
      const message = `Bonne nouvelle ! Votre facture n°${updatedInvoice.invoice_number} a été approuvée.`;

      sendEmail({
        to: pme.email,
        subject: 'Votre facture a été approuvée',
        text: `Bonjour ${pme.company_name},\n\n${message}\n\nElle est maintenant visible sur la marketplace.\n\nL'équipe FactoCI`,
      });

      await pool.query(
        'INSERT INTO notifications (user_id, message, related_link) VALUES ($1, $2, $3)',
        [updatedInvoice.pme_id, message, `/dashboard`]
      );
    }

    res.json({ msg: 'Facture approuvée.', invoice: updatedInvoice });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   PUT api/invoices/:id/reject
router.put('/:id/reject', authMiddleware, async (req, res) => {
  const { id: buyer_id, role } = req.user;
  const { id: invoice_id } = req.params;
  if (role !== 'GRAND_GROUPE') {
    return res.status(403).json({ msg: 'Accès refusé.' });
  }
  try {
    const updatedInvoiceResult = await pool.query(
      `UPDATE invoices SET status = 'REJECTED'
       WHERE id = $1 AND buyer_id = $2 AND status = 'PENDING_APPROVAL'
       RETURNING *`,
      [invoice_id, buyer_id]
    );
    if (updatedInvoiceResult.rows.length === 0) {
      return res.status(404).json({ msg: 'Facture non trouvée ou déjà traitée.' });
    }
    const updatedInvoice = updatedInvoiceResult.rows[0];

    const pmeResult = await pool.query('SELECT email, company_name FROM users WHERE id = $1', [updatedInvoice.pme_id]);
     if (pmeResult.rows.length > 0) {
      const pme = pmeResult.rows[0];
      const message = `Votre facture n°${updatedInvoice.invoice_number} a été rejetée par votre client.`;
      
      sendEmail({
        to: pme.email,
        subject: 'Information concernant votre facture',
        text: `Bonjour ${pme.company_name},\n\n${message}\n\nVous pouvez le contacter pour plus de détails.\n\nL'équipe FactoCI`,
      });
      
      await pool.query(
        'INSERT INTO notifications (user_id, message, related_link) VALUES ($1, $2, $3)',
        [updatedInvoice.pme_id, message, `/dashboard`]
      );
    }

    res.json({ msg: 'Facture rejetée.', invoice: updatedInvoice });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// --- ROUTE POUR LES STATS DU FINANCIER ---
router.get('/financier-stats', authMiddleware, async (req, res) => {
    const { role } = req.user;
    if (role !== 'FINANCIER') {
      return res.status(403).json({ msg: 'Accès refusé.' });
    }
    try {
      const stats = await pool.query(
        `SELECT
           COUNT(*) AS approved_count,
           COALESCE(SUM(amount), 0) AS approved_volume,
           COUNT(DISTINCT pme_id) AS pme_count
         FROM invoices
         WHERE status = 'APPROVED'`
      );
      res.json(stats.rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erreur du serveur');
    }
});

// --- ROUTE POUR LES FACTURES APPROUVÉES ---
router.get('/approved', authMiddleware, async (req, res) => {
  const { role } = req.user;
  if (role !== 'FINANCIER') {
    return res.status(403).json({ msg: 'Accès refusé.' });
  }

  try {
    const invoices = await pool.query(
      `SELECT
         i.id, i.invoice_number, i.amount, i.due_date, i.file_url,
         pme.company_name as pme_name,
         buyer.company_name as buyer_name
       FROM invoices i
       JOIN users pme ON i.pme_id = pme.id
       JOIN users buyer ON i.buyer_id = buyer.id
       WHERE i.status = 'APPROVED'
       ORDER BY i.created_at ASC`
    );
    res.json(invoices.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});


// --- NOUVELLE LOGIQUE POUR LES OFFRES ---

// @route   POST /api/invoices/:id/offers
// @desc    Un financier soumet une offre sur une facture
// @access  Privé (FINANCIER)
router.post('/:id/offers', authMiddleware, async (req, res) => {
  if (req.user.role !== 'FINANCIER') {
    return res.status(403).json({ msg: 'Accès refusé.' });
  }

  const { discount_rate } = req.body;
  const invoice_id = req.params.id;
  const financier_id = req.user.id;

  if (!discount_rate) {
    return res.status(400).json({ msg: 'Veuillez proposer un taux.' });
  }

  try {
    const invoice = await pool.query("SELECT * FROM invoices WHERE id = $1 AND status = 'APPROVED'", [invoice_id]);
    if (invoice.rows.length === 0) {
      return res.status(404).json({ msg: 'Facture non trouvée ou non disponible pour financement.' });
    }

    const newOffer = await pool.query(
      "INSERT INTO offers (invoice_id, financier_id, discount_rate) VALUES ($1, $2, $3) RETURNING *",
      [invoice_id, financier_id, discount_rate]
    );

    res.status(201).json({ msg: 'Offre soumise avec succès.', offer: newOffer.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});


// @route   GET /api/invoices/:id/offers
// @desc    Une PME consulte les offres sur sa facture
// @access  Privé (PME)
router.get('/:id/offers', authMiddleware, async (req, res) => {
    if (req.user.role !== 'PME') {
        return res.status(403).json({ msg: 'Accès refusé.' });
    }
    const invoice_id = req.params.id;
    try {
        const offers = await pool.query(
            `SELECT o.id, o.discount_rate, o.status, u.company_name as financier_name 
             FROM offers o
             JOIN users u ON o.financier_id = u.id
             WHERE o.invoice_id = $1 ORDER BY o.discount_rate ASC`,
            [invoice_id]
        );
        res.json(offers.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur du serveur');
    }
});


// @route   PUT /api/invoices/offers/:id/accept
// @desc    Une PME accepte une offre
// @access  Privé (PME)
router.put('/offers/:id/accept', authMiddleware, async (req, res) => {
  if (req.user.role !== 'PME') {
    return res.status(403).json({ msg: 'Accès refusé.' });
  }
  const offer_id = req.params.id;

  try {
    const offerResult = await pool.query("SELECT * FROM offers WHERE id = $1 AND status = 'EN_ATTENTE'", [offer_id]);
    if (offerResult.rows.length === 0) {
      return res.status(404).json({ msg: 'Offre non trouvée ou déjà traitée.' });
    }
    const offer = offerResult.rows[0];
    const invoice_id = offer.invoice_id;

    await pool.query(
      "UPDATE invoices SET status = 'FUNDED', winning_offer_id = $1 WHERE id = $2",
      [offer_id, invoice_id]
    );

    await pool.query("UPDATE offers SET status = 'ACCEPTEE' WHERE id = $1", [offer_id]);

    await pool.query("UPDATE offers SET status = 'REJETEE' WHERE invoice_id = $1 AND id != $2", [invoice_id, offer_id]);

    // TODO: Envoyer des notifications à la PME et au financier gagnant

    res.json({ msg: 'Offre acceptée avec succès !' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});


// L'ancienne route PUT /:id/finance est maintenant obsolète.

module.exports = router;