# Iwanyu Native Mobile Apps

This folder contains native app scaffolds for:
- `mobile/ios/IwanyuNative` (SwiftUI, iOS)
- `mobile/android` (Kotlin + Jetpack Compose, Android)

Both apps are designed to use the same Supabase backend contracts as the website.

## Shared Backend Contracts

Implemented client contract methods include:
- Products: `products`
- Vendors: `vendors`
- Orders: `orders`
- Wishlist: `wishlist_items`
- Carts: `carts`
- Edge functions:
  - `create-order`
  - `flutterwave-verify`

## iOS (SwiftUI)

Path: `mobile/ios/IwanyuNative`

1. Install XcodeGen (if needed):
   - `brew install xcodegen`
2. Generate project:
   - `cd mobile/ios/IwanyuNative`
   - `xcodegen generate`
3. Open `IwanyuNative.xcodeproj` in Xcode.
4. Set `SUPABASE_ANON_KEY` in `Sources/Info.plist` (or target build settings override).
5. Build and run.

Brand assets copied from website:
- `Resources/logo.png`
- `Resources/icon.png`

## Android (Kotlin + Compose)

Path: `mobile/android`

1. Open `mobile/android` in Android Studio.
2. Sync Gradle.
3. Set `SUPABASE_ANON_KEY` in `app/build.gradle.kts` `buildConfigField`.
4. Run on emulator/device.

Brand assets copied from website:
- `app/src/main/res/drawable/logo.png`
- `app/src/main/res/drawable/icon.png`

## Screens Coverage

Website pages mapped as individual native screens for:
- Storefront pages
- Auth/account/static pages
- Admin pages
- Seller pages

Files:
- iOS page screens: `mobile/ios/IwanyuNative/Sources/IndividualScreens.swift`
- Android page screens: `mobile/android/app/src/main/java/com/iwanyu/mobile/PageScreens.kt`

## Note

For production, add:
- token-based authenticated requests (user JWT from login flow)
- secure secrets handling per build type/flavor
- navigation and feature wiring for each scaffolded screen
