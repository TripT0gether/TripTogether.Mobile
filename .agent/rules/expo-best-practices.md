# Expo and React Native Best Practices

Standards for code quality, safety, and specialized Expo features with modern tooling.

## Official Documentation
Before implementing features, consult these official resources:
- **Expo**: https://docs.expo.dev/
- **Tailwind CSS**: https://tailwindcss.com/docs/styling-with-utility-classes
- **Metro Bundler**: https://metrobundler.dev/docs/getting-started
- **Turborepo**: https://turborepo.dev/docs

## Architecture
- **Components**: Use **functional components** with hooks
- **TypeScript**: Implement for type safety and better DX
- **File-based Routing**: Use **Expo Router** for navigation
  - Organize routes in `app/` directory
  - Use layout files (`_layout.tsx`) for shared UI
  - Leverage dynamic routes with `[id].tsx` syntax
  - Use route groups with `(group)` folders
- **State Management**:
  - Simple: Context API + hooks
  - Complex: Zustand or Redux Toolkit
  - Server state: React Query (TanStack Query)

## Styling
- **Primary**: Use **NativeWind v2.0.11** for Tailwind-style classes
  - Compatible with `tailwindcss@3.3.2`
  - Use `className` prop for styling
  - Configure in `tailwind.config.js`
- **Fallback**: Use `StyleSheet` for complex animations or platform-specific styles
- **Responsive**: Use Tailwind breakpoints and `useWindowDimensions` hook

## Navigation (Expo Router)
- **File-based routing**: Routes auto-generated from `app/` directory structure
- **Navigation hooks**:
  - `useRouter()` for programmatic navigation
  - `useLocalSearchParams()` for route params
  - `useSegments()` for current route segments
- **Layouts**: Use `_layout.tsx` for shared navigation structure
- **Deep linking**: Configured automatically by Expo Router
- **Type-safe routes**: Use TypeScript for route params

## Data & Assets
- **Assets**: Use Expo's asset system for images and fonts
- **Secure Storage**: Use `expo-secure-store` for sensitive data
- **Async Storage**: Use `@react-native-async-storage/async-storage` for non-sensitive data
- **API Calls**: Centralize in `src/services/` with axios or fetch

## Performance & Optimization
- **Metro Bundler**:
  - Cache enabled by default in `node_modules/.cache/`
  - Use `expo export` to pre-bundle for faster startups
  - Configure in `metro.config.js` if needed
- **Turborepo**:
  - Use `pnpm turbo run build` for cached builds
  - Configure tasks in `turbo.json`
  - Leverage cache for CI/CD pipelines
- **pnpm**:
  - Use pnpm 9.15.4+ for faster installs
  - Configure hoisting in `.npmrc` for React Native compatibility
- **Code Splitting**: Use dynamic imports for large components
- **Image Optimization**: Use WebP format and proper sizing

## Build & Deployment
- **EAS Build**: Use for cloud builds with Turborepo caching
  - Configure in `eas.json`
  - Enable Turborepo cache with `cache.paths`
  - Set `EXPO_USE_FAST_RESOLVER=true`
- **OTA Updates**: Use Expo's Over-The-Air updates for quick fixes
- **Environment Variables**: Use `EXPO_PUBLIC_*` prefix for client-side vars

## Development Workflow
- **Scripts**:
  - `pnpm start` - Start Metro bundler
  - `pnpm android` - Run on Android
  - `pnpm build` - Export bundles (populates Metro cache)
  - `pnpm turbo run build` - Build with Turborepo caching
  - `pnpm clean` - Clear all caches
- **Hot Reload**: Enabled by default, preserves state
- **Fast Refresh**: Auto-reload on save

## Error Handling & Quality
- **Error Boundaries**: Implement for graceful error handling
- **Crash Reporting**: Use Sentry or similar service
- **Offline Support**: Handle network failures gracefully
- **TypeScript**: Use strict mode for better type safety
- **Linting**: Use ESLint with React Native config

## Testing
- **Unit Tests**: Jest + React Native Testing Library
- **E2E Tests**: Detox or Maestro
- **Type Checking**: Run `pnpm type-check` before commits

## Security
- **Secure Storage**: Never store sensitive data in AsyncStorage
- **API Keys**: Use environment variables, never commit
- **Permissions**: Request only necessary permissions
- **HTTPS**: Always use HTTPS for API calls
