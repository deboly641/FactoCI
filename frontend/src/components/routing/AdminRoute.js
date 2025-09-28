import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const AdminRoute = () => {
  const token = localStorage.getItem('token');

  if (!token) {
    // Si pas de token, redirige vers la page de connexion
    return <Navigate to="/login" />;
  }

  try {
    const decodedToken = jwtDecode(token);
    const userRole = decodedToken.user.role;

    // Si le rôle est 'ADMIN', affiche la page demandée, sinon redirige
    return userRole === 'ADMIN' ? <Outlet /> : <Navigate to="/login" />;
  } catch (error) {
    console.error("Token invalide:", error);
    // Si le token est invalide, redirige vers la connexion
    return <Navigate to="/login" />;
  }
};

export default AdminRoute;