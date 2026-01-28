# TripTogether Mobile

React Native mobile application built with Expo, NativeWind, and Tailwind CSS, designed to integrate with a .NET API backend.

## Tech Stack

- **React Native** with **Expo**
- **TypeScript** for type safety
- **NativeWind** (v2.0.11) for Tailwind CSS styling
- **Tailwind CSS** (v3.3.2)
- **Axios** for API calls
- **Expo Router** for navigation
- **Expo Secure Store** for secure token storage

## Project Structure

```
TripTogether.Mobile/
├── assets/              # Images, fonts, and other assets
├── src/
│   ├── components/      # Reusable UI components
│   ├── screens/        # Screen components
│   ├── navigation/     # Navigation configuration
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API services and external integrations
│   └── utils/          # Utility functions and constants
├── App.js              # Root component (kept clean)
├── app.json            # Expo configuration
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── babel.config.js     # Babel configuration with NativeWind
```

## Setup Instructions

1. **Install Dependencies**
   
   This project uses **pnpm** as the package manager. If you don't have pnpm installed:
   ```powershell
   npm install -g pnpm
   ```
   
   Then install project dependencies:
   ```powershell
   pnpm install
   ```

2. **Configure API Base URL**
   - Open `src/services/api.ts`
   - Update `API_BASE_URL` with your .NET API endpoint:
     ```typescript
     const API_BASE_URL = 'http://your-api-url:port/api';
     ```

3. **Configure API Endpoints**
   - Open `src/utils/constants.ts`
   - Update `API_ENDPOINTS` with your actual .NET API routes

4. **Start Development Server**
   ```powershell
   pnpm start
   ```
   
   Or use the specific platform commands:
   ```powershell
   pnpm android  # For Android
   pnpm ios      # For iOS
   pnpm web      # For Web
   ```

## API Integration

The project includes a complete API service layer (`src/services/api.ts`) that:
- Handles authentication tokens automatically
- Provides interceptors for request/response handling
- Supports all HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Uses Expo Secure Store for token management

### Example Usage

```typescript
import { apiService } from '../services/api';

// GET request
const data = await apiService.get('/users');

// POST request
const result = await apiService.post('/users', { name: 'John' });

// With custom hook
const { data, loading, error } = useApi(
  () => apiService.get('/users'),
  []
);
```

## Styling

This project uses NativeWind (Tailwind CSS for React Native). You can use Tailwind utility classes directly in your components:

```tsx
<View className="flex-1 bg-gray-50 p-4">
  <Text className="text-2xl font-bold text-gray-900">
    Hello World
  </Text>
</View>
```

## Development

- Use TypeScript for all new files in `src/`
- Follow the folder structure guidelines
- Use functional components with hooks
- Implement proper error handling for API calls
- Use Expo Secure Store for sensitive data

## Package Manager

This project uses **pnpm** for faster, more efficient package management. The `.npmrc` file is configured with:
- `node-linker=hoisted` - Better React Native compatibility
- `shamefully-hoist=true` - Ensures Metro bundler works correctly
- Public hoist patterns for React Native and Expo packages

## Notes

- NativeWind version: 2.0.11
- Tailwind CSS version: 3.3.2
- These specific versions are required for compatibility
- Package manager: **pnpm** (configured in `.npmrc`)
