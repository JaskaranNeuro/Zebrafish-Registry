// Create file: zebrafish-frontend/src/components/admin/SuperAdminPanel.js
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Button, TextField, 
  Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Dialog, DialogTitle,
  DialogContent, DialogActions
} from '@mui/material';
import axios from 'axios';

const SuperAdminPanel = () => {
  const [facilities, setFacilities] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [extensionDays, setExtensionDays] = useState(365);
  const [planType, setPlanType] = useState('PREMIUM');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchFacilities();
  }, []);
  
  const fetchFacilities = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/admin/facilities', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setFacilities(response.data.facilities);
    } catch (err) {
      console.error('Error fetching facilities:', err);
      setError('Failed to load facilities');
    }
  };
  
  const handleExtend = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      await axios.post('http://localhost:5000/api/subscription/admin-extend', {
        facility_id: selectedFacility.id,
        days: extensionDays,
        plan: planType
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setDialogOpen(false);
      fetchFacilities();
    } catch (err) {
      console.error('Error extending subscription:', err);
      setError('Failed to extend subscription: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEndSubscription = async (facilityId, facilityName) => {
    // Show confirmation dialog
    if (!window.confirm(
      `Are you sure you want to end the subscription for ${facilityName}? This will immediately terminate all subscription benefits for this facility.`
    )) {
      return; // User cancelled
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      await axios.post('http://localhost:5000/api/subscription/admin/end', 
        { facility_id: facilityId },
        { headers: { 'Authorization': `Bearer ${token}` }}
      );
      
      // Refresh facilities list
      fetchFacilities();
      alert(`Subscription for ${facilityName} has been ended successfully.`);
    } catch (err) {
      console.error('Error ending subscription:', err);
      setError('Failed to end subscription: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>Super Admin Panel</Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        Use this panel to manage all facility subscriptions
      </Typography>
      
      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Facility ID</TableCell>
              <TableCell>Facility Name</TableCell>
              <TableCell>Subscription Plan</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Expiration</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {facilities.map(facility => (
              <TableRow key={facility.id}>
                <TableCell>{facility.id}</TableCell>
                <TableCell>{facility.name}</TableCell>
                <TableCell>{facility.subscription?.plan_name || 'None'}</TableCell>
                <TableCell>
                  {facility.subscription?.is_valid ? 'Active' : 'Expired'}
                </TableCell>
                <TableCell>
                  {facility.subscription?.end_date ? 
                    new Date(facility.subscription.end_date).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    sx={{ mr: 1 }}
                    onClick={() => {
                      setSelectedFacility(facility);
                      setDialogOpen(true);
                    }}
                  >
                    Extend
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => handleEndSubscription(facility.id, facility.name)}
                  >
                    End
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Extend Subscription for {selectedFacility?.name}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Plan</InputLabel>
            <Select
              value={planType}
              label="Plan"
              onChange={(e) => setPlanType(e.target.value)}
            >
              <MenuItem value="BASIC">Basic Plan</MenuItem>
              <MenuItem value="STANDARD">Standard Plan</MenuItem>
              <MenuItem value="PREMIUM">Premium Plan</MenuItem>
              <MenuItem value="UNLIMITED">Unlimited Plan</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="Duration (days)"
            type="number"
            fullWidth
            value={extensionDays}
            onChange={(e) => setExtensionDays(Math.max(1, parseInt(e.target.value) || 0))}
            InputProps={{
              inputProps: { min: 1 }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleExtend} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? 'Extending...' : 'Extend Subscription'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuperAdminPanel;