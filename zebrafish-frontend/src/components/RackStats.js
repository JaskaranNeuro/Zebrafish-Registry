import React from 'react';
import { Box, Typography, Tooltip, Grid, Stack, Button, Divider } from '@mui/material';
import { calculateRackStats } from '../utils/rackStats';
import { utils as xlsxUtils, writeFile } from 'xlsx-js-style';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AgeDistributionStats from './AgeDistributionStats';

// Define Excel's supported colors
const excelColors = [
  { name: 'Light Blue', rgb: 'BFE6FF' },   // MALE
  { name: 'Light Pink', rgb: 'FFD4DF' },   // FEMALE
  { name: 'Light Yellow', rgb: 'FFF3B0' }, // LARVAE
  { name: 'Light Green', rgb: 'C1F4C1' },  // JUVENILE
  { name: 'Default Blue', rgb: 'BBDEFB' }  // Default color
];

// Helper functions for color matching
const hexToRgb = (hex) => {
  if (!hex) hex = "BBDEFB";
  const bigint = parseInt(hex, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
};

const calculateDistance = (rgb1, rgb2) => {
  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
    Math.pow(rgb1.g - rgb2.g, 2) +
    Math.pow(rgb1.b - rgb2.b, 2)
  );
};

const getClosestColor = (targetHex) => {
  const targetRgb = hexToRgb(targetHex);
  let closestColor = excelColors[0];
  let minDistance = Infinity;

  excelColors.forEach(color => {
    const colorRgb = hexToRgb(color.rgb);
    const distance = calculateDistance(targetRgb, colorRgb);
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color;
    }
  });

  return closestColor.rgb;
};

const RackStats = ({ rack }) => {
  const stats = calculateRackStats(rack);
  
  const genderOrder = ['MALE', 'FEMALE', 'JUVENILE', 'LARVAE'];
  const nonEmptyGenders = Object.entries(stats.totalFish)
    .filter(([gender, count]) => count > 0)
    .sort((a, b) => genderOrder.indexOf(a[0]) - genderOrder.indexOf(b[0]));

  const genderColors = {
    MALE: '#bfe6ff',
    FEMALE: '#ffd4df',
    LARVAE: '#fff3b0',
    JUVENILE: '#c1f4c1'
  };

  const handleExport = () => {
    // Sort tanks by position
    const sortedTanks = [...rack.tanks].sort((a, b) => {
      const aRow = a.position.charAt(0);
      const bRow = b.position.charAt(0);
      if (aRow !== bRow) return aRow.localeCompare(bRow);
      return parseInt(a.position.slice(1)) - parseInt(b.position.slice(1));
    });

    // Prepare data for export
    const exportData = sortedTanks.map(tank => {
      // Initialize fish counts
      const fishCounts = {
        'MALE': 0,
        'FEMALE': 0,
        'LARVAE': 0,
        'JUVENILE': 0
      };
      
      // Calculate counts from subdivisions
      if (tank.subdivisions && Array.isArray(tank.subdivisions)) {
        tank.subdivisions.forEach(sub => {
          const gender = sub.gender?.toUpperCase();
          const count = parseInt(sub.count) || 0;
          if (gender && gender in fishCounts) {
            fishCounts[gender] += count;
          }
        });
      }

      // Calculate total fish count
      const totalFish = tank.subdivisions?.reduce((sum, sub) => 
        sum + (parseInt(sub.count) || 0), 0) || 0;

      return {
        'Position': tank.position,
        'Size': tank.size || 'REGULAR',
        'Line': tank.line || '',
        'DOB': tank.dob || '',
        'Color': tank.color || '#bbdefb',
        'Male Count': fishCounts['MALE'],
        'Female Count': fishCounts['FEMALE'],
        'Larvae Count': fishCounts['LARVAE'],
        'Juvenile Count': fishCounts['JUVENILE'],
        'Total Fish': totalFish
      };
    });

    // Create worksheet
    const ws = xlsxUtils.json_to_sheet(exportData);

    // Define column references
    const colorColumn = 'E';  // Add this line
    const genderColumns = ['F', 'G', 'H', 'I'];  // Add this line
    const totalColumn = 'J';  // Add this line

    // Define columns and add headers
    const headers = [
      'Position', 'Size', 'Line', 'DOB', 'Color',
      'Male Count', 'Female Count', 'Larvae Count', 'Juvenile Count', 'Total Fish'
    ];

    // Style headers
    headers.forEach((header, idx) => {
      const col = String.fromCharCode(65 + idx); // Convert 0-9 to A-J
      ws[`${col}1`] = {
        v: header,
        s: {
          font: { bold: true },
          alignment: { horizontal: 'center' }
        }
      };
    });

    // Set column widths
    ws['!cols'] = [
      { wch: 10 },  // Position
      { wch: 10 },  // Size
      { wch: 15 },  // Line
      { wch: 12 },  // DOB
      { wch: 15 },  // Color
      { wch: 12 },  // Male Count
      { wch: 12 },  // Female Count
      { wch: 12 },  // Larvae Count
      { wch: 12 },  // Juvenile Count
      { wch: 12 }   // Total Fish
    ];

    // Add formatting
    const range = xlsxUtils.decode_range(ws['!ref']);
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const tankIndex = row - 1;
      const tank = sortedTanks[tankIndex];
      const hexColor = tank.color || '#bbdefb';
      const closestRgb = getClosestColor(hexColor.replace('#', ''));

      // Apply color formatting
      const colorCellRef = `${colorColumn}${row + 1}`;
      ws[colorCellRef] = { 
        t: 'str', 
        v: ' ',
        s: {
          fill: {
            patternType: 'solid',
            fgColor: { rgb: closestRgb }
          },
          alignment: { horizontal: 'center' }
        }
      };

      // Format gender count columns
      genderColumns.forEach((col, idx) => {
        const gender = ['MALE', 'FEMALE', 'LARVAE', 'JUVENILE'][idx];
        const genderCellRef = `${col}${row + 1}`;
        const count = tank.subdivisions?.reduce((sum, sub) => {
          return sub.gender?.toUpperCase() === gender ? sum + (parseInt(sub.count) || 0) : sum;
        }, 0) || 0;
        
        ws[genderCellRef] = {
          t: 'n',
          v: count,
          s: {
            alignment: { horizontal: 'center' }
          }
        };
      });

      // Format total count column
      const totalCellRef = `${totalColumn}${row + 1}`;
      const totalCount = tank.subdivisions?.reduce((sum, sub) => 
        sum + (parseInt(sub.count) || 0), 0) || 0;
      
      ws[totalCellRef] = {
        t: 'n',
        v: totalCount,
        s: {
          alignment: { horizontal: 'center' },
          font: { bold: true }
        }
      };
    }

    // Create workbook and add worksheet
    const wb = xlsxUtils.book_new();
    xlsxUtils.book_append_sheet(wb, ws, 'Tank Data');

    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0];
    const filename = `${rack.name}_tank_data_${date}.xlsx`;

    // Write file
    try {
      writeFile(wb, filename);
    } catch (error) {
      console.error('Error exporting Excel file:', error);
    }
  };

  return (
    <Box sx={{ mt: 1, mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={3}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Tooltip title="Number of tanks in this rack">
              <Typography variant="body1" fontWeight="medium">
                Total Tanks: {stats.totalTanks}
              </Typography>
            </Tooltip>
            
            <Tooltip title="Export rack data to Excel">
              <Button
                size="small"
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={handleExport}
              >
                Export
              </Button>
            </Tooltip>
          </Stack>
        </Grid>
        <Grid item xs={12} sm={9}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body1" fontWeight="medium" sx={{ mr: 1 }}>
              Fish Count:
            </Typography>
            
            {/* Updated gender display with transparent boxes and black borders */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {nonEmptyGenders.map(([gender, count]) => (
                <Box 
                  key={gender}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    border: '1px solid rgba(0, 0, 0, 0.23)',
                    borderRadius: '16px',
                    px: 1.5,
                    py: 0.5,
                    backgroundColor: 'transparent'
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'text.primary' }}>
                    {gender}: {count}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Stack>
        </Grid>
      </Grid>
      
      {/* Add Age Distribution Stats if there are fish with DOB data */}
      {stats.totalFishCount > 0 && (
        <AgeDistributionStats ageDistribution={stats.ageDistribution} />
      )}
    </Box>
  );
};

export default RackStats;