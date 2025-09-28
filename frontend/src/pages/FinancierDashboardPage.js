import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container, Typography, Box, Link, Button, Paper, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert, TextField,
  Modal, Fade // Ajout des imports pour la modale
} from '@mui/material';
import Navbar from '../components/Navbar';

// --- STYLE POUR LA MODALE (FENÊTRE POP-UP) ---
const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

// --- COMPOSANT POUR LE FORMULAIRE D'OFFRE (DANS LA MODALE) ---
const OfferForm = ({ open, handleClose, invoiceId, onOfferSubmit }) => {
  const [discountRate, setDiscountRate] = useState('');
  const [error, setError] = useState('');
  

  const API_URL = 'http://localhost:5001';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!discountRate || discountRate <= 0) {
      setError('Veuillez entrer un taux valide supérieur à 0.');
      return;
    }
    setError('');
    

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      await axios.post(
        `${API_URL}/api/invoices/${invoiceId}/offers`,
        { discount_rate: discountRate },
        config
      );
      onOfferSubmit(); // Appelle la fonction du parent pour fermer et afficher un message
    } catch (err) {
      setError(err.response?.data?.msg || 'Erreur lors de la soumission de l\'offre.');
      console.error(err);
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Fade in={open}>
        <Box sx={style} component="form" onSubmit={handleSubmit}>
          <Typography variant="h6" component="h2">Faire une offre</Typography>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          <TextField
            label="Taux d'escompte (%)"
            type="number"
            value={discountRate}
            onChange={(e) => setDiscountRate(e.target.value)}
            fullWidth
            required
            margin="normal"
            inputProps={{ step: "0.01" }} // Permet les décimales
          />
          <Button type="submit" variant="contained" sx={{ mt: 2 }}>
            Soumettre l'offre
          </Button>
        </Box>
      </Fade>
    </Modal>
  );
};


// --- COMPOSANT POUR LES STATISTIQUES ---
const StatsDisplay = ({ stats }) => (
  <Box sx={{ mb: 4 }}>
    <Grid container spacing={3}>
      <Grid item xs={12} sm={4}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>Factures sur la Marketplace</Typography>
            <Typography variant="h5">{stats.approved_count}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={4}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>Volume Total à Financer</Typography>
            <Typography variant="h5">{parseFloat(stats.approved_volume).toLocaleString('fr-FR')} F CFA</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={4}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>PME à financer</Typography>
            <Typography variant="h5">{stats.pme_count}</Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  </Box>
);

const FinancierDashboardPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({ approved_count: 0, approved_volume: 0, pme_count: 0 });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // États pour gérer la modale
  const [openOfferModal, setOpenOfferModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  const API_URL = 'http://localhost:5001';

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      const [invoicesRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/invoices/approved`, config),
        axios.get(`${API_URL}/api/invoices/financier-stats`, config)
      ]);

      setInvoices(invoicesRes.data);
      setStats(statsRes.data);
    } catch (err) {
      setError('Erreur lors de la récupération des données de la marketplace.');
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Ouvre la modale pour l'offre
  const handleOpenOfferModal = (invoiceId) => {
    setSelectedInvoiceId(invoiceId);
    setOpenOfferModal(true);
  };

  // Ferme la modale
  const handleCloseOfferModal = () => {
    setSelectedInvoiceId(null);
    setOpenOfferModal(false);
  };
  
  // Gère le succès de la soumission de l'offre
  const handleOfferSubmitted = () => {
    handleCloseOfferModal();
    setMessage('Votre offre a été soumise avec succès !');
    // On ne rafraîchit pas la liste pour permettre de faire une offre sur d'autres factures
  };
  
  const filteredInvoices = invoices.filter(invoice =>
    invoice.pme_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.buyer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Navbar />
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Tableau de Bord Financier - Marketplace
          </Typography>

          <StatsDisplay stats={stats} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h2">
              Factures disponibles
            </Typography>
            <TextField
              label="Rechercher (PME, Acheteur)"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Box>

          {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>PME (Vendeur)</TableCell>
                  <TableCell>Grand Groupe (Acheteur)</TableCell>
                  <TableCell>Montant</TableCell>
                  <TableCell>PDF</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredInvoices.length > 0 ? (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.pme_name}</TableCell>
                      <TableCell>{invoice.buyer_name}</TableCell>
                      <TableCell>{parseFloat(invoice.amount).toLocaleString('fr-FR')} F CFA</TableCell>
                      <TableCell>
                        <Link href={`${API_URL}${invoice.file_url}`} target="_blank" rel="noopener noreferrer">
                          Voir
                        </Link>
                      </TableCell>
                      <TableCell align="center">
                        <Button variant="contained" color="primary" onClick={() => handleOpenOfferModal(invoice.id)}>
                          Faire une offre
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Aucun résultat trouvé.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Container>

      {/* --- Rendu de la modale --- */}
      {selectedInvoiceId && (
        <OfferForm
          open={openOfferModal}
          handleClose={handleCloseOfferModal}
          invoiceId={selectedInvoiceId}
          onOfferSubmit={handleOfferSubmitted}
        />
      )}
    </>
  );
};

export default FinancierDashboardPage;