// zebrafish-frontend/src/components/clinical/CaseDetail.js
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Button, Chip, Divider, 
  Grid, TextField, FormControl, InputLabel, Select, 
  MenuItem, List, ListItem, ListItemText, Avatar, 
  ListItemAvatar, IconButton, CircularProgress,
  Alert
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  AccessTime as TimeIcon,
  Delete as DeleteIcon  // Add this new import
} from '@mui/icons-material';
import axios from 'axios';

const CaseDetail = ({ caseData, onBack, onCaseUpdated }) => {
  const [newNote, setNewNote] = useState('');
  const [status, setStatus] = useState(caseData.status);
  const [closureReason, setClosureReason] = useState(caseData.closure_reason || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [caseDetails, setCaseDetails] = useState(caseData || {});
  const [refreshKey, setRefreshKey] = useState(0); // Add a refresh key state

  const fetchCaseDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `http://localhost:5000/api/clinical/cases/${caseData.id}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      setCaseDetails(response.data);
    } catch (err) {
      setError("Failed to refresh case details");
      console.error("Error fetching case details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseDetails();
  }, [caseData.id, refreshKey]);

  const handleStatusChange = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const data = { 
        status: status,
        closure_reason: status === 'Closed' ? closureReason : null 
      };
      
      await axios.patch(
        `http://localhost:5000/api/clinical/cases/${caseData.id}/status`, 
        data,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      onCaseUpdated();
    } catch (err) {
      setError('Failed to update case status');
      console.error('Error updating case:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      await axios.post(
        `http://localhost:5000/api/clinical/cases/${caseData.id}/notes`,
        { content: newNote.trim() },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      setNewNote('');
      
      // Refresh the case data to include the new note
      setRefreshKey(prevKey => prevKey + 1);
      
      // Call parent's onCaseUpdated if provided
      if (onCaseUpdated) onCaseUpdated();
      
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error';
      console.error('Error adding note:', err.response?.data || err.message, err);
      setError(`Failed to add note: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCase = async () => {
    if (window.confirm('Are you sure you want to delete this case? This action cannot be undone.')) {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        
        await axios.delete(
          `http://localhost:5000/api/clinical/cases/${caseData.id}`, 
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        // Notify parent that a case was deleted
        onCaseUpdated(); // Add this line to refresh the case list
        
        // Go back to the case list
        onBack();
      } catch (err) {
        setError('Failed to delete case');
        console.error('Error deleting case:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={onBack} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5">Case #{caseData.id}</Typography>
        <Chip 
          label={caseData.status} 
          color={caseData.status === 'Open' ? 'error' : 'success'} 
          sx={{ ml: 2 }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Button 
          startIcon={<DeleteIcon />}
          color="error"
          onClick={handleDeleteCase}
          disabled={loading}
        >
          Delete Case
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Case Information</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Typography variant="body1"><strong>Date Reported:</strong> {new Date(caseData.report_date).toLocaleDateString()}</Typography>
            <Typography variant="body1"><strong>Tank:</strong> {caseData.rack_name} / {caseData.tank_position}</Typography>
            <Typography variant="body1"><strong>Fish Line:</strong> {caseData.tank_line || 'Not specified'}</Typography>
            <Typography variant="body1"><strong>Affected Fish:</strong> {caseData.fish_count}</Typography>
            
            <Typography variant="body1" sx={{ mt: 2 }}><strong>Symptoms:</strong></Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {caseData.symptoms.map((symptom, index) => (
                <Chip 
                  key={index} 
                  label={symptom} 
                  color="primary" 
                  variant="outlined"
                  size="small"
                />
              ))}
            </Box>
            
            <Typography variant="body1" sx={{ mt: 2 }}><strong>Initial Note:</strong></Typography>
            <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
              {caseData.note || 'No initial notes provided.'}
            </Typography>

            {caseData.status === 'Closed' && (
              <>
                <Typography variant="body1" sx={{ mt: 2 }}><strong>Closure Reason:</strong></Typography>
                <Typography variant="body2">{caseData.closure_reason || 'Not specified'}</Typography>
              </>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>Case Updates</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 400 }}>
              {caseDetails.notes && caseDetails.notes.length > 0 ? (
                <List>
                  {caseDetails.notes.map((note, index) => (
                    <ListItem key={note.id || index} alignItems="flex-start" divider={index < caseDetails.notes.length - 1}>
                      <ListItemAvatar>
                        <Avatar>
                          <TimeIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={note.username || 'Unknown User'}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary" sx={{ display: 'block' }}>
                              {note.content}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(note.timestamp || note.created_at).toLocaleString()}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" sx={{ fontStyle: 'italic', textAlign: 'center', py: 3 }}>
                  No updates have been added to this case.
                </Typography>
              )}
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <TextField
                label="Add Note"
                multiline
                rows={3}
                fullWidth
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                margin="normal"
                placeholder="Enter your observations, treatments, or other updates..."
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button
                  variant="contained"
                  disabled={loading || !newNote.trim()}
                  endIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                  onClick={handleAddNote}
                >
                  Add Note
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Case Management</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={status}
                    label="Status"
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <MenuItem value="Open">Open</MenuItem>
                    <MenuItem value="Closed">Closed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {status === 'Closed' && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Closure Reason</InputLabel>
                    <Select
                      value={closureReason}
                      label="Closure Reason"
                      onChange={(e) => setClosureReason(e.target.value)}
                    >
                      <MenuItem value="Recovered">Recovered</MenuItem>
                      <MenuItem value="Euthanized">Euthanized</MenuItem>
                      <MenuItem value="Died">Died</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
              
              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={
                    loading || 
                    (status === caseData.status && closureReason === caseData.closure_reason) ||
                    (status === 'Closed' && !closureReason)
                  }
                  onClick={handleStatusChange}
                >
                  {loading ? <CircularProgress size={24} /> : 'Update Status'}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CaseDetail;