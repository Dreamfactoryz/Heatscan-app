# Heat Scan

Phone app for capturing heat numbers on pipe spools: photograph each flange, pipe and fitting in weld order, record the welds between them, and export everything as CSV and a photo ZIP. Built with Expo (React Native) for iPhone and Android from one codebase.

## What it does

- **Spools** with a name, job/location and fabricator (picked from a list you manage in Settings).
- **Heat numbers by photo.** The app reads the mark and suggests the heat number, item type, size, class/schedule and material. You check it, pick a look-alike reading if needed (0/O, 1/I, 5/S, 8/B, 2/Z) and save. You can also type a number in. Each item has a comments box.
- **Welds** between items, with a type (Butt, Socket, Fillet) and Shop Weld or Field Weld.
- **NDT warnings.** By default 1 in 10 shop butt welds needs X-ray and 1 in 5 fillet welds needs dye pen, counted across every spool on the phone. You can change the rates and the counts carried over from before in Settings. Each warning can be marked booked.
- **P&ID drawings** per spool (drawing number and title), with finger highlighting in three colours, zoom and labels.
- **Dye pen photos** linked to a weld, and **finished spool photos**.
- **Export** one spool or all spools as CSV (same columns as the web app) or a ZIP of all photos and drawings with the CSV inside, through the phone's share menu.

## How heat numbers are read

- **On the phone (default):** Google ML Kit text recognition. It is free, works offline and runs on both iPhone and Android.
- **With Claude (optional):** add a Claude API key in Settings and photos are sent to Claude, which is better on stamped, painted or worn marks. If there is no signal, the app falls back to the phone reader. The key is stored in the phone's secure storage.

## Where data lives

Everything is stored on the phone in the app's private folder (`heatscan.json` plus a `photos` folder). There is no server. Back up and share by exporting. Deleting the app deletes its data.

## Code layout

```
src/app/                 screens (Expo Router)
  index.tsx              spool list
  spool/[id]/index.tsx   one spool: capture, items, welds, NDT, dye pen, finished photos
  spool/[id]/drawings.tsx            P&ID list
  spool/[id]/drawing/[dwg].tsx       highlight a drawing
  settings.tsx           sampling rates, Claude key
src/lib/                 data, NDT rules, CSV, export, heat-number reading
src/components/          shared UI
```

## Run it during development

The app uses native modules (ML Kit, camera), so it needs a development build rather than Expo Go.

```bash
npm install
npm test            # NDT, CSV and heat-number parsing tests
npm run typecheck
npx eas-cli@latest build --profile development --platform android   # or ios
npx expo start --dev-client
```

## Getting it onto phones and into the stores

These steps need the owner's own accounts, so they cannot be done from code.

1. **Expo account (free).** Sign up at expo.dev, then run `npx eas-cli@latest login` and `npx eas-cli@latest init` in this folder. This links the project and adds its ID to `app.json`.
2. **Pick the app ID.** `app.json` uses `com.heatscan.field` for both `ios.bundleIdentifier` and `android.package`. Change it to something you own, such as `com.yourcompany.heatscan`, before the first store build. It cannot change after the app is published.
3. **Try it on Android first (no store needed).** `npx eas-cli@latest build --profile preview --platform android` gives a link to an APK you can install on any Android phone.
4. **Apple Developer Program ($99/year).** Enroll at developer.apple.com (a company enrollment needs a D-U-N-S number). Then `npx eas-cli@latest build --profile production --platform ios`. EAS creates the signing certificates for you when you sign in with your Apple ID.
5. **Test on iPhones with TestFlight.** `npx eas-cli@latest submit --platform ios` uploads the build to App Store Connect. Add testers in TestFlight.
6. **Google Play Console ($25 one-time).** Create the app at play.google.com/console. Build with `npx eas-cli@latest build --profile production --platform android`, then upload the `.aab` to an internal testing track (the first upload must be done by hand in the Play Console; later ones can use `eas submit`). New personal developer accounts must run a closed test with at least 12 testers for 14 days before going public; organisation accounts do not.
7. **Store listings.** Both stores need screenshots, a short description, a privacy policy URL and a data-safety / privacy form. For this version the honest answers are: no account, no data collected by the developer, photos stay on the device, and photos are sent to Anthropic only if the user adds their own Claude API key.
8. **Review.** Apple review usually takes one to three days; Google a few hours to a few days.

If the app is only for your own crew, you can skip public listing: use TestFlight and a Play internal or closed track, or Apple's Custom Apps (Apple Business Manager) for private distribution.

## Settings to know

- `app.json`: app name, version, icons, permissions text, app ID.
- `eas.json`: build profiles (`development`, `preview` for an installable Android APK, `production` for the stores).

## Build from your phone (no computer)

1. On expo.dev: Account settings → Access tokens → create a token and copy it.
2. On GitHub: this repo → Settings → Secrets and variables → Actions → New repository secret. Name `EXPO_TOKEN`, paste the token.
3. On GitHub: Actions tab → **Build Android app** → Run workflow (profile `preview`).
4. After 15–20 minutes the build appears on expo.dev under the `heat-scan` project. Open it on your Android phone and tap Install.
