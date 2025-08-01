// Create a new file: /d:/Zebrafish registry VS code/zebrafish-frontend/src/components/breeding/BreedingPlanSearch.js

import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Collapse,
  Typography
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';

const BreedingPlanSearch = ({ onSearch, onClear, availableTanks }) => {
  const [expanded, setExpanded] = useState(false);
  const [searchParams, setSearchParams] = useState({
    dateFrom: '',
    dateTo: '',
    tankLine: '',
    tankPosition: '',
    breedingResult: ''
  });

  // Get unique lines from available tanks
  const uniqueLines = [...new Set(availableTanks
    .filter(tank => tank && tank.line)
    .map(tank => tank.line))];

  // Get unique positions from available tanks  
  const uniquePositions = [...new Set(availableTanks
    .filter(tank => tank && tank.position)
    .map(tank => tank.position))].sort();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSearchParams({
      ...searchParams,
      [name]: value
    });
  };

  const handleSearch = () => {
    onSearch(searchParams);
  };

  const handleClear = () => {
    setSearchParams({
      dateFrom: '',
      dateTo: '',
      tankLine: '',
      tankPosition: '',
      breedingResult: ''
    });
    onClear();
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">
          Search Breeding Plans
        </Typography>
        <IconButton onClick={() => setExpanded(!expanded)}>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              name="dateFrom"
              label="From Date"
              type="date"
              value={searchParams.dateFrom}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              name="dateTo"
              label="To Date"
              type="date"
              value={searchParams.dateTo}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Fish Line</InputLabel>
              <Select
                name="tankLine"
                value={searchParams.tankLine}
                label="Fish Line"
                onChange={handleChange}
              >
                <MenuItem value="">All Lines</MenuItem>
                {uniqueLines.map(line => (
                  <MenuItem key={line} value={line}>{line}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Tank Position</InputLabel>
              <Select
                name="tankPosition"
                value={searchParams.tankPosition}
                label="Tank Position"
                onChange={handleChange}
              >
                <MenuItem value="">All Positions</MenuItem>
                {uniquePositions.map(position => (
                  <MenuItem key={position} value={position}>{position}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Breeding Result</InputLabel>
              <Select
                name="breedingResult"
                value={searchParams.breedingResult}
                label="Breeding Result"
                onChange={handleChange}
              >
                <MenuItem value="">All Results</MenuItem>
                <MenuItem value="true">Successful</MenuItem>
                <MenuItem value="false">Failed</MenuItem>
                <MenuItem value="null">Unknown</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={handleClear}
          >
            Clear
          </Button>
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
          >
            Search
          </Button>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default BreedingPlanSearch;