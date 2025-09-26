const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { sendEmail } = require('../services/emailService');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, role, company_name } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ msg: 'Veuillez entrer tous les champs requis.' });
  }

  try {
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length > 0) {
      return res.status(400).json({ msg: 'Cet utilisateur existe déjà.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const status = (role === 'PME') ? 'PENDING_VALIDATION' : 'ACTIVE';

    const newUser = await pool.query(
      `INSERT INTO users (email, password_hash, role, company_name, status) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, role`,
      [email, password_hash, role, company_name, status]
    );

    if (role === 'PME') {
      sendEmail({
        to: email,
        subject: 'Bienvenue sur FactoCI !',
        text: `Bonjour ${company_name},\n\nVotre compte a bien été créé sur FactoCI. Notre équipe va examiner votre profil et l'activera sous peu.\n\nL'équipe FactoCI`,
      });
    }

    res.status(201).json({
      msg: 'Utilisateur créé avec succès !',
      user: newUser.rows[0],
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// La route /login reste inchangée
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ msg: 'Veuillez entrer un email et un mot de passe.' });
  }

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ msg: 'Identifiants invalides.' });
    }
    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Identifiants invalides.' });
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

module.exports = router;