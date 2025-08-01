import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Divider, 
  Button, 
  IconButton,
  Grid,    
  Paper,
  Chip,
  useTheme,
  Avatar,
  Container
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, GridView as RackIcon } from '@mui/icons-material';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { setRacks } from '../store/racksSlice';
import RackGrid from './RackGrid';
import RackDialog from './RackDialog';
import SearchDialog from './SearchDialog';
import { Search as SearchIcon } from '@mui/icons-material';
import ColorMappingDialog from './ColorMappingDialog';
import { Palette as PaletteIcon } from '@mui/icons-material';
import { calculateRackStats } from '../utils/rackStats';
import RackStats from './RackStats';
import OverallStatsPanel from './OverallStatsPanel';

const RackList = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const racks = useSelector(state => {
    // The data structure in Redux has changed - it's now under state.racks.items
    // instead of just state.racks.racks
    const racksData = state.racks.items || [];
    console.log("Racks data in RackList:", racksData);
    if (racksData && racksData.length > 0) {
      console.log("First rack:", racksData[0]);
      console.log("Tanks in first rack:", racksData[0].tanks);
    }
    return racksData;
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [isColorMappingOpen, setIsColorMappingOpen] = useState(false);

  useEffect(() => {
    const fetchRacks = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log("RackList: Fetching racks with token:", token ? "token present" : "no token");
        
        const response = await axios.get('${process.env.REACT_APP_API_BASE_URL}/racks', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log("RackList: Racks fetched successfully, count:", response.data.length);
        dispatch(setRacks(response.data));
      } catch (error) {
        console.error('RackList: Error fetching racks:', error);
      }
    };
    
    fetchRacks();
  }, [dispatch]);

  // Keep all handler functions unchanged...
  const handleTankMove = async (tankId, sourcePosition, destinationPosition) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${process.env.REACT_APP_API_BASE_URL}/tanks/${tankId}/position`, 
        { position: destinationPosition },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      // Refresh racks data after successful move
      const response = await axios.get('${process.env.REACT_APP_API_BASE_URL}/racks');
      dispatch(setRacks(response.data));
    } catch (error) {
      console.error('Error moving tank:', error);
    }
  };

  const handleCreateRack = async (rackData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/racks`,
        rackData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.row_configs) {
        const { data: updatedRacks } = await axios.get('${process.env.REACT_APP_API_BASE_URL}/racks', {
          headers: { Authorization: `Bearer ${token}` }
        });
        dispatch(setRacks(updatedRacks));
      }

      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error creating rack:', error);
    }
  };

  const handleDeleteRack = async (rackId) => {
    if (!window.confirm('Are you sure you want to delete this rack?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/racks/${rackId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Refresh racks data after deletion
      const { data: updatedRacks } = await axios.get(
        '${process.env.REACT_APP_API_BASE_URL}/racks',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      dispatch(setRacks(updatedRacks));
    } catch (error) {
      console.error('Error deleting rack:', error);
    }
  };

  const handleSearch = async (searchData) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Search data:', searchData);
      
      const { data } = await axios.post(
        '${process.env.REACT_APP_API_BASE_URL}/search/tanks',
        searchData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Search response data:', data);
      
      // Transform the data to match the expected format
      const transformedResults = {};
      for (const [rackId, rackData] of Object.entries(data)) {
        transformedResults[rackId] = {
          ...rackData,
          id: parseInt(rackId),
          name: rackData.rack_name || rackData.name,
          tanks: rackData.tanks || [],
          row_configs: rackData.row_configs || {},
          dimensions: rackData.dimensions || '6x10'  // default dimensions if not provided
        };
      }
      
      console.log('Transformed results:', transformedResults);
      setSearchResults(transformedResults);
      setIsSearchDialogOpen(false);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleColorMapping = async (mappingData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '${process.env.REACT_APP_API_BASE_URL}/tanks/color-mapping',
        mappingData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (response.data) {
        // Refresh racks after color update
        const { data: updatedRacks } = await axios.get(
          '${process.env.REACT_APP_API_BASE_URL}/racks',
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        dispatch(setRacks(updatedRacks));
      }
    } catch (error) {
      console.error('Error applying color mapping:', error);
    }
  };

  const handleTankSave = async (updatedTank, tankData, config) => {
    if (!updatedTank.id) {
      // This is a new tank creation
      await axios.post('${process.env.REACT_APP_API_BASE_URL}/tanks', tankData, config);
    } else {
      // This is an existing tank update
      await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/tanks/${updatedTank.id}`,
        {
          ...updatedTank,
          size: updatedTank.size.toLowerCase(),
        },
        config
      );
    }
  };

  // Update the renderRacks function with enhanced UI separation
  const renderRacks = () => {
    if (searchResults) {
      // Calculate total stats for search results
      const totalStats = Object.values(searchResults).reduce((acc, rackData) => {
        acc.totalTanks += rackData.tanks.length;
        rackData.tanks.forEach(tank => {
          if (tank.subdivisions) {
            tank.subdivisions.forEach(sub => {
              if (sub.gender && sub.count) {
                acc.totalFish[sub.gender] = (acc.totalFish[sub.gender] || 0) + sub.count;
              }
            });
          }
        });
        return acc;
      }, { totalTanks: 0, totalFish: {} });
  
      return (
        <Card sx={{ mb: 2, boxShadow: 3, width: '100%' }}>
          <CardContent>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Search Results
              </Typography>
              {/* Add Stats Summary */}
              <Paper sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2">
                      Total Matching Tanks: {totalStats.totalTanks}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <Typography variant="subtitle2" gutterBottom>
                      Total Fish in Results:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {Object.entries(totalStats.totalFish).map(([gender, count]) => (
                        <Chip
                          key={gender}
                          label={`${gender}: ${count}`}
                          size="small"
                          sx={{
                            bgcolor: gender === 'MALE' ? '#bfe6ff' :
                                    gender === 'FEMALE' ? '#ffd4df' :
                                    gender === 'JUVENILE' ? '#fff3b0' : '#c1f4c1',
                            color: 'rgba(0, 0, 0, 0.75)'
                          }}
                        />
                      ))}
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
  
            {/* Existing search results display */}
            {Object.entries(searchResults).map(([rackId, rackData]) => (
              <Box key={rackId} sx={{ mb: 2 }}>
                <Typography variant="subtitle1">
                  {rackData.rack_name || rackData.name} ({rackData.lab_id})
                </Typography>
                <Grid container spacing={1}>
                  {rackData.tanks.map((tank) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={tank.id}>
                      <Paper
                        sx={{
                          p: 2,
                          backgroundColor: tank.color || '#bbdefb',
                          '&:hover': {
                            boxShadow: 3,
                            cursor: 'pointer'
                          }
                        }}
                      >
                        <Typography>Position: {tank.position}</Typography>
                        <Typography>Size: {tank.size}</Typography>
                        {tank.line && <Typography>Line: {tank.line}</Typography>}
                        {tank.dob && <Typography>DOB: {tank.dob}</Typography>}
                        {tank.subdivisions?.map((sub, i) => (
                          <Typography key={i}>
                            {sub.gender}: {sub.count}
                          </Typography>
                        ))}
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}
            <Button 
              variant="outlined"
              onClick={() => setSearchResults(null)}
              sx={{ mt: 2 }}
            >
              Clear Results
            </Button>
          </CardContent>
        </Card>
      );
    }
  
    // Enhanced UI for default view - show all racks with better separation
    return racks.map((rack) => {
      return (
        <Paper 
          key={rack.id} 
          sx={{ 
            mb: 6, // Increased margin between racks
            pb: 3,
            borderRadius: 2,
            boxShadow: 3,
            overflow: 'hidden',
            border: '1px solid #e0e0e0',
            width: '100%'
          }}
        >
          {/* Neutral Rack Header */}
          <Box 
            sx={{ 
              p: 2.5, 
              mb: 2,
              backgroundColor: '#f8f8f8', // Neutral light gray background
              borderBottom: '1px solid #e0e0e0', // Subtle border
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar 
                sx={{ 
                  bgcolor: theme.palette.primary.main, 
                  mr: 2,
                  height: 45,
                  width: 45
                }}
              >
                <RackIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {rack.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Lab ID: {rack.lab_id} | Dimensions: {rack.dimensions}
                </Typography>
              </Box>
            </Box>
            <IconButton 
              onClick={() => handleDeleteRack(rack.id)}
              color="error"
              size="small"
              sx={{ 
                border: '1px solid rgba(211, 47, 47, 0.5)', 
                '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.1)' } 
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
          
          {/* Keep existing rack stats and grid */}
          <Box sx={{ px: 1 }}>  {/* Reduced padding from px: 3 to px: 1 */}
            <RackStats rack={rack} />
            <RackGrid rack={rack} onTankMove={handleTankMove} />
          </Box>
        </Paper>
      );
    });
  };

  console.log('Updated racks in RackList:', racks);

  return (
    <Box 
      sx={{
        width: '100%', 
        maxWidth: '100vw', // Use full viewport width instead of fixed pixels
        mx: 0, // No horizontal margin
        px: { xs: 1, sm: 1, md: 1, lg: 1, xl: 1 }, // Minimal padding on all screen sizes
      }}
    >
      {/* Control Header */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsDialogOpen(true)}
          sx={{ boxShadow: 2 }}
        >
          Create Rack
        </Button>
        <Button
          variant="outlined"
          startIcon={<SearchIcon />}
          onClick={() => setIsSearchDialogOpen(true)}
        >
          Search
        </Button>
        <Button
          variant="outlined"
          startIcon={<PaletteIcon />}
          onClick={() => setIsColorMappingOpen(true)}
        >
          Color Mapping
        </Button>
        {searchResults && (
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setSearchResults(null)}
          >
            Clear Search Results
          </Button>
        )}
      </Box>
      
      {/* Add Overall Stats Panel */}
      <OverallStatsPanel racks={racks} />
      
      {/* Rack Display */}
      {renderRacks()}

      {/* Dialogs */}
      <RackDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleCreateRack}
      />
      <SearchDialog
        open={isSearchDialogOpen}
        onClose={() => setIsSearchDialogOpen(false)}
        onSearch={handleSearch}
        racks={racks}
      />
      <ColorMappingDialog
        open={isColorMappingOpen}
        onClose={() => setIsColorMappingOpen(false)}
        onApply={handleColorMapping}
        racks={racks}
      />
    </Box>
  );
};

export default RackList;
