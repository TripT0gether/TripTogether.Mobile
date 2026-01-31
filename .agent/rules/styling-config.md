# Styling and Configuration

Specific configuration requirements for NativeWind and Babel.

## Rules
- **Babel Configuration (`babel.config.js`)**:
    - Include `'nativewind/babel'` in the `plugins` array.
    - Ensure `'react-native-reanimated/plugin'` is listed **after** `'nativewind/babel'`.
    - **Avoid** using `jsxImportSource` in presets.
