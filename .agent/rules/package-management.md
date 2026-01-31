# Package Management and Compatibility

Guidelines for installing, upgrading, and maintaining version compatibility for key dependencies.

## Rules
- **Terminal Usage**: Use **PowerShell** for all package management commands.
- **NativeWind & Tailwind Compatibility**:
    - **MUST USE**: `nativewind@2.0.11` and `tailwindcss@3.3.2`.
    - Higher versions are known to cause `process(css).then(cb)` errors.
    - If errors occur, reinstall specific versions:
      ```powershell
      npm remove nativewind tailwindcss
      npm install nativewind@2.0.11 tailwindcss@3.3.2
      ```
- **New Package Pre-check**: Before installing, check if a package is already present:
    - `Get-ChildItem -Recurse -Filter <package-name>`
- **Upgrading**: Use `expo upgrade <package-name>` when possible. Falls back to `npm install <package-name>` if not supported by Expo.
