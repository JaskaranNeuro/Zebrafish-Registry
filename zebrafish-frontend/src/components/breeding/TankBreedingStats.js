// zebrafish-frontend/src/components/breeding/TankBreedingStats.js
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Grid, FormControl, InputLabel, 
  Select, MenuItem, CircularProgress, Button, Card, CardContent 
} from '@mui/material';
import { 
  PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine 
} from 'recharts';
import axios from 'axios';

// Replace the current CustomPieLabel function with this version

const CustomPieLabel = ({ cx, cy, midAngle, outerRadius, percent, fill }) => {
  // Don't render labels for very small segments
  if (percent < 0.05) return null;
  
  const RADIAN = Math.PI / 180;
  // Position labels OUTSIDE the segments
  const radius = outerRadius * 1.1; // Position labels at 120% of radius (outside)
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  // Determine text anchor based on position
  const textAnchor = x > cx ? 'start' : 'end';
  
  return (
    <text 
      x={x} 
      y={y} 
      fill={fill} // Use segment color for the text
      textAnchor={textAnchor}
      dominantBaseline="central"
      style={{
        fontWeight: 'bold',
        fontSize: '16px',
        textShadow: '0 0 3px #FFF, 0 0 3px #FFF' // White shadow for better contrast
      }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const TankBreedingStats = () => {
  const [racks, setRacks] = useState([]);
  const [selectedRack, setSelectedRack] = useState('');
  const [tanks, setTanks] = useState([]);
  const [selectedTank, setSelectedTank] = useState('');
  const [breedingHistory, setBreedingHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch racks on component mount
  useEffect(() => {
    const fetchRacks = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/racks`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setRacks(response.data);
      } catch (err) {
        setError('Error loading racks. Please try again.');
        console.error('Error fetching racks:', err);
      }
    };
    
    fetchRacks();
  }, []);
  
  // Add this function to sort tanks by position
  const sortTanksByPosition = (tanks) => {
    if (!tanks || !Array.isArray(tanks)) return [];  // Add this check
    
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

  // Update tanks when rack is selected
  useEffect(() => {
    if (selectedRack) {
      const rack = racks.find(r => r.id === parseInt(selectedRack));
      if (rack) {
        // Sort tanks by position before setting state
        const sortedTanks = sortTanksByPosition(rack.tanks);
        setTanks(sortedTanks);
        setSelectedTank(''); // Reset selected tank
      }
    } else {
      setTanks([]);
      setSelectedTank('');
    }
  }, [selectedRack, racks]);
  
  const fetchBreedingHistory = async () => {
    if (!selectedTank) return;
    
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/breeding/tank-history/${selectedTank}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setBreedingHistory(response.data);
    } catch (err) {
      setError('Error loading breeding history. Please try again.');
      console.error('Error fetching breeding history:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to prepare data for the pie chart
  const preparePieChartData = () => {
    if (!breedingHistory) return [];
    
    const maleStats = { success: 0, fail: 0, unknown: 0, total: 0 };
    const femaleStats = { success: 0, fail: 0, unknown: 0, total: 0 };
    
    breedingHistory.breeding_history.forEach(record => {
      if (record.males_used > 0) {
        maleStats.total++;
        if (record.breeding_result === true) maleStats.success++;
        else if (record.breeding_result === false) maleStats.fail++;
        else maleStats.unknown++;
      }
      
      if (record.females_used > 0) {
        femaleStats.total++;
        if (record.breeding_result === true) femaleStats.success++;
        else if (record.breeding_result === false) femaleStats.fail++; // Fixed: was using maleStats.fail
        else femaleStats.unknown++; // Fixed: was using maleStats.unknown
      }
    });
    
    const pieData = [];
    
    if (maleStats.total > 0) {
      pieData.push({
        gender: 'Male',
        data: [
          { name: 'Successful', value: maleStats.success, fill: '#4caf50' },
          { name: 'Failed', value: maleStats.fail, fill: '#f44336' },
          { name: 'No Result', value: maleStats.unknown, fill: '#9e9e9e' }
        ].filter(item => item.value > 0) // Only include non-zero values
      });
    }
    
    if (femaleStats.total > 0) {
      pieData.push({
        gender: 'Female',
        data: [
          { name: 'Successful', value: femaleStats.success, fill: '#4caf50' },
          { name: 'Failed', value: femaleStats.fail, fill: '#f44336' }, // Fixed: was using maleStats.fail
          { name: 'No Result', value: femaleStats.unknown, fill: '#9e9e9e' } // Fixed: was using maleStats.unknown
        ].filter(item => item.value > 0) // Only include non-zero values
      });
    }
    
    return pieData;
  };

  // Custom tooltip for timeline chart
  const TimelineTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    
    let status;
    if (data.result === null) {
      status = "Not Used for Breeding";
    } else if (data.result === 1) {
      status = "Breeding Successful";
    } else if (data.result === 0) {
      status = "Breeding Failed";
    } else {
      status = "No Result Set"; // Changed from "Unknown" to "No Result Set"
    }
    
    return (
      <Paper sx={{ p: 1 }}>
        <Typography variant="body2">{`Date: ${data.date}`}</Typography>
        <Typography variant="body2">{`Status: ${status}`}</Typography>
        {data.used > 0 && (
          <Typography variant="body2">{`Fish Used: ${data.used}`}</Typography>
        )}
      </Paper>
    );
  };

  // Update the prepareTimelineData function to handle dates correctly
  const prepareTimelineData = () => {
    if (!breedingHistory) return { maleData: [], femaleData: [] };
    
    const maleData = [];
    const femaleData = [];
    
    breedingHistory.breeding_history.forEach(record => {
      // Parse the date and ensure it's treated as a date in local time
      // This fixes the timezone shift that's causing the one-day offset
      const dateParts = record.date.split('T')[0].split('-');
      const localDate = `${dateParts[0]}-${dateParts[1]}-${dateParts[2]}`;
      
      // Add male data if males were used in this breeding
      if (record.males_used > 0) {
        maleData.push({
          date: localDate, // Use the corrected local date
          result: record.breeding_result === true ? 1 : 
                  record.breeding_result === false ? 0 : 0.5,
          used: record.males_used,
          position: record.position
        });
      }
      
      // Add female data if females were used in this breeding
      if (record.females_used > 0) {
        femaleData.push({
          date: localDate, // Use the corrected local date
          result: record.breeding_result === true ? 1 : 
                  record.breeding_result === false ? 0 : 0.5,
          used: record.females_used,
          position: record.position
        });
      }
    });
    
    // Sort data by date
    maleData.sort((a, b) => new Date(a.date) - new Date(b.date));
    femaleData.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return { maleData, femaleData };
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Tank Breeding Statistics</Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
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
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth disabled={!selectedRack}>
              <InputLabel>Select Tank</InputLabel>
              <Select
                value={selectedTank}
                label="Select Tank"
                onChange={(e) => setSelectedTank(e.target.value)}
              >
                <MenuItem value="">
                  <em>Select a tank</em>
                </MenuItem>
                {tanks.map((tank) => {
                  // Debug the subdivisions data
                  console.log('Tank subdivisions for', tank.position, ':', tank.subdivisions);
                  
                  // Calculate male and female counts with more flexible comparison
                  const maleCount = tank.subdivisions ? 
                    tank.subdivisions.filter(s => 
                      s.gender === 'MALE' || 
                      s.gender === 'male' || 
                      (typeof s.gender === 'object' && s.gender?.value === 'MALE')
                    ).reduce((sum, s) => sum + (s.count || 0), 0) : 0;
                    
                  const femaleCount = tank.subdivisions ? 
                    tank.subdivisions.filter(s => 
                      s.gender === 'FEMALE' || 
                      s.gender === 'female' || 
                      (typeof s.gender === 'object' && s.gender?.value === 'FEMALE')
                    ).reduce((sum, s) => sum + (s.count || 0), 0) : 0;
                  
                  // Create gender info string with symbols
                  const genderInfo = `(♂️${maleCount} ♀️${femaleCount})`;
                  
                  return (
                    <MenuItem key={tank.id} value={tank.id}>
                      {`${tank.position} - ${tank.line || 'Unspecified Line'} ${genderInfo}`}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Button 
              variant="contained" 
              onClick={fetchBreedingHistory}
              disabled={!selectedTank}
              fullWidth
            >
              View Breeding History
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {error && (
        <Box sx={{ my: 2 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}
      
      {breedingHistory && !loading && (
        <Box>
          <Typography variant="h5" gutterBottom>
            Breeding Statistics for Tank {breedingHistory.tank.position} ({breedingHistory.tank.line || 'Unspecified Line'})
          </Typography>
          
          {breedingHistory.breeding_history.length === 0 ? (
            <Typography sx={{ my: 2 }}>
              No breeding history found for this tank.
            </Typography>
          ) : (
            <Grid container spacing={3}>
              {/* Pie Charts showing success rates by gender */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Breeding Success Rate</Typography>
                    
                    {preparePieChartData().map((genderData, index) => (
                      <Box key={genderData.gender} sx={{ 
                        height: preparePieChartData().length > 1 ? 320 : 420, // Increase height for better spacing
                        mt: index > 0 ? 2 : 0,
                        mb: 4 // Increase bottom margin
                      }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }} gutterBottom>
                          {genderData.gender} Fish
                        </Typography>
                        
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart margin={{ top: 70, right: 70, bottom: 70, left: 70 }}> 
                            {/* Increased all margins to prevent cutting off */}
                            <Pie
                              data={genderData.data}
                              cx="50%"
                              cy="45%" 
                              label={CustomPieLabel}
                              labelLine={false}
                              outerRadius={100}
                              dataKey="value"
                              minAngle={0} // Ensure small segments are visible
                            >
                              {genderData.data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value, name) => [`${value} instances`, name]} />
                            <Legend 
                              verticalAlign="bottom" 
                              height={2}
                              wrapperStyle={{ paddingTop: 80 }}
                              layout="horizontal"
                              iconType="circle"
                              iconSize={14}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                    ))}
                    
                    {preparePieChartData().length === 0 && (
                      <Typography variant="body2" sx={{ mt: 2 }}>
                        No breeding data available to show success rate.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Timeline Charts showing breeding over time */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Breeding Timeline</Typography>
                    
                    {preparePieChartData().map((genderData, index) => (
                      <Box 
                        key={genderData.gender} 
                        sx={{ 
                          height: preparePieChartData().length > 1 ? 320 : 400, // Changed from 200 to 300 for multiple genders
                          mt: index > 0 ? 4 : 0,
                          mb: 2
                        }}
                      >
                        <Typography variant="subtitle1" gutterBottom>
                          {genderData.gender} Fish
                        </Typography>
                        
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart margin={{ top: 10, right: 30, left: 70, bottom: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              type="category"
                              allowDuplicatedCategory={false}
                              tickFormatter={(value) => {
                                // Handle the date format consistently to ensure correct display
                                const [year, month, day] = value.split('-');
                                return `${month}/${day}`;
                              }}
                              height={40}
                              angle={-45}
                              textAnchor="end"
                              tick={{ fontSize: 10 }}
                            />
                            <YAxis 
                              domain={[0, 1]}
                              tickCount={3}
                              width={70}
                              tickFormatter={(value) => {
                                if (value === 1) return 'Success';
                                if (value === 0.5) return 'No Result';
                                if (value === 0) return 'Failed';
                                return '';
                              }}
                            />
                            <Tooltip content={<TimelineTooltip />} />
                            <Legend verticalAlign="top" height={36} />
                            
                            {/* Add position change reference lines */}
                            {(breedingHistory?.positionHistory || []).map((change, idx) => {
                              if (idx > 0 && change.startDate) { // Skip first position
                                return (
                                  <ReferenceLine
                                    key={`pos-${idx}`}
                                    x={change.startDate}
                                    stroke="#FF9800"
                                    strokeDasharray="3 3"
                                    label={{
                                      value: `→ ${change.position}`,
                                      position: 'top',
                                      fill: '#FF9800',
                                      fontSize: 10
                                    }}
                                  />
                                );
                              }
                              return null;
                            })}
                            
                            {/* Show line based on gender */}
                            <Line
                              name={`${genderData.gender} Fish`}
                              data={genderData.gender === 'Male' ? 
                                prepareTimelineData().maleData : 
                                prepareTimelineData().femaleData}
                              dataKey="result"
                              stroke={genderData.gender === 'Male' ? "#1976d2" : "#e91e63"}
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              connectNulls={false}
                              activeDot={{ r: 6 }}
                              isAnimationActive={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                    ))}
                    
                    {preparePieChartData().length === 0 && (
                      <Typography variant="body2" sx={{ mt: 2 }}>
                        No breeding data available to show timeline.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Summary Statistics */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Summary</Typography>
                  <Typography variant="body1">
                    Total Breeding Events: {breedingHistory.breeding_history.length}
                  </Typography>
                </Paper>
              </Grid>

              {/* Tank History */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>Tank History</Typography>
                  {breedingHistory && breedingHistory.positionHistory && breedingHistory.positionHistory.length > 1 ? (
                    <Box>
                      <Typography variant="body1" color="text.secondary" gutterBottom>
                        This tank has been moved between positions:
                      </Typography>
                      
                      {/* Sort history by date (newest first) and display as transitions */}
                      {[...breedingHistory.positionHistory]
                        .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
                        .map((entry, index, array) => {
                          // Get previous position (if available)
                          const prevPosition = index < array.length - 1 ? array[index + 1].position : null;
                          const moveDate = new Date(entry.startDate).toLocaleDateString();
                          const isCurrentPosition = index === 0;
                          const isOriginalPosition = index === array.length - 1;
                          
                          return (
                            <Box key={index} sx={{ mb: 1, pl: 2, borderLeft: '2px solid #e0e0e0' }}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: (isCurrentPosition || isOriginalPosition) ? 'bold' : 'normal' 
                                }}
                              >
                                {isCurrentPosition && prevPosition
                                  ? `Current position: ${entry.position} (moved from ${prevPosition} on ${moveDate})`
                                  : prevPosition 
                                    ? `Moved from ${prevPosition} to ${entry.position} on ${moveDate}`
                                    : `Original position: ${entry.position} (since ${moveDate})`
                                }
                              </Typography>
                            </Box>
                          );
                        })}
                    </Box>
                  ) : (
                    <Typography variant="body2">
                      This tank has maintained its current position.
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>
          )}
        </Box>
      )}
    </Box>
  );
};

export default TankBreedingStats;
