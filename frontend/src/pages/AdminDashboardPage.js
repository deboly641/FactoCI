import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Button, Box, Alert, TextField,
  Select, MenuItem, FormControl, InputLabel, Grid, Card, CardContent
} from '@mui/material';
import Navbar from '../components/Navbar'; // Import de votre Navbar existante

// --- COMPOSANT POUR LE FORMULAIRE DE CRÉATION ---
const CreateUserForm = ({ onUserCreated }) => {
  const [formData, setFormData] = useState({
    company_name: '',
    email: '',
    password: '',
    role: 'GRAND_GROUPE'
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const { company_name, email, password, role } = formData;

  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 
          'x-auth-token': token,
          'Content-Type': 'application/json' 
        } 
      };
      const res = await axios.post('http://localhost:5001/api/admin/users', formData, config);
      setMessage(res.data.msg);
      setFormData({ company_name: '', email: '', password: '', role: 'GRAND_GROUPE' });
      if (onUserCreated) onUserCreated();
    } catch (err) {
      setError(err.response?.data?.msg || 'Erreur lors de la création de l\'utilisateur.');
    }
  };

  return (
    <Box component="form" onSubmit={onSubmit} sx={{ mb: 4 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        Créer un nouvel utilisateur
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      <TextField label="Nom de l'entreprise" name="company_name" value={company_name} onChange={onChange} fullWidth required sx={{ mb: 2 }}/>
      <TextField label="Adresse Email" name="email" type="email" value={email} onChange={onChange} fullWidth required sx={{ mb: 2 }}/>
      <TextField label="Mot de passe" name="password" type="password" value={password} onChange={onChange} fullWidth required sx={{ mb: 2 }}/>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Rôle</InputLabel>
        <Select name="role" value={role} label="Rôle" onChange={onChange}>
          <MenuItem value="GRAND_GROUPE">Grand Groupe</MenuItem>
          <MenuItem value="FINANCIER">Financier</MenuItem>
        </Select>
      </FormControl>
      <Button type="submit" variant="contained" color="primary">
        Créer l'utilisateur
      </Button>
    </Box>
  );
};

// --- COMPOSANT POUR LES STATISTIQUES ---
const StatsDisplay = ({ stats }) => {
    return (
        <Box sx={{ mb: 4 }}>
            <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>Utilisateurs Inscrits</Typography>
                            <Typography variant="h5">{stats.totalUsers}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>Volume Total Transigé</Typography>
                            <Typography variant="h5">{stats.totalVolume.toLocaleString('fr-FR')} F CFA</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>Factures en Attente</Typography>
                            <Typography variant="h5">{stats.pendingInvoices}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};


const AdminDashboardPage = () => {
  const [pendingPMEs, setPendingPMEs] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalVolume: 0, pendingInvoices: 0 });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Vous devez être connecté en tant qu\'administrateur.');
        return;
      }
      const config = { headers: { 'x-auth-token': token } };
      
      const [pmeRes, statsRes] = await Promise.all([
        axios.get('http://localhost:5001/api/admin/users/pending', config),
        axios.get('http://localhost:5001/api/admin/stats', config)
      ]);
      
      setPendingPMEs(pmeRes.data);
      setStats(statsRes.data);

    } catch (err) {
      setError('Erreur lors de la récupération des données du tableau de bord.');
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleActivate = async (pmeId) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      const res = await axios.put(`http://localhost:5001/api/admin/users/${pmeId}/activate`, {}, config);
      setMessage(res.data.msg);
      setPendingPMEs(pendingPMEs.filter(pme => pme.id !== pmeId));
    } catch (err) {
      setError('Erreur lors de l\'activation de la PME.');
      console.error(err);
    }
  };

  return (
    <>
      <Navbar /> {/* AJOUT DE LA NAVBAR ICI */}
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Portail Administrateur
          </Typography>

          <StatsDisplay stats={stats} />
          
          <CreateUserForm onUserCreated={fetchData} />

          <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 4 }}>
            PME en attente de validation
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Nom de l'entreprise</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Date d'inscription</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingPMEs.length > 0 ? (
                  pendingPMEs.map((pme) => (
                    <TableRow key={pme.id}>
                      <TableCell>{pme.company_name}</TableCell>
                      <TableCell>{pme.email}</TableCell>
                      <TableCell>{new Date(pme.created_at).toLocaleDateString()}</TableCell>
                      <TableCell align="right">
                        <Button variant="contained" color="primary" onClick={() => handleActivate(pme.id)}>
                          Activer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      Aucune PME en attente de validation.
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

export default AdminDashboardPage;