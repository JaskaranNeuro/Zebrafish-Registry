import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Switch,
  FormControlLabel,
  Box
} from '@mui/material';

const RowConfigDialog = ({ open, onClose, rack, onSave }) => {
  const [rowConfigs, setRowConfigs] = useState({});
  const [rowValues, setRowValues] = useState({});
  const rows = parseInt(rack?.rows) || 0;
  const defaultColumns = parseInt(rack?.columns) || 0;

  // Debug logging when props change
  useEffect(() => {
    console.log('RowConfigDialog received props:', {
      isOpen: open,
      rackData: rack,
      rowConfigs: rack?.row_configs
    });
    
    // Initialize rowValues when the dialog opens with a rack
    if (open && rack) {
      const initialValues = {};
      const totalRows = parseInt(rack.rows) || 0;
      
      // Create entries for each row
      for (let i = 0; i < totalRows; i++) {
        const rowKey = i.toString();
        // Use existing config if available, otherwise use rack's default columns
        initialValues[rowKey] = 
          (rack.row_configs && rack.row_configs[rowKey]) 
            ? rack.row_configs[rowKey] 
            : (parseInt(rack.columns) || 0);  // Added semicolon here
      }
      
      console.log('Setting initial row values:', initialValues);
      setRowValues(initialValues);
    }
  }, [open, rack]);

  // Initialize configs when dialog opens
  useEffect(() => {
    if (open && rack?.row_configs) {
      setRowConfigs({ ...rack.row_configs });
    }
  }, [open, rack]);

  const handleRowConfigChange = (rowIndex, value) => {
    const newConfigs = { ...rowConfigs };
    if (value && value > 0) {
      newConfigs[rowIndex] = parseInt(value);
    } else {
      delete newConfigs[rowIndex];
    }
    setRowConfigs(newConfigs);
    console.log('Updated row configs:', newConfigs); // Debug log
  };

  const handleSave = () => {
    const formattedConfigs = Object.entries(rowConfigs).reduce((acc, [key, value]) => {
      if (value && value > 0) {
        acc[key.toString()] = parseInt(value);
      }
      return acc;
    }, {});
    console.log('RowConfigDialog saving configs:', formattedConfigs);
    onSave(formattedConfigs);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Configure Row Positions</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Customize the number of positions for each row. Default is {defaultColumns} positions.
          </Typography>
          
          {Array.from({ length: rows }).map((_, index) => {
            const rowLabel = String.fromCharCode(65 + index);
            return (
              <Grid container spacing={2} key={index} alignItems="center" sx={{ mb: 1 }}>
                <Grid item xs={2}>
                  <Typography>Row {rowLabel}:</Typography>
                </Grid>
                <Grid item xs={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!rowConfigs[index]}
                        onChange={(e) => {
                          if (!e.target.checked) {
                            handleRowConfigChange(index, null);
                          } else {
                            handleRowConfigChange(index, defaultColumns);
                          }
                        }}
                      />
                    }
                    label="Custom"
                  />
                </Grid>
                {rowConfigs[index] !== undefined && (
                  <Grid item xs={6}>
                    <TextField
                      type="number"
                      label="Positions"
                      value={rowConfigs[index]}
                      onChange={(e) => handleRowConfigChange(index, parseInt(e.target.value) || defaultColumns)}
                      InputProps={{ inputProps: { min: 1 } }}
                      size="small"
                      fullWidth
                    />
                  </Grid>
                )}
              </Grid>
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default RowConfigDialog;