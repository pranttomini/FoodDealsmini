# FoodDeals Berlin 🍔

Eine Multi-Plattform App für Food Deals in Berlin - verfügbar als Web-App, iOS und Android!

## 🏗️ Tech Stack

- **Framework**: React 19 + TypeScript 5.8
- **Build Tool**: Vite 6
- **Mobile**: Capacitor 8 (iOS + Android)
- **UI**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Maps**: Leaflet
- **AI**: Google Gemini (Deal-Enhancement & Spam-Detection)

## 📁 Projekt-Struktur (Monorepo)

```
FoodDeals/
├── src/                    # Gemeinsamer Code (Web + iOS + Android)
│   ├── components/        # React Components
│   ├── services/          # Supabase & Gemini Services
│   ├── types/             # TypeScript Types
│   └── App.tsx            # Haupt-App
├── ios/                   # iOS Native Project (Xcode)
├── android/               # Android Native Project (Android Studio)
├── dist/                  # Build Output (für Capacitor)
├── capacitor.config.ts    # Capacitor Konfiguration
└── vite.config.ts         # Vite Build Config
```

## 🚀 Development Workflow

### Web Development (wie bisher)

```bash
npm run dev              # Startet Dev Server auf http://localhost:3000
npm run build            # Production Build
npm run preview          # Preview Production Build
```

### Mobile Development

#### iOS (benötigt macOS + Xcode)

```bash
# 1. Build & Sync
npm run sync:ios         # Build + Sync zu iOS

# 2. Xcode öffnen
npm run open:ios         # Öffnet Xcode

# 3. In Xcode: Select Device/Simulator → Run (⌘R)
```

#### Android (benötigt Android Studio)

```bash
# 1. Build & Sync
npm run sync:android     # Build + Sync zu Android

# 2. Android Studio öffnen
npm run open:android     # Öffnet Android Studio

# 3. In Android Studio: Select Device/Emulator → Run (▶)
```

#### Alle Plattformen syncen

```bash
npm run sync            # Build + Sync zu iOS & Android
```

## 📱 Verfügbare Capacitor Plugins

Die App nutzt folgende native Features:

- **Camera** (`@capacitor/camera`) - Fotos für Deal-Uploads
- **Geolocation** (`@capacitor/geolocation`) - User-Position für Karte
- **Share** (`@capacitor/share`) - Deals teilen
- **Splash Screen** - Ladebildschirm
- **Status Bar** - Native Status Bar Styling
- **App** - App-Lifecycle Events

### Beispiel: Camera verwenden

```typescript
import { Camera, CameraResultType } from '@capacitor/camera';

const takePicture = async () => {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri
  });

  // image.webPath enthält die Bild-URL
  console.log(image.webPath);
};
```

### Beispiel: Plattform-Erkennung

```typescript
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  // Mobile (iOS/Android)
  console.log('Running on mobile');
} else {
  // Web
  console.log('Running in browser');
}

// Plattform-spezifisch
if (Capacitor.getPlatform() === 'ios') {
  // iOS-spezifischer Code
}
```

## 🔧 Git Workflow für funktionelle Changes

**Ein Commit = Update für Web, iOS UND Android!** 🎉

```bash
# 1. Feature Branch erstellen
git checkout -b feature/neue-filter-option

# 2. Code in src/ ändern (betrifft automatisch alle Plattformen!)
# z.B. src/components/FilterBar.tsx

# 3. Testen
npm run dev                    # Web testen
npm run sync:ios              # iOS testen (in Xcode)
npm run sync:android          # Android testen (in Android Studio)

# 4. Commit & Push
git add src/components/FilterBar.tsx
git commit -m "feat: Add cuisine multi-select filter"
git push origin feature/neue-filter-option

# 5. Pull Request erstellen
```

**Wichtig:** Änderungen in `src/` betreffen **automatisch** alle Plattformen!

## 🌍 Environment Variables

Erstelle eine `.env` Datei (siehe `.env.example`):

```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
GEMINI_API_KEY=xxx
```

## 📦 Installation & Setup

```bash
# 1. Dependencies installieren
npm install

# 2. Environment Variables konfigurieren
cp .env.example .env
# Fülle .env mit deinen API Keys

# 3. Ersten Build machen
npm run build

# 4. Native Plattformen syncen
npx cap sync
```

## 🎨 Plattform-spezifische Anpassungen

### App Icons & Splash Screens

**iOS:**
- Icons: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Splash: `ios/App/App/Assets.xcassets/Splash.imageset/`

**Android:**
- Icons: `android/app/src/main/res/mipmap-*/`
- Splash: `android/app/src/main/res/drawable/splash.png`

### App Name & Bundle ID

In [capacitor.config.ts](capacitor.config.ts):

```typescript
const config: CapacitorConfig = {
  appId: 'com.fooddeals.berlin',    // Ändern für deine App
  appName: 'FoodDeals Berlin',      // App-Name
  // ...
};
```

## 🐛 Troubleshooting

### "Could not find iOS platform"
```bash
npm install @capacitor/ios @capacitor/android
npx cap sync
```

### iOS Build Fehler
```bash
cd ios/App
pod install
cd ../..
npx cap sync ios
```

### Android Gradle Fehler
```bash
cd android
./gradlew clean
cd ..
npx cap sync android
```

### Nach Code-Änderungen funktioniert Mobile nicht
```bash
# IMMER nach Code-Änderungen:
npm run build
npx cap sync
```

## 📝 Nützliche Commands

```bash
# Development
npm run dev                    # Web Dev Server
npm run build                  # Production Build
npm run sync                   # Build + Sync alle Plattformen

# Mobile Testing
npm run open:ios              # Öffne Xcode
npm run open:android          # Öffne Android Studio
npm run run:ios               # Build + Run auf iOS
npm run run:android           # Build + Run auf Android

# Capacitor
npx cap sync                  # Sync zu allen Plattformen
npx cap sync ios              # Sync nur zu iOS
npx cap sync android          # Sync nur zu Android
npx cap update                # Update Capacitor Dependencies
```

## 🚢 Deployment

### Web
```bash
npm run build
# Deploye dist/ zu Vercel/Netlify/etc.
```

### iOS (App Store)
```bash
npm run build
npx cap sync ios
npm run open:ios
# In Xcode: Product → Archive → Distribute to App Store
```

### Android (Google Play)
```bash
npm run build
npx cap sync android
npm run open:android
# In Android Studio: Build → Generate Signed Bundle/APK
```

## 📚 Weitere Ressourcen

- [Capacitor Dokumentation](https://capacitorjs.com/docs)
- [Capacitor Plugins](https://capacitorjs.com/docs/plugins)
- [Vite Dokumentation](https://vitejs.dev)
- [React 19 Docs](https://react.dev)
- [Supabase Docs](https://supabase.com/docs)

---

**Happy Coding! 🚀**
