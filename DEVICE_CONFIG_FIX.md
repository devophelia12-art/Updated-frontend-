# API Connection Fix for Physical Device

If you're using a **physical Android/iOS device** instead of emulator:

## Step 1: Update config/api.ts

In the Android section, comment out emulator line and uncomment device line:

```typescript
// Android emulator
if (Platform.OS === 'android') {
  // COMMENT this line for physical device:
  // return `http://10.0.2.2:${LOCAL_PORT}`;
  
  // UNCOMMENT this line for physical device:
  return `http://${LOCAL_IP}:${LOCAL_PORT}`;
}
```

## Step 2: Make sure your device and computer are on same WiFi network

## Step 3: Restart Expo
```bash
npx expo start --clear
```

## Step 4: Check console for debug info
Look for "🔗 API Configuration:" in console to verify correct URL is being used.