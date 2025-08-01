import React, { useState } from 'react';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tabs, Tab } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { setProfiles, setError } from '../../store/breedingSlice';
import ProfileList from './ProfileList';
import BreedingPlanList from './BreedingPlanList';
import TankBreedingStats from './TankBreedingStats';
import BreedingCalendar from './BreedingCalendar';

const BreedingManagement = () => {
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('profiles');
  const dispatch = useDispatch();

  const handleCreateProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('`${process.env.REACT_APP_API_BASE_URL}/breeding/profiles', 
        { name: newProfileName },
        { headers: { 'Authorization': `Bearer ${token}` }}
      );

      // Update profiles in Redux store
      const profilesResponse = await axios.get('`${process.env.REACT_APP_API_BASE_URL}/breeding/profiles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      dispatch(setProfiles(profilesResponse.data));

      setIsProfileDialogOpen(false);
      setNewProfileName('');
    } catch (err) {
      console.error('Error creating profile:', err);
      dispatch(setError(err.response?.data?.message || 'Failed to create profile'));
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSelectedProfile(null);  // Reset selected profile when changing tabs
  };

  return (
    <Box sx={{ width: '100%', mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Breeding Management</Typography>
        {activeTab === 'profiles' && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsProfileDialogOpen(true)}
          >
            Create Profile
          </Button>
        )}
      </Box>

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Breeding Profiles" value="profiles" />
        <Tab label="Tank Breeding Statistics" value="stats" />
        <Tab label="Eggs/Fish Request Calendar" value="calendar" />
      </Tabs>

      <Dialog open={isProfileDialogOpen} onClose={() => setIsProfileDialogOpen(false)}>
        <DialogTitle>Create New Profile</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Profile Name"
            fullWidth
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsProfileDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateProfile} 
            variant="contained"
            disabled={!newProfileName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {activeTab === 'profiles' ? (
        selectedProfile ? (
          <BreedingPlanList 
            profile={selectedProfile} 
            onBack={() => setSelectedProfile(null)}
          />
        ) : (
          <ProfileList
            onSelectProfile={setSelectedProfile}
          />
        )
      ) : activeTab === 'stats' ? (
        <TankBreedingStats />
      ) : activeTab === 'calendar' ? (
        <BreedingCalendar />
      ) : null}
    </Box>
  );
};

export default BreedingManagement;