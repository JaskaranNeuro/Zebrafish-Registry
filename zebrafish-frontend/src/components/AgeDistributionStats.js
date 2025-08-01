import React from 'react';
import { Box, Typography, Paper, Grid, Divider } from '@mui/material';

const AgeDistributionStats = ({ ageDistribution, title = "Age Distribution" }) => {
  if (!ageDistribution) return null;
  
  // Age categories to display
  const ageCategories = [
    { 
      label: "< 6 months", 
      count: ageDistribution.lessThan6Months || 0, 
      percent: ageDistribution.lessThan6MonthsPercent || 0 
    },
    { 
      label: "1-2 years", 
      count: ageDistribution.oneToTwoYears || 0, 
      percent: ageDistribution.oneToTwoYearsPercent || 0 
    },
    { 
      label: "2-3 years", 
      count: ageDistribution.twoToThreeYears || 0, 
      percent: ageDistribution.twoToThreeYearsPercent || 0 
    },
    { 
      label: "> 3 years", 
      count: ageDistribution.overThreeYears || 0, 
      percent: ageDistribution.overThreeYearsPercent || 0 
    }
  ];

  return (
    <Paper sx={{ p: 1, mt: 1, mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>{title}</Typography>
      <Divider sx={{ mb: 1 }} />
      
      <Grid container spacing={1}>
        {ageCategories.map((category, index) => (
          <Grid item xs={6} sm={3} key={index}>
            <Box sx={{ textAlign: 'center', p: 0.5 }}>
              <Typography variant="subtitle2">{category.label}</Typography>
              <Box 
                sx={{ 
                  height: 8, 
                  bgcolor: '#e0e0e0', 
                  borderRadius: 1, 
                  overflow: 'hidden',
                  mb: 0.5
                }}
              >
                <Box 
                  sx={{ 
                    width: `${Math.min(100, category.percent)}%`, 
                    height: '100%', 
                    bgcolor: index === 0 ? '#4caf50' : 
                             index === 1 ? '#2196f3' : 
                             index === 2 ? '#ff9800' : '#f44336'
                  }} 
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {category.count} fish ({category.percent}%)
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default AgeDistributionStats;