const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/profile/me
// @desc    Obtenir le profil de l'utilisateur connecté
// @access  Privé
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // Grâce au middleware, req.user contient l'ID et le rôle de l'utilisateur
    const userProfile = await pool.query(
      'SELECT id, email, role, company_name FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userProfile.rows.length === 0) {
      return res.status(404).json({ msg: 'Profil non trouvé' });
    }

    res.json(userProfile.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

module.exports = router;

// @route   PUT api/profile
// @desc    Mettre à jour le profil de l'utilisateur (PME)
// @access  Privé
router.put('/', authMiddleware, async (req, res) => {
  // 1. Extraire les données du corps de la requête
  const { company_name, company_details, bank_details } = req.body;

  // 2. Construire l'objet de mise à jour
  const fieldsToUpdate = {};
  if (company_name) fieldsToUpdate.company_name = company_name;
  if (company_details) fieldsToUpdate.company_details = company_details;
  if (bank_details) fieldsToUpdate.bank_details = bank_details;

  if (Object.keys(fieldsToUpdate).length === 0) {
    return res.status(400).json({ msg: 'Aucun champ à mettre à jour fourni.' });
  }

  try {
    // 3. Mettre à jour les informations dans la base de données
    const updatedUser = await pool.query(
      'UPDATE users SET company_name = $1, company_details = $2, bank_details = $3 WHERE id = $4 RETURNING *',
      [
        fieldsToUpdate.company_name,
        fieldsToUpdate.company_details,
        fieldsToUpdate.bank_details,
        req.user.id, // L'ID vient du token JWT via le middleware
      ]
    );

    res.json({ msg: 'Profil mis à jour avec succès.', user: updatedUser.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});