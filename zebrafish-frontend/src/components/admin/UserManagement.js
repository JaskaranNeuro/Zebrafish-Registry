import React, { useState, useEffect } from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, Button, TextField, Select, MenuItem, FormControl, 
  InputLabel, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import axios from 'axios';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'researcher'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log("Fetching users with token:", token);
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log("Users fetched successfully:", response.data);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Consider showing an error message to the user
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      console.log(`Updating user ${userId} role to: ${newRole}`);
      const token = localStorage.getItem('token');
      const response = await axios.put(`${process.env.REACT_APP_API_BASE_URL}/admin/users/${userId}/role`, 
        { role: newRole },
        { headers: { 'Authorization': `Bearer ${token}` }}
      );
      console.log('Role update response:', response.data);
      fetchUsers(); // Refresh the user list
    } catch (error) {
      console.error('Error updating user role:', error.response?.data || error.message);
      alert(`Failed to update role: ${error.response?.data?.msg || 'Unknown error'}`);
    }
  };

  const handleCreateUser = async () => {
    try {
      console.log("Creating new user:", newUser);
      const token = localStorage.getItem('token');
      // Make sure this URL is correct
      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/admin/users`, 
        newUser,
        { headers: { 'Authorization': `Bearer ${token}` }}
      );
      console.log("User creation response:", response.data);
      setOpen(false);
      setNewUser({username: '', email: '', password: '', role: 'researcher'});
      fetchUsers();
      // Add success message
      alert("User created successfully!");
    } catch (error) {
      console.error('Error creating user:', error);
      alert(`Failed to create user: ${error.response?.data?.msg || error.message}`);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    // Ask for confirmation before deleting
    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/admin/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log(`User ${username} deleted successfully`);
      
      // Refresh the user list
      fetchUsers();
      
      // Show success message
      alert(`User "${username}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(`Failed to delete user: ${error.response?.data?.msg || error.message}`);
    }
  };

  return (
    <div>
      <h2>User Management</h2>
      <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
        Add New User
      </Button>
      
      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Select
                    value={user.role}
                    onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                  >
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="facility_manager">Clinical Manager</MenuItem>
                    <MenuItem value="researcher">Researcher</MenuItem>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button 
                    variant="outlined" 
                    color="error"
                    onClick={() => handleDeleteUser(user.id, user.username)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Username"
            fullWidth
            value={newUser.username}
            onChange={(e) => setNewUser({...newUser, username: e.target.value})}
          />
          <TextField
            margin="dense"
            label="Email"
            fullWidth
            value={newUser.email}
            onChange={(e) => setNewUser({...newUser, email: e.target.value})}
          />
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            value={newUser.password}
            onChange={(e) => setNewUser({...newUser, password: e.target.value})}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Role</InputLabel>
            <Select
              value={newUser.role}
              onChange={(e) => setNewUser({...newUser, role: e.target.value})}
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="facility_manager">Clinical Manager</MenuItem>
              <MenuItem value="researcher">Researcher</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateUser} color="primary">Create</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default UserManagement;