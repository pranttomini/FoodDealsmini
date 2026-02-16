# FoodDealsmini — Execution Tasks (Design-guideline aligned)

## Goal
Expo app should follow the Stitch design guideline style (not 1:1 clone), while preserving core web features (voting/comments/post/filter/map-list flow).

## Current Sprint

### 1) Foundation / Structure
- [x] Create task board and phased plan
- [x] Upgrade tab shell (floating bottom nav, cleaner hierarchy)
- [x] Add shared design token file (`apps/mobile/constants/theme.ts`)

### 2) First Design Iteration (implemented)
- [x] Restyle **List screen** to guideline look (cards, chips, pricing emphasis, vote pill, spacing)
- [x] Keep deal detail modal wired to list cards
- [x] Improve map screen compatibility for web preview (no crash path for react-native-maps)

### 3) Next Iterations (in progress)
- [ ] Redesign **Deal Detail** screen to match guideline visual language
- [ ] Redesign **Post Deal** screen (layout + chips + CTA)
- [ ] Add **Advanced Filters** screen and connect to list/map data
- [ ] Polish **Profile** screen to same visual system

### 4) Feature Parity Verification
- [ ] Upvote / downvote flow + optimistic updates
- [ ] Comments create/delete parity
- [ ] Post flow (image upload + location + validation)
- [ ] Filter behavior shared across list/map

### 5) Testing / Delivery
- [ ] Keep web + expo preview testable in parallel
- [ ] Iterate with screenshot comparisons
- [ ] Push commits to `main` continuously
