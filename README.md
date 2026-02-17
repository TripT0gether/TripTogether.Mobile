# TripTogether Mobile

A React Native mobile application for collaborative group travel planning, expense tracking, and friend management. Built with Expo, TypeScript, and a "Clean 80s Retro" design aesthetic.

## Tech Stack

- **React Native** (0.74.5) with **Expo** (~51.0.0)
- **TypeScript** (5.3.3) for type safety
- **Expo Router** (3.5.0) for file-based navigation
- **NativeWind** (2.0.11) with **Tailwind CSS** (3.3.2)
- **Axios** for API communication with auto-refresh JWT tokens
- **Expo Secure Store** for secure authentication token storage
- **Lucide React Native** for retro-style icons
- **React Native Toast Message** for user feedback

## Project Structure

```
TripTogether.Mobile/
├── app/                 # File-based routing (Expo Router)
│   ├── (auth)/         # Auth screens (route group, URL: /login, /register)
│   ├── index.tsx       # Home/Groups dashboard
│   ├── friends.tsx     # Friends management
│   └── profile.tsx     # User profile
├── src/
│   ├── components/     # Reusable UI components
│   ├── services/       # API service layer (auth, user, group, friendship)
│   ├── types/          # TypeScript definitions
│   ├── constants/      # Theme & design tokens
│   └── utils/          # Helper functions
└── assets/             # Images, fonts, icons
```

## Design System

**Theme:** "Clean 80s Retro" - Vintage computer terminal aesthetic with warm earth tones

**Color Palette:**
- Primary: Terracotta Brown (`#A0462D`)
- Secondary: Sage Green (`#7B9B7D`)
- Accent: Olive Green (success states)
- Background: Cream (`#F9F6F0`)
- Card: Off-White (`#FFFCF7`)

**Typography:** IBM Plex Mono (monospace font family)

**UI Elements:**
- Retro box shadows (offset shadows)
- Border-heavy cards
- Pixel-perfect borders and rounded corners
- Toast notifications with retro styling

## Features

### **Authentication**
- Email/password registration with OTP verification
- Secure JWT-based authentication
- Automatic token refresh
- Logout functionality

### **Friend Management**
- Search users by username/email
- Send/receive friend requests
- Accept/reject requests
- Unfriend with confirmation dialog
- Friends list with search filtering
- Swipeable tab navigation (Friends, Requests, Search)

### **Group Management**
- Create and browse travel groups
- View group details
- Pagination support
- Search functionality

### **User Profile**
- View and edit profile information
- Display verification status
- Avatar with initials

### **Navigation**
- File-based routing with Expo Router
- Bottom sheet user menu
- Header with notification bell (UI only, badge shows "3")
- Stack navigation with gestures

## Setup Instructions

### Prerequisites
- Node.js (16+)
- **pnpm** (9.15.4) - Required package manager
- Expo CLI
- Android Studio (for Android) or Xcode (for iOS)

### 1. Install pnpm
```bash
npm install -g pnpm@9.15.4
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Configure API Endpoint
Update the API base URL in `src/services/apiConfig.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: 'http://your-backend-url:port/api',
  TIMEOUT: 30000,
};
```

### 4. Start Development Server
```bash
pnpm start
```

Or use platform-specific commands:
```bash
pnpm android  # Android emulator
pnpm ios      # iOS simulator
pnpm web      # Web browser
```

### 5. Clear Cache (if needed)
```bash
pnpm start --clear
```

## Running on Devices

### **Android Emulator**
1. Open Android Studio → Device Manager
2. Start an AVD (Android Virtual Device)
3. Run `pnpm android`
4. App installs and launches automatically via ADB

### **Physical Device**
1. Install Expo Go app from App/Play Store
2. Scan QR code from terminal
3. Ensure device is on same network as dev server

## Authentication Flow

1. **Register:** Email + password → OTP sent to email
2. **Verify OTP:** Enter 6-digit code
3. **Login:** JWT access + refresh tokens stored securely
4. **Auto-refresh:** Axios interceptor handles token expiry
5. **Logout:** Clears tokens from secure storage

## API Integration

The app uses a layered service architecture:

```typescript
// Example: Using the friend service
import { friendshipService } from '../src/services/friendshipService';

// Search users
const results = await friendshipService.searchUsers({ searchTerm: 'john' });

// Send friend request
await friendshipService.sendFriendRequest(userId);

// Get friends list
const friends = await friendshipService.getFriends({ pageSize: 20 });

// Unfriend
await friendshipService.unfriend(friendshipId);
```

**API Response Format:**
```typescript
{
  "isSuccess": true,
  "value": {
    "code": "200",
    "message": "Success",
    "data": { /* actual data */ }
  },
  "error": null
}
```

## Route Groups Explained

Expo Router uses `(parentheses)` for **route groups** - folders that organize files without affecting URLs:

```
app/(auth)/login.tsx  →  /login  (not /auth/login)
```

Benefits:
- Cleaner URLs
- Shared layouts between related screens
- Better code organization

## Package Manager

**pnpm** is required for this project. Configuration in `.npmrc`:
- `node-linker=hoisted` - React Native compatibility
- `shamefully-hoist=true` - Metro bundler support
- Public hoist patterns for Expo and React Native

## Type Checking

```bash
pnpm type-check
```

## Common Issues

### **Metro bundler cache issues**
```bash
pnpm start --clear
```

### **Dependencies not resolving**
```bash
rm -rf node_modules
pnpm install
```

### **ADB device not found**
```bash
adb devices
adb kill-server && adb start-server
```

## Development Guidelines

- Use **TypeScript** for all new code
- Follow existing folder structure
- Use functional components with hooks
- Implement proper error handling for all API calls
- Test on both iOS and Android
- Follow the retro design system (theme.ts)
- Use `showSuccessToast()` and `showErrorToast()` for user feedback

## Upcoming Features

- [ ] Notifications (bell icon functional)
- [ ] Trip planning workflow
- [ ] Expense tracking & settlement
- [ ] Photo gallery
- [ ] Real-time updates (WebSocket)

## Related Repositories

- **Backend API:** TripTogether.API (.NET)

## License

Private - Academic Project
