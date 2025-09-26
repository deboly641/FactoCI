const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, 
  auth: {
    user: 'vincentdeboly@gmail.com', // Votre email de connexion à Brevo
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
    console.error("Erreur critique lors de l'envoi de l'email:", error);
    // On ne propage plus l'erreur pour ne pas bloquer le reste de l'application.
  }
};

module.exports = { sendEmail };