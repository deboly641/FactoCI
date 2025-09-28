import React from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import NotificationBell from './NotificationBell'; // Importer la cloche

const Navbar = () => {
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/login'; 
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          FactoCI
        </Typography>
        <NotificationBell /> {/* AJOUT DE LA CLOCHE ICI */}
        <Button color="inherit" onClick={handleLogout}>
          Déconnexion
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;