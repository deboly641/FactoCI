import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Importer useNavigate
import { IconButton, Badge, Menu, MenuItem, Typography } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate(); // Initialiser useNavigate

  const API_URL = 'http://localhost:5001';

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const config = { headers: { 'x-auth-token': token } };
      const res = await axios.get(`${API_URL}/api/notifications`, config);
      setNotifications(res.data);
    } catch (err) {
      console.error("Erreur lors de la récupération des notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };
  
  const handleNotificationClick = async (notif) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      // Marquer la notification comme lue
      await axios.put(`${API_URL}/api/notifications/${notif.id}/read`, {}, config);
      
      // Mettre à jour l'état localement
      setNotifications(notifications.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      
      // Naviguer vers le lien associé
      if (notif.related_link) {
        navigate(notif.related_link);
      }
    } catch (err) {
      console.error("Erreur lors de la mise à jour de la notification", err);
    }
    handleCloseMenu();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <>
      <IconButton color="inherit" onClick={handleOpenMenu}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        {notifications.length > 0 ? (
          notifications.map(notif => (
            <MenuItem key={notif.id} onClick={() => handleNotificationClick(notif)} selected={!notif.is_read}>
              <Typography variant="body2">{notif.message}</Typography>
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>Aucune nouvelle notification</MenuItem>
        )}
      </Menu>
    </>
  );
};

export default NotificationBell;