// This file runs via jest's setupFiles BEFORE any test module imports
// It sets placeholder env vars so env.ts doesn't throw when app.ts is loaded
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://placeholder:27017/test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_key_at_least_32chars';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_at_least_32chars';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.JWT_REFRESH_REMEMBER_EXPIRES_IN = '30d';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.SERVER_URL = 'http://localhost:5000';
process.env.COOKIE_DOMAIN = 'localhost';
process.env.GOOGLE_CLIENT_ID = 'test_client_id';
process.env.GOOGLE_CLIENT_SECRET = 'test_client_secret';
process.env.GEMINI_API_KEY = ''; // Disabled in tests — prevents real API calls
