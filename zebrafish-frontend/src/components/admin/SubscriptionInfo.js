// zebrafish-frontend/src/components/admin/SubscriptionInfo.js
import React, { useState, useEffect } from 'react';
import { 
  Typography, Button, Box, 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Select, MenuItem, InputLabel, FormControl,
  CircularProgress, Alert, Paper, Divider, Grid, Chip, FormControlLabel, Checkbox, Container
} from '@mui/material';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Move stripePromise outside of component to ensure it's only loaded once
const stripePromise = loadStripe('pk_test_51QzKsRKz64q50WpFrK8RMcBTTbGJB3Hv0t9WEfuy1DjCnkzddvX1DMW73T2Q56bdGMOpSLGmvJnBLhxcX39y2G3L00SWH5ZtZV');

// Update the PaymentFormContent component definition to accept necessary props
const PaymentFormContent = ({ 
  onSuccess, 
  onCancel,
  selectedPaymentPlan,
  selectedPaymentPeriod,
  selectedPaymentDays,
  autoRenew,
  setAutoRenew,
  getPrice = () => 0,  // Default function if not provided
  calculatePrice = () => 0  // Default function if not provided
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  
  // Friendly error messages for common payment errors
  const getFriendlyErrorMessage = (error) => {
    const errorMessages = {
      'card_declined': "Your card was declined. Please try a different payment method or contact your bank.",
      'expired_card': "Your card has expired. Please use a different card.",
      'incorrect_cvc': "The security code (CVC) is incorrect. Please check and try again.",
      'processing_error': "There was an error processing your card. Please try again or use a different payment method.",
      'insufficient_funds': "Your card has insufficient funds. Please use a different payment method.",
      'invalid_card': "Your card information is invalid. Please check the details or try a different card."
    };
    
    if (error.code && errorMessages[error.code]) {
      return errorMessages[error.code];
    }
    
    return error.message || "An error occurred with your payment. Please try again.";
  };
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    setProcessing(true);
    setPaymentError(null);
    
    console.log("Starting payment process");
    
    if (!stripe || !elements) {
      console.error("Stripe.js hasn't loaded yet");
      setPaymentError("Payment processing is not available. Please try again later.");
      setProcessing(false);
      return;
    }
    
    try {
      // Create payment method using the card element
      console.log("Creating payment method...");
      const {error, paymentMethod} = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
      });
      
      if (error) {
        console.error("Error creating payment method:", error);
        setPaymentError(getFriendlyErrorMessage(error));
        setProcessing(false);
        return;
      }
      
      console.log("Payment method created:", paymentMethod.id);
      
      // Send payment info to your backend
      const token = localStorage.getItem('token');
      console.log("Sending payment to backend...");
      console.log("Plan:", selectedPaymentPlan);
      console.log("Days:", selectedPaymentDays);
      
      // Update the payment submission around line 236
      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/subscription/payment`, {
        paymentMethodId: paymentMethod.id,
        plan: selectedPaymentPlan,
        period: selectedPaymentPeriod, // Use period instead of days
        autoRenew: autoRenew,
        return_url: `${window.location.origin}/#/payment-return`
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log("Backend response:", response.data);
      
      // Handle 3D Secure authentication if required
      if (response.data.requires_action) {
        console.log("3D Secure authentication required");
        console.log("Payment intent client secret:", response.data.payment_intent_client_secret);
        
        // Store payment data for after redirect
        localStorage.setItem('pendingPaymentData', JSON.stringify({
          payment_intent_id: response.data.payment_intent_id,
          plan: selectedPaymentPlan,
          days: selectedPaymentDays
        }));
        
        // Handle the card action (3D Secure)
        console.log("Calling stripe.handleCardAction...");
        
        // This is a critical step - we force a small delay to ensure the UI is ready
        // before showing the 3D Secure dialog
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const result = await stripe.handleCardAction(response.data.payment_intent_client_secret);
        console.log("handleCardAction result:", result);
        
        if (result.error) {
          console.error("Error handling card action:", result.error);
          setPaymentError(getFriendlyErrorMessage(result.error));
          setProcessing(false);
        } else {
          // The 3D Secure authentication was successful
          console.log("3D Secure authentication successful");
          console.log("Verifying payment with backend...");
          
          try {
            // Now we verify the payment with the backend
            // Update the verification around line 273
            const verifyResponse = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/subscription/payment/verify`, {
              payment_intent_id: response.data.payment_intent_id,
              plan: selectedPaymentPlan,
              period: selectedPaymentPeriod, // Use period instead of days
            }, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log("Verification response:", verifyResponse.data);
            
            if (verifyResponse.data.message === "Payment successful and subscription extended") {
              // Clear pending payment data
              localStorage.removeItem('pendingPaymentData');
              // Handle successful payment
              console.log("Payment verification successful");
              onSuccess(verifyResponse.data);
            } else {
              console.error("Payment verification failed:", verifyResponse.data);
              setPaymentError("Payment verification failed. Please try again.");
              setProcessing(false);
            }
          } catch (verifyError) {
            console.error("Payment verification request failed:", verifyError);
            setPaymentError(verifyError.response?.data?.message || "Payment verification failed");
            setProcessing(false);
          }
        }
      } else if (response.data.message === "Payment successful and subscription extended") {
        // Regular card without 3D Secure - payment already succeeded
        console.log("Payment successful immediately (no 3DS required)");
        onSuccess(response.data);
      } else {
        // Some other status
        console.error("Unexpected payment response:", response.data);
        setPaymentError("Payment processing incomplete. Please try again.");
        setProcessing(false);
      }
    } catch (err) {
      console.error('Payment error:', err);
      if (err.response) {
        console.error('Error response:', err.response.data);
      }
      setPaymentError(err.response?.data?.message || 'Payment failed. Please try again.');
      setProcessing(false);
    }
  };
  
  // Rest of the component remains the same
  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Payment Details
        </Typography>
        <CardElement options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': {
                color: '#aab7c4',
              },
            },
            invalid: {
              color: '#9e2146',
            },
          },
        }} />
      </Box>
      
      <Typography variant="body1" gutterBottom>
        Total: ${calculatePrice().toFixed(2)} USD
      </Typography>
      
      {paymentError && (
        <Alert severity="error" sx={{ mb: 2 }}>{paymentError}</Alert>
      )}
      
      <FormControlLabel
        control={
          <Checkbox
            checked={autoRenew}
            onChange={(e) => setAutoRenew(e.target.checked)}
            color="primary"
          />
        }
        label={
          <Box>
            <Typography variant="body2">
              Enable automatic renewal
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Your subscription will automatically renew when it expires. You can cancel anytime.
            </Typography>
          </Box>
        }
        sx={{ mt: 2 }}
      />
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button sx={{ mr: 2 }} onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
          type="submit" 
          disabled={!stripe || processing}
        >
          {processing ? 'Processing...' : 'Pay & Extend'}
        </Button>
      </Box>
    </form>
  );
};

const SubscriptionInfo = () => {
  console.log("SubscriptionInfo component rendering");
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [planType, setPlanType] = useState('BASIC');
  const [extensionDays, setExtensionDays] = useState(30);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedPaymentPlan, setSelectedPaymentPlan] = useState(null);
  const [selectedPaymentDays, setSelectedPaymentDays] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('1_month');
  const [subscriptionPeriods, setSubscriptionPeriods] = useState([]);
  const [selectedPaymentPeriod, setSelectedPaymentPeriod] = useState('1_month');
  const [autoRenew, setAutoRenew] = useState(true);
  
  // Fetch subscription info
  const fetchSubscriptionInfo = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log("Fetching subscription status with token:", token ? "token present" : "no token");
      
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/subscription/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log("Subscription API response:", response.data);
      
      if (response.data) {
        setSubscription(response.data);
        setAutoRenew(response.data.auto_renew !== undefined ? response.data.auto_renew : true);
      } else {
        setSubscription(null);
        setError('No subscription data received');
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
      console.error('Error details:', err.response?.data || 'No response data');
      
      // Check if this is a 404 "No subscription found" error
      if (err.response && err.response.status === 404) {
        setSubscription(null);  // Set subscription to null to indicate no active subscription
        setError('No active subscription found. You can purchase a new subscription below.');
      } else {
        // For other errors, keep the subscription data if it exists
        // This prevents losing the subscription UI on temporary errors
        setError('Failed to load subscription information. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch available plans
  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/subscription/plans`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPlans(response.data.plans || []);
      setSubscriptionPeriods(response.data.periods || []);
      console.log('Available plans:', response.data.plans);
      console.log('Available periods:', response.data.periods);
    } catch (err) {
      console.error('Error fetching plans:', err);
    }
  };
  
  useEffect(() => {
    fetchSubscriptionInfo();
    fetchPlans();
  }, []);
  
  // Free extension (for trial plans)
  const handleExtendSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${process.env.REACT_APP_API_BASE_URL}/subscription/extend`, 
        { period: selectedPeriod, plan: planType },
        { headers: { 'Authorization': `Bearer ${token}` }}
      );
      
      fetchSubscriptionInfo();
      setPlanDialogOpen(false);
    } catch (err) {
      console.error('Error extending subscription:', err);
      setError('Failed to extend subscription: ' + (err.response?.data?.message || err.message));
    }
  };
  
  const getStatusColor = (isValid, daysRemaining) => {
    if (!isValid) return 'error';
    if (daysRemaining < 7) return 'warning';
    return 'success';
  };
  
  // Update the formatDate function to handle dates consistently
const formatDate = (dateString) => {
  if (!dateString) return "N/A";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'  // Always use UTC
    });
  } catch (e) {
    console.error("Date formatting error:", e);
    return "Error";
  }
};

// Update the calculateDays function to handle date differences correctly
const calculateDays = (startDate, endDate) => {
  try {
    // Create dates at start of day in UTC
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Set both dates to start of day
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);
    
    // Calculate difference including the end date
    const diffTime = end.getTime() - start.getTime();
    // Add one day to include the end date in the count
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return Math.max(0, diffDays);
  } catch (e) {
    console.error("Error calculating days:", e);
    return 0;
  }
};

// Add helper function to normalize dates
const normalizeDate = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};
  
  // Check if plan requires payment
  const planRequiresPayment = (planId) => {
    const plan = plans.find(p => p.id === planId);
    return plan && !plan.is_trial;
  };
  
  // Handle plan selection and determine next steps
  const handlePlanConfirm = () => {
    if (planRequiresPayment(planType)) {
      setSelectedPaymentPlan(planType);
      setSelectedPaymentPeriod(selectedPeriod);
      setPaymentDialogOpen(true);
      setPlanDialogOpen(false);
    } else {
      handleExtendSubscription();
    }
  };

  // Calculate price based on plan and days
  const calculatePrice = () => {
    const selectedPlan = plans.find(p => p.id === planType);
    const selectedPeriodObj = subscriptionPeriods.find(p => p.id === selectedPeriod);
    
    if (!selectedPlan || !selectedPeriodObj) return 0;
    
    const basePrice = selectedPlan.price_per_day * selectedPeriodObj.days;
    return basePrice * (1 - (selectedPeriodObj.discount || 0));
  };

  // Add this function to your SubscriptionInfo component
const handleEndSubscription = async () => {
  // Show confirmation dialog
  if (!window.confirm(
    "Are you sure you want to end your subscription? This will immediately terminate all subscription benefits for your facility."
  )) {
    return; // User cancelled
  }
  
  try {
    setError(null);
    const token = localStorage.getItem('token');
    
    const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/subscription/end`, 
      {}, // No body needed for this request
      { headers: { 'Authorization': `Bearer ${token}` }}
    );
    
    fetchSubscriptionInfo(); // Refresh subscription info
    alert("Subscription has been ended successfully.");
  } catch (err) {
    console.error('Error ending subscription:', err);
    setError('Failed to end subscription: ' + (err.response?.data?.message || err.message));
  }
};

// Add this function at the beginning of your SubscriptionInfo component
const getPlanPriority = (planName) => {
  const priorities = {
    "PREMIUM": 3,
    "STANDARD": 2,
    "BASIC": 1,
    "TRIAL": 0
  };
  return priorities[planName] || 0;
};

// Add this function to fix the undefined reference error
const logDateCalculation = (tier, calculatedDays) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Tier date calculation:', {
      plan: tier.plan_name,
      start: new Date(tier.start_date).toISOString(),
      end: new Date(tier.end_date).toISOString(),
      calculatedDays
    });
  }
};

// Update the conditional rendering logic:
return (
  <Container maxWidth="lg">
    <Typography variant="h4" component="h1" gutterBottom>
      Subscription Management
    </Typography>
    
    {loading ? (
      <CircularProgress />
    ) : (
      <>
        {error && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="info" sx={{ mb: 1 }}>{error}</Alert>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={fetchSubscriptionInfo}
            >
              Retry Loading Subscription
            </Button>
          </Box>
        )}
        
        {!subscription && !loading ? (
          // Show purchase options when no subscription exists
          <Paper sx={{ p: 3, mb: 3 }}>
            {/* Purchase form */}
          </Paper>
        ) : subscription ? (
          // Show current subscription details when one exists
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="h4" gutterBottom>Subscription Management</Typography>
              
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
              )}
              
              <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
                <Typography variant="h5" gutterBottom>Current Subscription</Typography>
                <Divider sx={{ mb: 2 }} />
                
                {subscription ? (
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" color="textSecondary">Facility</Typography>
                        <Typography variant="h6">{subscription.facility_name}</Typography>
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" color="textSecondary">Plan</Typography>
                        <Typography variant="h6">{subscription.plan_name}</Typography>
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" color="textSecondary">Status</Typography>
                        <Chip 
                          label={subscription.is_valid ? "Active" : "Expired"} 
                          color={getStatusColor(subscription.is_valid, subscription.days_remaining)}
                          variant="outlined"
                          sx={{ fontWeight: 'bold' }} 
                        />
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" color="textSecondary">Start Date</Typography>
                        <Typography variant="h6">{formatDate(subscription.start_date)}</Typography>
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" color="textSecondary">Expiration Date</Typography>
                        <Typography variant="h6">{formatDate(subscription.end_date)}</Typography>
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" color="textSecondary">Time Remaining</Typography>
                        <Typography variant="h6">{subscription.days_remaining} days</Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                        <Box>
                          <Typography variant="subtitle2" color="textSecondary">Resource Limits</Typography>
                          <Typography>Maximum Users: {subscription.max_users}</Typography>
                          <Typography>Maximum Racks: {subscription.max_racks}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Button 
                            variant="outlined" 
                            color="error" 
                            onClick={handleEndSubscription}
                          >
                            End Subscription
                          </Button>
                          <Button 
                            variant="contained" 
                            color="primary" 
                            onClick={() => setPlanDialogOpen(true)}
                          >
                            Extend Subscription
                          </Button>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                ) : (
                  <Typography>No subscription found. Please contact support.</Typography>
                )}

                {/* Keep only this Tiered Subscription section */}
                {subscription && (subscription.has_tiered_plan || subscription.has_multiple_tiers) && (
                  <Box sx={{ mt: 2, p: 2, backgroundColor: '#f0f7ff', borderRadius: 1 }}>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      Tiered Subscription
                    </Typography>
                    
                    {subscription.subscription_tiers?.length > 0 ? (
                      <>
                        <Typography variant="body2" gutterBottom>
                          Your subscription includes multiple plans with different durations:
                        </Typography>
                        
                        <Box sx={{ mt: 2 }}>
                          {subscription.subscription_tiers.map((tier, index) => {
                            const startDate = new Date(tier.start_date);
                            const endDate = new Date(tier.end_date);
                            const now = new Date();
                            
                            // Fix days calculation to include both start and end dates
                            const actualStartDate = new Date(Math.max(startDate, now));
                            actualStartDate.setHours(0, 0, 0, 0);
                            
                            const actualEndDate = new Date(endDate);
                            actualEndDate.setHours(23, 59, 59, 999);
                            
                            // FIXED: Remove the +1 since Math.round already includes the end date
                            const daysRemaining = Math.round((actualEndDate - actualStartDate) / (1000 * 60 * 60 * 24));
                            
                            // Only show remaining days (not expired)
                            if (daysRemaining <= 0) return null;
                            
                            // For logging/debugging
                            logDateCalculation(tier, daysRemaining);
                            
                            return (
                              <Box 
                                key={index} 
                                sx={{ 
                                  p: 2, 
                                  mb: 1, 
                                  borderRadius: 1,
                                  bgcolor: index === 0 ? '#e3f2fd' : '#f5f5f5',
                                }}
                              >
                                <Typography variant="subtitle2">
                                  {tier.plan_name} Plan {index === 0 ? '(Current)' : ''}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                  {daysRemaining} days
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {index === 0 ? 'Now' : formatDate(tier.start_date)} → {formatDate(tier.end_date)}
                                </Typography>
                              </Box>
                            );
                          })}
                        </Box>
                      </>
                    ) : (
                      <>
                        <Typography variant="body2">
                          You are currently using the <strong>{subscription.plan_name}</strong> plan. 
                          After {formatDate(subscription.end_date)}, your subscription will switch to 
                          the <strong>{subscription.original_plan_name}</strong> plan for the remainder of your subscription.
                        </Typography>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                          <Typography variant="body2">
                            <strong>Current plan:</strong> {subscription.plan_name}
                            {` (until ${formatDate(subscription.end_date)})`}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Secondary plan:</strong> {subscription.original_plan_name}
                            {` (until ${formatDate(subscription.original_plan_end_date)})`}
                          </Typography>
                        </Box>
                      </>
                    )}
                  </Box>
                )}
              </Paper>
              
              {/* Plan Selection Dialog */}
              <Dialog open={planDialogOpen} onClose={() => setPlanDialogOpen(false)}>
                <DialogTitle>Extend Subscription</DialogTitle>
                <DialogContent>
                  <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
                    <InputLabel>Plan</InputLabel>
                    <Select
                      value={planType}
                      label="Plan"
                      onChange={(e) => setPlanType(e.target.value)}
                    >
                      {plans.map(plan => (
                        <MenuItem key={plan.id} value={plan.id}>
                          {plan.name} - Max Users: {plan.max_users}, Max Racks: {plan.max_racks}
                          {plan.is_trial ? ' (Free)' : ` ($${plan.price_per_day}/day)`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Duration</InputLabel>
                    <Select
                      value={selectedPeriod}
                      label="Duration"
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                    >
                      {subscriptionPeriods.map(period => (
                        <MenuItem key={period.id} value={period.id}>
                          {period.name} 
                          {period.discount > 0 ? ` (${period.discount * 100}% discount)` : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  {planRequiresPayment(planType) && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      This plan requires payment. You'll be prompted to enter payment details in the next step.
                    </Typography>
                  )}
                  
                  {calculatePrice() > 0 && (
                    <Typography variant="body1" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
                      Total: ${calculatePrice().toFixed(2)} USD
                    </Typography>
                  )}
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setPlanDialogOpen(false)}>Cancel</Button>
                  <Button 
                    variant="contained"
                    color="primary"
                    onClick={handlePlanConfirm}
                  >
                    {planRequiresPayment(planType) ? 'Continue to Payment' : 'Extend Subscription'}
                  </Button>
                </DialogActions>
              </Dialog>
              
              {/* Payment Dialog */}
              <Dialog 
                open={paymentDialogOpen} 
                onClose={() => setPaymentDialogOpen(false)}
                maxWidth="sm"
                fullWidth
              >
                <DialogTitle>Payment Details</DialogTitle>
                <DialogContent sx={{ minWidth: 400, pt: 2 }}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Plan: {selectedPaymentPlan}
                    </Typography>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Duration: {
                        subscriptionPeriods.find(p => p.id === selectedPaymentPeriod)?.name || selectedPaymentPeriod
                      }
                    </Typography>
                    <Typography variant="h6" gutterBottom>
                      Total: ${calculatePrice().toFixed(2)} USD
                    </Typography>
                  </Box>
                  
                  <Elements stripe={stripePromise}>
                    <PaymentFormContent
                      onSuccess={(data) => {
                        setPaymentDialogOpen(false);
                        fetchSubscriptionInfo();
                        alert("Payment successful! Your subscription has been extended.");
                      }}
                      onCancel={() => setPaymentDialogOpen(false)}
                      selectedPaymentPlan={selectedPaymentPlan}
                      selectedPaymentPeriod={selectedPaymentPeriod}
                      selectedPaymentDays={subscriptionPeriods.find(p => p.id === selectedPaymentPeriod)?.days || 30}
                      autoRenew={autoRenew}
                      setAutoRenew={setAutoRenew}
                      calculatePrice={calculatePrice}
                    />
                  </Elements>
                </DialogContent>
              </Dialog>
            </Box>
          </Paper>
        ) : null}
      </>
    )}
  </Container>
);

};

export default SubscriptionInfo;
