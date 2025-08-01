import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Paper, Tabs, Tab, Divider } from '@mui/material';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

const Login = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation(); 
  
  // Parse redirect URL from query parameters (if any)
  const queryParams = new URLSearchParams(location.search);
  const redirectUrl = queryParams.get('redirect') || '/';

  // Add state for tab switching between login and signup
  const [activeTab, setActiveTab] = useState('login');
  
  // Login state
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  
  // Facility signup state (renamed from newFacilityData for clarity)
  const [facilityData, setFacilityData] = useState({
    facilityName: '',
    adminUsername: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
    organizationName: ''
  });
  
  // Error messages
  const [error, setError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState('');
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError('');
    setSignupSuccess('');
  };

  const handleLoginDataChange = (e) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value
    });
  };

  const handleFacilityDataChange = (e) => {
    setFacilityData({
      ...facilityData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      console.log('Attempting login with:', loginData);
      const response = await axios.post('http://localhost:5000/api/login', loginData);

      console.log('Login response:', response.data);
      if (response.data && response.data.access_token) {
        // Pass the token to parent component
        onLoginSuccess(response.data.access_token);

        // Handle redirect after a short delay
        setTimeout(() => {
          navigate(redirectUrl);
        }, 300);
      } else {
        setError('Login successful but no token received');
      }
    } catch (error) {
      console.error('Login error:', error.response?.data);
      setError(error.response?.data?.message || 'Login failed');
    }
  };
  
  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSignupSuccess('');
    
    // Basic validation
    if (facilityData.adminPassword !== facilityData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      // Create new facility subscription
      const dataToSend = {
        facilityName: facilityData.facilityName,
        organizationName: facilityData.organizationName,
        admin: {
          username: facilityData.adminUsername,
          email: facilityData.adminEmail,
          password: facilityData.adminPassword
        }
      };
      
      console.log('Creating new facility with:', dataToSend);
      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/register-facility`, dataToSend);
      
      console.log('New facility response:', response.data);
      setSignupSuccess('New facility created successfully! You can now log in as the admin.');
      
      // Clear the form
      setFacilityData({
        facilityName: '',
        adminUsername: '',
        adminEmail: '',
        adminPassword: '',
        confirmPassword: '',
        organizationName: ''
      });
      
      // Switch to the login tab after successful signup
      setTimeout(() => {
        setActiveTab('login');
      }, 2000);
    } catch (error) {
      console.error('Signup error:', error.response?.data);
      setError(error.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <Paper sx={{ maxWidth: 500, mx: 'auto', mt: 8, p: 3, borderRadius: 2, boxShadow: 3 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Zebrafish Facility Management
      </Typography>
      
      <Tabs 
        value={activeTab} 
        onChange={handleTabChange} 
        variant="fullWidth" 
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Login" value="login" />
        <Tab label="Register New Facility" value="signup" />
      </Tabs>

      {activeTab === 'login' && (
        <Box component="form" onSubmit={handleLogin}>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          
          <TextField
            fullWidth
            label="Username"
            name="username"
            value={loginData.username}
            onChange={handleLoginDataChange}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Password"
            name="password"
            type="password"
            value={loginData.password}
            onChange={handleLoginDataChange}
            margin="normal"
            required
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 3, mb: 2 }}
          >
            Login
          </Button>
        </Box>
      )}

      {activeTab === 'signup' && (
        <Box component="form" onSubmit={handleSignup}>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          
          {signupSuccess && (
            <Typography color="success.main" sx={{ mb: 2 }}>
              {signupSuccess}
            </Typography>
          )}
          
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Facility Information
          </Typography>
          
          <TextField
            fullWidth
            label="Facility Name"
            name="facilityName"
            value={facilityData.facilityName}
            onChange={handleFacilityDataChange}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            label="Organization Name"
            name="organizationName"
            value={facilityData.organizationName}
            onChange={handleFacilityDataChange}
            margin="normal"
            required
          />
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>
            Admin Account Information
          </Typography>
          
          <TextField
            fullWidth
            label="Admin Username"
            name="adminUsername"
            value={facilityData.adminUsername}
            onChange={handleFacilityDataChange}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            label="Admin Email"
            name="adminEmail"
            type="email"
            value={facilityData.adminEmail}
            onChange={handleFacilityDataChange}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            label="Admin Password"
            name="adminPassword"
            type="password"
            value={facilityData.adminPassword}
            onChange={handleFacilityDataChange}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={facilityData.confirmPassword}
            onChange={handleFacilityDataChange}
            margin="normal"
            required
          />
          
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 3, mb: 2 }}
          >
            Create New Facility
          </Button>
        </Box>
      )}
      
      <Typography variant="body2" align="center" sx={{ mt: 2 }}>
        {activeTab === 'login' ? 
          "Need your own zebrafish tracking system? Register your facility to get started." :
          "Already have an account? Switch to Login."
        }
      </Typography>
    </Paper>
  );
};

export default Login;