import React from 'react';
import { Container, Box, Typography, Button } from '@mui/material';
import SubscriptionInfo from '../components/admin/SubscriptionInfo';
import Header from '../components/Header';

const SubscriptionPage = ({ onLogout, userRole }) => {
  return (
    <>
      <Header onLogout={onLogout} />
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h3" component="h1">
              Subscription Management
            </Typography>
            <Button 
              variant="outlined"
              onClick={() => { window.location.href = "/#/"; }}
            >
              Back to Dashboard
            </Button>
          </Box>
          {userRole && userRole.toLowerCase() === 'admin' && (
            <Button 
              variant="contained"
              color="primary"
              onClick={() => { 
                console.log("Navigating to subscription management page");
                window.location.href = "/#/subscription-management";
              }}
              startIcon={<span role="img" aria-label="subscription">📅</span>}
              size="medium"
            >
              Manage Subscription
            </Button>
          )}
          <SubscriptionInfo />
        </Box>
      </Container>
    </>
  );
};

export default SubscriptionPage;