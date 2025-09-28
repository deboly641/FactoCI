const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs'); // Ajout de l'import manquant

// @route   GET api/admin/users
// @desc    Récupérer tous les utilisateurs
// @access  Privé (Admin)
router.get('/users', authMiddleware, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ msg: 'Accès non autorisé.' });
  }

  try {
    const allUsers = await pool.query('SELECT id, company_name, email, role, status FROM users ORDER BY created_at DESC');
    res.json(allUsers.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   GET api/admin/users/pending
// @desc    Récupérer les PME en attente de validation
// @access  Privé (Admin)
router.get('/users/pending', authMiddleware, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ msg: 'Accès non autorisé.' });
  }
  try {
    const pendingPMEs = await pool.query(
      "SELECT id, company_name, email, created_at FROM users WHERE role = 'PME' AND status = 'PENDING_VALIDATION' ORDER BY created_at ASC"
    );
    res.json(pendingPMEs.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// --- NOUVELLE ROUTE CI-DESSOUS ---

// @route   GET api/admin/stats
// @desc    Récupérer les statistiques de la plateforme
// @access  Privé (Admin)
router.get('/stats', authMiddleware, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ msg: 'Accès non autorisé.' });
  }

  try {
    // 1. Compter le nombre total d'utilisateurs
    const totalUsers = await pool.query("SELECT COUNT(*) FROM users");

    // 2. Calculer le volume total des factures soumises (somme des montants)
    const totalVolume = await pool.query("SELECT SUM(amount) FROM invoices");

    // 3. Compter le nombre de factures en attente d'approbation
    const pendingInvoices = await pool.query("SELECT COUNT(*) FROM invoices WHERE status = 'PENDING_APPROVAL'");

    res.json({
      totalUsers: parseInt(totalUsers.rows[0].count, 10),
      totalVolume: parseFloat(totalVolume.rows[0].sum) || 0,
      pendingInvoices: parseInt(pendingInvoices.rows[0].count, 10),
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   POST api/admin/users
// @desc    Créer un nouvel utilisateur (Grand Groupe ou Financier)
// @access  Privé (Admin)
router.post('/users', authMiddleware, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ msg: 'Accès non autorisé.' });
  }

  const { email, password, role, company_name } = req.body;

  // Validation simple
  if (!email || !password || !role || !company_name) {
    return res.status(400).json({ msg: 'Veuillez remplir tous les champs.' });
  }
  if (role !== 'GRAND_GROUPE' && role !== 'FINANCIER') {
    return res.status(400).json({ msg: 'Le rôle doit être GRAND_GROUPE ou FINANCIER.' });
  }

  try {
    // Vérifier si l'utilisateur existe déjà
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length > 0) {
      return res.status(400).json({ msg: 'Cet utilisateur existe déjà.' });
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Créer le nouvel utilisateur avec le statut 'ACTIVE' directement
    const newUser = await pool.query(
      `INSERT INTO users (email, password_hash, role, company_name, status) 
       VALUES ($1, $2, $3, $4, 'ACTIVE') 
       RETURNING id, email, role, company_name`,
      [email, password_hash, role, company_name]
    );

    res.status(201).json({
      msg: 'Utilisateur créé avec succès !',
      user: newUser.rows[0],
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});


// @route   PUT api/admin/users/:id/activate
// @desc    Activer un utilisateur
// @access  Privé (Admin)
router.put('/users/:id/activate', authMiddleware, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ msg: 'Accès non autorisé.' });
  }
  try {
    const updatedUser = await pool.query(
      "UPDATE users SET status = 'ACTIVE' WHERE id = $1 AND status = 'PENDING_VALIDATION' RETURNING *",
      [req.params.id]
    );
    if (updatedUser.rows.length === 0) {
        return res.status(404).json({ msg: 'Utilisateur non trouvé ou déjà actif.' });
    }
    // TODO: Envoyer un email de bienvenue à la PME activée
    res.json({ msg: 'Utilisateur activé.', user: updatedUser.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   PUT api/admin/users/:id/suspend
// @desc    Suspendre un utilisateur
// @access  Privé (Admin)
router.put('/users/:id/suspend', authMiddleware, async (req, res) => {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ msg: 'Accès non autorisé.' });
    }
    try {
      const updatedUser = await pool.query(
        "UPDATE users SET status = 'SUSPENDED' WHERE id = $1 RETURNING *",
        [req.params.id]
      );
      if (updatedUser.rows.length === 0) {
          return res.status(404).json({ msg: 'Utilisateur non trouvé.' });
      }
      res.json({ msg: 'Utilisateur suspendu.', user: updatedUser.rows[0] });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erreur du serveur');
    }
  });

module.exports = router;