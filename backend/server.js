// Importer les librairies nécessaires
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Créer une instance de l'application express
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Importer et utiliser les routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const profileRoutes = require('./routes/profile');
app.use('/api/profile', profileRoutes);

// NOUVELLES LIGNES À AJOUTER
const invoiceRoutes = require('./routes/invoices');
app.use('/api/invoices', invoiceRoutes);

// Définir le port d'écoute
const PORT = process.env.PORT || 5001;

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});