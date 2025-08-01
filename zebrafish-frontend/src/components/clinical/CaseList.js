// zebrafish-frontend/src/components/clinical/CaseList.js
import React, { useState } from 'react';
import { 
  Box, Typography, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Chip,
  IconButton, Button, CircularProgress, FormControl,
  InputLabel, Select, MenuItem
} from '@mui/material';
import { 
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const CaseList = ({ cases, loading, error, onCaseSelect, onRefresh }) => {
  const [filter, setFilter] = useState('all'); // 'all', 'open', 'closed'
  
  const filteredCases = cases.filter(caseItem => {
    if (filter === 'all') return true;
    if (filter === 'open') return caseItem.status === 'Open';
    if (filter === 'closed') return caseItem.status === 'Closed';
    return true;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Clinical Cases</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filter}
              label="Status"
              onChange={(e) => setFilter(e.target.value)}
              size="small"
            >
              <MenuItem value="all">All Cases</MenuItem>
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </Select>
          </FormControl>
          <Button 
            startIcon={<RefreshIcon />} 
            onClick={onRefresh}
            variant="outlined"
            size="small"
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : filteredCases.length === 0 ? (
        <Typography>No clinical cases found.</Typography>
      ) : (
        <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Case ID</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Tank</TableCell>
                <TableCell>Symptoms</TableCell>
                <TableCell>Fish Count</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCases.map((caseItem) => (
                <TableRow 
                  key={caseItem.id}
                  sx={{ '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
                >
                  <TableCell>{caseItem.id}</TableCell>
                  <TableCell>{new Date(caseItem.report_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {`${caseItem.rack_name} / ${caseItem.tank_position}`}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {caseItem.symptoms.slice(0, 3).map((symptom, index) => (
                        <Chip 
                          key={index} 
                          label={symptom} 
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                      {caseItem.symptoms.length > 3 && (
                        <Chip 
                          label={`+${caseItem.symptoms.length - 3}`} 
                          size="small"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{caseItem.fish_count}</TableCell>
                  <TableCell>
                    <Chip
                      label={caseItem.status}
                      color={caseItem.status === 'Open' ? 'error' : 'success'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton 
                      onClick={() => onCaseSelect(caseItem.id)}
                      size="small"
                      color="primary"
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default CaseList;