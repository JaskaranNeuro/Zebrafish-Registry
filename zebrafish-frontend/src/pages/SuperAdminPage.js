import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Container, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Button, Dialog, DialogActions, 
  DialogContent, DialogTitle, FormControl, InputLabel, Select, MenuItem,
  TextField, Alert, Chip, CircularProgress, Accordion, AccordionSummary, 
  AccordionDetails, Grid, Toolbar
} from '@mui/material';
import { 
  Check as CheckIcon, 
  Close as CloseIcon, 
  Logout as LogoutIcon,
  ExpandMore as ExpandMoreIcon,
  Layers as LayersIcon 
} from '@mui/icons-material';

const SuperAdminPage = () => {
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [formData, setFormData] = useState({
    planType: 'STANDARD',
    days: 365
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [tiersDialogOpen, setTiersDialogOpen] = useState(false);
  const [selectedFacilityForTiers, setSelectedFacilityForTiers] = useState(null);

  // Check authentication and super admin status
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        // No token, redirect to login
        navigate('/');
        return;
      }

      try {
        // Verify the token is valid
        const userResponse = await axios.get('`${process.env.REACT_APP_API_BASE_URL}/user', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        // Check super admin status
        const superAdminResponse = await axios.get('`${process.env.REACT_APP_API_BASE_URL}/check-super-admin', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        setIsAuthenticated(true);
        setIsSuperAdmin(superAdminResponse.data.is_super_admin);

        if (!superAdminResponse.data.is_super_admin) {
          setError('You do not have super admin privileges');
          // Optional: redirect non-super admins
          // setTimeout(() => navigate('/'), 3000);
        } else {
          // Proceed with fetching facilities
          fetchFacilities();
        }
      } catch (err) {
        console.error('Authentication error:', err);
        setError('Authentication failed. Please log in again.');
        setIsAuthenticated(false);
        // Redirect to login after a short delay
        setTimeout(() => navigate('/'), 2000);
      }
    };

    checkAuth();
  }, [navigate]);

  // Helper to safely access nested properties that might be undefined
  const safeAccess = (obj, path) => {
    if (!obj) return undefined;
    const keys = path.split('.');
    return keys.reduce((acc, key) => acc && acc[key] !== undefined ? acc[key] : undefined, obj);
  };

  // Fetch all facilities with subscription data
  const fetchFacilities = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const response = await axios.get(
        '`${process.env.REACT_APP_API_BASE_URL}/super-admin/facilities',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      console.log('Facilities data:', response.data);
      setFacilities(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching facilities:', err);
      setError(err.response?.data?.message || 'Failed to load facilities');
      setLoading(false);
    }
  };

  // Handle extending a subscription
  const handleExtend = async () => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '`${process.env.REACT_APP_API_BASE_URL}/super-admin/subscription/extend',
        {
          facility_id: selectedFacility.id,
          plan_type: formData.planType,
          days: parseInt(formData.days)
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('Extend subscription response:', response.data);
      setExtendDialogOpen(false);
      fetchFacilities(); // Reload data
    } catch (err) {
      console.error('Error extending subscription:', err);
      setError(err.response?.data?.message || 'Failed to extend subscription');
    }
  };

  // Handle ending a subscription
  const handleEnd = async () => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '`${process.env.REACT_APP_API_BASE_URL}/super-admin/subscription/end',
        {
          facility_id: selectedFacility.id
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('End subscription response:', response.data);
      setEndDialogOpen(false);
      fetchFacilities(); // Reload data
    } catch (err) {
      console.error('Error ending subscription:', err);
      setError(err.response?.data?.message || 'Failed to end subscription');
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('activeTab');
    setIsAuthenticated(false);
    navigate('/');
  };

  // Get color based on subscription status
  const getStatusColor = (status) => {
    return status === 'ACTIVE' ? 'success' : 'error';
  };

  // Helper function to calculate days left more accurately (inclusive of end date)
  const calculateDaysLeft = (endDateStr) => {
    if (!endDateStr) return null;
    
    // Parse the date string - ensure it's treated as UTC
    const endDate = new Date(endDateStr + 'T00:00:00Z');
    const today = new Date();
    
    // Reset time portion for accurate day calculation
    endDate.setUTCHours(0, 0, 0, 0);
    today.setUTCHours(0, 0, 0, 0);
    
    // Remove time zone differences by working with date components
    const endDateOnly = new Date(Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      endDate.getUTCDate()
    ));
    
    const todayOnly = new Date(Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    ));
    
    // Calculate difference in days
    const diffTime = endDateOnly.getTime() - todayOnly.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Add 1 for inclusive counting (counting both start and end day)
    return Math.max(0, diffDays + 1);
  };

  // Handle opening the tiers dialog
  const handleOpenTiersDialog = (facility) => {
    setSelectedFacilityForTiers(facility);
    setTiersDialogOpen(true);
  };

  // Helper function to get color based on plan type
  const getPlanColor = (planName) => {
    if (!planName) return 'default';
    
    const planColors = {
      'TRIAL': 'default',
      'BASIC': 'info',
      'STANDARD': 'primary',
      'PREMIUM': 'secondary',
      'UNLIMITED': 'success'
    };
    return planColors[planName.toUpperCase()] || 'default';
  };

  // Helper function to calculate days between two dates
  const calculateDaysBetween = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return 0;
    
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // If not authenticated yet, show loading
  if (!isAuthenticated) {
    return (
      <Container sx={{ mt: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Verifying authentication...</Typography>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Container>
    );
  }

  // If authenticated but not super admin, show error
  if (!isSuperAdmin) {
    return (
      <>
        <Box 
          component="header" 
          sx={{ bgcolor: 'primary.main', color: 'white', p: 2, mb: 3 }}
        >
          <Container maxWidth="lg">
            <Toolbar disableGutters>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                Super Admin Panel
              </Typography>
              <Button 
                color="inherit" 
                onClick={handleLogout}
                startIcon={<LogoutIcon />}
              >
                Logout
              </Button>
            </Toolbar>
          </Container>
        </Box>
        <Container maxWidth="lg">
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="h6">Access Denied</Typography>
            <Typography>
              You do not have super admin privileges. Please contact your system administrator.
            </Typography>
            <Button 
              variant="outlined" 
              color="inherit" 
              sx={{ mt: 2 }}
              onClick={() => navigate('/')}
            >
              Return to Dashboard
            </Button>
          </Alert>
        </Container>
      </>
    );
  }

  return (
    <>
      {/* Custom header for the Super Admin page */}
      <Box 
        component="header" 
        sx={{ bgcolor: 'primary.main', color: 'white', p: 2, mb: 3 }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Super Admin Panel
            </Typography>
            <Button 
              color="inherit" 
              onClick={handleLogout}
              startIcon={<LogoutIcon />}
            >
              Logout
            </Button>
          </Toolbar>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Super Admin Panel
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Manage facility subscriptions across the platform
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mb: 2 }}>
            <Button 
              variant="contained" 
              onClick={fetchFacilities} 
              disabled={loading}
            >
              Refresh Data
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Facility Name</TableCell>
                  <TableCell>Organization</TableCell>
                  <TableCell>Admin</TableCell>
                  <TableCell>Plan Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>End Date</TableCell>
                  <TableCell>Days Left</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <CircularProgress size={24} sx={{ mr: 1 }} />
                      Loading facilities...
                    </TableCell>
                  </TableRow>
                ) : facilities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>No facilities found</TableCell>
                  </TableRow>
                ) : (
                  facilities.map(facility => (
                    <React.Fragment key={facility.id}>
                      <TableRow key={facility.id}>
                        <TableCell>{facility.name || 'Unknown'}</TableCell>
                        <TableCell>{facility.organization || 'N/A'}</TableCell>
                        <TableCell>{facility.admin || 'No Admin'}</TableCell>
                        <TableCell>
                          {safeAccess(facility, 'subscription.plan') || 'No Plan'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={safeAccess(facility, 'subscription.status') || 'No Subscription'}
                            color={getStatusColor(safeAccess(facility, 'subscription.status'))}
                            icon={safeAccess(facility, 'subscription.status') === 'ACTIVE' ? <CheckIcon /> : <CloseIcon />}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {safeAccess(facility, 'subscription.end_date') || '-'}
                        </TableCell>
                        <TableCell>
                          {typeof safeAccess(facility, 'subscription.days_left') === 'number' 
                            ? safeAccess(facility, 'subscription.days_left')
                            : safeAccess(facility, 'subscription.end_date')
                              ? calculateDaysLeft(safeAccess(facility, 'subscription.end_date'))
                              : '-'
                          }
                          {safeAccess(facility, 'subscription.end_date') && 
                            <Typography variant="caption" display="block" color="text.secondary">
                              (inclusive)
                            </Typography>
                          }
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button 
                              size="small" 
                              variant="contained" 
                              color="primary"
                              onClick={() => {
                                setSelectedFacility(facility);
                                setExtendDialogOpen(true);
                              }}
                            >
                              Extend
                            </Button>
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color="error"
                              onClick={() => {
                                setSelectedFacility(facility);
                                setEndDialogOpen(true);
                              }}
                            >
                              End
                            </Button>
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color="info"
                              startIcon={<LayersIcon />}
                              disabled={!safeAccess(facility, 'subscription.tiers') || safeAccess(facility, 'subscription.tiers').length === 0}
                              onClick={() => handleOpenTiersDialog(facility)}
                            >
                              Tiers
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                      {safeAccess(facility, 'subscription.tiers') && safeAccess(facility, 'subscription.tiers').length > 0 && (
                        <TableRow key={`${facility.id}-tiers`}>
                          <TableCell colSpan={8} sx={{ py: 0 }}>
                            <Accordion sx={{ 
                              boxShadow: 'none',
                              '&:before': { // Remove the default divider
                                display: 'none',
                              },
                            }}>
                              <AccordionSummary 
                                expandIcon={<ExpandMoreIcon />}
                                sx={{ 
                                  backgroundColor: 'transparent',
                                  pl: 0,
                                }}
                              >
                                <Typography variant="body2">View Subscription Tiers</Typography>
                              </AccordionSummary>
                              <AccordionDetails>
                                <Box sx={{ maxWidth: '100%', overflow: 'auto' }}>
                                  {/* Current active plan */}
                                  <Box sx={{ 
                                    mb: 3, 
                                    position: 'relative',
                                    pl: 4,
                                    '&:before': {
                                      content: '""',
                                      position: 'absolute',
                                      left: '12px',
                                      top: '12px',
                                      width: '12px',
                                      height: '12px',
                                      borderRadius: '50%',
                                      backgroundColor: 'primary.main',
                                      zIndex: 1
                                    }
                                  }}>
                                    <Paper elevation={2} sx={{ p: 2, backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
                                      <Typography variant="subtitle2">
                                        Active Plan: {safeAccess(facility, 'subscription.plan')}
                                      </Typography>
                                      <Typography variant="body2">
                                        {safeAccess(facility, 'subscription.start_date')} to {safeAccess(facility, 'subscription.end_date')}
                                      </Typography>
                                    </Paper>
                                  </Box>
                                  
                                  {/* Tiers divider line */}
                                  <Box sx={{ 
                                    position: 'relative', 
                                    ml: 2.5,
                                    '&:before': {
                                      content: '""',
                                      position: 'absolute',
                                      left: 0,
                                      top: 0,
                                      bottom: 0,
                                      width: '2px',
                                      backgroundColor: 'divider'
                                    }
                                  }}>
                                    {/* Upcoming tiers */}
                                    {safeAccess(facility, 'subscription.tiers').map((tier, index) => (
                                      <Box 
                                        key={tier.id || index} 
                                        sx={{ 
                                          position: 'relative',
                                          mb: 2, 
                                          ml: 3,
                                          '&:before': {
                                            content: '""',
                                            position: 'absolute',
                                            left: '-12px',
                                            top: '12px',
                                            width: '10px',
                                            height: '10px',
                                            borderRadius: '50%',
                                            backgroundColor: 'secondary.main',
                                            zIndex: 1
                                          }
                                        }}
                                      >
                                        <Paper elevation={1} sx={{ p: 2 }}>
                                          <Typography variant="subtitle2">
                                            {tier.plan_name}
                                          </Typography>
                                          <Typography variant="body2">
                                            {tier.start_date} to {tier.end_date}
                                          </Typography>
                                        </Paper>
                                      </Box>
                                    ))}
                                  </Box>
                                </Box>
                              </AccordionDetails>
                            </Accordion>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Extend Subscription Dialog */}
        <Dialog open={extendDialogOpen} onClose={() => setExtendDialogOpen(false)}>
          <DialogTitle>
            Extend Subscription for {selectedFacility?.name}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, minWidth: 400 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Plan Type</InputLabel>
                <Select
                  value={formData.planType}
                  onChange={(e) => setFormData({...formData, planType: e.target.value})}
                  label="Plan Type"
                >
                  <MenuItem value="BASIC">Basic</MenuItem>
                  <MenuItem value="STANDARD">Standard</MenuItem>
                  <MenuItem value="PREMIUM">Premium</MenuItem>
                  <MenuItem value="UNLIMITED">Unlimited</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="Duration (days)"
                type="number"
                fullWidth
                value={formData.days}
                onChange={(e) => setFormData({...formData, days: e.target.value})}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setExtendDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleExtend} variant="contained" color="primary">
              Extend Subscription
            </Button>
          </DialogActions>
        </Dialog>

        {/* End Subscription Dialog */}
        <Dialog open={endDialogOpen} onClose={() => setEndDialogOpen(false)}>
          <DialogTitle>
            End Subscription
          </DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to end the subscription for {selectedFacility?.name}?
              This will immediately revoke their access to premium features.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEndDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEnd} variant="contained" color="error">
              End Subscription
            </Button>
          </DialogActions>
        </Dialog>

        {/* Tiers Dialog */}
        <Dialog 
          open={tiersDialogOpen} 
          onClose={() => setTiersDialogOpen(false)} 
          maxWidth="md" 
          fullWidth
        >
          <DialogTitle>
            Subscription Tiers for {selectedFacilityForTiers?.name}
          </DialogTitle>
          <DialogContent>
            {selectedFacilityForTiers && safeAccess(selectedFacilityForTiers, 'subscription.tiers') && (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>Current Active Plan</Typography>
                  <Paper elevation={3} sx={{ p: 2, backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="subtitle2">Plan</Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {safeAccess(selectedFacilityForTiers, 'subscription.plan')}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="subtitle2">Start Date</Typography>
                        <Typography variant="body1">
                          {safeAccess(selectedFacilityForTiers, 'subscription.start_date')}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="subtitle2">End Date</Typography>
                        <Typography variant="body1">
                          {safeAccess(selectedFacilityForTiers, 'subscription.end_date')}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Box>
                
                {safeAccess(selectedFacilityForTiers, 'subscription.tiers').length > 0 ? (
                  <>
                    <Typography variant="h6" gutterBottom>Upcoming Tiers</Typography>
                    <TableContainer component={Paper}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Order</TableCell>
                            <TableCell>Plan</TableCell>
                            <TableCell>Start Date</TableCell>
                            <TableCell>End Date</TableCell>
                            <TableCell>Duration</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {safeAccess(selectedFacilityForTiers, 'subscription.tiers').map((tier, index) => (
                            <TableRow key={tier.id || index}>
                              <TableCell>{tier.tier_order || index + 1}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={tier.plan_name} 
                                  size="small" 
                                  color={getPlanColor(tier.plan_name)}
                                />
                              </TableCell>
                              <TableCell>{tier.start_date}</TableCell>
                              <TableCell>{tier.end_date}</TableCell>
                              <TableCell>
                                {calculateDaysBetween(tier.start_date, tier.end_date)} days
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                ) : (
                  <Alert severity="info">No additional subscription tiers found.</Alert>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTiersDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
};

export default SuperAdminPage;
