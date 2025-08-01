import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Grid,
  IconButton,
  Typography,
  Switch,
  FormControlLabel
} from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';

const RackDialog = ({ open, onClose, onSave, initialData }) => {
  const [rackData, setRackData] = useState(initialData || {
    name: '',
    lab_id: '',
    rows: 3,
    columns: 5,
    row_configs: {}
  });
  const [errors, setErrors] = useState({});
  const [customRows, setCustomRows] = useState({});

  const validateRack = () => {
    const newErrors = {};
    if (!rackData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!rackData.lab_id.trim()) {
      newErrors.lab_id = 'Lab ID is required';
    }
    if (rackData.rows < 1 || rackData.rows > 10) {
      newErrors.rows = 'Rows must be between 1 and 10';
    }
    if (rackData.columns < 1 || rackData.columns > 10) {
      newErrors.columns = 'Columns must be between 1 and 10';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateRack()) {
      onSave(rackData);
    }
  };

  const handleRowConfigChange = (rowIndex, value) => {
    const newConfigs = { ...rackData.row_configs };
    if (value) {
      newConfigs[rowIndex] = value;
    } else {
      delete newConfigs[rowIndex];
    }
    setRackData({ ...rackData, row_configs: newConfigs });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {initialData ? 'Edit Rack' : 'Create New Rack'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Rack Name"
                value={rackData.name}
                onChange={(e) => setRackData({ ...rackData, name: e.target.value })}
                error={!!errors.name}
                helperText={errors.name}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Lab ID"
                value={rackData.lab_id}
                onChange={(e) => setRackData({ ...rackData, lab_id: e.target.value })}
                error={!!errors.lab_id}
                helperText={errors.lab_id}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Number of Rows"
                value={rackData.rows}
                onChange={(e) => setRackData({ ...rackData, rows: parseInt(e.target.value) || 0 })}
                error={!!errors.rows}
                helperText={errors.rows}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Number of Columns"
                value={rackData.columns}
                onChange={(e) => setRackData({ ...rackData, columns: parseInt(e.target.value) || 0 })}
                error={!!errors.columns}
                helperText={errors.columns}
              />
            </Grid>
          </Grid>

          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
            Row Configurations
          </Typography>
          
          {Array.from({ length: rackData.rows }).map((_, index) => {
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
                        checked={!!rackData.row_configs[index]}
                        onChange={(e) => {
                          if (!e.target.checked) {
                            handleRowConfigChange(index, null);
                          } else {
                            handleRowConfigChange(index, rackData.columns);
                          }
                        }}
                      />
                    }
                    label="Custom positions"
                  />
                </Grid>
                {rackData.row_configs[index] && (
                  <Grid item xs={6}>
                    <TextField
                      type="number"
                      label="Number of positions"
                      value={rackData.row_configs[index]}
                      onChange={(e) => handleRowConfigChange(index, parseInt(e.target.value) || rackData.columns)}
                      InputProps={{ inputProps: { min: 1 } }}
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
        <Button onClick={handleSave} variant="contained">
          {initialData ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RackDialog;