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
        const response = await axios.get('http://localhost:5000/api/breeding/profiles', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        dispatch(setProfiles(response.data));
      } catch (err) {
        console.error('Error fetching profiles:', err);
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
      await axios.delete(`http://localhost:5000/api/breeding/profiles/${profileId}`, {
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
        `http://localhost:5000/api/breeding/profiles/${profileToEdit.id}`,
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