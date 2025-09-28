import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom'; // Renommé pour éviter confusion
import axios from 'axios';
import Navbar from '../components/Navbar';

// Import des composants Material-UI
import {
  Container,
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Link
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

const DashboardPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState('');

  const API_URL = 'http://localhost:5001';

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/invoices/my-invoices`, {
          headers: { 'x-auth-token': token },
        });
        setInvoices(res.data);
      } catch (err) {
        setError('Erreur lors de la récupération des factures.');
        console.error(err);
      }
    };
    fetchInvoices();
  }, []);

  return (
    <>
      <Navbar />
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1">
              Tableau de Bord PME
            </Typography>
            <Button
              variant="contained"
              component={RouterLink}
              to="/submit-invoice"
              startIcon={<AddCircleOutlineIcon />}
            >
              Soumettre une facture
            </Button>
          </Box>
          <Box sx={{ mb: 4 }}>
            <Button component={RouterLink} to="/profile" variant="outlined">
              Gérer mon profil
            </Button>
          </Box>
          <Typography variant="h6" component="h2" gutterBottom>
            Mes Factures Soumises
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Numéro</TableCell>
                  <TableCell align="right">Montant</TableCell>
                  <TableCell align="center">Date d'échéance</TableCell>
                  <TableCell align="center">Statut</TableCell>
                  <TableCell align="center">Facture PDF</TableCell>
                  {/* --- NOUVELLE COLONNE --- */}
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.length > 0 ? (
                  invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.invoice_number}</TableCell>
                      <TableCell align="right">{parseFloat(invoice.amount).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</TableCell>
                      <TableCell align="center">{new Date(invoice.due_date).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell align="center">{invoice.status}</TableCell>
                      <TableCell align="center">
                        <Link 
                          href={`${API_URL}${invoice.file_url}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          Voir le PDF
                        </Link>
                      </TableCell>
                      {/* --- NOUVELLE CELLULE AVEC LE BOUTON CONDITIONNEL --- */}
                      <TableCell align="center">
                        {invoice.status === 'APPROVED' && (
                          <Button
                            variant="contained"
                            size="small"
                            component={RouterLink}
                            to={`/invoices/${invoice.id}/offers`}
                          >
                            Voir les offres
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    {/* --- MISE À JOUR DU COLSPAN --- */}
                    <TableCell colSpan={6} align="center">
                      Vous n'avez pas encore soumis de facture.
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

export default DashboardPage;