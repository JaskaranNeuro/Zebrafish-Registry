import React, { useState } from 'react';
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
  Grid,
  IconButton,
  RadioGroup,
  Radio,
  FormControlLabel
} from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';

const searchFields = [
  { value: 'line', label: 'Line' },
  { value: 'dob', label: 'Date of Birth' },
  { value: 'size', label: 'Tank Size' },
  { value: 'position', label: 'Position' },
  { value: 'gender', label: 'Gender' },
  { value: 'count', label: 'Fish Count' }
];

const SearchDialog = ({ open, onClose, onSearch, racks }) => {
  const [searchScope, setSearchScope] = useState('all');
  const [selectedRack, setSelectedRack] = useState('');
  const [operator, setOperator] = useState('AND');
  const [searchTerms, setSearchTerms] = useState([{ field: 'line', value: '' }]);

  const handleSearch = () => {
    const searchData = {
      operator,
      searchTerms: searchTerms.filter(term => term.value !== ''),
      rack_id: searchScope === 'specific' ? selectedRack : null
    };
    onSearch(searchData);
    onClose(); // Add this line to close the dialog after search
  };

  const addSearchTerm = () => {
    setSearchTerms([...searchTerms, { field: 'line', value: '' }]);
  };

  const removeSearchTerm = (index) => {
    setSearchTerms(searchTerms.filter((_, i) => i !== index));
  };

  const updateSearchTerm = (index, field, value) => {
    const newTerms = [...searchTerms];
    newTerms[index] = { ...newTerms[index], [field]: value };
    setSearchTerms(newTerms);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Search Tanks</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <RadioGroup
                row
                value={searchScope}
                onChange={(e) => setSearchScope(e.target.value)}
              >
                <FormControlLabel 
                  value="all" 
                  control={<Radio />} 
                  label="Search All Racks" 
                />
                <FormControlLabel 
                  value="specific" 
                  control={<Radio />} 
                  label="Search Specific Rack" 
                />
              </RadioGroup>
            </Grid>

            {searchScope === 'specific' && (
              <Grid item xs={12}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel id="rack-select-label">Select Rack</InputLabel>
                  <Select
                    labelId="rack-select-label"
                    label="Select Rack"  // Add this line
                    value={selectedRack}
                    onChange={(e) => setSelectedRack(e.target.value)}
                  >
                    {racks.map((rack) => (
                      <MenuItem key={rack.id} value={rack.id}>
                        {rack.name} ({rack.lab_id})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12}>
              <RadioGroup
                row
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
              >
                <FormControlLabel 
                  value="AND" 
                  control={<Radio />} 
                  label="Match All (AND)" 
                />
                <FormControlLabel 
                  value="OR" 
                  control={<Radio />} 
                  label="Match Any (OR)" 
                />
              </RadioGroup>
            </Grid>

            {searchTerms.map((term, index) => (
              <Grid container item spacing={2} key={index}>
                <Grid item xs={5}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel id="search-field-label">Search Field</InputLabel>
                    <Select
                      labelId="search-field-label"
                      label="Search Field"  // Add this line
                      value={term.field}
                      onChange={(e) => updateSearchTerm(index, 'field', e.target.value)}
                    >
                      {searchFields.map((field) => (
                        <MenuItem key={field.value} value={field.value}>
                          {field.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={5}>
                  <TextField
                    fullWidth
                    label="Search Value"
                    type={term.field === 'dob' ? 'date' : 'text'}
                    value={term.value}
                    onChange={(e) => updateSearchTerm(index, 'value', e.target.value)}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Grid>
                <Grid item xs={2}>
                  <IconButton 
                    onClick={() => removeSearchTerm(index)}
                    color="error"
                    sx={{ mt: 1 }}
                  >
                    <RemoveIcon />
                  </IconButton>
                </Grid>
              </Grid>
            ))}

            <Grid item xs={12}>
              <Button
                startIcon={<AddIcon />}
                onClick={addSearchTerm}
                variant="outlined"
                sx={{ mt: 1 }}
              >
                Add Search Term
              </Button>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSearch} variant="contained">Search</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SearchDialog;