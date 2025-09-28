import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import SubmitInvoicePage from './pages/SubmitInvoicePage';
import BuyerDashboardPage from './pages/BuyerDashboardPage';
import FinancierDashboardPage from './pages/FinancierDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
// --- IMPORTER LA NOUVELLE PAGE ---
import InvoiceOffersPage from './pages/InvoiceOffersPage';

function App() {
  const [auth, setAuth] = useState({
    token: null,
    isAuthenticated: false,
    role: null
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setAuth({
          token: token,
          isAuthenticated: true,
          role: decoded.user.role
        });
      } catch (e) {
        localStorage.removeItem('token');
        setAuth({ token: null, isAuthenticated: false, role: null });
      }
    }
  }, []);
  
  const handleLogin = (role) => {
    setAuth({
      token: localStorage.getItem('token'),
      isAuthenticated: true,
      role: role
    });
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!auth.isAuthenticated ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/register" 
          element={!auth.isAuthenticated ? <RegisterPage /> : <Navigate to="/" />} 
        />
        
        {/* Redirection Intelligente après connexion */}
        <Route 
          path="/" 
          element={
            !auth.isAuthenticated ? (
              <Navigate to="/login" />
            ) : auth.role === 'ADMIN' ? (
              <Navigate to="/admin-dashboard" />
            ) : auth.role === 'GRAND_GROUPE' ? (
              <Navigate to="/buyer-dashboard" />
            ) : auth.role === 'FINANCIER' ? (
              <Navigate to="/financier-dashboard" />
            ) : (
              <DashboardPage /> // PME par défaut
            )
          } 
        />
        
        {/* Routes protégées */}
        <Route 
          path="/profile" 
          element={auth.isAuthenticated ? <ProfilePage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/submit-invoice" 
          element={auth.isAuthenticated ? <SubmitInvoicePage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/buyer-dashboard" 
          element={auth.isAuthenticated && auth.role === 'GRAND_GROUPE' ? <BuyerDashboardPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/financier-dashboard" 
          element={auth.isAuthenticated && auth.role === 'FINANCIER' ? <FinancierDashboardPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/admin-dashboard" 
          element={auth.isAuthenticated && auth.role === 'ADMIN' ? <AdminDashboardPage /> : <Navigate to="/login" />} 
        />

        {/* --- NOUVELLE ROUTE PROTÉGÉE POUR LES OFFRES --- */}
        <Route 
          path="/invoices/:invoiceId/offers"
          element={auth.isAuthenticated && auth.role === 'PME' ? <InvoiceOffersPage /> : <Navigate to="/login" />} 
        />

        {/* Redirige toutes les autres URL non trouvées vers la page de connexion */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;