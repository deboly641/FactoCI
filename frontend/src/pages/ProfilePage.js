import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

// Import des composants Material-UI
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Alert
} from '@mui/material';

const ProfilePage = () => {
  const [formData, setFormData] = useState({
    company_name: '',
    company_details: { rccm: '', dfe: '' },
    bank_details: { bank_name: '', rib: '' },
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await axios.get('http://localhost:5001/api/profile/me', {
            headers: { 'x-auth-token': token },
          });
          setFormData({
            company_name: res.data.company_name || '',
            company_details: res.data.company_details || { rccm: '', dfe: '' },
            bank_details: res.data.bank_details || { bank_name: '', rib: '' },
          });
        } catch (err) {
          console.error('Erreur lors de la récupération du profil', err);
        }
      }
    };
    fetchProfile();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === 'rccm' || name === 'dfe') {
      setFormData({
        ...formData,
        company_details: { ...formData.company_details, [name]: value },
      });
    } else if (name === 'bank_name' || name === 'rib') {
      setFormData({
        ...formData,
        bank_details: { ...formData.bank_details, [name]: value },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await axios.put('http://localhost:5001/api/profile', formData, {
        headers: { 'x-auth-token': token },
      });
      setMessage('Profil mis à jour avec succès !');
    } catch (err) {
      setMessage('Erreur lors de la mise à jour.');
      console.error(err);
    }
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="md">
        <Box component={Paper} sx={{ mt: 4, p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Mon Profil d'Entreprise
          </Typography>
          <Box component="form" onSubmit={onSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6">Informations Générales</Typography>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Nom de l'entreprise"
                  name="company_name"
                  value={formData.company_name}
                  onChange={onChange}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6">Détails Légaux</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="RCCM"
                  name="rccm"
                  value={formData.company_details.rccm}
                  onChange={onChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="DFE"
                  name="dfe"
                  value={formData.company_details.dfe}
                  onChange={onChange}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6">Détails Bancaires</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nom de la banque"
                  name="bank_name"
                  value={formData.bank_details.bank_name}
                  onChange={onChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="RIB"
                  name="rib"
                  value={formData.bank_details.rib}
                  onChange={onChange}
                />
              </Grid>
              <Grid item xs={12}>
                <Button type="submit" variant="contained" color="primary">
                  Mettre à jour
                </Button>
              </Grid>
            </Grid>
          </Box>
          {message && <Alert severity="success" sx={{ mt: 2 }}>{message}</Alert>}
          <Box sx={{ mt: 2 }}>
             <Button component={Link} to="/" variant="text">
                Retour au tableau de bord
              </Button>
          </Box>
        </Box>
      </Container>
    </>
  );
};

export default ProfilePage;