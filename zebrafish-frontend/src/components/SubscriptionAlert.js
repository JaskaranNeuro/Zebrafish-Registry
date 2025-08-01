// zebrafish-frontend/src/components/SubscriptionAlert.js
import React, { useState, useEffect } from 'react';
import { Alert, Button, Snackbar } from '@mui/material';
import axios from 'axios';

const SubscriptionAlert = () => {
  const [subscription, setSubscription] = useState(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('info');
  
  useEffect(() => {
    // Only check subscription if user is logged in
    if (localStorage.getItem('token')) {
      checkSubscription();
    }
    
    // Check every hour
    const interval = setInterval(() => {
      if (localStorage.getItem('token')) {
        checkSubscription();
      }
    }, 3600000);
    
    return () => clearInterval(interval);
  }, []);
  
  const checkSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('`${process.env.REACT_APP_API_BASE_URL}/subscription/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setSubscription(response.data);
      
      // Set appropriate alert messages
      if (!response.data.is_valid) {
        setMessage('Your subscription has expired. Please renew to continue using all features.');
        setSeverity('error');
        setOpen(true);
      } else if (response.data.days_remaining < 7) {
        setMessage(`Your subscription will expire in ${response.data.days_remaining} days. Please renew soon.`);
        setSeverity('warning');
        setOpen(true);
      }
    } catch (err) {
      console.error('Error checking subscription:', err);
    }
  };
  
  const handleClose = () => {
    setOpen(false);
  };
  
  return (
    <Snackbar
      open={open}
      autoHideDuration={10000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert 
        onClose={handleClose} 
        severity={severity}
        action={
          <Button 
            color="inherit" 
            size="small" 
            onClick={() => { window.location.hash = "#/subscription-management"; }}
          >
            Manage
          </Button>
        }
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default SubscriptionAlert;