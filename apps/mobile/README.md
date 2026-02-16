# FoodDeals Mobile App

React Native mobile app built with Expo for FoodDeals Berlin.

## ✅ Implemented Features

### Core Screens
- **Map View** ([index.tsx](app/(tabs)/index.tsx))
  - ✅ Interactive map with react-native-maps
  - ✅ Shows all active deals as markers
  - ✅ User location tracking
  - ✅ Clickable markers open deal details
  - ✅ GPS integration with permissions

- **List View** ([list.tsx](app/(tabs)/list.tsx))
  - ✅ FlatList with all deals (performance optimized)
  - ✅ Pull-to-refresh functionality
  - ✅ Deal cards with images, prices, votes
  - ✅ Discount badges
  - ✅ Cuisine and deal type tags
  - ✅ Tap card to open full details

- **Post Screen** ([post.tsx](app/(tabs)/post.tsx))
  - ✅ Full deal posting form
  - ✅ Camera & photo library integration
  - ✅ Image upload to Supabase Storage
  - ✅ Location tracking (GPS)
  - ✅ Deal type & cuisine type selectors
  - ✅ Price validation
  - ✅ Form validation & error handling

- **Profile Screen** ([profile.tsx](app/(tabs)/profile.tsx))
  - ✅ User profile with avatar
  - ✅ Avatar upload functionality
  - ✅ XP & Level display with progress bar
  - ✅ Statistics (deals posted, money saved)
  - ✅ Badge system (locked/unlocked)
  - ✅ Pull-to-refresh
  - ✅ Settings section
  - ✅ Sign out functionality

### Deal Interaction
- **Deal Detail Modal** ([components/DealDetailModal.tsx](components/DealDetailModal.tsx))
  - ✅ Full-screen modal with all deal info
  - ✅ **Voting system** (upvote/downvote)
  - ✅ **Comments section** (add, view, delete own)
  - ✅ Optimistic UI updates
  - ✅ Deal ownership checks
  - ✅ Delete own deals functionality
  - ✅ Image gallery
  - ✅ Restaurant info & location
  - ✅ Discount calculation

### Authentication
- **Login Screen** ([login.tsx](app/login.tsx))
  - ✅ Email/password login
  - ✅ Form validation
  - ✅ Error handling
  - ✅ Skip option (browse without login)

- **Signup Screen** ([signup.tsx](app/signup.tsx))
  - ✅ Username, email, password registration
  - ✅ Password confirmation
  - ✅ Username validation (3-30 chars)
  - ✅ Email verification prompt

### Infrastructure
- **Supabase Integration** ([lib/supabase.ts](lib/supabase.ts))
  - Client configuration with AsyncStorage
  - Auto session refresh
  - Environment variable configuration
  - Storage for images & avatars

- **Authentication Context** ([contexts/AuthContext.tsx](contexts/AuthContext.tsx))
  - Sign up, sign in, sign out
  - Profile fetching & refresh
  - Session management
  - User context available throughout app

- **Shared Package**
  - Types, constants, translations from `@fooddeals/shared`
  - Shared between web and mobile

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm (workspace manager)
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
# Install all dependencies from root
pnpm install

# Start Expo dev server
cd apps/mobile
pnpm start

# Run on iOS
pnpm ios

# Run on Android
pnpm android
```

### Environment Variables

Create a `.env` file (already created with your Supabase credentials):

```env
EXPO_PUBLIC_SUPABASE_URL=https://uopbkpxqslrnlnmsesif.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 📦 Dependencies

### Core
- `expo` ~54.0.33
- `react-native` 0.81.5
- `expo-router` ~6.0.23 (file-based routing)

### Maps & Location
- `react-native-maps` 1.20.1
- `expo-location` ~19.0.8

### Backend
- `@supabase/supabase-js` 2.95.1
- `@react-native-async-storage/async-storage` 2.2.0
- `react-native-url-polyfill` 3.0.0

### UI & Media
- `expo-camera` 17.0.10
- `expo-image-picker` 17.0.10
- `@expo/vector-icons` ^15.0.3

## 🗂️ Project Structure

```
apps/mobile/
├── app/
│   ├── (tabs)/          # Tab navigation screens
│   │   ├── index.tsx    # Map view
│   │   ├── list.tsx     # Deal list
│   │   ├── post.tsx     # Post deal
│   │   └── profile.tsx  # User profile
│   ├── _layout.tsx      # Root layout with AuthProvider
│   └── modal.tsx        # Example modal
├── contexts/
│   └── AuthContext.tsx  # Authentication context
├── lib/
│   └── supabase.ts      # Supabase client config
├── components/          # Expo default components
├── constants/           # Expo default constants
└── assets/             # Images, fonts

packages/shared/        # Shared types/constants
```

## 🎯 Next Steps

### High Priority
1. **Post Deal Screen**
   - Camera integration with expo-camera
   - Image picker with expo-image-picker
   - Form with restaurant name, price, location
   - Upload to Supabase Storage

2. **Profile Screen**
   - Display user stats (XP, level, badges)
   - Avatar upload
   - Language switcher
   - Sign out button

3. **Deal Detail Modal**
   - Full deal information
   - Vote buttons (upvote/downvote)
   - Comments section
   - Share functionality

4. **Authentication Screens**
   - Login screen
   - Signup screen
   - Password reset

### Medium Priority
- Push notifications with Expo Notifications
- Offline support with SQLite
- Image optimization and caching
- Filter system for deals
- Search functionality
- Dark mode support

### Low Priority
- Animations with react-native-reanimated
- Haptic feedback
- Splash screen customization
- App icon
- Deep linking

## 🔧 Configuration Files

- [package.json](package.json) - Dependencies and scripts
- [app.json](app.json) - Expo app configuration
- [tsconfig.json](tsconfig.json) - TypeScript config
- [.env](.env) - Environment variables (not in git)
- [.env.example](.env.example) - Example env file

## 📱 Testing

```bash
# Run on iOS Simulator (Mac only)
pnpm ios

# Run on Android Emulator
pnpm android

# Run in web browser (for testing)
pnpm web

# Start with cache clear
pnpm start --clear
```

## 🚢 Deployment

### Development Build
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure project
eas build:configure

# Build for iOS
eas build --platform ios --profile development

# Build for Android
eas build --platform android --profile development
```

### Production Build
```bash
# Build for app stores
eas build --platform all --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## 🐛 Known Issues

1. **Map markers not showing** - Check if deals have valid latitude/longitude
2. **Location permission denied** - Map falls back to Berlin center
3. **Images not loading** - Check Supabase Storage CORS settings
4. **Dark mode** - Not yet implemented, defaults to light mode

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Maps](https://github.com/react-native-maps/react-native-maps)
- [Supabase React Native Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- [Expo Router](https://docs.expo.dev/router/introduction/)
