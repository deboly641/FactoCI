const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/notifications
// @desc    Récupérer les notifications de l'utilisateur connecté
// @access  Privé
router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifications = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(notifications.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   PUT api/notifications/:id/read
// @desc    Marquer une notification comme lue
// @access  Privé
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (notification.rows.length === 0) {
      return res.status(404).json({ msg: 'Notification non trouvée.' });
    }
    res.json(notification.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   PUT api/notifications/read-all
// @desc    Marquer toutes les notifications comme lues
// @access  Privé
router.put('/read-all', authMiddleware, async (req, res) => {
    try {
      await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
        [req.user.id]
      );
      res.json({ msg: 'Toutes les notifications ont été marquées comme lues.' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erreur du serveur');
    }
  });

module.exports = router;