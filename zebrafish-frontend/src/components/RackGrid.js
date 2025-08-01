import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Tooltip, Button, CircularProgress } from '@mui/material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setRacks } from '../store/racksSlice';
import TankDialog from './TankDialog';
import { TankSizeEnum, GenderEnum } from '../utils/enums';
import RowConfigDialog from './RowConfigDialog';
import { Settings as SettingsIcon } from '@mui/icons-material';

const RackGrid = ({ rack, onTankMove }) => {
  const [selectedTank, setSelectedTank] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRowConfigOpen, setIsRowConfigOpen] = useState(false);
  const dispatch = useDispatch();
  const containerRef = React.useRef(null);

  // Add this function to your RackGrid component to handle token validation
  const getValidatedToken = () => {
    const token = localStorage.getItem('token');
    
    // Check if token exists and has the correct format (three segments separated by dots)
    if (!token || token.split('.').length !== 3) {
      console.error('Invalid token structure detected. Token segments:', token?.split('.').length);
      // Force user to re-authenticate
      window.location.href = '/login';
      return null;
    }
    
    return token;
  };

  // Add this helper function
  const createAuthConfig = (additionalHeaders = {}) => {
    const token = getValidatedToken();
    if (!token) return null;
    
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...additionalHeaders
      }
    };
  };

  // Enhanced effectiveRack definition with better null handling
  const effectiveRack = React.useMemo(() => {
    if (!rack) return { id: 0, name: '', lab_id: '', rows: 0, columns: 0, row_configs: {}, tanks: [] };
    return {
      ...rack,
      row_configs: rack.row_configs || {},
      // Ensure tanks is always an array
      tanks: Array.isArray(rack.tanks) ? rack.tanks : []
    };
  }, [rack]);

  // Convert “A1” -> [0, 0]
  const getGridPosition = (position) => {
    const row = position.charAt(0).charCodeAt(0) - 65;
    const col = parseInt(position.slice(1), 10) - 1;
    return [row, col];
  };

  // Convert single cell into a range for LARGE tanks
  const getCombinedPosition = (position, size) => {
    if (size.toUpperCase() !== 'LARGE') return position;
    const col = parseInt(position.slice(1), 10);
    const row = position.charAt(0);
    return `${row}${col}-${row}${col + 1}`;
  };

  // Update getColumnCount function
  const getColumnCount = (rowIndex) => {
    const customCount = effectiveRack.row_configs?.[rowIndex.toString()];
    const defaultCount = parseInt(effectiveRack.columns) || 0;
    const result = customCount ? parseInt(customCount) : defaultCount;
    console.log(`Row ${rowIndex}: customCount=${customCount}, defaultCount=${defaultCount}, result=${result}`);
    return result;
  };

  // Update getCellWidth function
  const getCellWidth = (rowIndex) => {
    // Find the max number of columns in any row to use as reference
    const maxCols = Math.max(
      ...Object.values(effectiveRack.row_configs || {}).map(val => parseInt(val) || 0),
      parseInt(effectiveRack.columns) || 0
    );
    
    // Get this row's column count
    const rowCols = getColumnCount(rowIndex);
    
    // All rows should have the same total width
    const standardWidth = 90;
    return rowCols ? (maxCols * standardWidth) / rowCols : standardWidth;
  };

  // Build the grid with proper column counts per row
  const rows = parseInt(effectiveRack?.rows) || 0;
  console.log(`Using rows count: ${rows} from rack:`, effectiveRack);

  const grid = Array(rows).fill().map((_, rowIdx) => {
    const colCount = getColumnCount(rowIdx);
    console.log(`Creating grid row ${rowIdx}:`, {
      colCount,
      rowConfig: effectiveRack?.row_configs?.[rowIdx]
    });
    return Array(parseInt(colCount)).fill(null);
  });

  // Place existing tanks onto the grid
  effectiveRack.tanks.forEach((tank) => {
    const positions = tank.position.split('-');
    const [startRow, startCol] = getGridPosition(positions[0]);
    
    // Enhanced bounds checking with detailed error logging
    if (startRow >= 0 && startRow < grid.length && startCol < grid[startRow].length) {
      grid[startRow][startCol] = tank;

      // Handle large tanks with proper bounds checking
      if (positions.length > 1 || (tank.size && tank.size.toLowerCase() === 'large')) {
        const secondCol = startCol + 1;
        if (secondCol < grid[startRow].length) {
          grid[startRow][secondCol] = 'occupied';
        } else {
          console.error(`Large tank ${tank.id} at position ${tank.position} would extend beyond grid boundaries`);
        }
      }
    } else {
      console.error(`Tank at position ${tank.position} is outside grid boundaries:`, {
        tankId: tank.id,
        gridRows: grid.length,
        gridCols: startRow < grid.length ? grid[startRow].length : 'N/A'
      });
    }
  });

  // Drag & drop
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { destination, draggableId, source } = result;
    const [destRow, destCol] = getGridPosition(destination.droppableId);
    const [sourceRow, sourceCol] = getGridPosition(source.droppableId);
    
    // Get source and destination tanks
    const sourceTank = grid[sourceRow][sourceCol];
    const destTank = grid[destRow][destCol];
    
    // If destination is empty, handle as before
    if (!destTank) {
      if (onTankMove) {
        onTankMove(draggableId, source.droppableId, destination.droppableId);
      }
      return;
    }

    // Check if tanks can be swapped (same size)
    if (sourceTank.size?.toLowerCase() !== destTank.size?.toLowerCase()) {
      setError("Tanks of different sizes cannot be swapped");
      return;
    }

    // Perform the swap
    try {
      setLoading(true);
      const token = getValidatedToken();
      if (!token) return;
      
      // Call new API endpoint to swap tanks
      await axios.post(
        '`${process.env.REACT_APP_API_BASE_URL}/tanks/swap-positions',
        {
          tank1Id: sourceTank.id,
          tank2Id: destTank.id,
          position1: source.droppableId,
          position2: destination.droppableId
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Refresh racks data after swap
      const { data: updatedRacks } = await axios.get(
        '`${process.env.REACT_APP_API_BASE_URL}/racks',
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      dispatch(setRacks(updatedRacks));
      setError(null);
    } catch (err) {
      console.error('Error swapping tanks:', err);
      setError(err.response?.data?.message || 'Failed to swap tanks');
    } finally {
      setLoading(false);
    }
  };

  // Select a tank for editing
  const handleTankClick = (tank) => {
    // Set selectedTank when editing
    setSelectedTank(tank);
  };

  // Save an edited tank
  const handleTankSave = async (updatedTank) => {
    setLoading(true);
    try {
      const token = getValidatedToken();
      if (!token) return;
      
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      if (updatedTank.replacementPosition) {
        // Validate target position before proceeding
        const targetRow = updatedTank.replacementPosition.charCodeAt(0) - 65;
        const targetCol = parseInt(updatedTank.replacementPosition.slice(1)) - 1;
        
        // Check grid bounds
        if (targetRow < 0 || targetRow >= grid.length || 
            targetCol < 0 || targetCol >= grid[targetRow].length) {
          throw new Error('Target position is outside grid boundaries');
        }
        
        const targetTank = grid[targetRow][targetCol];

        if (!targetTank || targetTank === 'occupied') {
          throw new Error('No tank at target position');
        }

        // If replacing positions, use the swap endpoint
        await axios.post(
          '`${process.env.REACT_APP_API_BASE_URL}/tanks/swap-positions',
          {
            tank1Id: updatedTank.id,
            tank2Id: targetTank.id,
            position1: updatedTank.position,
            position2: updatedTank.replacementPosition
          },
          config
        );
      } else {
        // Regular save logic
        if (!updatedTank.id) {
          // This is a new tank creation
          await axios.post('`${process.env.REACT_APP_API_BASE_URL}/tanks', {
            ...updatedTank,
            size: updatedTank.size?.toUpperCase() || 'REGULAR',
            rack_id: effectiveRack.id
          }, config);
        } else {
          // This is an existing tank update
          await axios.put(
            ``${process.env.REACT_APP_API_BASE_URL}/tanks/${updatedTank.id}`,
            {
              ...updatedTank,
              size: updatedTank.size?.toUpperCase() || 'REGULAR'
            },
            config
          );
        }
      }

      // Refresh racks data after any change
      const { data: updatedRacks } = await axios.get(
        '`${process.env.REACT_APP_API_BASE_URL}/racks',
        config
      );
      dispatch(setRacks(updatedRacks));
      setSelectedTank(null);
      setError(null);
    } catch (err) {
      // Enhanced error handling
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update tank';
      console.error('Tank operation error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Create a new tank
  const handleCreateTank = (position) => {
    setSelectedTank({
      id: null,
      position: getCombinedPosition(position, 'REGULAR'),
      size: 'REGULAR',
      line: '',
      dob: '',
      subdivisions: [{ gender: 'MALE', count: 0 }]
    });
  };

  // Delete a tank
  const handleDeleteTank = async (tankId) => {
    // Input validation
    if (!tankId || isNaN(parseInt(tankId))) {
      setError('Invalid tank ID provided');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this tank?')) {
      return;
    }

    setLoading(true);
    try {
      console.log('Deleting tank with ID:', tankId);
      const token = getValidatedToken();
      if (!token) return;
      
      const response = await axios.delete(``${process.env.REACT_APP_API_BASE_URL}/tanks/${tankId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Delete response:', response);

      // Refresh racks data after deletion
      const { data: updatedRacks } = await axios.get(
        '`${process.env.REACT_APP_API_BASE_URL}/racks',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      dispatch(setRacks(updatedRacks));
      setError(null);
    } catch (err) {
      // Enhanced error handling
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete tank';
      console.error('Error deleting tank:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Color indication
  const getTankColor = (tank) => {
    if (!tank) return '#f5f5f5';  // Empty cell color
    if (tank === 'occupied') return '#e0e0e0';  // Occupied cell color
    return tank.color || '#bbdefb';  // Use custom color or default
  };

  const getRowLabel = (index) => {
    if (index < 26) {
      return String.fromCharCode(65 + index);
    }
    // For rows beyond 26, use AA, AB, AC, etc.
    const first = String.fromCharCode(65 + Math.floor(index / 26) - 1);
    const second = String.fromCharCode(65 + (index % 26));
    return first + second;
  };

  const handleRowConfigSave = async (newRowConfigs) => {
    try {
      console.log('Handling row config save with values:', newRowConfigs);
      
      // Validate input
      if (!newRowConfigs || typeof newRowConfigs !== 'object') {
        throw new Error('Invalid row configuration data');
      }
      
      // Security: Sanitize and validate row configs before sending to API
      const formattedConfigs = Object.entries(newRowConfigs).reduce((acc, [key, value]) => {
        // Ensure values are integers only
        const parsedValue = parseInt(value);
        if (!isNaN(parsedValue) && parsedValue > 0) {
          acc[key.toString()] = parsedValue;
        }
        return acc;
      }, {});
      
      console.log('Formatted configs to save:', formattedConfigs);
      
      const token = getValidatedToken();
      if (!token) return;
      
      console.log('Saving row configs for rack ID:', effectiveRack.id);
      const response = await axios.put(
        ``${process.env.REACT_APP_API_BASE_URL}/racks/${effectiveRack.id}/row-config`,
        { row_configs: formattedConfigs },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('Backend row config response:', response.data);
      
      // Refresh racks after update
      const { data: updatedRacks } = await axios.get('`${process.env.REACT_APP_API_BASE_URL}/racks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      dispatch(setRacks(updatedRacks));
      
      // Close the dialog
      setIsRowConfigOpen(false);
      setError(null);
    } catch (error) {
      // Enhanced error handling
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update row configurations';
      console.error('Error updating row configurations:', error);
      setError(errorMessage);
    }
  };

  useEffect(() => {
    console.log('Rack configs updated:', effectiveRack?.row_configs);
    // Force re-render when configs change
  }, [effectiveRack?.row_configs]);

  useEffect(() => {
    console.log('Updated rack.row_configs:', effectiveRack?.row_configs);
  }, [effectiveRack?.row_configs]);

  useEffect(() => {
    console.log('Rack updated:', effectiveRack);
  }, [effectiveRack]);

  useEffect(() => {
    console.log('Effective rack updated:', effectiveRack);
  }, [effectiveRack]);

  const handleOpenRowConfig = () => {
    // Log the current row configuration before opening dialog
    console.log('Opening row config dialog with:', {
      rackId: effectiveRack.id,
      rowConfigs: effectiveRack.row_configs,
      rows: effectiveRack.rows,
      columns: effectiveRack.columns
    });
    
    setIsRowConfigOpen(true);
  };

  const renderColumnHeaders = () => (
    <Grid container>
      {/* Empty top-left corner */}
      <Grid item sx={{ width: 30 }}>
        <Paper sx={{ 
          height: 30, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          bgcolor: 'grey.100' 
        }} />
      </Grid>
      
      {/* Column Numbers - Single row with custom numbering */}
      {/*
      <Grid item xs>
        <Grid container spacing={1} sx={{ mb: 1 }}>
          {Array(Math.max(...Array(rows).fill().map((_, idx) => getColumnCount(idx)))).fill(0).map((_, colIdx) => (
            <Grid 
              item 
              key={`col-${colIdx}`} 
              sx={{ 
                width: getCellWidth(0) // Use first row's width for consistency
              }}
            >
              <Paper sx={{ 
                height: 30, 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                bgcolor: 'grey.100'
              }}>
                <Typography variant="body2">
                  {colIdx + 1}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Grid>
      */}
    </Grid>
  );

  const renderRowColumnHeaders = (rowIdx) => {
    const headers = [];
    const currentRow = grid[rowIdx];
    let colIdx = 0;
    while (colIdx < currentRow.length) {
      const cell = currentRow[colIdx];
      if (cell && cell !== 'occupied' && cell.size && cell.size.toLowerCase() === 'large') {
        headers.push(
          <Grid item key={`header-${rowIdx}-${colIdx}`} sx={{ width: getCellWidth(rowIdx) * 2 + 8 }}>
            <Paper
              sx={{
                height: 30,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                bgcolor: 'grey.100'
              }}
            >
              <Typography variant="body2">
                {`${String.fromCharCode(65 + rowIdx)}${colIdx + 1}-${String.fromCharCode(65 + rowIdx)}${colIdx + 2}`}
              </Typography>
            </Paper>
          </Grid>
        );
        colIdx += 2;
      } else {
        headers.push(
          <Grid item key={`header-${rowIdx}-${colIdx}`} sx={{ width: getCellWidth(rowIdx) }}>
            <Paper
              sx={{
                height: 30,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                bgcolor: 'grey.100'
              }}
            >
              <Typography variant="body2">
                {`${String.fromCharCode(65 + rowIdx)}${colIdx + 1}`}
              </Typography>
            </Paper>
          </Grid>
        );
        colIdx++;
      }
    }
    return (
      <Grid container spacing={1} sx={{ flexWrap: 'nowrap', mb: 1 }}>
        {headers}
      </Grid>
    );
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          startIcon={<SettingsIcon />}
          onClick={handleOpenRowConfig}
          variant="outlined"
          size="small"
        >
          Configure Rows
        </Button>
      </Box>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Box 
          ref={containerRef}
          sx={{ 
            width: '100%',
            height: '80vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <Box
            sx={{
              flex: 1,
              overflow: 'scroll',
              width: '100%',
              '&::-webkit-scrollbar': {
                height: 8,
                width: 8,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#f1f1f1',
                borderRadius: 4,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#888',
                borderRadius: 4,
                '&:hover': {
                  backgroundColor: '#666'
                }
              }
            }}
          >
            <Grid 
              container 
              sx={{ 
                width: (() => {
                  // Calculate width based on the maximum columns in any row
                  const maxCols = Math.max(
                    ...Object.values(effectiveRack.row_configs || {}).map(val => parseInt(val) || 0),
                    parseInt(effectiveRack.columns) || 0
                  );
                  return (maxCols * 90) + 150; // Fixed width based on max columns
                })(),
                minWidth: '100%',
                minHeight: 'fit-content',
                pl: 4, // Increased left padding
                pt: 1 // Add top padding to the container
              }}
            >
              

              {/* Grid with Row Labels and Cells */}
              {grid.map((row, rowIdx) => (
                <Grid container key={`row-${rowIdx}`} wrap="nowrap" alignItems="flex-start">
                  {/* Row Label */}
                  <Grid item sx={{ width: 30 }}>
                    <Paper
                      sx={{ 
                        height: 120, 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        bgcolor: 'grey.100',
                        mb: 1,
                        mt: 6.3  // Add top margin to move row headers down
                      }}
                    >
                      <Typography variant="body2">
                        {getRowLabel(rowIdx)}
                      </Typography>
                    </Paper>
                  </Grid>

                  {/* Common container */}
                  <Grid item xs sx={{ pl: 1 }}> {/* Add left padding */}
                    {/* Column Headers with separate spacing */}
                    <Box sx={{ 
                      ml: 2.5, 
                      mr: 2,
                      pt: 1, // Add top padding
                      width: 'calc(100% - 20px)', // Ensure headers have enough width
                      overflow: 'visible', // Prevent header clipping
                      position: 'relative' // Ensure proper stacking context
                    }}> 
                      <Grid container spacing={1} sx={{ 
                        flexWrap: 'nowrap',
                        minWidth: 'fit-content'
                      }}>
                        {renderRowColumnHeaders(rowIdx)}
                      </Grid>
                    </Box>

                    {/* Row Cells - Add a small left margin here if needed */}
                    <Grid container spacing={1} sx={{ 
                      flexWrap: 'nowrap', 
                      mt: 0.5,
                      ml: 0.5,
                      minWidth: 'fit-content' // Ensure cells don't shrink
                    }}>
                      {(() => {
                        const cellItems = [];
                        for (let colIdx = 0; colIdx < row.length; colIdx++) {
                          const pos = `${String.fromCharCode(65 + rowIdx)}${colIdx + 1}`;
                          const cell = row[colIdx];
                          if (cell === 'occupied') continue;
                          if (cell && cell.size && cell.size.toLowerCase() === 'large') {
                            const combinedWidth = getCellWidth(rowIdx) * 2 + 8;
                            cellItems.push(
                              <Grid item key={`cell-${pos}`} sx={{ width: combinedWidth, mb: 1 }}>
                                <Droppable droppableId={cell.position}>
                                  {(provided) => (
                                    <Paper
                                      ref={provided.innerRef}
                                      {...provided.droppableProps}
                                      data-testid={`grid-cell-${cell.position}`}
                                      sx={{
                                        height: 120,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        bgcolor: getTankColor(cell),
                                        mb: 1,
                                      }}
                                    >
                                      <Tooltip
                                        title={
                                          <>
                                            <Typography>ID: {cell.id}</Typography>
                                            <Typography>Position: {cell.position}</Typography>
                                            <Typography>Size: {cell.size}</Typography>
                                            {cell.line && <Typography>Line: {cell.line}</Typography>}
                                            {cell.dob && <Typography>DOB: {cell.dob}</Typography>}
                                          </>
                                        }
                                      >
                                        <div
                                          style={{
                                            width: '100%',
                                            height: '100%',
                                            padding: '4px',
                                            boxSizing: 'border-box',
                                            cursor: 'pointer'
                                          }}
                                          onClick={() => handleTankClick(cell)}
                                        >
                                          <Typography variant="body2" align="center" sx={{ fontSize: '0.875rem' }}>
                                            {getCombinedPosition(cell.position, cell.size)}
                                          </Typography>
                                          {cell.line && (
                                            <Typography variant="caption" display="block" align="center" sx={{ fontSize: '0.75rem' }}>
                                              {cell.line}
                                            </Typography>
                                          )}
                                          <Box sx={{ mt: 0.5 }}>
                                            {cell.subdivisions?.map((sub, i) => (
                                              <Typography
                                                key={`${cell.id}-sub-${i}`}
                                                variant="caption"
                                                display="block"
                                                align="center"
                                                sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}
                                              >
                                                {`${sub.gender.charAt(0).toUpperCase()}: ${sub.count || 0}`}
                                              </Typography>
                                            ))}
                                          </Box>
                                        </div>
                                      </Tooltip>
                                      {provided.placeholder}
                                    </Paper>
                                  )}
                                </Droppable>
                              </Grid>
                            );
                            colIdx++; // Skip slot for large tank
                          } else {
                            cellItems.push(
                              <Grid item key={`cell-${pos}`} sx={{ width: getCellWidth(rowIdx), mb: 1 }}>
                                <Droppable droppableId={pos}>
                                  {(provided, snapshot) => (
                                    <Paper
                                      ref={provided.innerRef}
                                      {...provided.droppableProps}
                                      data-testid={`grid-cell-${pos}`}
                                      sx={{
                                        height: 120,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        bgcolor: cell && cell !== 'occupied' 
                                          ? getTankColor(cell) 
                                          : 'grey.100',
                                        mb: 1,
                                        outline: snapshot.isDraggingOver 
                                          ? '2px dashed #1976d2' 
                                          : 'none',
                                        transition: 'all 0.2s ease',
                                        opacity: snapshot.isDraggingOver 
                                          ? 0.8 
                                          : 1
                                      }}
                                    >
                                      {cell && cell !== 'occupied' && (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                          <Draggable draggableId={String(cell.id || `temp-${cell.position}`)} index={0}>
                                            {(dragProvided, snapshot) => (
                                              <Tooltip
                                                title={
                                                  <>
                                                    <Typography>ID: {cell.id}</Typography>
                                                    <Typography>Position: {cell.position}</Typography>
                                                    <Typography>Size: {cell.size || 'REGULAR'}</Typography>
                                                    {cell.line && <Typography>Line: {cell.line}</Typography>}
                                                    {cell.dob && <Typography>DOB: {cell.dob}</Typography>}
                                                  </>
                                                }
                                              >
                                                <div
                                                  ref={dragProvided.innerRef}
                                                  {...dragProvided.draggableProps}
                                                  {...dragProvided.dragHandleProps}
                                                  style={{
                                                    ...dragProvided.draggableProps.style,
                                                    opacity: snapshot.isDragging ? 0.6 : 1,
                                                    cursor: 'pointer',
                                                    width: '100%',
                                                    height: '100%',
                                                    padding: '4px',
                                                    boxSizing: 'border-box'
                                                  }}
                                                  onClick={() => handleTankClick(cell)}
                                                >
                                                  <Typography variant="body2" align="center" sx={{ fontSize: '0.875rem' }}>
                                                    {cell.position}
                                                  </Typography>
                                                  {cell.line && (
                                                    <Typography
                                                      variant="caption"
                                                      display="block"
                                                      align="center"
                                                      sx={{ fontSize: '0.75rem' }}
                                                    >
                                                      {cell.line}
                                                    </Typography>
                                                  )}
                                                  <Box sx={{ mt: 0.5 }}>
                                                    {cell.subdivisions?.map((sub, i) => (
                                                      <Typography
                                                        key={`${cell.id}-sub-${i}`}
                                                        variant="caption"
                                                        display="block"
                                                        align="center"
                                                        sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}
                                                      >
                                                        {`${sub.gender.charAt(0).toUpperCase()}: ${sub.count || 0}`}
                                                      </Typography>
                                                    ))}
                                                  </Box>
                                                </div>
                                              </Tooltip>
                                            )}
                                          </Draggable>
                                        </Box>
                                      )}
                                      {!cell && (
                                        <Button variant="outlined" size="small" onClick={() => handleCreateTank(pos)}>
                                          Create Tank
                                        </Button>
                                      )}
                                      {provided.placeholder}
                                    </Paper>
                                  )}
                                </Droppable>
                              </Grid>
                            );
                          }
                        }
                        return cellItems;
                      })()}
                    </Grid>
                  </Grid>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      </DragDropContext>

      {loading && <CircularProgress size={24} />}
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      <TankDialog
        open={!!selectedTank}
        onClose={() => setSelectedTank(null)}
        tank={selectedTank}
        rack={effectiveRack}  // Add this
        onSave={handleTankSave}
        onDelete={handleDeleteTank}
      />
      <RowConfigDialog
        open={isRowConfigOpen}
        onClose={() => setIsRowConfigOpen(false)}
        rack={effectiveRack}
        onSave={handleRowConfigSave}
      />
    </>
  );
};

RackGrid.defaultProps = {
  onTankMove: () => {}
};

export default RackGrid;
