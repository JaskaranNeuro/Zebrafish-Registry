// zebrafish-frontend/src/components/clinical/ClinicalManagement.js
import React, { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, Paper } from '@mui/material';
import CaseForm from './CaseForm';
import CaseList from './CaseList';
import CaseDetail from './CaseDetail';
import axios from 'axios';

const ClinicalManagement = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchCases = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('`${process.env.REACT_APP_API_BASE_URL}/clinical/cases', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCases(response.data);
    } catch (err) {
      setError('Failed to fetch clinical cases');
      console.error('Error fetching cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (newValue === 'list') {
      setSelectedCase(null);
    }
  };

  const handleCaseSaved = () => {
    fetchCases();
    setActiveTab('list');
  };

  const handleCaseSelected = async (caseId) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      // Fetch complete case details with notes
      const response = await axios.get(``${process.env.REACT_APP_API_BASE_URL}/clinical/cases/${caseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setSelectedCase(response.data);
      setActiveTab('detail');
    } catch (err) {
      console.error("Error loading case details:", err);
      setError(`Failed to load case details: ${err.response?.data?.message || err.message}`);
      // Stay on list view when there's an error
      setActiveTab('list'); 
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    setSelectedCase(null);
    setActiveTab('list');
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" gutterBottom>Clinical Management</Typography>
      
      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab value="list" label="Case List" />
        <Tab value="new" label="Report New Case" />
        {selectedCase && <Tab value="detail" label={`Case #${selectedCase.id}`} />}
      </Tabs>

      <Paper sx={{ p: 3 }}>
        {activeTab === 'list' && (
          <CaseList 
            cases={cases} 
            loading={loading} 
            error={error} 
            onCaseSelect={handleCaseSelected} 
            onRefresh={fetchCases} 
          />
        )}
        
        {activeTab === 'new' && (
          <CaseForm onSaved={handleCaseSaved} />
        )}
        
        {activeTab === 'detail' && selectedCase && (
          <CaseDetail 
            caseData={selectedCase} 
            onBack={handleBackToList}
            onCaseUpdated={fetchCases}
          />
        )}
      </Paper>
    </Box>
  );
};

export default ClinicalManagement;
