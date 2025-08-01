import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Box,
  Alert
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

// Add helper function at the top of your component to get fish counts by gender
const getFishCountByGender = (tank, gender) => {
  if (!tank || !tank.subdivisions) return 0;
  
  return tank.subdivisions.reduce((sum, sub) => {
    if (sub.gender?.toUpperCase() === gender) {
      return sum + (parseInt(sub.count) || 0);
    }
    return sum;
  }, 0);
};

// Define this outside the component to prevent recreation on each render
const DEFAULT_CROSS = {
  rack1: '',
  tank1: '',
  tank1Fish: { male: 0, female: 0 },
  rack2: '',
  tank2: '',
  tank2Fish: { male: 0, female: 0 },
  breedingResult: null  // null = unknown, true = successful, false = failed
};

const BreedingPlanDialog = ({ open, onClose, onSave, availableTanks = [], initialPlan = null }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [error, setError] = useState(null);
  const [crosses, setCrosses] = useState([{...DEFAULT_CROSS}]);

  // Initialize with values from initialPlan if provided (for editing mode)
  useEffect(() => {
    if (open && initialPlan) {
      console.log("Received initialPlan:", initialPlan);
      // Set the date
      setSelectedDate(initialPlan.breeding_date);
      
      // Clear any previous error
      setError(null);
      
      // Initialize crosses if they exist
      if (initialPlan.crosses && initialPlan.crosses.length) {
        const mappedCrosses = initialPlan.crosses.map(cross => {
          // Debug each cross object
          console.log("Processing cross for edit:", cross);
          
          return {
            rack1: cross.rack1 || '',
            tank1: cross.tank1 || '',
            tank1Fish: {
              male: typeof cross.tank1Fish?.male === 'number' ? cross.tank1Fish.male : 0,
              female: typeof cross.tank1Fish?.female === 'number' ? cross.tank1Fish.female : 0
            },
            rack2: cross.rack2 || '',
            tank2: cross.tank2 || '',
            tank2Fish: {
              male: typeof cross.tank2Fish?.male === 'number' ? cross.tank2Fish.male : 0,
              female: typeof cross.tank2Fish?.female === 'number' ? cross.tank2Fish.female : 0
            },
            breedingResult: cross.breedingResult // Make sure this is included
          };
        });
        
        console.log("Setting crosses to:", mappedCrosses);
        setCrosses(mappedCrosses);
      }
    } else if (open) {
      // Reset for new plan creation
      setSelectedDate('');
      setCrosses([{...DEFAULT_CROSS}]);
      setError(null);
    }
  }, [open, initialPlan]);

  // Create a mapping from rack name to the tanks in that rack
  const rackMap = useMemo(() => {
    return availableTanks.reduce((acc, tank) => {
      if (!tank || !tank.rackName) return acc;
      
      const rackName = tank.rackName;
      if (!acc[rackName]) {
        acc[rackName] = [];
      }
      acc[rackName].push(tank);
      return acc;
    }, {});
  }, [availableTanks]);

  useEffect(() => {
    // Debug rackMap after it's created
    if (open && initialPlan) {
      console.log("Available racks for tanks:", Object.keys(rackMap));
      console.log("First rack contents:", rackMap[Object.keys(rackMap)[0]]);
    }
  }, [rackMap, open, initialPlan]);

  // Calculate already selected fish counts for each tank within this dialog
  const selectedFishCounts = useMemo(() => {
    const counts = {};
    
    crosses.forEach(cross => {
      // Handle tank1 selections
      if (cross.tank1) {
        if (!counts[cross.tank1]) {
          counts[cross.tank1] = { MALE: 0, FEMALE: 0 };
        }
        counts[cross.tank1].MALE += cross.tank1Fish?.male || 0;
        counts[cross.tank1].FEMALE += cross.tank1Fish?.female || 0;
      }
      
      // Handle tank2 selections
      if (cross.tank2) {
        if (!counts[cross.tank2]) {
          counts[cross.tank2] = { MALE: 0, FEMALE: 0 };
        }
        counts[cross.tank2].MALE += cross.tank2Fish?.male || 0;
        counts[cross.tank2].FEMALE += cross.tank2Fish?.female || 0;
      }
    });
    
    return counts;
  }, [crosses]);

  // Sort tanks by position (e.g., A1, A2, A3, etc.)
  const sortTanks = (tanks) => {
    if (!tanks || !Array.isArray(tanks)) return [];
    
    return [...tanks].sort((a, b) => {
      const rowA = a.position?.charAt(0);
      const rowB = b.position?.charAt(0);
      
      if (!rowA || !rowB) return 0;
      if (rowA !== rowB) return rowA.localeCompare(rowB);
      
      return parseInt(a.position.slice(1)) - parseInt(b.position.slice(1));
    });
  };

  // Given a tank and gender, return an array [0, 1, ..., available Fish]
  // Now considers fish already selected in other crosses in this dialog
  const getFishCountOptions = (tank, gender, currentCrossIndex, side) => {
    if (!tank || !tank.subdivisions) return [0];
    
    // Calculate total available fish in the tank
    const total = tank.subdivisions.reduce((sum, sub) => {
      if (!sub || !sub.gender) return sum;
      return sub.gender.toUpperCase() === gender ? sum + (parseInt(sub.count) || 0) : sum;
    }, 0);
    
    // Calculate how many fish are already selected in OTHER crosses
    // (exclude the current cross being edited)
    let alreadySelected = 0;
    const tankId = tank.id;
    
    if (selectedFishCounts[tankId]) {
      alreadySelected = selectedFishCounts[tankId][gender] || 0;
      
      // Subtract the current cross's selection so it doesn't restrict itself
      const currentCross = crosses[currentCrossIndex];
      if (currentCross) {
        // Check if this is the same tank we're calculating for
        if (side === 1 && currentCross.tank1 === tankId) {
          alreadySelected -= currentCross.tank1Fish?.[gender.toLowerCase()] || 0;
        } else if (side === 2 && currentCross.tank2 === tankId) {
          alreadySelected -= currentCross.tank2Fish?.[gender.toLowerCase()] || 0;
        }
      }
    }
    
    // Available = total - already selected in other crosses
    const available = Math.max(0, total - alreadySelected);
    
    return Array.from({ length: available + 1 }, (_, i) => i);
  };

  // Handle changes in cross selections
  const handleCrossChange = (index, field, value) => {
    setCrosses(prev => {
      const newCrosses = [...prev];
      const cross = { ...newCrosses[index] };
      
      switch(field) {
        case 'rack1':
          cross.rack1 = value;
          cross.tank1 = '';
          cross.tank1Fish = { male: 0, female: 0 };
          break;
        case 'rack2':
          cross.rack2 = value;
          cross.tank2 = '';
          cross.tank2Fish = { male: 0, female: 0 };
          break;
        case 'tank1':
          cross.tank1 = value;
          cross.tank1Fish = { male: 0, female: 0 };
          break;
        case 'tank2':
          cross.tank2 = value;
          cross.tank2Fish = { male: 0, female: 0 };
          break;
        default:
          break;
      }
      
      newCrosses[index] = cross;
      return newCrosses;
    });
  };

  // Handle changes for fish count selections
  const handleFishChange = (index, side, gender, value) => {
    setCrosses(prev => {
      const newCrosses = [...prev];
      if (!newCrosses[index]) return prev;
      
      const cross = { ...newCrosses[index] };
      const field = side === 1 ? 'tank1Fish' : 'tank2Fish';
      
      // Ensure the fish object exists
      cross[field] = { 
        ...(cross[field] || { male: 0, female: 0 }),
        [gender]: value 
      };
      
      newCrosses[index] = cross;
      return newCrosses;
    });
  };

  const handleAddCross = () => {
    setCrosses(prev => [...prev, {...DEFAULT_CROSS}]);
  };

  // Reset dialog states when dialog opens/closes
  useEffect(() => {
    if (open && !initialPlan) {
      // Only reset for new plans, not when editing
      setSelectedDate('');
      setCrosses([{...DEFAULT_CROSS}]);
      setError(null);
    }
  }, [open, initialPlan]);

  const handleSave = () => {
    setError(null);
    if (!selectedDate) {
      setError('Breeding date is required');
      return;
    }
    
    // Validate that both sides of each cross are selected
    for (const cross of crosses) {
      if (!cross.rack1 || !cross.tank1 || !cross.rack2 || !cross.tank2) {
        setError('Please select rack and tank for both sides of every cross');
        return;
      }
    }
    
    // Prepare payload in desired format
    const payload = {
      breeding_date: selectedDate,
      crosses: crosses.map(cross => ({
        tank1: {
          id: cross.tank1,
          males: cross.tank1Fish?.male || 0,
          females: cross.tank1Fish?.female || 0
        },
        tank2: {
          id: cross.tank2,
          males: cross.tank2Fish?.male || 0,
          females: cross.tank2Fish?.female || 0
        },
        breedingResult: cross.breedingResult
      }))
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {initialPlan ? 'Edit Breeding Plan' : 'Create Breeding Plan'}
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              type="date"
              label="Breeding Date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              InputLabelProps={{ 
                shrink: true,
                sx: { 
                  position: 'relative',
                  transform: 'none',
                  marginBottom: '8px' 
                }
              }}
              sx={{ mt: 1 }}  // Add top margin
            />
          </Grid>
          {crosses.map((cross, index) => (
            <Grid item xs={12} key={index}>
              <Box sx={{ p: 2, border: '1px solid #ccc', borderRadius: 1 }}>
                <Typography variant="h6">Cross {index + 1}</Typography>
                <Grid container spacing={2}>
                  {/* Tank 1 Selection */}
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Rack 1</InputLabel>
                      <Select
                        value={cross.rack1 || ''}
                        label="Rack 1"
                        onChange={(e) => handleCrossChange(index, 'rack1', e.target.value)}
                      >
                        {Object.keys(rackMap || {}).map(rack => (
                          <MenuItem key={rack} value={rack}>{rack}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Tank 1</InputLabel>
                      <Select
                        value={cross.tank1 || ''}
                        label="Tank 1"
                        onChange={(e) => handleCrossChange(index, 'tank1', e.target.value)}
                        disabled={!cross.rack1}
                      >
                        {cross.rack1 && rackMap[cross.rack1] ? 
                          sortTanks(rackMap[cross.rack1]).map(tank => {
                            const maleCount = getFishCountByGender(tank, 'MALE');
                            const femaleCount = getFishCountByGender(tank, 'FEMALE');
                            
                            return (
                              <MenuItem key={tank.id} value={tank.id}>
                                {`${tank.position} - ${tank.line || 'Unknown'} (♂${maleCount} ♀${femaleCount})`}
                              </MenuItem>
                            );
                          }) : null}
                      </Select>
                    </FormControl>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <FormControl fullWidth>
                          <InputLabel>Males</InputLabel>
                          <Select
                            value={cross.tank1Fish?.male ?? 0}
                            label="Males"
                            onChange={(e) =>
                              handleFishChange(index, 1, 'male', parseInt(e.target.value, 10) || 0)
                            }
                            disabled={!cross.tank1}
                          >
                            {cross.tank1 ?
                              getFishCountOptions(
                                availableTanks.find(t => t && t.id === cross.tank1),
                                'MALE',
                                index,
                                1
                              ).map(num => (
                                <MenuItem key={num} value={num}>{num}</MenuItem>
                              )) : <MenuItem value={0}>0</MenuItem>}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6}>
                        <FormControl fullWidth>
                          <InputLabel>Females</InputLabel>
                          <Select
                            value={cross.tank1Fish?.female ?? 0}
                            label="Females"
                            onChange={(e) =>
                              handleFishChange(index, 1, 'female', parseInt(e.target.value, 10) || 0)
                            }
                            disabled={!cross.tank1}
                          >
                            {cross.tank1 ?
                              getFishCountOptions(
                                availableTanks.find(t => t && t.id === cross.tank1),
                                'FEMALE',
                                index,
                                1
                              ).map(num => (
                                <MenuItem key={num} value={num}>{num}</MenuItem>
                              )) : <MenuItem value={0}>0</MenuItem>}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Grid>
                  {/* Tank 2 Selection */}
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Rack 2</InputLabel>
                      <Select
                        value={cross.rack2 || ''}
                        label="Rack 2"
                        onChange={(e) => handleCrossChange(index, 'rack2', e.target.value)}
                      >
                        {Object.keys(rackMap || {}).map(rack => (
                          <MenuItem key={rack} value={rack}>{rack}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Tank 2</InputLabel>
                      <Select
                        value={cross.tank2 || ''}
                        label="Tank 2"
                        onChange={(e) => handleCrossChange(index, 'tank2', e.target.value)}
                        disabled={!cross.rack2}
                      >
                        {cross.rack2 && rackMap[cross.rack2] ? 
                          sortTanks(rackMap[cross.rack2]).map(tank => {
                            const maleCount = getFishCountByGender(tank, 'MALE');
                            const femaleCount = getFishCountByGender(tank, 'FEMALE');
                            
                            return (
                              <MenuItem key={tank.id} value={tank.id}>
                                {`${tank.position} - ${tank.line || 'Unknown'} (♂${maleCount} ♀${femaleCount})`}
                              </MenuItem>
                            );
                          }) : null}
                      </Select>
                    </FormControl>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <FormControl fullWidth>
                          <InputLabel>Males</InputLabel>
                          <Select
                            value={cross.tank2Fish?.male ?? 0}
                            label="Males"
                            onChange={(e) =>
                              handleFishChange(index, 2, 'male', parseInt(e.target.value, 10) || 0)
                            }
                            disabled={!cross.tank2}
                          >
                            {cross.tank2 ?
                              getFishCountOptions(
                                availableTanks.find(t => t && t.id === cross.tank2),
                                'MALE',
                                index,
                                2
                              ).map(num => (
                                <MenuItem key={num} value={num}>{num}</MenuItem>
                              )) : <MenuItem value={0}>0</MenuItem>}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6}>
                        <FormControl fullWidth>
                          <InputLabel>Females</InputLabel>
                          <Select
                            value={cross.tank2Fish?.female ?? 0}
                            label="Females"
                            onChange={(e) =>
                              handleFishChange(index, 2, 'female', parseInt(e.target.value, 10) || 0)
                            }
                            disabled={!cross.tank2}
                          >
                            {cross.tank2 ?
                              getFishCountOptions(
                                availableTanks.find(t => t && t.id === cross.tank2),
                                'FEMALE',
                                index,
                                2
                              ).map(num => (
                                <MenuItem key={num} value={num}>{num}</MenuItem>
                              )) : <MenuItem value={0}>0</MenuItem>}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                    {/* Add this right below the Tank 2 Female selection */}
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12}>
                        <FormControl fullWidth>
                          <InputLabel>Breeding Result</InputLabel>
                          <Select
                            value={cross.breedingResult !== undefined && cross.breedingResult !== null 
                              ? cross.breedingResult.toString() 
                              : ''
                            }
                            label="Breeding Result"
                            onChange={(e) => {
                              const value = e.target.value;
                              setCrosses(prev => {
                                const newCrosses = [...prev];
                                const updatedCross = { ...newCrosses[index] };
                                updatedCross.breedingResult = value === '' ? null : value === 'true';
                                newCrosses[index] = updatedCross;
                                return newCrosses;
                              });
                            }}
                          >
                            {/* Remove the "Unknown" option, but keep empty value for initial state */}
                            <MenuItem value="">Select Result</MenuItem>
                            <MenuItem value="true">Successful</MenuItem>
                            <MenuItem value="false">Failed</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          ))}
          <Grid item xs={12}>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddCross}
              variant="outlined"
            >
              Add Another Cross
            </Button>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save Plan</Button>
      </DialogActions>
    </Dialog>
  );
};

BreedingPlanDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  availableTanks: PropTypes.array
};

export default BreedingPlanDialog;