// client/src/config.js
const isDevelopment = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';

export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:5000/api'
  : "https://spring8-inventory-management.onrender.com";

export const config = {
  apiUrl: API_BASE_URL,
  isDevelopment,
}; 