# Expo and React Native Best Practices

Standards for code quality, safety, and specialized Expo features.

## Rules
- **Architecture**:
    - Use **functional components** with hooks.
    - Implement **TypeScript** for type safety.
- **Styling**:
    - Use **NativeWind** for styling components.
    - Fallback to `StyleSheet` where necessary.
- **Navigation**:
    - Implement navigation using **Expo Router**.
- **Data & Assets**:
    - Use Expo's asset system for images and fonts.
    - Secure sensitive data with `Expo.SecureStore`.
- **Infrastructure**:
    - Utilize Expo SDK features and APIs.
    - Implement robust error handling and crash reporting.
    - Implement proper offline support.
    - Use Expo's OTA (Over-The-Air) mechanism for updates.
