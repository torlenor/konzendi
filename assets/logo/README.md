# Konzendi logo

These files are the production sources of the Konzendi **Threaded Mind** logo. The design
decisions are in [Phase 12](../../docs/phases/phase-12-logo-design.md).

## Rights

All rights reserved. The [logo rights notice](RIGHTS.md)
applies to these sources and to all exports from them. It does not apply to other repository
files.

## Files and allowed use

| File | Use |
| --- | --- |
| `konzendi-mark-on-light.svg` | Petrol and blue. Use it on light backgrounds. |
| `konzendi-mark-on-dark.svg` | Cool light and blue. Use it on dark backgrounds. |
| `konzendi-app-icon.svg` | The light-background logo at 78% on a rounded `#dbe5ea` tile. It is the source of the tray icon, the application icons, and the favicon. |
| [`src/assets/konzendi-tray-32.png`](../../src/assets/konzendi-tray-32.png) | Generated 32 by 32 px tray icon. Do not edit it by hand. |
| [`src-tauri/icons/`](../../src-tauri/icons/) | Generated application icons. The Linux window icon is `32x32.png`. Do not edit them by hand. |

- Do not change the colours, the geometry, or the positions of the petrol and blue lobes.
- The tray, the application icons, and the favicon use `konzendi-app-icon.svg`. The tile keeps
  the petrol lobes visible on dark panels. Do not add a keyline or a theme-dependent icon.
- The README shows the logo at 80 px before the `# Konzendi` heading. The heading stays text.
- When you put the logo beside other content, keep clear space of at least 6 units in the
  64-unit view box (the width of the spine) outside the view box.
- `index.html` links the favicon directly to `konzendi-app-icon.svg`.

## Export the icons

```bash
npm run logo:export            # writes src/assets/konzendi-tray-32.png
npm run logo:export -- --check # fails if the committed PNG differs from a new export
npm run logo:icons             # writes the application icons in src-tauri/icons/
```

The script renders `konzendi-app-icon.svg` with the pinned `@resvg/resvg-js` development
dependency. It fails if the source view box is not `0 0 64 64` or if the output is not an 8-bit
RGBA PNG of 32 by 32 px. `npm run test:scripts` also compares the committed PNG with a new export.

`npm run logo:icons` runs the locked Tauri CLI (`tauri icon`) on the same source and replaces
only the existing desktop icon files. It does not keep the Android and iOS icons that the CLI
also writes. The PNG and ICO files are the same on each run; `icon.icns` changes on each run.

## Replace the logo

1. Change the three SVG sources together. Keep the `0 0 64 64` view box.
2. Run `npm run logo:export` and `npm run logo:icons`. Commit the SVG sources and all generated
   icons together.
3. Run `npm run test:scripts`. Then check the tray on a light panel and a dark panel, and check
   the window icon, in the running application.
4. If the tray icon cannot be loaded, the application shows its generated application icon. To
   go back to the previous logo, revert the commit that changed it.
