import React, { useState, useEffect } from 'react';
import { 
  Badge, IconButton, Menu, MenuItem, ListItemText, 
  Typography, Divider, Box, Button, List, ListItem,
  ListItemIcon 
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  MedicalServices as MedicalIcon,
  Comment as CommentIcon,
  CheckCircleOutline as ReadIcon
} from '@mui/icons-material';
import axios from 'axios';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { limit: 10 }
      });
      
      // Add null checks to handle unexpected API response format
      if (response.data && Array.isArray(response.data.notifications)) {
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unread_count || 0);
      } else if (Array.isArray(response.data)) {
        // Handle case where API might return an array directly
        setNotifications(response.data);
        setUnreadCount(response.data.filter(n => !n.is_read).length);
      } else {
        // Default to empty array if unexpected format
        console.error('Unexpected notification data format:', response.data);
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      // Set default values on error
      setNotifications([]);
      setUnreadCount(0);
    }
  };
  
  useEffect(() => {
    fetchNotifications();
    
    // Poll for new notifications every minute
    const intervalId = setInterval(fetchNotifications, 60000);
    return () => clearInterval(intervalId);
  }, []);
  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        const token = localStorage.getItem('token');
        await axios.post(
          `http://localhost:5000/api/notifications/${notification.id}/read`,
          {},
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        // Update local state
        setNotifications(notifications.map(n => 
          n.id === notification.id ? { ...n, is_read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }
    
    // Navigate to the appropriate view based on notification type
    if (notification.category === 'case_opened' || notification.category === 'note_added') {
      window.location.hash = "#/clinical-management";
      // You could also navigate to specific case with something like:
      // window.location.hash = `#/clinical-management/case/${notification.reference_id}`;
    }
    
    handleMenuClose();
  };
  
  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/notifications/read-all',
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      // Update local state
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };
  
  const getNotificationIcon = (category) => {
    switch (category) {
      case 'case_opened':
        return <MedicalIcon color="error" />;
      case 'note_added':
        return <CommentIcon color="primary" />;
      default:
        return <NotificationsIcon color="action" />;
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <>
      <IconButton 
        color="inherit" 
        onClick={handleMenuOpen}
        aria-label="notifications"
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          style: {
            width: 320,
            maxHeight: 400,
          }
        }}
      >
        <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notifications</Typography>
          {unreadCount > 0 && (
            <Button 
              size="small" 
              onClick={handleMarkAllRead}
              color="primary"
            >
              Mark all as read
            </Button>
          )}
        </Box>
        <Divider />
        
        {notifications.length === 0 ? (
          <MenuItem disabled>
            <Typography variant="body2" color="textSecondary" sx={{ py: 1 }}>
              No notifications
            </Typography>
          </MenuItem>
        ) : (
          <List sx={{ width: '100%', p: 0 }}>
            {notifications.map((notification) => (
              <ListItem 
                key={notification.id}
                alignItems="flex-start"
                onClick={() => handleNotificationClick(notification)}
                sx={{ 
                  borderLeft: notification.is_read ? 'none' : '3px solid #1976d2',
                  bgcolor: notification.is_read ? 'transparent' : 'rgba(25, 118, 210, 0.08)',
                  cursor: 'pointer'
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {getNotificationIcon(notification.category)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body1" sx={{ fontWeight: notification.is_read ? 'normal' : 'bold' }}>
                      {notification.message}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="caption" component="span" display="block">
                        {formatDate(notification.created_at)}
                      </Typography>
                    </>
                  }
                />
                {notification.is_read && (
                  <ReadIcon color="action" sx={{ fontSize: 16, opacity: 0.5, ml: 1 }} />
                )}
              </ListItem>
            ))}
          </List>
        )}
      </Menu>
    </>
  );
};

export default NotificationCenter;