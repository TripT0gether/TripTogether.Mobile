# Project Structure and Organization

Enforce the recommended folder structure for React Native Expo projects and keep root files clean.

## Rules
- **Folder Structure**: Ensure the following directories and files exist:
    - `assets/`
    - `src/`
        - `components/`
        - `screens/`
        - `navigation/`
        - `hooks/`
        - `utils/`
    - `app/` (for Expo Router)
        - `_layout.tsx`
        - `index.tsx`
- **Root Files**:
    - `App.js`: Keep it clean. Delegate logic to components in `src/`.
    - `app.json`: Configure according to Expo documentation.
- **File Operations**: Use PowerShell for moving or renaming files.
    - Example: `Move-Item -Path .\old\path\file.txt -Destination .\new\path\newname.txt`
