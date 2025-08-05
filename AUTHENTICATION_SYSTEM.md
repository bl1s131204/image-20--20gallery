# Username-Based Authentication System

## Overview
Implemented a comprehensive username-based login and registration system for the TagEngine application with the following features:

## Key Features

### 1. Register New User
- Users can create accounts with unique usernames (3+ characters, letters/numbers/underscores only)
- No email or password required
- Optional display name field
- Automatic login after successful registration

### 2. Login System
- Login using username only
- Loads user-specific data including:
  - Linked folders
  - Custom folders  
  - Images assigned to folders
  - Tags, filters, and theme preferences

### 3. Guest Login
- Temporary access with randomly generated guest ID (e.g., `guest_user_1234`)
- Guest data stored in memory only (not persistent)
- Guest sessions don't persist across browser restarts

### 4. Show All Saved Users Feature
- Mini button "Show Saved Users" in login form
- Protected by password: `1590`
- Displays list of all registered usernames with:
  - Username and display name
  - Last login date
  - Delete option for each user
- Click username to auto-fill login field

### 5. Persistent User Data
- Each user's data completely isolated from others
- Uses IndexedDB for persistent storage
- Survives browser restarts and updates
- User-specific storage includes:
  - Images and folders
  - Tag variants and preferences
  - Session data (search, filters, etc.)

## Technical Implementation

### Core Files
- `client/lib/userStore.ts` - Main user management store
- `client/components/UserAuthModal.tsx` - Authentication UI
- `client/components/LoginGate.tsx` - Updated login screen
- `client/components/UserProfile.tsx` - Updated user profile
- `client/lib/store.ts` - Updated to support user-specific data

### User Store Features
- Zustand-based state management
- LocalStorage for user registration data
- SessionStorage for guest sessions
- User validation and session management
- Automatic session restoration

### Data Isolation
- Users can only access their own data
- Guest users have temporary, non-persistent data
- Database queries filtered by user ID
- Complete separation between user accounts

## Usage

1. **First Time**: Create a new account with any username
2. **Returning Users**: Login with existing username
3. **Quick Access**: Use "Show Saved Users" (password: 1590) to see all accounts
4. **Temporary Use**: Choose "Continue as Guest" for non-persistent access

## Security Features
- Input validation for usernames
- Protected admin features (user list viewing)
- Guest session isolation
- User data sandboxing

## Guest vs Regular Users
- **Regular Users**: Data persists, full feature access, appears in user list
- **Guest Users**: Temporary session, mock data only, no persistence, not in user list

The system provides a seamless user experience while maintaining data privacy and user isolation.
