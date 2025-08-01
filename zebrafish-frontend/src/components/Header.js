import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import NotificationCenter from './NotificationCenter';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { Link } from 'react-router-dom';

// Add a prop to check if the user is a super admin
const Header = ({ onLogout, isSuperAdmin }) => {
  const handleLogout = () => {
    localStorage.removeItem('token');
    onLogout();
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Zebrafish Facility
        </Typography>
        
        {/* Add Super Admin link if user has privileges */}
        {isSuperAdmin && (
          <Button 
            color="inherit" 
            component={Link} 
            to="/super-admin"
            sx={{ mr: 2 }}
          >
            Super Admin Panel
          </Button>
        )}
        
        <Box display="flex" alignItems="center">
          <NotificationCenter />
          <Button 
            color="inherit" 
            onClick={handleLogout}
            startIcon={<ExitToAppIcon />}
          >
            Log Out
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;