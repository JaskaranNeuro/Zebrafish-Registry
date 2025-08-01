import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';
import { setProfiles, setError, setLoading } from '../../store/breedingSlice';

const ProfileList = ({ onSelectProfile }) => {
  const dispatch = useDispatch();
  const { profiles, loading, error } = useSelector(state => state.breeding);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [profileToEdit, setProfileToEdit] = useState(null);
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    const fetchProfiles = async () => {
      dispatch(setLoading(true));
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/breeding/profiles`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Validate that we got proper JSON data, not HTML
        if (typeof response.data === 'string' && response.data.includes('<!doctype html>')) {
          console.error("ProfileList: Received HTML instead of JSON - API error");
          dispatch(setProfiles([])); // Set empty array instead of HTML
          return;
        }
        
        // Validate that response.data is an array
        if (!Array.isArray(response.data)) {
          console.error("ProfileList: Response data is not an array:", typeof response.data);
          dispatch(setProfiles([])); // Set empty array as fallback
          return;
        }
        
        dispatch(setProfiles(response.data));
      } catch (err) {
        console.error('Error fetching profiles:', err);
        
        // Check for authentication errors
        if (err.response?.status === 422 && 
            (err.response?.data?.message === 'Signature verification failed' ||
             err.response?.data?.message?.includes('signature'))) {
          console.log('🔧 DEBUG: Token expired in ProfileList, letting global interceptor handle it');
          // Global interceptor will handle this
          return;
        }
        
        dispatch(setError(err.response?.data?.message || 'Failed to fetch profiles'));
      } finally {
        dispatch(setLoading(false));
      }
    };

    fetchProfiles();
  }, [dispatch]);

  const handleDeleteProfile = async (profileId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/breeding/profiles/${profileId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      dispatch(setProfiles(profiles.filter(p => p.id !== profileId)));
    } catch (err) {
      console.error("Error deleting profile:", err);
      dispatch(setError(err.response?.data?.message || 'Failed to delete profile'));
    }
  };

  const handleEditClick = (profile, e) => {
    e.stopPropagation();
    setProfileToEdit(profile);
    setEditedName(profile.name);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!profileToEdit) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/breeding/profiles/${profileToEdit.id}`,
        { name: editedName },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      // Update profiles in Redux store
      const updatedProfiles = profiles.map(p => 
        p.id === profileToEdit.id ? {...p, name: editedName} : p
      );
      dispatch(setProfiles(updatedProfiles));
      
      setEditDialogOpen(false);
      setProfileToEdit(null);
    } catch (err) {
      console.error('Error updating profile:', err);
      dispatch(setError(err.response?.data?.message || 'Failed to update profile'));
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" sx={{ p: 2 }}>
        {error}
      </Typography>
    );
  }

  // Add safety check to ensure profiles is an array
  if (!Array.isArray(profiles)) {
    console.error("ProfileList render: profiles is not an array:", typeof profiles);
    return (
      <Typography color="error" sx={{ p: 2 }}>
        Invalid data format received. Please refresh the page.
      </Typography>
    );
  }

  if (!profiles.length) {
    return (
      <Typography sx={{ p: 2 }}>
        No breeding profiles found. Create one to get started.
      </Typography>
    );
  }

  return (
    <>
      <Grid container spacing={3}>
        {profiles.map((profile) => (
          <Grid item xs={12} md={6} lg={4} key={profile.id}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                '&:hover': { boxShadow: 6 }
              }}
              onClick={() => onSelectProfile(profile)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">{profile.name}</Typography>
                  <Box>
                    <Tooltip title="Edit Profile">
                      <IconButton 
                        size="small"
                        onClick={(e) => handleEditClick(profile, e)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Profile">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProfile(profile.id);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                <Typography color="textSecondary">
                  Created: {new Date(profile.created_at).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Profile Name"
            fullWidth
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveEdit} 
            variant="contained"
            disabled={!editedName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ProfileList;
