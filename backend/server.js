// Importer les librairies nécessaires
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path'); // Importer le module 'path'

// Créer une instance de l'application express
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// --- LIGNE POUR SERVIR LES FICHIERS UPLOADÉS ---
// Cela rend le dossier 'uploads' publiquement accessible
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Importer et utiliser les routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const profileRoutes = require('./routes/profile');
app.use('/api/profile', profileRoutes);

const invoiceRoutes = require('./routes/invoices');
app.use('/api/invoices', invoiceRoutes);

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// --- NOUVELLES LIGNES POUR LES NOTIFICATIONS ---
const notificationRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationRoutes);


// Définir le port d'écoute
const PORT = process.env.PORT || 5001;

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});