import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SubscriptionPage from './pages/SubscriptionPage';
import PaymentReturnPage from './pages/PaymentReturnPage';

const AppRoutes = ({ userRole, handleLogout, isAuthenticated, children }) => {
  return (
    <Routes>
      <Route 
        path="/subscription-management" 
        element={
          isAuthenticated && userRole === 'admin' 
            ? <SubscriptionPage onLogout={handleLogout} /> 
            : <Navigate to="/" replace />
        } 
      />
      <Route 
        path="/payment-return" 
        element={
          isAuthenticated 
            ? <PaymentReturnPage onLogout={handleLogout} /> 
            : <Navigate to="/" replace />
        } 
      />
      <Route path="/" element={children} />
    </Routes>
  );
};

export default AppRoutes;