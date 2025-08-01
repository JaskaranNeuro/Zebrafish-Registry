import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, Container, Button } from '@mui/material';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import Header from '../components/Header';

const PaymentReturnPage = ({ onLogout }) => {
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const pendingPaymentData = JSON.parse(localStorage.getItem('pendingPaymentData') || '{}');
        
        if (!pendingPaymentData.payment_intent_id) {
          setError("No payment information found.");
          setStatus('failed');
          return;
        }
        
        // Verify the payment with your backend
        const token = localStorage.getItem('token');
        const response = await axios.post(
          'http://localhost:5000/api/subscription/payment/verify', 
          {
            payment_intent_id: pendingPaymentData.payment_intent_id,
            plan: pendingPaymentData.plan,
            days: pendingPaymentData.days
          },
          { headers: { 'Authorization': `Bearer ${token}` }}
        );
        
        // Clear the stored payment data
        localStorage.removeItem('pendingPaymentData');
        
        setStatus('success');
        
      } catch (err) {
        console.error('Payment verification error:', err);
        setError(err.response?.data?.message || 'Failed to verify payment');
        setStatus('failed');
      }
    };
    
    verifyPayment();
  }, [navigate]);
  
  const handleReturnToSubscription = () => {
    navigate('/subscription-management');
  };
  
  return (
    <>
      <Header onLogout={onLogout} />
      <Container maxWidth="sm">
        <Box 
          sx={{ 
            my: 8, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            textAlign: 'center' 
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            Processing Payment
          </Typography>
          
          {status === 'processing' && (
            <Box sx={{ mt: 4, mb: 2 }}>
              <CircularProgress size={60} />
              <Typography variant="h6" sx={{ mt: 2 }}>
                Verifying your payment...
              </Typography>
            </Box>
          )}
          
          {status === 'success' && (
            <Alert severity="success" sx={{ mt: 2, width: '100%' }}>
              <Typography variant="h6">Payment Successful!</Typography>
              <Typography variant="body1">
                Your subscription has been extended.
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                sx={{ mt: 2 }}
                onClick={handleReturnToSubscription}
              >
                Return to Subscription Management
              </Button>
            </Alert>
          )}
          
          {status === 'failed' && (
            <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
              <Typography variant="h6">Payment Verification Failed</Typography>
              <Typography variant="body1">
                {error || "There was an issue verifying your payment. Please contact support."}
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                sx={{ mt: 2 }}
                onClick={handleReturnToSubscription}
              >
                Return to Subscription Management
              </Button>
            </Alert>
          )}
        </Box>
      </Container>
    </>
  );
};

export default PaymentReturnPage;