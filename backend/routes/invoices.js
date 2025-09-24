const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');

// Configuration de Multer pour gérer l'upload de fichiers en mémoire
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
    
    const file_url = `/uploads/invoices/${pme_id}-${req.file.originalname}`;

    try {
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

// @route   GET api/invoices/my-invoices
// @desc    Récupérer les factures de la PME connectée
// @access  Privé
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

// @route   GET api/invoices/pending-approval
// @desc    Récupérer les factures en attente pour le Grand Groupe connecté
// @access  Privé (Grand Groupe)
router.get('/pending-approval', authMiddleware, async (req, res) => {
  const { id: buyer_id, role } = req.user;
  if (role !== 'GRAND_GROUPE') {
    return res.status(403).json({ msg: 'Accès refusé.' });
  }
  try {
    const invoices = await pool.query(
      `SELECT i.id, i.invoice_number, i.amount, i.due_date, u.company_name as pme_name
       FROM invoices i
       JOIN users u ON i.pme_id = u.id
       WHERE i.buyer_id = $1 AND i.status = 'PENDING_APPROVAL'
       ORDER BY i.created_at DESC`,
      [buyer_id]
    );
    res.json(invoices.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   PUT api/invoices/:id/approve
// @desc    Approuver une facture
// @access  Privé (Grand Groupe)
router.put('/:id/approve', authMiddleware, async (req, res) => {
  const { id: buyer_id, role } = req.user;
  const { id: invoice_id } = req.params;
  if (role !== 'GRAND_GROUPE') {
    return res.status(403).json({ msg: 'Accès refusé.' });
  }
  try {
    const updatedInvoice = await pool.query(
      `UPDATE invoices SET status = 'APPROVED'
       WHERE id = $1 AND buyer_id = $2 AND status = 'PENDING_APPROVAL'
       RETURNING *`,
      [invoice_id, buyer_id]
    );
    if (updatedInvoice.rows.length === 0) {
      return res.status(404).json({ msg: 'Facture non trouvée ou déjà traitée.' });
    }
    res.json({ msg: 'Facture approuvée.', invoice: updatedInvoice.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   PUT api/invoices/:id/reject
// @desc    Rejeter une facture
// @access  Privé (Grand Groupe)
router.put('/:id/reject', authMiddleware, async (req, res) => {
  const { id: buyer_id, role } = req.user;
  const { id: invoice_id } = req.params;
  if (role !== 'GRAND_GROUPE') {
    return res.status(403).json({ msg: 'Accès refusé.' });
  }
  try {
    const updatedInvoice = await pool.query(
      `UPDATE invoices SET status = 'REJECTED'
       WHERE id = $1 AND buyer_id = $2 AND status = 'PENDING_APPROVAL'
       RETURNING *`,
      [invoice_id, buyer_id]
    );
    if (updatedInvoice.rows.length === 0) {
      return res.status(404).json({ msg: 'Facture non trouvée ou déjà traitée.' });
    }
    res.json({ msg: 'Facture rejetée.', invoice: updatedInvoice.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// --- NOUVELLES ROUTES POUR LE FINANCIER ---

// @route   GET api/invoices/approved
// @desc    Récupérer toutes les factures approuvées (la marketplace)
// @access  Privé (Financier)
router.get('/approved', authMiddleware, async (req, res) => {
  const { role } = req.user;

  if (role !== 'FINANCIER') {
    return res.status(403).json({ msg: 'Accès refusé.' });
  }

  try {
    const invoices = await pool.query(
      `SELECT 
         i.id, i.invoice_number, i.amount, i.due_date, 
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

// @route   PUT api/invoices/:id/finance
// @desc    Financer une facture
// @access  Privé (Financier)
router.put('/:id/finance', authMiddleware, async (req, res) => {
  const { id: financier_id, role } = req.user;
  const { id: invoice_id } = req.params;

  if (role !== 'FINANCIER') {
    return res.status(403).json({ msg: 'Accès refusé.' });
  }

  try {
    const updatedInvoice = await pool.query(
      `UPDATE invoices SET status = 'FINANCED'
       WHERE id = $1 AND status = 'APPROVED'
       RETURNING *`,
      [invoice_id]
    );

    if (updatedInvoice.rows.length === 0) {
      return res.status(404).json({ msg: 'Facture non trouvée ou déjà financée.' });
    }

    res.json({ msg: 'Facture financée avec succès.', invoice: updatedInvoice.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});


module.exports = router;