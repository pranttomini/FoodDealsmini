# FoodDealsmini — Expo Redesign + Feature Parity Plan

## Goal
Bring Expo app visual quality close to Stitch reference while keeping web feature parity (voting, comments, posting, profile, map/list flows).

## Track A — Design System
- [x] A1. Improve bottom tab shell (floating, rounded, modern visual hierarchy)
- [ ] A2. Define shared tokens (color, spacing, radius, typography)
- [ ] A3. Build reusable mobile UI primitives (DealCard, Badge, PrimaryButton, SectionHeader)
- [ ] A4. Apply Stitch-like layout to key screens (Home map, list, details, post)

## Track B — Feature Parity
- [ ] B1. Verify voting parity (upvote/downvote state + optimistic updates)
- [ ] B2. Verify deal detail parity (comments read/write/delete)
- [ ] B3. Verify post flow parity (image upload + location + deal type/cuisine)
- [ ] B4. Verify profile parity (avatar upload, badge visibility, stats)
- [ ] B5. Add advanced filters view + map/list sync behavior

## Track C — Parallel Testing Setup
- [x] C1. Web dev server runnable on :3000
- [ ] C2. Expo dev server parallel run with QR/URL for mobile testing
- [ ] C3. Keep a smoke checklist for every iteration

## Smoke Checklist
- [ ] Login
- [ ] Open map, open deal detail
- [ ] Vote up/down
- [ ] Comment create/delete
- [ ] Post new deal with image
- [ ] Open profile and avatar update
- [ ] Switch tabs and verify no crashes
