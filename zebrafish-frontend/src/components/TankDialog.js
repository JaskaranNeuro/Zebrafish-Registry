import React, { useState, useEffect } from 'react';
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
  Box,
  IconButton,
  Typography,
  Grid,
  RadioGroup,
  Radio,
  FormControlLabel,
  Paper
} from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { TankSizeEnum, GenderEnum } from '../utils/enums';

const PRESET_COLORS = [
  { name: 'Blue', value: '#bbdefb' },
  { name: 'Red', value: '#ffcdd2' },
  { name: 'Green', value: '#c8e6c9' },
  { name: 'Yellow', value: '#fff9c4' },
  { name: 'Purple', value: '#e1bee7' },
  { name: 'Orange', value: '#ffe0b2' },
];

const TankDialog = ({ open, onClose, tank, rack, onSave, onDelete }) => {
  const [editedTank, setEditedTank] = useState(tank ? { ...tank } : {});
  const [replacementPosition, setReplacementPosition] = useState('');
  const [errors, setErrors] = useState({});
  const [useCustomColor, setUseCustomColor] = useState(false);

  useEffect(() => {
    if (tank) {
      const formattedTank = {
        id: tank.id,
        position: tank.position,
        // Preserve original size case
        size: tank.size || 'REGULAR',
        line: tank.line || '',
        dob: tank.dob || '',
        subdivisions: tank.subdivisions?.map(sub => ({
          ...sub,
          gender: sub.gender?.toUpperCase() || 'MALE',
          count: parseInt(sub.count) || 0
        })) || [],
        color: tank.color || PRESET_COLORS[0].value,
      };
      setEditedTank(formattedTank);
      setUseCustomColor(!PRESET_COLORS.some(c => c.value === tank.color));
    } else {
      setEditedTank(null);
    }
  }, [tank]);

  if (!tank || !editedTank) return null;

  const handleSubdivisionChange = (index, field, value) => {
    const newSubdivisions = [...editedTank.subdivisions];
    
    // For gender field, ensure correct format regardless of input format
    if (field === 'gender') {
      // Convert to uppercase string format always
      const normalizedGender = typeof value === 'string' ? value.toUpperCase() : 
                              (value && value.value ? value.value.toUpperCase() : 'MALE');
      
      newSubdivisions[index] = {
        ...newSubdivisions[index],
        gender: normalizedGender
      };
    } else {
      // Handle other fields normally
      newSubdivisions[index] = {
        ...newSubdivisions[index],
        [field]: field === 'count' ? Math.max(0, parseInt(value) || 0) : value
      };
    }
    
    setEditedTank({
      ...editedTank,
      subdivisions: newSubdivisions
    });
    
    // Log the change to help debug
    console.log('Updated subdivision:', newSubdivisions[index]);
  };

  const addSubdivision = () => {
    setEditedTank({
      ...editedTank,
      subdivisions: [
        ...editedTank.subdivisions,
        { gender: GenderEnum.MALE, count: 0 }
      ]
    });
  };

  const removeSubdivision = (index) => {
    const newSubdivisions = editedTank.subdivisions.filter((_, i) => i !== index);
    setEditedTank({
      ...editedTank,
      subdivisions: newSubdivisions
    });
  };

  const validateTank = () => {
    const newErrors = {};
    
    // Don't validate ID for new tanks
    if (tank.id && !editedTank?.id) {
      newErrors.general = 'Missing tank ID';
    }

    editedTank.subdivisions.forEach((sub, index) => {
      if (isNaN(sub.count) || sub.count < 0) {
        newErrors[`count-${index}`] = 'Count must be a positive number';
      }
      if (!sub.gender) {
        newErrors[`gender-${index}`] = 'Gender is required';
      }
    });

    // Validate replacement position if one is entered
    if (replacementPosition) {
      // Check format (letter followed by number)
      if (!/^[A-Z][0-9]+$/.test(replacementPosition)) {
        newErrors.replacementPosition = 'Invalid position format. Use format like A1, B2, etc.';
      } else if (rack) { // Add null check for rack
        const targetTank = rack.tanks.find(t => t.position === replacementPosition);
        if (!targetTank) {
          newErrors.replacementPosition = 'No tank at this position';
        } else {
          // Use raw size values for comparison
          const currentSize = editedTank.size || 'REGULAR';
          const targetSize = targetTank.size || 'REGULAR';
          
          console.log('Size comparison:', {
            currentTank: {
              id: editedTank.id,
              position: editedTank.position,
              size: currentSize
            },
            targetTank: {
              id: targetTank.id,
              position: targetTank.position,
              size: targetSize
            }
          });
          
          if (currentSize.toLowerCase() !== targetSize.toLowerCase()) {
            newErrors.replacementPosition = `Cannot swap tanks of different sizes (${currentSize} vs ${targetSize})`;
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateTank()) {
      const updatedTankData = {
        ...editedTank,
        size: editedTank.size || 'REGULAR',
        replacementPosition: replacementPosition || null
      };
      console.log('Saving tank with data:', updatedTankData);
      onSave(updatedTankData);
    }
  };

 

  const renderColorPicker = () => (
    <Grid item xs={12}>
      <Typography variant="subtitle1" gutterBottom>
        Tank Color
      </Typography>
      <RadioGroup
        value={useCustomColor ? 'custom' : 'preset'}
        onChange={(e) => setUseCustomColor(e.target.value === 'custom')}
        row
      >
        <FormControlLabel 
          value="preset" 
          control={<Radio />} 
          label="Preset Colors" 
        />
        <FormControlLabel 
          value="custom" 
          control={<Radio />} 
          label="Custom Color" 
        />
      </RadioGroup>
      
      {!useCustomColor ? (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
          {PRESET_COLORS.map((color) => (
            <Paper
              key={color.value}
              onClick={() => setEditedTank({ ...editedTank, color: color.value })}
              sx={{
                width: 40,
                height: 40,
                backgroundColor: color.value,
                cursor: 'pointer',
                border: editedTank?.color === color.value ? '2px solid black' : '2px solid transparent',
                '&:hover': {
                  opacity: 0.8
                }
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {editedTank?.color === color.value && (
                  <Typography variant="caption" sx={{ background: 'rgba(255,255,255,0.8)', px: 1 }}>
                    ✓
                  </Typography>
                )}
              </Box>
            </Paper>
          ))}
        </Box>
      ) : (
        <TextField
          fullWidth
          type="color"
          value={editedTank?.color || '#bbdefb'}
          onChange={(e) => setEditedTank({ ...editedTank, color: e.target.value })}
          sx={{ 
            mt: 2,
            '& input': { 
              height: 50,
              cursor: 'pointer',
              width: '100%',
              padding: '8px'
            } 
          }}
        />
      )}
    </Grid>
  );

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      role="dialog"
      aria-labelledby="tank-dialog-title"
    >
      <DialogTitle id="tank-dialog-title">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {tank?.id ? `Edit Tank ${editedTank?.position}` : 'Create New Tank'}
          </Typography>
          {tank?.id && (
            <IconButton
              color="error"
              onClick={() => {
                // Add confirmation dialog
                if (window.confirm(`Are you sure you want to delete tank ${editedTank?.position}?`)) {
                  console.log('Attempting to delete tank:', tank.id);
                  try {
                    onDelete(tank.id);
                  } catch (err) {
                    console.error('Error in tank deletion:', err);
                    // Provide feedback to user
                    alert(`Error deleting tank: ${err.message || 'Unknown error'}`);
                  }
                }
              }}
              size="large"
              aria-label="delete tank"
            >
              <DeleteIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Line"
                value={editedTank?.line || ''}
                onChange={(e) => setEditedTank({...editedTank, line: e.target.value})}
                error={!!errors.line}
                helperText={errors.line}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="Date of Birth"
                value={editedTank?.dob || ''}
                onChange={(e) => setEditedTank({...editedTank, dob: e.target.value})}
                InputLabelProps={{
                  shrink: true,
                }}
                error={!!errors.dob}
                helperText={errors.dob}
              />
            </Grid>
            {renderColorPicker()}
          </Grid>
          {errors.general && (
            <Typography 
              color="error" 
              gutterBottom 
              data-testid="error-message"
            >
              {errors.general}
            </Typography>
          )}
          <Typography variant="subtitle1" gutterBottom>
            Tank Size: {editedTank.size}
          </Typography>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Tank Size</InputLabel>
            <Select
              id="tank-size"
              value={editedTank.size}
              label="Tank Size"
              onChange={(e) => setEditedTank({...editedTank, size: e.target.value})}
              data-testid="tank-size-select"
              aria-label="Tank Size"
            >
              <MenuItem value={TankSizeEnum.SMALL}>Small</MenuItem>
              <MenuItem value={TankSizeEnum.REGULAR}>Regular</MenuItem>
              <MenuItem value={TankSizeEnum.LARGE}>Large</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Replace With Position"
            value={replacementPosition}
            onChange={(e) => {
              // Convert to uppercase and remove any non-alphanumeric characters
              const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
              setReplacementPosition(value);
            }}
            error={!!errors.replacementPosition}
            helperText={errors.replacementPosition}
            sx={{ mt: 2 }}
            placeholder="e.g., A1, B2"
          />

          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            Subdivisions
          </Typography>
          
          {editedTank.subdivisions.map((sub, index) => (
            <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
              <Grid item xs={5}>
                <FormControl fullWidth>
                  <InputLabel>Gender</InputLabel>
                  <Select
                    value={sub.gender}
                    label="Gender"
                    onChange={(e) => handleSubdivisionChange(index, 'gender', e.target.value)}
                  >
                    <MenuItem value={GenderEnum.MALE}>Male</MenuItem>
                    <MenuItem value={GenderEnum.FEMALE}>Female</MenuItem>
                    <MenuItem value={GenderEnum.LARVAE}>Larvae</MenuItem>
                    <MenuItem value={GenderEnum.JUVENILE}>Juvenile</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={5}>
                <TextField
                  type="number"
                  label="Count"
                  value={sub.count}
                  onChange={(e) => handleSubdivisionChange(index, 'count', parseInt(e.target.value))}
                  fullWidth
                  error={!!errors[`count-${index}`]}
                  helperText={errors[`count-${index}`]}
                />
              </Grid>
              <Grid item xs={2}>
                <IconButton 
                  onClick={() => removeSubdivision(index)}
                  sx={{ mt: 1 }}
                  color="error"
                >
                  <RemoveIcon />
                </IconButton>
              </Grid>
            </Grid>
          ))}
          
          <Button
            startIcon={<AddIcon />}
            onClick={addSubdivision}
            variant="outlined"
            sx={{ mt: 1 }}
            data-testid="add-subdivision-button"
          >
            Add Subdivision
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" data-testid="save-button">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TankDialog;