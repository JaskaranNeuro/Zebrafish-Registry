// zebrafish-frontend/src/components/clinical/CaseForm.js
import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, TextField, Button, 
  FormControl, InputLabel, Select, MenuItem, 
  Chip, OutlinedInput, CircularProgress, FormHelperText,
  Autocomplete
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import axios from 'axios';

// Predefined list of common zebrafish symptoms
const SYMPTOM_OPTIONS = [
  'Fin damage', 'Lethargy', 'Abnormal swimming', 'Loss of appetite',
  'Swelling', 'Scale loss', 'Discoloration', 'Breathing difficulty',
  'Bulging eyes', 'Skin lesions', 'Spine curvature', 'Weight loss',
  'Bloating', 'Hemorrhaging', 'Parasite visible', 'Fungal growth'
];

// Add a function to sort tanks by position
const sortTanksByPosition = (tanks) => {
  if (!tanks || !Array.isArray(tanks)) return [];
  
  return [...tanks].sort((a, b) => {
    // Extract letter and number parts (e.g., "A1" -> "A" and 1)
    const aMatch = a.position.match(/([A-Z]+)(\d+)/);
    const bMatch = b.position.match(/([A-Z]+)(\d+)/);
    
    if (!aMatch || !bMatch) return a.position.localeCompare(b.position);
    
    const [, aLetter, aNumber] = aMatch;
    const [, bLetter, bNumber] = bMatch;
    
    // First compare letters
    if (aLetter !== bLetter) {
      return aLetter.localeCompare(bLetter);
    }
    
    // Then compare numbers
    return parseInt(aNumber) - parseInt(bNumber);
  });
};

const CaseForm = ({ onSaved }) => {
  const [racks, setRacks] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [selectedRack, setSelectedRack] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  
  const { control, handleSubmit, watch, formState: { errors }, reset } = useForm({
    defaultValues: {
      tank_id: '',
      symptoms: [],
      fish_count: 1,
      report_date: new Date(),
      note: ''
    }
  });

  // Get racks on component mount
  useEffect(() => {
    const fetchRacks = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/racks`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setRacks(response.data);
      } catch (err) {
        console.error('Error fetching racks:', err);
      }
    };
    fetchRacks();
  }, []);

  // Update tanks when rack is selected
  useEffect(() => {
    if (selectedRack) {
      const rack = racks.find(r => r.id === parseInt(selectedRack));
      if (rack) {
        // Sort tanks by position before setting state
        const sortedTanks = sortTanksByPosition(rack.tanks);
        setTanks(sortedTanks);
      }
    } else {
      setTanks([]);
    }
  }, [selectedRack, racks]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setSubmitError(null);
      
      // Format date for backend
      const formattedData = {
        ...data,
        report_date: data.report_date.toISOString().split('T')[0]
      };
      
      const token = localStorage.getItem('token');
      await axios.post(`${process.env.REACT_APP_API_BASE_URL}/clinical/cases`, formattedData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      reset();
      onSaved();
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to submit case');
      console.error('Error submitting case:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Typography variant="h5" gutterBottom>Report New Clinical Case</Typography>
      
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Select Rack</InputLabel>
          <Select
            value={selectedRack}
            label="Select Rack"
            onChange={(e) => setSelectedRack(e.target.value)}
          >
            <MenuItem value="">
              <em>Select a rack</em>
            </MenuItem>
            {racks.map((rack) => (
              <MenuItem key={rack.id} value={rack.id}>
                {rack.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Controller
          name="tank_id"
          control={control}
          rules={{ required: 'Tank is required' }}
          render={({ field }) => (
            <FormControl fullWidth sx={{ mb: 2 }} error={!!errors.tank_id}>
              <InputLabel>Select Tank</InputLabel>
              <Select
                {...field}
                label="Select Tank"
                disabled={!selectedRack}
              >
                <MenuItem value="">
                  <em>Select a tank</em>
                </MenuItem>
                {tanks.map((tank) => {
                  // Calculate male and female counts
                  const maleCount = tank.subdivisions ? 
                    tank.subdivisions.filter(s => 
                      s.gender === 'MALE' || s.gender === 'male' || 
                      (typeof s.gender === 'object' && s.gender?.value === 'MALE')
                    ).reduce((sum, s) => sum + (s.count || 0), 0) : 0;
                    
                  const femaleCount = tank.subdivisions ? 
                    tank.subdivisions.filter(s => 
                      s.gender === 'FEMALE' || s.gender === 'female' || 
                      (typeof s.gender === 'object' && s.gender?.value === 'FEMALE')
                    ).reduce((sum, s) => sum + (s.count || 0), 0) : 0;
                  
                  const genderInfo = `(♂️${maleCount} ♀️${femaleCount})`;
                  
                  return (
                    <MenuItem key={tank.id} value={tank.id}>
                      {`${tank.position} - ${tank.line || 'Unspecified Line'} ${genderInfo}`}
                    </MenuItem>
                  );
                })}
              </Select>
              {errors.tank_id && <FormHelperText>{errors.tank_id.message}</FormHelperText>}
            </FormControl>
          )}
        />

        <Controller
          name="symptoms"
          control={control}
          rules={{ required: 'At least one symptom is required' }}
          render={({ field }) => (
            <FormControl fullWidth sx={{ mb: 2 }} error={!!errors.symptoms}>
              <Autocomplete
                multiple
                options={SYMPTOM_OPTIONS}
                freeSolo
                value={field.value}
                onChange={(e, newValue) => field.onChange(newValue)}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={option}
                      {...getTagProps({ index })}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Symptoms"
                    placeholder="Select or type symptoms"
                    error={!!errors.symptoms}
                    helperText={errors.symptoms?.message}
                  />
                )}
              />
            </FormControl>
          )}
        />

        <Controller
          name="fish_count"
          control={control}
          rules={{ 
            required: 'Fish count is required',
            min: { value: 1, message: 'Minimum count is 1' },
            max: { value: 1000, message: 'Maximum count is 1000' }
          }}
          render={({ field }) => (
            <TextField
              {...field}
              type="number"
              label="Number of Affected Fish"
              fullWidth
              sx={{ mb: 2 }}
              inputProps={{ min: 1 }}
              onChange={(e) => field.onChange(parseInt(e.target.value) || '')}
              error={!!errors.fish_count}
              helperText={errors.fish_count?.message}
            />
          )}
        />

        {/* Replace the DatePicker implementation with a standard TextField */}
        <Controller
          name="report_date"
          control={control}
          rules={{ required: 'Date is required' }}
          render={({ field }) => (
            <TextField
              {...field}
              type="date"
              label="Date Observed"
              fullWidth
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
              value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
              onChange={(e) => field.onChange(new Date(e.target.value))}
              error={!!errors.report_date}
              helperText={errors.report_date?.message}
            />
          )}
        />

        <Controller
          name="note"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Initial Observations & Notes"
              fullWidth
              multiline
              rows={4}
              sx={{ mb: 2 }}
            />
          )}
        />
      </Box>

      {submitError && (
        <Typography color="error" sx={{ mb: 2 }}>
          {submitError}
        </Typography>
      )}

      <Button
        type="submit"
        variant="contained"
        disabled={loading}
        sx={{ mt: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Submit Report'}
      </Button>
    </Box>
  );
};

export default CaseForm;
