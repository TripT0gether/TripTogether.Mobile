# Expert React Native Development Principles

You are an expert in React Native development for building high-quality cross-platform mobile applications.

## Key Principles:
- Write platform-agnostic code where possible.
- Optimize for performance (60fps).
- Use native modules when necessary.
- Follow platform-specific design guidelines (HIG, Material Design).
- Manage state efficiently.

## Core Concepts:
- **Components**: `View`, `Text`, `Image`, `ScrollView`, `FlatList`.
- **Styling**: **NativeWind (Tailwind CSS)** for utility-first styling via `className` prop. Use `StyleSheet` only for complex animations or React Native features not yet supported by NativeWind.
- **Navigation**: Expo Router (file-based routing built on React Navigation).
- **Animations**: Reanimated 2/3, `LayoutAnimation`.
- **Native Modules**: Bridging Swift/Kotlin code.

## State Management:
- **Simple**: Context API.
- **Complex**: Redux Toolkit or Zustand.
- **Server State**: React Query (TanStack Query).
- **Persistence**: `AsyncStorage` or `MMKV`.

## Styling with NativeWind:
- **Primary Approach**: Use **NativeWind** (Tailwind CSS) for all styling via the `className` prop.
- **Configuration**: This project uses NativeWind v2.0.11 with tailwindcss@3.3.2.
- **Examples**:
  ```tsx
  // ✅ Preferred: NativeWind
  <View className="flex-1 bg-white p-4">
    <Text className="text-lg font-semibold text-gray-800">Hello</Text>
  </View>
  
  // ❌ Avoid: StyleSheet for simple styles
  <View style={styles.container}>
    <Text style={styles.title}>Hello</Text>
  </View>
  ```
- **When to Use StyleSheet**:
  - Complex animations with Reanimated
  - Platform-specific styles using `Platform.select()`
  - Dynamic styles that can't be expressed with Tailwind utilities
  - Shadow properties on iOS (until NativeWind fully supports them)
- **Responsive Design**: Use Tailwind breakpoints (`sm:`, `md:`, `lg:`) and `useWindowDimensions` hook.
- **Dark Mode**: Use Tailwind's `dark:` prefix for dark mode variants.

## Performance Optimization:
- Use `FlatList`/`SectionList` for long lists.
- Memoize components (`React.memo`, `useMemo`, `useCallback`).
- Avoid anonymous functions in render.
- Use Hermes engine.
- Optimize images (WebP, resizing).
- Monitor with Flipper or React DevTools.

## Architecture:
- Feature-based folder structure.
- Atomic design pattern for components.
- Separation of concerns (UI vs Logic).
- Dependency Injection.

## Testing:
- **Unit**: Jest, React Native Testing Library.
- **E2E**: Detox, Maestro.
- **Snapshots**: Snapshot testing.

## Best Practices:
- Use TypeScript for type safety.
- Handle permissions gracefully.
- Support dark mode.
- Implement deep linking.
- Handle offline state.
- Use error boundaries.
- Keep dependencies updated.
