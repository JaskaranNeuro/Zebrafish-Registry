import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;
let failedRequestCount = 0;
let csrfTokenId = null;
let csrfToken = null;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000,
  withCredentials: true, // Important for cookies
});

// Function to get CSRF tokens
async function getCsrfToken() {
  if (!csrfTokenId || !csrfToken) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/csrf-token`, { withCredentials: true });
      csrfTokenId = response.data.token_id;
      csrfToken = response.data.token_value;
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      throw error;
    }
  }
  return { csrfTokenId, csrfToken };
}

// Add CSRF tokens to non-GET requests
api.interceptors.request.use(async config => {
  // Add authorization header if token exists
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Add CSRF token for non-GET requests
  if (config.method !== 'get') {
    try {
      const { csrfTokenId, csrfToken } = await getCsrfToken();
      config.headers['X-CSRF-TOKEN-ID'] = csrfTokenId;
      config.headers['X-CSRF-TOKEN'] = csrfToken;
      // Note: CSRF tokens are single-use
    } catch (error) {
      console.error('Failed to add CSRF token to request:', error);
    }
  }
  
  return config;
}, error => {
  return Promise.reject(error);
});

// Handle token refresh
api.interceptors.response.use(response => {
  // Reset failed request count on successful response
  failedRequestCount = 0;
  return response;
}, async error => {
  const originalRequest = error.config;
  
  // If token has expired (401) and we haven't tried to refresh too many times
  if (error.response && error.response.status === 401 && !originalRequest._retry && failedRequestCount < MAX_RETRIES) {
    originalRequest._retry = true;
    failedRequestCount++;
    
    try {
      // Try to refresh token
      const response = await axios.post(
        `${API_BASE_URL}/api/refresh`, 
        {}, 
        { withCredentials: true }
      );
      
      if (response.data.access_token) {
        // Update token in localStorage
        localStorage.setItem('token', response.data.access_token);
        
        // Update auth header in original request
        originalRequest.headers['Authorization'] = `Bearer ${response.data.access_token}`;
        
        // Retry original request
        return api(originalRequest);
      }
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError);
      
      // If refresh fails, redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      
      // Use setTimeout to avoid interrupting the current execution
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
      
      return Promise.reject(refreshError);
    }
  }
  
  // Handle rate limiting with exponential backoff
  if (error.response && error.response.status === 429 && failedRequestCount < MAX_RETRIES) {
    failedRequestCount++;
    
    // Calculate backoff time with exponential increase
    const backoffTime = BASE_BACKOFF_MS * Math.pow(2, failedRequestCount - 1);
    console.log(`Request failed. Retrying in ${backoffTime/1000} seconds...`);
    
    // Wait for backoff time
    await new Promise(resolve => setTimeout(resolve, backoffTime));
    
    // Retry the request
    return api(originalRequest);
  }
  
  return Promise.reject(error);
});

export default api;

// API function exports
export const authAPI = {
  login: (credentials) => axios.post(`${API_BASE_URL}/api/login`, credentials, { withCredentials: true }),
  logout: () => api.post('/api/logout'),
  getCurrentUser: () => api.get('/api/user'),
  checkSuperAdmin: () => api.get('/api/check-super-admin')
};

// Other API exports remain unchanged
// ...