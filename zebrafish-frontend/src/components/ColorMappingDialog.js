import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  RadioGroup,
  Radio,
  FormControlLabel,
  Box,
  Typography,
  Paper,
  Grid
} from '@mui/material';

const PRESET_COLORS = [
  { name: 'Blue', value: '#bbdefb' },
  { name: 'Red', value: '#ffcdd2' },
  { name: 'Green', value: '#c8e6c9' },
  { name: 'Yellow', value: '#fff9c4' },
  { name: 'Purple', value: '#e1bee7' },
  { name: 'Orange', value: '#ffe0b2' },
];

const ColorMappingDialog = ({ open, onClose, racks, onApply }) => {
  const [mappingType, setMappingType] = useState('line');
  const [selectedRack, setSelectedRack] = useState('all');
  const [selectedValue, setSelectedValue] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0].value);
  const [customColor, setCustomColor] = useState(false);

  // Get unique lines from all racks
  const getUniqueLines = () => {
    if (!racks || !Array.isArray(racks)) return [];
    
    const lines = new Set();
    racks.forEach(rack => {
      if (rack && Array.isArray(rack.tanks)) {
        rack.tanks.forEach(tank => {
          if (tank && tank.line) {
            lines.add(tank.line);
          }
        });
      }
    });
    return Array.from(lines);
  };

  const genderOptions = [
    { value: 'MALE', label: 'Male' },
    { value: 'FEMALE', label: 'Female' },
    { value: 'LARVAE', label: 'Larvae' },
    { value: 'JUVENILE', label: 'Juvenile' },
    { value: 'MALE_FEMALE', label: 'Male + Female' }
  ];

  const handleApply = () => {
    onApply({
      type: mappingType,
      rackId: selectedRack === 'all' ? null : selectedRack,
      value: selectedValue,
      color: customColor ? selectedColor : selectedColor
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Color Mapping</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <RadioGroup
                row
                value={mappingType}
                onChange={(e) => setMappingType(e.target.value)}
              >
                <FormControlLabel value="line" control={<Radio />} label="By Line" />
                <FormControlLabel value="gender" control={<Radio />} label="By Gender" />
              </RadioGroup>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select Rack</InputLabel>
                <Select
                  value={selectedRack}
                  label="Select Rack"
                  onChange={(e) => setSelectedRack(e.target.value)}
                >
                  <MenuItem value="all">All Racks</MenuItem>
                  {racks.map(rack => (
                    <MenuItem key={rack.id} value={rack.id}>
                      {rack.name} ({rack.lab_id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>{mappingType === 'line' ? 'Select Line' : 'Select Gender'}</InputLabel>
                <Select
                  value={selectedValue}
                  label={mappingType === 'line' ? 'Select Line' : 'Select Gender'}
                  onChange={(e) => setSelectedValue(e.target.value)}
                >
                  {mappingType === 'line' 
                    ? getUniqueLines().map(line => (
                        <MenuItem key={line} value={line}>{line}</MenuItem>
                      ))
                    : genderOptions.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))
                  }
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Select Color
              </Typography>
              <RadioGroup
                value={customColor ? 'custom' : 'preset'}
                onChange={(e) => setCustomColor(e.target.value === 'custom')}
                row
              >
                <FormControlLabel value="preset" control={<Radio />} label="Preset Colors" />
                <FormControlLabel value="custom" control={<Radio />} label="Custom Color" />
              </RadioGroup>

              {!customColor ? (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                  {PRESET_COLORS.map((color) => (
                    <Paper
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      sx={{
                        width: 40,
                        height: 40,
                        backgroundColor: color.value,
                        cursor: 'pointer',
                        border: selectedColor === color.value ? '2px solid black' : '2px solid transparent',
                        '&:hover': { opacity: 0.8 }
                      }}
                    />
                  ))}
                </Box>
              ) : (
                <TextField
                  fullWidth
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  sx={{ mt: 2 }}
                />
              )}
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleApply} variant="contained" color="primary">
          Apply Colors
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ColorMappingDialog;