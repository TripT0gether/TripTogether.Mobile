---
description: Safely install a new package while ensuring compatibility and checking for existing installs.
---

1. Check if the package is already installed:
    ```powershell
    Get-ChildItem -Recurse -Filter <package-name>
    ```
2. If the package relates to NativeWind or Tailwind, ensure versions:
    - `nativewind@2.0.11`
    - `tailwindcss@3.3.2`
3. Install using Expo if possible:
    ```powershell
    expo upgrade <package-name>
    ```
4. If not supported by Expo, use npm:
    ```powershell
    npm install <package-name>
    ```
