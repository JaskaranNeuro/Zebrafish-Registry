// zebrafish-frontend/src/utils/apiHelpers.js
import { toast } from 'react-toastify'; // You might need to install this package

export const handleApiError = (error, navigate) => {
  if (error.response) {
    const { data, status } = error.response;
    
    // Handle subscription-related errors
    if (status === 403 && data.code) {
      switch (data.code) {
        case 'SUBSCRIPTION_EXPIRED':
          toast.error('Your subscription has expired. Please renew to continue.');
          if (navigate) navigate('/subscription');
          return true;
          
        case 'USER_LIMIT_REACHED':
        case 'RACK_LIMIT_REACHED':
          toast.error(data.message || 'Subscription limit reached');
          return true;
      }
    }
  }
  
  // Generic error handling
  toast.error(error.response?.data?.message || error.message || 'An error occurred');
  return false;
};

// Example usage in a component
import { handleApiError } from '../utils/apiHelpers';
import { useNavigate } from 'react-router-dom';

const MyComponent = () => {
  const navigate = useNavigate();
  
  const createUser = async () => {
    try {
      // Your API call
    } catch (error) {
      // If it's a subscription error, it's already handled
      if (!handleApiError(error, navigate)) {
        // Handle other specific errors here
        console.error('Error creating user:', error);
      }
    }
  };
  
  // Rest of your component
};