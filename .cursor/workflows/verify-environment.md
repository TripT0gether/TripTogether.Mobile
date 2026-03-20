---
description: Verify the project environment, folder structure, and key package versions.
---

1. Check directory structure:
    ```powershell
    Get-ChildItem -Path assets, src, app
    ```
2. Verify package versions (NativeWind and Tailwind):
    ```powershell
    Select-String -Path package.json -Pattern "nativewind", "tailwindcss"
    ```
3. Check Babel configuration:
    ```powershell
    Get-Content babel.config.js
    ```
4. Confirm `App.js` cleanliness:
    ```powershell
    Get-Content App.js
    ```
