const nodemailer = require('nodemailer');
require('dotenv').config();

// AJOUTEZ CETTE LIGNE CI-DESSOUS
console.log("Clé API utilisée pour Brevo :", process.env.BREVO_API_KEY);

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: '97e6ae001@smtp-brevo.com', // Votre email de connexion à Brevo
    pass: process.env.BREVO_API_KEY,
  },
  tls: {
    rejectUnauthorized: false
  }
});

/**
 * Fonction pour envoyer un email.
 */
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const info = await transporter.sendMail({
      from: '"FactoCI" <vincentdeboly@gmail.com>',
      to: to,
      subject: subject,
      text: text,
      html: html,
    });
    console.log('Email envoyé avec succès: %s', info.messageId);
    return info;
  } catch (error) {
    // MODIFICATION IMPORTANTE : On affiche l'erreur complète !
    console.error("--- ERREUR CRITIQUE LORS DE L'ENVOI DE L'EMAIL ---");
    console.error("L'inscription de l'utilisateur a réussi, mais l'email de bienvenue n'a pas pu être envoyé.");
    console.error("Erreur détaillée :", error);
    console.error("--- FIN DE L'ERREUR ---");
    // On ne bloque pas le reste de l'application, mais l'erreur est maintenant très visible.
  }
};

module.exports = { sendEmail };