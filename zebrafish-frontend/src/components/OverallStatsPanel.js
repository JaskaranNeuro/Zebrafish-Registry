import React from 'react';
import { Box, Paper, Typography, Divider, useTheme, Grid } from '@mui/material';
import AgeDistributionStats from './AgeDistributionStats';
import { calculateOverallStats } from '../utils/rackStats';
import MaleIcon from '@mui/icons-material/Male';
import FemaleIcon from '@mui/icons-material/Female';
import WaterIcon from '@mui/icons-material/Water';
import SetMealIcon from '@mui/icons-material/SetMeal';
import AssessmentIcon from '@mui/icons-material/Assessment';

const OverallStatsPanel = ({ racks }) => {
  const theme = useTheme();
  const overallStats = calculateOverallStats(racks);
  
  // Skip rendering if no data
  if (!overallStats || overallStats.totalFishCount === 0) return null;

  // Updated gender colors to ensure no overlap with age distribution colors
  const genderConfig = {
    MALE: { 
      icon: <MaleIcon />, 
      color: '#000000', // Indigo - different from age bar blues
      barColor: '#3949ab'
    },
    FEMALE: { 
      icon: <FemaleIcon />, 
      color:'#000000',
      barColor: '#e91e63' 
    },
    JUVENILE: { 
     
      color: '#000000', // Teal - different from age bar greens
      barColor: '#00796b'
    },
    LARVAE: { 
     
      color: '#000000', // Deep orange - different from age bar oranges
      barColor: '#d84315'
    }
  };
  
  // Define the order of genders for consistent display
  const genderOrder = ["MALE", "FEMALE", "JUVENILE", "LARVAE"];
  
  // Filter out empty gender categories
  const nonEmptyGenders = genderOrder
    .filter(gender => overallStats.totalFish[gender] > 0)
    .map(gender => [gender, overallStats.totalFish[gender]]);
  
  // Calculate percentage for each gender
  const totalFishCount = overallStats.totalFishCount || 0;
  const genderWithPercentage = nonEmptyGenders.map(([gender, count]) => ({
    gender,
    count,
    percentage: totalFishCount ? Math.round((count / totalFishCount) * 100) : 0
  }));

  return (
    <Box 
      sx={{ 
        mb: 5, // Increased margin bottom for more separation
        position: 'relative',
        zIndex: 1,
        // Removed the ::after pseudo-element completely
      }}
    >
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          border: `2px solid ${theme.palette.primary.light}`,
          borderRadius: 2,
          background: theme.palette.background.paper,
          position: 'relative',
          zIndex: 2,
          overflow: 'visible',
          // Keep only the top accent bar
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '5px',
            backgroundColor: theme.palette.primary.main,
            zIndex: 3
          }
        }}
      >
        {/* Header with icon */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <AssessmentIcon 
            color="primary" 
            sx={{ mr: 1, fontSize: 28 }}
          />
          <Typography 
            variant="h5" 
            sx={{ 
              color: theme.palette.primary.main,
              fontWeight: 'bold'
            }}
          >
            Facility-Wide Statistics
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 3, backgroundColor: theme.palette.primary.light }} />
        
        <Box sx={{ mb: 2 }}>
          <Typography 
            variant="body1" 
            gutterBottom
            sx={{ fontWeight: 'medium', fontSize: '1.1rem' }}
          >
            Total Tanks: {overallStats.totalTanks}
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Typography 
              variant="body1" 
              sx={{ fontWeight: 'medium', fontSize: '1.1rem', mb: 1 }}
            >
              Fish Count:
            </Typography>
            
            <Grid container spacing={2}>
              {genderWithPercentage.map(({ gender, count, percentage }) => (
                <Grid item xs={6} sm={3} key={gender}>
                  <Box 
                    sx={{ 
                      p: 1.5, 
                      borderRadius: 1,
                      border: `1px solid ${theme.palette.divider}`,
                      bgcolor: 'background.paper',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      boxShadow: 'none' // Removed shadow completely
                    }}
                  >
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 1,
                        color: genderConfig[gender].color
                      }}
                    >
                      {genderConfig[gender].icon}
                      <Typography 
                        variant="subtitle1" 
                        sx={{ ml: 1, fontWeight: 'bold' }}
                      >
                        {gender}
                      </Typography>
                    </Box>
                    
                    <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                      {count}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary">
                      {percentage}% of total
                    </Typography>
                    
                    <Box 
                      sx={{ 
                        mt: 1, 
                        width: '100%', 
                        height: 4, 
                        bgcolor: theme.palette.grey[200],
                        borderRadius: 5,
                        overflow: 'hidden'
                      }}
                    >
                      <Box 
                        sx={{ 
                          width: `${percentage}%`, 
                          height: '100%', 
                          bgcolor: genderConfig[gender].barColor,
                          borderRadius: 5
                        }} 
                      />
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
        
        <AgeDistributionStats 
          ageDistribution={overallStats.ageDistribution}
          title="Overall Age Distribution" 
        />
      </Paper>

      {/* Add a simple margin spacer instead of using the ::after pseudo-element */}
      <Box sx={{ height: 20 }} />
    </Box>
  );
};

export default OverallStatsPanel;