import React, { useState, useEffect, useCallback } from 'react';
import { Container, Box, Typography, Tabs, Tab, Button, MenuItem } from '@mui/material';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setRacks } from './store/racksSlice';
import TabReset from './TabReset';
import SubscriptionAlert from './components/SubscriptionAlert';
import AppRoutes from './AppRoutes';
import SuperAdminPage from './pages/SuperAdminPage';
import Login from './components/Login';
import RackList from './components/RackList';
import BreedingManagement from './components/breeding/BreedingManagement';
import ClinicalManagement from './components/clinical/ClinicalManagement';
import UserManagement from './components/admin/UserManagement';
import Header from './components/Header';
import SubscriptionPage from './pages/SubscriptionPage';
import ErrorBoundary from './components/ErrorBoundary';
// Import Routes/Route but remove BrowserRouter
import { Route, Routes, useLocation, useNavigate, Link, Navigate } from 'react-router-dom';
import PaymentReturnPage from './pages/PaymentReturnPage';
import SuperAdminGuard from './components/SuperAdminGuard';
// Add this import at the top with your other imports
import api from './utils/api';

// Update in axios interceptor in App.js (around line 20-35)
axios.interceptors.response.use(
  response => response,
  error => {
    // Prevent infinite loops by checking if we're already on the login page
    const isLoginPage = window.location.href.includes('/login');
    
    if (
      error.response && 
      (error.response.status === 401 || 
       error.response.status === 403 || 
       error.response.status === 422) && 
      !isLoginPage  // Only redirect if not already on login page
    ) {
      console.error('Authentication error:', error.response.data);
      // Clear token
      localStorage.removeItem('token');
      localStorage.removeItem('activeTab');
      localStorage.removeItem('userRole');
      
      // Use replace state instead of location.href to prevent loops
      window.history.replaceState(null, '', '/login');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

const App = () => {
  // Your state declarations...
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('token');
  });
  const [activeTab, setActiveTab] = useState('registry');
  const [userRole, setUserRole] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  const dispatch = useDispatch();
  const location = useLocation(); // Add this
  const navigate = useNavigate(); // Add this

  // Check if user is on the super admin path
  const isSuperAdminPath = location.pathname === '/super-admin';

  // 1. MOVE handleLogout HERE and wrap in useCallback
  const handleLogout = useCallback(() => {
    // Clear ALL localStorage items
    localStorage.removeItem('token');
    localStorage.removeItem('activeTab'); 
    localStorage.removeItem('userRole');
    setUserRole(null);
    setIsAuthenticated(false);
    setDataLoaded(false);
    dispatch(setRacks([]));
  }, [dispatch]); // Add dispatch as a dependency

  // Rest of your state and handlers remain the same

  // Update your fetchRacks function to use axios directly instead of api
const fetchRacks = useCallback(async () => {
  try {
    const token = localStorage.getItem('token');
    console.log("Fetching racks with token:", token ? "token present" : "no token");
    
    // Use axios directly with full headers specification
    const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/racks`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Validate that we got proper JSON data, not HTML
    if (typeof response.data === 'string' && response.data.includes('<!doctype html>')) {
      console.error("App: Received HTML instead of JSON - API error");
      dispatch(setRacks([])); // Set empty array instead of HTML
      return [];
    }
    
    // Validate that response.data is an array
    if (!Array.isArray(response.data)) {
      console.error("App: Response data is not an array:", typeof response.data);
      dispatch(setRacks([])); // Set empty array as fallback
      return [];
    }
    
    console.log("Racks data received:", response.data);
    console.log("Racks count:", response.data.length);
    
    // Debug the data structure
    if (response.data.length > 0) {
      console.log("First rack tanks:", response.data[0].tanks ? response.data[0].tanks.length : "no tanks array");
    }
    
    dispatch(setRacks(response.data));
    dispatch(setRacks(response.data));
    return response.data;
  } catch (error) {
    console.error('Error fetching racks:', error);
    dispatch(setRacks([])); // Set empty array on error
    return null;
  }
}, [dispatch]);

  // Your fetchUserInfo function stays the same
  const fetchUserInfo = useCallback(async () => {
    if (isAuthenticated) {
      try {
        const token = localStorage.getItem('token');
        console.log("Fetching user info with token:", token ? 
          `${token.substring(0, 15)}... (Length: ${token.length})` : 
          "no token");
        
        if (!token || token === "undefined" || token === "null") {
          console.error("Invalid token found in localStorage");
          handleLogout();
          return null;
        }
        
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/user`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log("User API response:", response.data);
        
        // Enhanced debugging for role processing
        let normalizedRole = null;
        
        if (response.data && response.data.role) {
          // Get the role from API response
          const rawRole = response.data.role;
          console.log("Raw role value from API:", rawRole, "Type:", typeof rawRole);
          
          // Normalize by converting to string and lowercase
          normalizedRole = String(rawRole).toLowerCase();
          console.log("Normalized role:", normalizedRole);
          
          // Set the user role in state with a setTimeout to ensure it completes
          // before the next render cycle
          setUserRole(normalizedRole);
          
          // Force an update after a short delay to ensure the role is applied
          if (normalizedRole === 'admin') {
            setTimeout(() => {
              console.log("Forcing admin role update");
              // Just set it again to trigger re-render
              setUserRole(normalizedRole);
            }, 100);
          }
          
          // Explicitly log admin status check
          console.log("Is admin?", normalizedRole === 'admin');
          
          // Store role in localStorage for persistence
          localStorage.setItem('userRole', normalizedRole);
        }
        
        return response.data;
      } catch (error) {
        console.error('Error fetching user info:', error);
        return null;
      }
    }
    return null;
  }, [isAuthenticated]);

  // Now this useEffect works because handleLogout is defined above
  useEffect(() => {
    const loadInitialData = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Force clear and reset any saved tabs to ensure fresh state
          localStorage.removeItem('activeTab');
          
          // Set auth state first
          setIsAuthenticated(true);
          
          // Get user info
          const userInfo = await fetchUserInfo();
          console.log("Loaded user info:", userInfo);
          
          if (userInfo) {
            // Set the role and tab based on user info
            if (userInfo.role) {
              const role = String(userInfo.role).toLowerCase();
              
              // Immediately set role without delay
              setUserRole(role);
              localStorage.setItem('userRole', role);
              
              // Set default tab based on role
              if (role === 'facility_manager') {
                setActiveTab('clinical');
                localStorage.setItem('activeTab', 'clinical');
              } else {
                setActiveTab('registry');
                localStorage.setItem('activeTab', 'registry');
              }
              
              // Force redraw for admin roles
              if (role === 'admin') {
                setTimeout(() => {
                  console.log("Forcing admin UI update");
                  setUserRole(role);
                }, 50);
              }
            }
            
            // Fetch racks data
            await fetchRacks();
            
            // Mark data as loaded
            setDataLoaded(true);
          } else {
            // Handle case where user info couldn't be loaded
            console.error("Failed to load user info");
            handleLogout(); // Log the user out if we can't get their info
          }
        } catch (error) {
          console.error("Error in loadInitialData:", error);
          handleLogout();
        }
      }
    };
    
    loadInitialData();
  }, [fetchRacks, fetchUserInfo, handleLogout]); // Add the missing dependencies

  // Role-based tab restriction
  useEffect(() => {
    if (userRole === 'facility_manager') {
      setActiveTab('clinical');
      localStorage.setItem('activeTab', 'clinical');
    } else if (userRole === 'admin' && activeTab === 'users') {
      // Ensure admin can stay on users tab
      setActiveTab('users');
      localStorage.setItem('activeTab', 'users');
    } else if (!['registry', 'breeding', 'clinical', 'users'].includes(activeTab)) {
      // Reset to default tab for other roles or invalid tabs
      setActiveTab('registry');
    }
  }, [userRole, activeTab]);

  useEffect(() => {
    // Re-fetch user info when app regains focus
    const handleFocus = () => {
      if (isAuthenticated) {
        fetchUserInfo();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, fetchUserInfo]); 

  // Add this effect to ensure tabs are updated when role changes
  useEffect(() => {
    if (userRole) {
      console.log("User role changed to:", userRole);
      
      // When role changes, update the tab accordingly if needed
      if (userRole === 'facility_manager' && activeTab !== 'clinical') {
        console.log("Setting tab to clinical for facility manager");
        setActiveTab('clinical');
      } else if (userRole === 'admin') {
        // For admins, make sure the Users tab is visible in next render
        console.log("Admin role detected, ensuring UI updates");
        setTimeout(() => {
          // Just force a small re-render to ensure tabs update
          setUserRole(prev => prev);
        }, 50);
      }
    }
  }, [userRole, activeTab]);

  // Modify your handleLoginSuccess function in App.js (around line 240)
const handleLoginSuccess = useCallback(async (token) => {
  if (!token) {
    console.error("No token provided to handleLoginSuccess");
    return;
  }
  
  console.log("Login success with token:", token.substring(0, 20) + "...");
  
  // Clear any previous state first
  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
  localStorage.removeItem('activeTab');
  
  // Store the token with proper formatting
  localStorage.setItem('token', token);
  
  try {
    // Set authenticated state immediately to avoid blank page
    setIsAuthenticated(true);
    
    // Small delay to ensure token is stored
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Make the API call to get user info - use a try-catch for each API call
    try {
      console.log("Fetching user info after login...");
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/user`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log("User API response on login:", response.data);
      
      if (response.data && response.data.role) {
        // Get the role directly from the API response
        const role = String(response.data.role).toLowerCase();
        console.log("Setting user role:", role);
        
        // Set userRole first before anything else
        setUserRole(role);
        localStorage.setItem('userRole', role);
        
        // Set proper tab based on role
        if (role === 'facility_manager') {
          setActiveTab('clinical');
          localStorage.setItem('activeTab', 'clinical');
        } else {
          setActiveTab('registry');
          localStorage.setItem('activeTab', 'registry');
        }
        
        console.log("User login setup complete");
      } else {
        console.error("No role found in user response");
        // Set default values to avoid blank page
        setActiveTab('registry');
        localStorage.setItem('activeTab', 'registry');
      }
    } catch (userError) {
      console.error("Error fetching user data:", userError);
      // Set default values to avoid blank page
      setActiveTab('registry');
      localStorage.setItem('activeTab', 'registry');
    }
    
    // Fetch racks in a separate try-catch
    try {
      console.log("Fetching racks after login...");
      await fetchRacks();
    } catch (racksError) {
      console.error("Error fetching racks:", racksError);
    }
    
    // Always set these states to avoid getting stuck
    setDataLoaded(true);
    console.log("Login flow completed successfully");
    
  } catch (error) {
    console.error("Error in handleLoginSuccess:", error);
    // Even if there's an error, set states to avoid blank page
    setIsAuthenticated(true);
    setDataLoaded(true);
    setActiveTab('registry');
    localStorage.setItem('activeTab', 'registry');
  }
  
  // Failsafe timeout - if something goes wrong, still show the app
  setTimeout(() => {
    console.log("Failsafe: Ensuring dataLoaded is true after timeout");
    setDataLoaded(true);
  }, 3000);
}, [fetchRacks, setActiveTab, setDataLoaded, setIsAuthenticated, setUserRole]);

  // Remove the handleLogout definition that was here

  // Add this function definition after your state declarations but before the useEffect hooks
// Around line 65, after your existing function declarations

const handleTabChange = useCallback((event, newTab) => {
  // Check if the user has permission to access this tab
  if (userRole === 'facility_manager' && newTab !== 'clinical') {
    // Facility managers can only access the clinical tab
    return;
  }
  
  // Check if the user has permission for the users tab
  if (newTab === 'users' && (!userRole || userRole.toLowerCase() !== 'admin')) {
    // Only admins can access the users tab
    return;
  }
  
  // Update the active tab
  setActiveTab(newTab);
  
  // Save the active tab in localStorage
  localStorage.setItem('activeTab', newTab);
  
  console.log(`Tab changed to: ${newTab}`);
}, [userRole]);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/user`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // If the API response includes is_super_admin, use that
        if ('is_super_admin' in response.data) {
          setIsSuperAdmin(response.data.is_super_admin);
        } else {
          // Otherwise use SQL query through a separate endpoint
          // (You'd need to create this endpoint)
          const superCheck = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/check-super-admin`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          setIsSuperAdmin(superCheck.data.is_super_admin);
        }
      } catch (error) {
        console.error('Error checking super admin status', error);
      }
    };
    
    checkUserRole();
  }, []);

  // Your rendering logic stays the same
  if (!isAuthenticated) {
    return (
      <Container maxWidth="lg">
        <Login onLoginSuccess={handleLoginSuccess} />
      </Container>
    );
  }

  // Show loading state while data is being fetched
  if (!dataLoaded) {
    return (
      <>
        <Header onLogout={handleLogout} />
        <Container maxWidth="lg">
          <Box sx={{ my: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h3" component="h1" gutterBottom>
              Zebrafish Facility Management
            </Typography>
            <Typography variant="h5">
              Loading data...
            </Typography>
            {/* Add a fallback button in case loading gets stuck */}
            <Button 
              variant="outlined" 
              onClick={() => setDataLoaded(true)}
              sx={{ mt: 2 }}
            >
              Continue Anyway
            </Button>
          </Box>
        </Container>
      </>
    );
  }
  
  console.log("RENDERING: Current user role:", userRole, "Active Tab:", activeTab);

  const renderTabs = () => {
    try {
      const normalizedRole = userRole ? String(userRole).toLowerCase() : '';
      console.log("Rendering tabs with role:", normalizedRole);
      
      if (normalizedRole === 'admin') {
        console.log("Showing admin tabs");
        return [
          <Tab key="registry" value="registry" label="Tank Registry" />,
          <Tab key="breeding" value="breeding" label="Breeding Management" />,
          <Tab key="clinical" value="clinical" label="Clinical Management" />,
          <Tab key="users" value="users" label="User Management" />
        ];
      } else if (normalizedRole === 'facility_manager') {
        return [<Tab key="clinical" value="clinical" label="Clinical Management" />];
      } else {
        return [
          <Tab key="registry" value="registry" label="Tank Registry" />,
          <Tab key="breeding" value="breeding" label="Breeding Management" />,
          <Tab key="clinical" value="clinical" label="Clinical Management" />
        ];
      }
    } catch (error) {
      console.error("Error in renderTabs:", error);
      return [<Tab key="registry" value="registry" label="Tank Registry" />];
    }
  };

  // Show main application with routing
  return (
    <>
      <Routes>
        {/* Super Admin Route - Special handling */}
        <Route 
          path="/super-admin" 
          element={
            <SuperAdminGuard>
              <SuperAdminPage handleLogout={handleLogout} />
            </SuperAdminGuard>
          } 
        />
        
        {/* Login route with possible redirect parameter */}
        <Route 
          path="/login" 
          element={
            !isAuthenticated ? (
              <Login onLoginSuccess={handleLoginSuccess} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        
        {/* Subscription management route */}
        <Route 
          path="/subscription-management" 
          element={
            isAuthenticated && userRole === 'admin' 
              ? <SubscriptionPage onLogout={handleLogout} /> 
              : <Navigate to="/" replace />
          } 
        />
        
        {/* Payment return route */}
        <Route 
          path="/payment-return" 
          element={
            isAuthenticated 
              ? <PaymentReturnPage onLogout={handleLogout} /> 
              : <Navigate to="/" replace />
          } 
        />
        
        {/* Main application route */}
        <Route path="/" element={
          isAuthenticated ? (
            <ErrorBoundary>
              {console.log('Rendering main app - isAuthenticated:', isAuthenticated, 'userRole:', userRole, 'activeTab:', activeTab)}
              {isAuthenticated && <Header onLogout={handleLogout} isSuperAdmin={isSuperAdmin} />}
              {isAuthenticated && <SubscriptionAlert />}
              <Container 
                maxWidth={false} // Important: remove the maxWidth constraint
                disableGutters={true} // Remove default padding
                sx={{
                  px: 1, // Minimal padding
                  width: '88vw', // Full viewport width
                  maxWidth: '100vw', // Ensure no constraints
                  overflowX: 'hidden' // Prevent horizontal scrolling
                }}
              >
                <Box sx={{ my: 4 }}>
                  {/* Header row with title and subscription button */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    mb: 3 
                  }}>
                    <Typography variant="h3" component="h1" gutterBottom sx={{ mb: 0 }}>
                      Zebrafish Facility Management
                    </Typography>
                    
                    {/* Subscription management button for admins */}
                    {userRole && userRole.toLowerCase() === 'admin' && (
                      <Button 
                        variant="contained"
                        color="primary"
                        onClick={() => navigate('/subscription-management')}
                        startIcon={<span role="img" aria-label="subscription">📅</span>}
                        size="medium"
                      >
                        Manage Subscription
                      </Button>
                    )}
                  </Box>
                  
                  <Tabs 
                    value={activeTab}
                    onChange={handleTabChange}
                    sx={{ mb: 3 }}
                  >
                    {renderTabs()}
                  </Tabs>
                  
                  <TabReset activeTab={activeTab} setActiveTab={setActiveTab} />
                  
                  {/* Render content based on active tab */}
                  {activeTab === 'registry' && <RackList />}
                  {activeTab === 'breeding' && <BreedingManagement />}
                  {activeTab === 'clinical' && <ClinicalManagement />}
                  {activeTab === 'users' && (userRole && userRole.toLowerCase() === 'admin') && <UserManagement />}
                </Box>
              </Container>
            </ErrorBoundary>
          ) : (
            <Navigate to="/login" replace />
          )
        }/>
      </Routes>
    </>
  );
};

export default App;
