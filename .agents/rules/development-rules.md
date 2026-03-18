# TripTogether Development Rules

## Architecture
- **Components**: Functional components with hooks.
- **TypeScript**: Strict mode for type safety and DX.
- **Routing**: Expo Router (file-based in `app/`). Use `_layout.tsx` for shared UI, `[id].tsx` for dynamic routes, and `(group)` for route groups.
- **State Management**: Context API + hooks for simple state; Zustand or Redux Toolkit for complex state; React Query for server state.

## Navigation
- **Expo Router**: Auto-generated routes from `app/`.
- **Hooks**: `useRouter()`, `useLocalSearchParams()`, `useSegments()`.
- **Features**: Deep linking is auto-configured. Use TypeScript for type-safe route params.

## Data & Assets
- **Images**: `expo-image` for caching, placeholders, and performance.
- **Assets/Fonts**: Expo asset system.
- **Storage**: `expo-secure-store` for sensitive data, `@react-native-async-storage/async-storage` for non-sensitive data.
- **API**: Centralize in `src/services/` using Axios or fetch.

## Security
- **Storage**: Never store sensitive data in AsyncStorage.
- **API Keys**: Use environment variables; do not commit them.
- **Permissions**: Request only necessary permissions.
- **Network**: Always use HTTPS for API calls.

## Documentation & Comments
- **File-level comments**: Add a block at the top explaining purpose, architecture role, key exports, and patterns.
- **Inline comments**: Avoid line-by-line comments. Code should be self-documenting. Use inline only for complex logic.
