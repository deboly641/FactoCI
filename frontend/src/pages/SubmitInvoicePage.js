import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { Container, Box, Typography, TextField, Button, Select, MenuItem, FormControl, InputLabel } from '@mui/material';

const SubmitInvoicePage = () => {
  // ... (toute la logique useState, useEffect, onSubmit... reste exactement la même)
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    buyer_id: '',
    invoice_number: '',
    amount: '',
    due_date: '',
  });
  const [file, setFile] = useState(null);
  const [buyers, setBuyers] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchBuyers = () => {
      const testBuyer = {
        id: 'b5fa5c06-e169-4170-83f4-3f47140e5ed1', 
        company_name: 'Le Grand Groupe Test' 
      };
      setBuyers([testBuyer]);
      if (testBuyer) {
        setFormData(prev => ({ ...prev, buyer_id: testBuyer.id }));
      }
    };
    fetchBuyers();
  }, []);

  const { buyer_id, invoice_number, amount, due_date } = formData;

  const onFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const onFileChange = (e) => setFile(e.target.files[0]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage('Veuillez sélectionner un fichier PDF.');
      return;
    }

    const submissionData = new FormData();
    submissionData.append('invoicePdf', file);
    submissionData.append('buyer_id', buyer_id);
    submissionData.append('invoice_number', invoice_number);
    submissionData.append('amount', amount);
    submissionData.append('due_date', due_date);

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5001/api/invoices', submissionData, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage('Facture soumise avec succès !');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setMessage('Erreur lors de la soumission.');
      console.error(err);
    }
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="md">
        <Box component="form" onSubmit={onSubmit} sx={{ mt: 4 }}>
          <Typography variant="h4" gutterBottom>Soumettre une Facture</Typography>
          
          <FormControl fullWidth margin="normal" required>
            <InputLabel id="buyer-select-label">Client (Grand Groupe)</InputLabel>
            <Select
              labelId="buyer-select-label"
              name="buyer_id"
              value={buyer_id}
              label="Client (Grand Groupe)"
              onChange={onFormChange}
            >
              {buyers.map(buyer => (
                <MenuItem key={buyer.id} value={buyer.id}>{buyer.company_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField fullWidth margin="normal" label="Numéro de Facture" name="invoice_number" value={invoice_number} onChange={onFormChange} required />
          <TextField fullWidth margin="normal" label="Montant" name="amount" type="number" value={amount} onChange={onFormChange} required />
          <TextField fullWidth margin="normal" name="due_date" type="date" value={due_date} onChange={onFormChange} required InputLabelProps={{ shrink: true }} label="Date d'échéance" />
          
          <Button variant="contained" component="label" sx={{ mt: 2 }}>
            Choisir le fichier PDF
            <input type="file" hidden onChange={onFileChange} required accept=".pdf" />
          </Button>
          {file && <Typography sx={{ display: 'inline', ml: 2 }}>{file.name}</Typography>}

          <Button type="submit" variant="contained" color="primary" sx={{ mt: 3, display: 'block' }}>
            Soumettre la facture
          </Button>

          {message && <Typography sx={{ mt: 2 }}>{message}</Typography>}
        </Box>
      </Container>
    </>
  );
};

export default SubmitInvoicePage;