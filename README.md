# Better-Messenger
A new Messenger desktop app, since the official one is discontinued since 12.12.2025

The better part:
It doesn't force edge onto you.

## Installation
- Select a release from Releases on the right
- Run the installer
- If "Windows protected your PC" (Windows SmartScreen) pops up:
    - Click More Info -> Run Anyways

### Disable minimize to tray
- open app
- press ALT
- Top left corner will have "Settings" button
- Click, uncheck minimize to tray

### Releases (For Developers)
- Install deps once: `npm install`.
- Build the installer: `npm run build` (outputs to `dist/`).
- Create a tag: `git tag v1.0.0` then `git push origin v1.0.0`.
- Draft a GitHub Release for that tag and upload the `Better Messenger Setup x.y.z.exe` from `dist/`
- Add release notes: brief summary
