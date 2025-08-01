import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { CircularProgress, Container, Typography, Alert, Box, Button } from '@mui/material';

const SuperAdminGuard = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();

  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        setIsAuthenticated(false);
        return;
      }
      
      try {
        // First check if user info can be retrieved (confirms token is valid)
        await axios.get(`${process.env.REACT_APP_API_BASE_URL}/user`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // Then check super admin status
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/check-super-admin`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('Super admin check response:', response.data);
        setIsAuthenticated(true);
        setIsSuperAdmin(response.data.is_super_admin);
        setIsLoading(false);
      } catch (err) {
        console.error('Error verifying super admin status:', err);
        setError('Failed to verify admin privileges.');
        setIsAuthenticated(false);
        setIsSuperAdmin(false);
        setIsLoading(false);
      }
    };
    
    checkSuperAdminStatus();
  }, []);
  
  if (isLoading) {
    return (
      <Container sx={{ mt: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Verifying super admin privileges...</Typography>
      </Container>
    );
  }
  
  if (!isAuthenticated) {
    // Save the current location to redirect after login
    return <Navigate to={`/login`} replace state={{ from: location }} />;
  }
  
  if (!isSuperAdmin) {
    return (
      <Container sx={{ mt: 8 }}>
        <Alert severity="error">
          <Typography variant="h6">Access Denied</Typography>
          <Typography>
            You don't have super admin privileges. Please contact your system administrator.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => window.location.href = '/'}
            >
              Return to Dashboard
            </Button>
          </Box>
        </Alert>
      </Container>
    );
  }
  
  return children;
};

export default SuperAdminGuard;