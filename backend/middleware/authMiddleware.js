const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function (req, res, next) {
  // 1. Récupérer le token de l'en-tête de la requête
  const token = req.header('x-auth-token');

  // 2. Vérifier s'il n'y a pas de token
  if (!token) {
    return res.status(401).json({ msg: 'Aucun token, autorisation refusée' });
  }

  // 3. Vérifier la validité du token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ajouter l'utilisateur (contenu dans le token) à l'objet de la requête
    req.user = decoded.user;
    next(); // Passer au prochain middleware ou à la route
  } catch (err) {
    res.status(401).json({ msg: 'Le token n\'est pas valide' });
  }
};