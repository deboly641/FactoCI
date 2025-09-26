const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/admin/users
// @desc    Récupérer tous les utilisateurs
// @access  Privé (Admin)
router.get('/users', authMiddleware, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ msg: 'Accès non autorisé.' });
  }

  try {
    // On ajoute la colonne "status" à la requête
    const allUsers = await pool.query('SELECT id, company_name, email, role, status FROM users ORDER BY created_at DESC');
    res.json(allUsers.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// *** NOUVELLES ROUTES CI-DESSOUS ***

// @route   PUT api/admin/users/:id/activate
// @desc    Activer un utilisateur
// @access  Privé (Admin)
router.put('/users/:id/activate', authMiddleware, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ msg: 'Accès non autorisé.' });
  }
  try {
    const updatedUser = await pool.query(
      "UPDATE users SET status = 'ACTIVE' WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (updatedUser.rows.length === 0) {
        return res.status(404).json({ msg: 'Utilisateur non trouvé.' });
    }
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