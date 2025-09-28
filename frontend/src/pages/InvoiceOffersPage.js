import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container, Typography, Box, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Button, Alert
} from '@mui/material';
import Navbar from '../components/Navbar';

const InvoiceOffersPage = () => {
  const [offers, setOffers] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { invoiceId } = useParams(); // Récupère l'ID de la facture depuis l'URL
  const navigate = useNavigate();

  const API_URL = 'http://localhost:5001';

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };
        const res = await axios.get(`${API_URL}/api/invoices/${invoiceId}/offers`, config);
        setOffers(res.data);
      } catch (err) {
        setError('Erreur lors de la récupération des offres.');
        console.error(err);
      }
    };
    if (invoiceId) {
      fetchOffers();
    }
  }, [invoiceId]);

  const handleAcceptOffer = async (offerId) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      const res = await axios.put(`${API_URL}/api/invoices/offers/${offerId}/accept`, {}, config);
      setMessage(res.data.msg);
      // Rediriger vers le tableau de bord après un court délai
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err.response?.data?.msg || 'Erreur lors de l\'acceptation de l\'offre.');
    }
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="md">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Offres pour la facture
          </Typography>
          {message && <Alert severity="success">{message}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Financier</TableCell>
                  <TableCell align="right">Taux d'escompte</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {offers.length > 0 ? (
                  offers.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell>{offer.financier_name}</TableCell>
                      <TableCell align="right">{offer.discount_rate}%</TableCell>
                      <TableCell align="right">
                        <Button 
                          variant="contained" 
                          color="primary"
                          onClick={() => handleAcceptOffer(offer.id)}
                          disabled={message} // Désactive les boutons après une action
                        >
                          Accepter
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      Aucune offre reçue pour le moment.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Container>
    </>
  );
};

export default InvoiceOffersPage;