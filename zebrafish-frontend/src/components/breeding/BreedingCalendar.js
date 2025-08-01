import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Grid, Button, IconButton, 
  Card, CardContent, CardActions, Chip, Tooltip, 
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  RadioGroup, Radio, FormControlLabel, Badge, Avatar,
  ButtonGroup
} from '@mui/material';
import { 
  ArrowBackIos, ArrowForwardIos, Add as AddIcon, 
  Today as TodayIcon, History as HistoryIcon,
  Person as PersonIcon, Delete as DeleteIcon
} from '@mui/icons-material';
import axios from 'axios';

const BreedingCalendar = () => {
  // State for calendar
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [calendarDays, setCalendarDays] = useState([]);
  const [calendarData, setCalendarData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State for request dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [requestType, setRequestType] = useState('eggs');
  const [fishAge, setFishAge] = useState('');
  const [userName, setUserName] = useState('');
  const [notes, setNotes] = useState('');
  
  // State for history dialog
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historyData, setHistoryData] = useState([]);
  
  // Generate calendar days for current month
  useEffect(() => {
    // Get the first day of the month and the last day
    const firstDay = new Date(currentMonth);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay();
    
    // Calculate days from previous month to display
    const daysFromPrevMonth = firstDayOfWeek;
    
    // Calculate total days needed for the grid (max 6 rows of 7 days)
    const totalDays = 42;
    
    const days = [];
    
    // Add days from previous month
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const lastDayPrevMonth = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate();
    
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      const day = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), lastDayPrevMonth - i);
      days.push({
        date: day,
        isCurrentMonth: false,
        isPrevMonth: true
      });
    }
    
    // Add days from current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const day = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      days.push({
        date: day,
        isCurrentMonth: true,
        isPrevMonth: false,
        isNextMonth: false
      });
    }
    
    // Add days from next month
    const remainingDays = totalDays - days.length;
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    for (let i = 1; i <= remainingDays; i++) {
      const day = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), i);
      days.push({
        date: day,
        isCurrentMonth: false,
        isNextMonth: true
      });
    }
    
    setCalendarDays(days);
    fetchCalendarData(firstDay, new Date(nextMonth.getFullYear(), nextMonth.getMonth(), remainingDays));
  }, [currentMonth]);
  
  // Fetch calendar data for current month
  const fetchCalendarData = async (startDate, endDate) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/breeding/calendar/${formattedStartDate}`,
        { 
          headers: { 'Authorization': `Bearer ${token}` },
          params: { end_date: formattedEndDate }
        }
      );
      
      // Convert array to object indexed by date for easier lookup
      const dataByDate = {};
      response.data.forEach(item => {
        const date = item.date.split('T')[0];
        if (!dataByDate[date]) {
          dataByDate[date] = [];
        }
        dataByDate[date].push(item);
      });
      
      setCalendarData(dataByDate);
    } catch (err) {
      setError('Failed to load calendar data');
      console.error('Error fetching calendar data:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Navigate to previous month
  const goToPreviousMonth = () => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentMonth(prevMonth);
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentMonth(nextMonth);
  };
  
  // Go to current month
  const goToCurrentMonth = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };
  
  // Open request dialog for a day
  const handleDayClick = (day) => {
    setSelectedDate(day.date);
    setDialogOpen(true);
    setRequestType('eggs');
    setFishAge('');
    setNotes('');
  };
  
  // Submit breeding request
  const handleSubmitRequest = async () => {
    if (!selectedDate || !userName) {
      setError('Please fill all required fields');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        '`${process.env.REACT_APP_API_BASE_URL}/breeding/calendar/request',
        {
          date: selectedDate.toISOString().split('T')[0],
          username: userName,
          request_type: requestType,
          fish_age: requestType === 'fish' ? fishAge : null,
          notes: notes
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      // Reload calendar data for the current month view
      const firstDay = new Date(currentMonth);
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      fetchCalendarData(firstDay, lastDay);
      
      setDialogOpen(false);
    } catch (err) {
      setError('Failed to submit request');
      console.error('Error submitting request:', err);
    }
  };
  
  // Fetch history data
  const fetchHistoryData = async () => {
    if (!historyStartDate || !historyEndDate) {
      setError('Please select start and end dates');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/breeding/calendar/history`,
        { 
          headers: { 'Authorization': `Bearer ${token}` },
          params: { start_date: historyStartDate, end_date: historyEndDate }
        }
      );
      
      setHistoryData(response.data);
    } catch (err) {
      setError('Failed to load history data');
      console.error('Error fetching history:', err);
    }
  };
  
  // Add the delete request handler function
  const handleDeleteRequest = async (requestId, event) => {
    // Stop event propagation to prevent opening the day dialog
    event && event.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this breeding request?')) {
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.REACT_APP_API_BASE_URL}/breeding/calendar/request/${requestId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      // Reload calendar data after deletion
      const firstDay = new Date(currentMonth);
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      await fetchCalendarData(firstDay, lastDay);
      
      // Also refresh history data if the history dialog is open
      if (historyDialogOpen && historyStartDate && historyEndDate) {
        fetchHistoryData();
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to delete request');
      console.error('Error deleting request:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Format date for display
  const formatDate = (date) => {
    return date.getDate();
  };
  
  // Check if a date is today
  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };
  
  // Get requests for a specific day
  const getRequestsForDay = (day) => {
    const dateKey = day.date.toISOString().split('T')[0];
    return calendarData[dateKey] || [];
  };

  // Day of week names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>Eggs/Fish Request Calendar</Typography>
      
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ 
            background: 'linear-gradient(45deg, #ef9a9a 30%, #ffcdd2 90%)',  // red gradient
            borderRadius: 2,
            px: 3,
            py: 1,
            boxShadow: '0 3px 5px 2px rgba(239, 154, 154, 0.3)'
          }}>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 'medium' }}>
              {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ButtonGroup variant="outlined" size="small" sx={{ mr: 2 }}>
              <Tooltip title="Previous Month">
                <Button onClick={goToPreviousMonth}>
                  <ArrowBackIos fontSize="small" />
                </Button>
              </Tooltip>
              <Tooltip title="Current Month">
                <Button onClick={goToCurrentMonth} color="primary">
                  <TodayIcon fontSize="small" />
                </Button>
              </Tooltip>
              <Tooltip title="Next Month">
                <Button onClick={goToNextMonth}>
                  <ArrowForwardIos fontSize="small" />
                </Button>
              </Tooltip>
            </ButtonGroup>
            <Button 
              variant="contained" 
              startIcon={<HistoryIcon />}
              onClick={() => setHistoryDialogOpen(true)}
              size="small"
              sx={{ 
                background: 'linear-gradient(45deg, #ef9a9a 30%, #ffcdd2 90%)',  // Red gradient
                boxShadow: '0 3px 5px 2px rgba(239, 154, 154, 0.3)'
              }}
            >
              History
            </Button>
          </Box>
        </Box>

        {/* Days of week header - updated with red for weekends and green for weekdays */}
        <Grid container spacing={0.5} sx={{ mb: 1 }}>
          {dayNames.map((day, index) => (
            <Grid item xs={1.714} key={`header-${index}`}>
              <Box sx={{ 
                textAlign: 'center', 
                py: 1, 
                background: index === 0 || index === 6 
                  ? 'linear-gradient(45deg, #ef9a9a 30%, #ffcdd2 90%)'  // Red for weekends (Sat & Sun)
                  : 'linear-gradient(45deg, #a5d6a7 30%, #c8e6c9 90%)',  // Green for weekdays
                color: index === 0 || index === 6 ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.7)',  // Darker text for better readability
                borderRadius: 2,
                fontWeight: 'medium',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
              }}>
                <Typography variant="subtitle2">{day}</Typography>
              </Box>
            </Grid>
          ))}
          
          {/* Calendar days styling update */}
          {calendarDays.map((day, index) => (
            <Grid item xs={1.714} key={index}>
              <Card 
                sx={{ 
                  height: '100%',
                  minHeight: 90,
                  backgroundColor: day.isCurrentMonth 
                    ? (isToday(day.date) ? 'rgba(194, 24, 91, 0.08)' : 'background.paper')  // Warm rose tint for today
                    : 'rgba(0, 0, 0, 0.04)',
                  border: isToday(day.date) ? '2px solid' : 'none',
                  borderColor: isToday(day.date) ? '#C2185B' : 'transparent',  // Rose color border for today
                  borderRadius: 2,
                  boxShadow: day.isCurrentMonth 
                    ? (getRequestsForDay(day).length > 0 ? 2 : 1)
                    : 0,
                  transition: 'all 0.2s ease-in-out',
                  opacity: day.isCurrentMonth ? 1 : 0.6,
                  overflow: 'hidden',
                  '&:hover': {
                    boxShadow: day.isCurrentMonth ? '0px 6px 12px rgba(0, 0, 0, 0.15)' : 0,
                    transform: day.isCurrentMonth ? 'translateY(-2px)' : 'none',
                    cursor: day.isCurrentMonth ? 'pointer' : 'default'
                  },
                  position: 'relative',
                  ...(getRequestsForDay(day).length > 0 && day.isCurrentMonth && {
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '4px',
                      background: 'linear-gradient(90deg, #7B1FA2 0%, #C2185B 100%)',  // Purple to rose gradient
                      zIndex: 1
                    }
                  })
                }}
                onClick={() => day.isCurrentMonth && handleDayClick(day)}
              >
                <CardContent sx={{ p: 1, position: 'relative' }}>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1
                  }}>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: isToday(day.date) ? 'bold' : 'medium',
                        color: isToday(day.date) ? '#C2185B' :  // Rose color for today's date
                               !day.isCurrentMonth ? 'text.disabled' : 'text.primary',
                        fontSize: isToday(day.date) ? '1.1rem' : '1rem',
                      }}
                    >
                      {formatDate(day.date)}
                    </Typography>
                    
                    {getRequestsForDay(day).length > 3 && (
                      <Chip 
                        size="small" 
                        label={`+${getRequestsForDay(day).length}`}
                        sx={{ 
                          height: 20, 
                          fontSize: '0.7rem', 
                          backgroundColor: 'rgba(123, 31, 162, 0.1)',  // Light purple bg
                          border: '1px solid',
                          borderColor: '#7B1FA2',  // Purple border
                        }}
                      />
                    )}
                  </Box>
                  
                  <Box sx={{ mt: 1, maxHeight: 56, overflowY: 'auto' }}>
                    {getRequestsForDay(day).slice(0, 3).map((request, idx) => (
                      <Chip
                        key={idx}
                        label={
                          <Tooltip 
                            title={
                              <React.Fragment>
                                <Typography variant="body2">{request.username}</Typography>
                                <Typography variant="body2">
                                  {request.request_type === 'fish' 
                                    ? `Fish (${request.fish_age} dpf)` 
                                    : 'Eggs'}
                                </Typography>
                                {request.notes && (
                                  <Typography variant="body2">Note: {request.notes}</Typography>
                                )}
                              </React.Fragment>
                            }
                          >
                            <span>{request.username}</span>
                          </Tooltip>
                        }
                        size="small"
                        sx={{ 
                          mt: 0.5, 
                          mr: 0.5, 
                          backgroundColor: request.request_type === 'eggs' 
                            ? 'rgba(123, 31, 162, 0.15)'  // Light purple for eggs
                            : 'rgba(216, 67, 21, 0.15)',  // Light orange for fish
                          color: request.request_type === 'eggs' 
                            ? '#7B1FA2'  // Purple text for eggs
                            : '#D84315',  // Deep orange text for fish
                          border: '1px solid',
                          borderColor: request.request_type === 'eggs' 
                            ? '#7B1FA2'  // Purple border for eggs
                            : '#D84315',  // Deep orange border for fish
                          '& .MuiChip-deleteIcon': {
                            color: request.request_type === 'eggs' 
                              ? '#7B1FA2'  // Purple delete icon for eggs
                              : '#D84315',  // Deep orange delete icon for fish
                            '&:hover': {
                              color: request.request_type === 'eggs' 
                                ? '#6A1B9A'  // Darker purple on hover for eggs
                                : '#BF360C',  // Darker orange on hover for fish
                            }
                          }
                        }}
                        onDelete={(e) => handleDeleteRequest(request.id, e)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ))}
                  </Box>
                </CardContent>
                {day.isCurrentMonth && (
                  <CardActions sx={{ p: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Button 
                      size="small" 
                      startIcon={<AddIcon fontSize="small" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDayClick(day);
                      }}
                      fullWidth
                      sx={{ 
                        fontSize: '0.7rem', 
                        textTransform: 'none',
                        background: 'linear-gradient(to right, rgba(123, 31, 162, 0.05), rgba(194, 24, 91, 0.05))',  // Very light purple to rose gradient
                        '&:hover': {
                          background: 'linear-gradient(to right, rgba(123, 31, 162, 0.15), rgba(194, 24, 91, 0.15))',  // Slightly darker on hover
                        }
                      }}
                    >
                      Add
                    </Button>
                  </CardActions>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
      
      {/* Request Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Add Breeding Request for {selectedDate ? formatDate(selectedDate) : ''}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Your Name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <Typography variant="subtitle2" gutterBottom>Request Type</Typography>
                <RadioGroup
                  row
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                >
                  <FormControlLabel value="eggs" control={<Radio />} label="Eggs" />
                  <FormControlLabel value="fish" control={<Radio />} label="Fish" />
                </RadioGroup>
              </FormControl>
            </Grid>
            
            {requestType === 'fish' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Fish Age"
                  type="number"
                  InputProps={{
                    inputProps: { min: 0 }
                  }}
                  value={fishAge}
                  onChange={(e) => setFishAge(e.target.value)}
                  placeholder="Enter fish age"
                  required
                />
              </Grid>
            )}
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDialogOpen(false)}
            sx={{ 
              color: '#000000'  // Purple text for Cancel button
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitRequest}
            variant="contained" 
            sx={{ 
              background: '#c8e6c9',  // Solid green color
              color: '#000000',       // Dark text
              '&.Mui-disabled': {     // Style for disabled state
                background: '#e8f5e9', // Lighter green when disabled
                color: '#388e3c',      // Still visible green text
                opacity: 0.9          // Slightly transparent to indicate disabled
              }
            }}
            disabled={!userName || (requestType === 'fish' && !fishAge)}
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* History Dialog */}
      <Dialog 
        open={historyDialogOpen} 
        onClose={() => setHistoryDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Breeding Calendar History</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={historyStartDate}
                onChange={(e) => setHistoryStartDate(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={historyEndDate}
                onChange={(e) => setHistoryEndDate(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                variant="contained"
                onClick={fetchHistoryData}
                sx={{ 
                  height: '100%',
                  background: 'linear-gradient(45deg, #7B1FA2 30%, #C2185B 90%)',
                  boxShadow: '0 3px 5px 2px rgba(194, 24, 91, .3)'
                }}
                fullWidth
              >
                Search
              </Button>
            </Grid>
            
            {historyData.length > 0 ? (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, mt: 2 }}>
                  <Typography variant="h6" gutterBottom>Results</Typography>
                  <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Date</th>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>User</th>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Request</th>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Age</th>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Notes</th>
                          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyData.map((item, index) => (
                          <tr key={index}>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                              {new Date(item.date).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{item.username}</td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{item.request_type}</td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{item.fish_age || '-'}</td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{item.notes || '-'}</td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                              <IconButton 
                                size="small" 
                                color="error" 
                                onClick={() => handleDeleteRequest(item.id)}
                                title="Delete request"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                </Paper>
              </Grid>
            ) : (
              <Grid item xs={12}>
                <Typography sx={{ mt: 2 }}>No history data found for selected date range.</Typography>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BreedingCalendar;
