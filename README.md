# Vocabulary Test M6 - Troubleshooting Guide

## Issues Fixed

### 1. Page Reload Logout Problem
- **Problem**: Users were automatically logged out when reloading the page
- **Solution**: Implemented session persistence using localStorage to restore user sessions on page reload

### 2. Form Data Loss
- **Problem**: All typed data in submission fields was lost on page reload
- **Solution**: Added automatic form data persistence that saves answers as users type and restores them on page reload

### 3. Visibility Check Failure Lockout
- **Problem**: After visibility check failure, users couldn't log in again
- **Solution**: Added graceful handling of visibility failures with options to restart the test or continue with submission

### 4. Database Connection Inconsistency
- **Problem**: Login and submit functions used different database connection methods
- **Solution**: Standardized both functions to use the same `Client` pattern from pg library

## Setup Instructions

### 1. Database Setup
Run the SQL commands in `setup-database.sql` in your Neon database to create the users table and insert the test data.

### 2. Environment Variables
Make sure you have the following environment variable set in your Netlify deployment:
```
NEON_DATABASE_URL=your_neon_database_connection_string
```

### 3. Dependencies
Install the required dependencies:
```bash
npm install
```

## Features Added

### Session Persistence
- Users stay logged in across page reloads
- Form data is automatically saved and restored
- Session state is maintained in localStorage

### Improved Error Handling
- Graceful handling of visibility check failures
- Users can restart tests if needed
- Better error messages and user feedback

### Logout Functionality
- Added logout button for better user control
- Proper cleanup of all stored data
- Reset of form state

### Form Data Persistence
- Real-time saving of form inputs
- Automatic restoration on page reload
- Prevents data loss during navigation

## Testing

1. **Login**: Use any of the test credentials (e.g., Munich/pass1)
2. **Form Persistence**: Type in some answers, reload the page, verify data is restored
3. **Session Persistence**: Login, reload page, verify you're still logged in
4. **Visibility Check**: Test the page visibility detection (switch tabs, minimize browser)
5. **Logout**: Use the logout button to clear session

## Troubleshooting

### If users still get logged out:
- Check browser console for JavaScript errors
- Verify localStorage is enabled in the browser
- Check if the session restoration function is being called

### If form data is not persisting:
- Ensure the form input event listeners are properly attached
- Check localStorage for the 'formAnswers' key
- Verify the restoreFormData function is called on page load

### If visibility check still causes issues:
- The system now provides options to restart or continue
- Users can choose to restart the test if they believe it was an error
- The 5-second delay gives users time to return to the page

## Security Notes

- Current token implementation is basic (base64 encoded user ID + timestamp)
- Consider implementing proper JWT tokens for production use
- Passwords are stored in plain text - consider hashing for production
- The visibility check is a basic anti-cheating measure but can be bypassed

## Deployment

The project is configured for Netlify deployment with:
- `netlify.toml` configuration
- Serverless functions in the `functions/` directory
- Proper CORS and method handling
