import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container, Typography, Box, Link, Button, Paper, Grid, Card, CardContent,
  Accordion, AccordionSummary, AccordionDetails, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Alert, TextField // Importer TextField
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Navbar from '../components/Navbar';

// ... (Le composant StatsDisplay reste le même)
const StatsDisplay = ({ stats }) => (
    <Box sx={{ mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Factures en Attente</Typography>
              <Typography variant="h5">{stats.pending_count}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Montant Total en Attente</Typography>
              <Typography variant="h5">{parseFloat(stats.pending_volume).toLocaleString('fr-FR')} F CFA</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Fournisseurs Actifs</Typography>
              <Typography variant="h5">{stats.supplier_count}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );


const BuyerDashboardPage = () => {
  const [groupedInvoices, setGroupedInvoices] = useState([]);
  const [stats, setStats] = useState({ pending_count: 0, pending_volume: 0, supplier_count: 0 });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // État pour la recherche

  const API_URL = 'http://localhost:5001';

  // ... (La fonction fetchData et useEffect restent les mêmes)
    const fetchData = async () => {
        try {
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };
        const [invoicesRes, statsRes] = await Promise.all([
            axios.get(`${API_URL}/api/invoices/pending-approval`, config),
            axios.get(`${API_URL}/api/invoices/buyer-stats`, config)
        ]);
        setGroupedInvoices(invoicesRes.data);
        setStats(statsRes.data);
        } catch (err) {
        setError('Erreur lors de la récupération des données.');
        console.error(err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);


  // ... (La fonction handleAction reste la même)
    const handleAction = async (invoiceId, action) => {
        try {
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };
        const res = await axios.put(`${API_URL}/api/invoices/${invoiceId}/${action}`, {}, config);
        setMessage(res.data.msg);
        fetchData();
        } catch (err) {
        setError(`Erreur lors de l'action : ${action}`);
        }
    };

  // Filtrer les résultats en fonction de la recherche
  const filteredGroups = groupedInvoices.filter(group =>
    group.pme_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Navbar />
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Tableau de Bord Grand Groupe
          </Typography>

          <StatsDisplay stats={stats} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h2">
              Factures en attente d'approbation
            </Typography>
            {/* --- CHAMP DE RECHERCHE --- */}
            <TextField
              label="Rechercher une PME"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Box>

          {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {filteredGroups.length > 0 ? (
            filteredGroups.map((group) => (
              <Accordion key={group.pme_name} sx={{ mb: 1 }}>
                {/* ... (Le contenu de l'accordéon reste le même) */}
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>{group.pme_name} ({group.invoices.length} facture(s))</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Numéro</TableCell>
                          <TableCell>Montant</TableCell>
                          <TableCell>PDF</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {group.invoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell>{invoice.invoice_number}</TableCell>
                            <TableCell>{parseFloat(invoice.amount).toLocaleString('fr-FR')} F CFA</TableCell>
                            <TableCell>
                              <Link href={`${API_URL}${invoice.file_url}`} target="_blank" rel="noopener noreferrer">
                                Voir
                              </Link>
                            </TableCell>
                            <TableCell align="right">
                              <Button variant="contained" color="success" size="small" onClick={() => handleAction(invoice.id, 'approve')} sx={{ mr: 1 }}>
                                Approuver
                              </Button>
                              <Button variant="contained" color="error" size="small" onClick={() => handleAction(invoice.id, 'reject')}>
                                Rejeter
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            ))
          ) : (
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography>Aucun résultat trouvé pour votre recherche.</Typography>
            </Paper>
          )}
        </Box>
      </Container>
    </>
  );
};

export default BuyerDashboardPage;