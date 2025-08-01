import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon, 
  Add as AddIcon, 
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { setPlans, setError, setLoading } from '../../store/breedingSlice';
import BreedingPlanDialog from './BreedingPlanDialog';
import BreedingPlanSearch from './BreedingPlanSearch';

// Helper function to properly format dates
const formatBreedingDate = (dateString) => {
  if (!dateString) return '';
  
  // Create a date from the string and adjust for timezone
  const date = new Date(dateString);
  // Add the timezone offset to ensure we display the correct day
  date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
  return date.toLocaleDateString();
};

const BreedingPlanList = ({ profile, onBack }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [availableTanks, setAvailableTanks] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [planToEdit, setPlanToEdit] = useState(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [newBreedingDate, setNewBreedingDate] = useState('');
  const [filteredPlans, setFilteredPlans] = useState(null);
  const [searchActive, setSearchActive] = useState(false);
  const dispatch = useDispatch();
  const { plans, loading } = useSelector(state => state.breeding);

  // Debug profile data
  console.log('🔧 DEBUG: Profile data in BreedingPlanList:', profile);

  useEffect(() => {
    if (profile && profile.id) {
      console.log('🔧 DEBUG: Fetching plans for profile ID:', profile.id);
      fetchPlans(profile.id);
      fetchTanks();
    } else {
      console.error('🔧 DEBUG: Profile is missing or has no ID:', profile);
    }
  }, [profile.id, dispatch]);

  const fetchPlans = async (profileId) => {
    dispatch(setLoading(true));
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/breeding/plans?profile_id=${profileId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      dispatch(setPlans(response.data));
    } catch (err) {
      console.error('Error fetching plans:', err);
      dispatch(setError(err.response?.data?.message || 'Failed to fetch breeding plans'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const fetchTanks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/racks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const tanks = response.data.flatMap(rack => 
        rack.tanks.map(tank => ({
          ...tank,
          rackName: rack.name,
          rackLabId: rack.lab_id
        }))
      );
      setAvailableTanks(tanks);
    } catch (err) {
      console.error('Error fetching tanks:', err);
    }
  };

  const handleDeletePlan = async (planId, event) => {
    event.stopPropagation(); // Prevent opening the plan when clicking delete
    if (!window.confirm('Are you sure you want to delete this breeding plan?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/breeding/plans/${planId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Update the local state to remove the deleted plan
      dispatch(setPlans(plans.filter(plan => plan.id !== planId)));
    } catch (err) {
      console.error('Error deleting plan:', err);
      dispatch(setError(err.response?.data?.message || 'Failed to delete breeding plan'));
    }
  };

  const handleSavePlan = async (planData) => {
    try {
      console.log('🔧 DEBUG: Starting breeding plan creation with data:', planData);
      
      const dataWithProfile = {
        ...planData,
        profile_id: profile.id
      };
      
      console.log('🔧 DEBUG: Data with profile:', dataWithProfile);
      console.log('🔧 DEBUG: API URL:', `${process.env.REACT_APP_API_BASE_URL}/breeding/plans`);

      const token = localStorage.getItem('token');
      console.log('🔧 DEBUG: Token present:', token ? 'YES' : 'NO');
      
      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/breeding/plans`, dataWithProfile, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('🔧 DEBUG: Breeding plan creation response:', response.data);
      console.log('🔧 DEBUG: Response status:', response.status);
      
      fetchPlans(profile.id);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('🔧 DEBUG: Error creating breeding plan:', error);
      console.error('🔧 DEBUG: Error response:', error.response?.data);
      console.error('🔧 DEBUG: Error status:', error.response?.status);
      
      // Show user-friendly error message
      if (error.response?.data?.message) {
        alert(`Failed to create breeding plan: ${error.response.data.message}`);
      } else {
        alert('Failed to create breeding plan. Please check the console for details and try again.');
      }
    }
  };

  const handleUpdatePlan = async (planData) => {
    if (!planToEdit) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/breeding/plans/${planToEdit.id}`,
        planData,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      fetchPlans(profile.id);
      setEditMode(false);
      setPlanToEdit(null);
      setViewDialogOpen(false);
    } catch (error) {
      console.error('Error updating breeding plan:', error);
    }
  };

  const handleViewPlan = (plan) => {
    setSelectedPlan(plan);
    // Fetch fresh tank data before showing the view dialog
    fetchTanks().then(() => {
      // Fetch fresh plan data to ensure we have latest breeding results
      const token = localStorage.getItem('token');
      axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/breeding/plans/${plan.id}`, 
        { headers: { 'Authorization': `Bearer ${token}` } }
      ).then(response => {
        setSelectedPlan(response.data);  // Use the fresh data
        setViewDialogOpen(true);
      }).catch(err => {
        console.error("Error fetching plan details:", err);
        // Fallback to using the existing plan data
        setViewDialogOpen(true);
      });
    });
  };

  const handleEditPlan = (plan) => {
    console.log("Editing plan:", plan);
    
    // First, verify we have the plan data
    if (!plan || !plan.crosses || !plan.crosses.length) {
      console.error("Invalid plan data for editing:", plan);
      return;
    }
    
    // Ensure tanks are loaded before editing
    setLoading(true);
    fetchTanks()
      .then(() => {
        console.log("Tanks loaded, count:", availableTanks.length);
        if (availableTanks.length === 0) {
          console.error("No tanks available for editing");
          alert("Error: Could not load tank data for editing");
          return;
        }
        
        setSelectedPlan(plan);
        setPlanToEdit(plan);
        
        // Short delay to ensure state updates before opening dialog
        setTimeout(() => {
          setEditMode(true);
        }, 100);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleCopyPlan = async () => {
    if (!selectedPlan || !newBreedingDate) return;
    
    try {
      // Create a new plan with the same crosses but different date
      const newPlanData = {
        profile_id: profile.id,
        breeding_date: newBreedingDate,
        crosses: selectedPlan.crosses.map(cross => ({
          tank1: {
            id: cross.tank1_id,
            males: cross.tank1_males,
            females: cross.tank1_females
          },
          tank2: {
            id: cross.tank2_id,
            males: cross.tank2_males,
            females: cross.tank2_females
          }
        }))
      };
      
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/breeding/plans`, 
        newPlanData,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      setCopyDialogOpen(false);
      setNewBreedingDate('');
      fetchPlans(profile.id);
    } catch (error) {
      console.error('Error copying breeding plan:', error);
    }
  };

  const getPlanDetails = () => {
    if (!selectedPlan || !selectedPlan.crosses) return null;

    // Find tank details for each tank in crosses
    const crossesWithDetails = selectedPlan.crosses.map(cross => {
      // Ensure IDs are compared as numbers
      const tank1Id = typeof cross.tank1_id === 'string' ? parseInt(cross.tank1_id, 10) : cross.tank1_id;
      const tank2Id = typeof cross.tank2_id === 'string' ? parseInt(cross.tank2_id, 10) : cross.tank2_id;
      
      // Use defensive coding to prevent undefined access errors
      const tank1 = availableTanks.find(t => t && t.id === tank1Id);
      const tank2 = availableTanks.find(t => t && t.id === tank2Id);
      
      return {
        ...cross,
        tank1: tank1 
          ? `${tank1.rackName} / ${tank1.position} - ${tank1.line || 'Unknown'}` 
          : `Unknown Tank (ID: ${tank1Id})`,
        tank2: tank2 
          ? `${tank2.rackName} / ${tank2.position} - ${tank2.line || 'Unknown'}` 
          : `Unknown Tank (ID: ${tank2Id})`,
        tank1_males: cross.tank1_males || 0,
        tank1_females: cross.tank1_females || 0,
        tank2_males: cross.tank2_males || 0,
        tank2_females: cross.tank2_females || 0
      };
    });

    return crossesWithDetails;
  };

  // Convert plan to format expected by BreedingPlanDialog
  const convertPlanToDialogFormat = (plan) => {
    if (!plan) {
      console.error("No plan provided to convertPlanToDialogFormat");
      return null;
    }
    
    // Make sure breeding_date is in YYYY-MM-DD format
    const breedingDate = typeof plan.breeding_date === 'string' 
      ? plan.breeding_date.split('T')[0] // Extract just the date part from ISO string
      : '';
      
    console.log("Plan before conversion:", plan);
    console.log("availableTanks count:", availableTanks.length);
    
    const result = {
      breeding_date: breedingDate,
      crosses: plan.crosses.map(cross => {
        // Find the corresponding tanks
        const tank1 = availableTanks.find(t => t && t.id === cross.tank1_id);
        const tank2 = availableTanks.find(t => t && t.id === cross.tank2_id);
        
        console.log("Cross mapping:", { 
          crossId: cross.id, 
          tank1Id: cross.tank1_id,
          tank2Id: cross.tank2_id,
          foundTank1: !!tank1,
          foundTank2: !!tank2,
          breedingResult: cross.breeding_result // Log this to debug
        });
        
        if (!tank1 || !tank2) {
          console.warn("Could not find tank:", !tank1 ? `tank1_id: ${cross.tank1_id}` : `tank2_id: ${cross.tank2_id}`);
        }
        
        return {
          rack1: tank1 ? tank1.rackName : '',
          tank1: cross.tank1_id,
          tank1Fish: {
            male: parseInt(cross.tank1_males) || 0,
            female: parseInt(cross.tank1_females) || 0
          },
          rack2: tank2 ? tank2.rackName : '',
          tank2: cross.tank2_id,
          tank2Fish: {
            male: parseInt(cross.tank2_males) || 0,
            female: parseInt(cross.tank2_females) || 0
          },
          breedingResult: cross.breeding_result // Ensure this is included
        };
      })
    };
    
    console.log("Converted plan:", result);
    return result;
  };

  const handleSearch = (searchParams) => {
    setSearchActive(true);
    
    // Client-side filtering
    const filtered = plans.filter(plan => {
      // Date range filter
      if (searchParams.dateFrom && new Date(plan.breeding_date) < new Date(searchParams.dateFrom)) {
        return false;
      }
      
      if (searchParams.dateTo && new Date(plan.breeding_date) > new Date(searchParams.dateTo)) {
        return false;
      }
      
      // For tank line and position, we need to check all crosses
      if (searchParams.tankLine || searchParams.tankPosition) {
        const hasTankMatch = plan.crosses.some(cross => {
          const tank1 = availableTanks.find(t => t && t.id === cross.tank1_id);
          const tank2 = availableTanks.find(t => t && t.id === cross.tank2_id);
          
          // Check if line matches in either tank
          if (searchParams.tankLine && 
              !(tank1?.line === searchParams.tankLine || tank2?.line === searchParams.tankLine)) {
            return false;
          }
          
          // Check if position matches in either tank
          if (searchParams.tankPosition && 
              !(tank1?.position === searchParams.tankPosition || tank2?.position === searchParams.tankPosition)) {
            return false;
          }
          
          return true;
        });
        
        if (!hasTankMatch) return false;
      }
      
      // Breeding result filter
      if (searchParams.breedingResult) {
        const resultValue = searchParams.breedingResult === 'null' ? null : 
                            searchParams.breedingResult === 'true';
                            
        const hasResultMatch = plan.crosses.some(cross => 
          cross.breeding_result === resultValue
        );
        
        if (!hasResultMatch) return false;
      }
      
      return true;
    });
    
    setFilteredPlans(filtered);
  };

  const handleClearSearch = () => {
    setSearchActive(false);
    setFilteredPlans(null);
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={onBack}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4">{profile.name}</Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsDialogOpen(true)}
        >
          Create Breeding Plan
        </Button>
      </Box>
      
      {/* Add search component */}
      <BreedingPlanSearch 
        onSearch={handleSearch} 
        onClear={handleClearSearch}
        availableTanks={availableTanks}
      />
      
      {searchActive && (
        <Box sx={{ mb: 2 }}>
          <Typography>
            Found {filteredPlans?.length || 0} breeding plans matching your search criteria
            {filteredPlans?.length === 0 && (
              <Button 
                sx={{ ml: 2 }} 
                size="small" 
                variant="outlined" 
                onClick={handleClearSearch}
              >
                Clear Search
              </Button>
            )}
          </Typography>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (searchActive ? filteredPlans : plans)?.length > 0 ? (
        <Grid container spacing={3}>
          {(searchActive ? filteredPlans : plans).map(plan => (
            <Grid item xs={12} md={6} lg={4} key={plan.id}>
              <Paper 
                sx={{ 
                  p: 2, 
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 3 }
                }}
                onClick={() => handleViewPlan(plan)}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6">
                    Breeding Date: {formatBreedingDate(plan.breeding_date)}
                  </Typography>
                  <IconButton 
                    color="error" 
                    size="small"
                    onClick={(e) => handleDeletePlan(plan.id, e)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    {plan.crosses?.length || 0} crosses
                  </Typography>
                  <Box>
                    <IconButton size="small" color="primary" onClick={(e) => {
                      e.stopPropagation();
                      handleEditPlan(plan);
                    }}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="primary">
                      <VisibilityIcon />
                    </IconButton>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ textAlign: 'center', my: 4 }}>
          <Typography variant="body1">
            {searchActive ? 'No breeding plans match your search criteria.' : 'No breeding plans found. Create one to get started.'}
          </Typography>
        </Box>
      )}

      {/* Create Plan Dialog */}
      <BreedingPlanDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSavePlan}
        availableTanks={availableTanks}
      />

      {/* Edit Plan Dialog */}
      {editMode && planToEdit && (
        <BreedingPlanDialog
          key={`edit-${planToEdit.id}`} // Add key to force remount with new data
          open={editMode}
          onClose={() => {
            setEditMode(false);
            setPlanToEdit(null);
          }}
          onSave={handleUpdatePlan}
          availableTanks={availableTanks}
          initialPlan={convertPlanToDialogFormat(planToEdit)}
        />
      )}

      {/* View Plan Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Breeding Plan Details - {selectedPlan && formatBreedingDate(selectedPlan.breeding_date)}
        </DialogTitle>
        <DialogContent>
          {selectedPlan && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1">
                  Created: {selectedPlan && new Date(selectedPlan.created_at).toLocaleString()}
                </Typography>
                <Box>
                  <Button 
                    startIcon={<EditIcon />} 
                    onClick={() => handleEditPlan(selectedPlan)}
                    sx={{ mr: 1 }}
                  >
                    Edit Plan
                  </Button>
                  <Button 
                    startIcon={<CopyIcon />} 
                    onClick={() => setCopyDialogOpen(true)}
                  >
                    Copy Plan
                  </Button>
                </Box>
              </Box>
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Crosses</Typography>
              {getPlanDetails()?.map((cross, idx) => (
                <Paper key={cross.id || idx} sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle1">Cross {idx + 1}</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2">
                        <strong>Tank 1:</strong> {cross.tank1}
                      </Typography>
                      <Typography variant="body2">
                        Males: {cross.tank1_males}, Females: {cross.tank1_females}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2">
                        <strong>Tank 2:</strong> {cross.tank2}
                      </Typography>
                      <Typography variant="body2">
                        Males: {cross.tank2_males}, Females: {cross.tank2_females}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Breeding Result</InputLabel>
                          <Select
                            value={cross.breeding_result !== null ? cross.breeding_result.toString() : ''}
                            label="Breeding Result"
                            onChange={(e) => {
                              const value = e.target.value;
                              const breedingResult = value === '' ? null : value === 'true';
                              
                              // Update local state immediately for UI feedback
                              setSelectedPlan(prevPlan => {
                                if (!prevPlan) return prevPlan;
                                
                                const updatedPlan = {...prevPlan};
                                updatedPlan.crosses = updatedPlan.crosses.map(c => {
                                  if (c.id === cross.id) {
                                    return {...c, breeding_result: breedingResult};
                                  }
                                  return c;
                                });
                                return updatedPlan;
                              });
                            }}
                          >
                            <MenuItem value="">Unknown</MenuItem>
                            <MenuItem value="true">Successful</MenuItem>
                            <MenuItem value="false">Failed</MenuItem>
                          </Select>
                        </FormControl>
                        <Button 
                          variant="contained" 
                          color="primary" 
                          size="small"
                          onClick={() => {
                            // Get the current value from the select
                            const breedingResult = cross.breeding_result;
                            
                            // Call API to update just this cross
                            const token = localStorage.getItem('token');
                            axios.patch(
                              `${process.env.REACT_APP_API_BASE_URL}/breeding/crosses/${cross.id}`, 
                              { breedingResult: breedingResult },
                              { headers: { 'Authorization': `Bearer ${token}` } }
                            ).then(() => {
                              // Update Redux store by fetching fresh data
                              fetchPlans(profile.id);
                              
                              // Show success message
                              alert("Breeding result saved successfully!");
                            }).catch(err => {
                              console.error("Error updating breeding result:", err);
                              alert("Failed to save breeding result. Please try again.");
                            });
                          }}
                        >
                          Save Result
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Copy Plan Dialog */}
      <Dialog 
        open={copyDialogOpen} 
        onClose={() => setCopyDialogOpen(false)}
      >
        <DialogTitle>Copy Breeding Plan</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            This will create a new breeding plan with the same crosses but on a different date.
          </Typography>
          <TextField
            label="New Breeding Date"
            type="date"
            fullWidth
            value={newBreedingDate}
            onChange={(e) => setNewBreedingDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCopyDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCopyPlan} 
            variant="contained" 
            disabled={!newBreedingDate}
          >
            Copy Plan
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BreedingPlanList;
