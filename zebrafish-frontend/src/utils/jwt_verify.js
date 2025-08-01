// Create a file named jwt_verify.js in the src/utils folder
export const verifyToken = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error("No token found in localStorage");
    return false;
  }
  
  try {
    // Split the JWT token into its parts
    const [header, payload, signature] = token.split('.');
    
    // Decode the payload (the middle part)
    const decodedPayload = JSON.parse(atob(payload));
    console.log("Decoded token payload:", decodedPayload);
    
    // Check for facility_id in the token
    if (decodedPayload.sub && typeof decodedPayload.sub === 'object') {
      console.log("Token facility_id:", decodedPayload.sub.facility_id);
      if (!decodedPayload.sub.facility_id) {
        console.warn("Token doesn't contain facility_id!");
      }
    } else {
      console.warn("Token subject is not an object or missing!");
    }
    
    return decodedPayload;
  } catch (e) {
    console.error("Error verifying token:", e);
    return false;
  }
};