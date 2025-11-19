# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Environment configuration

1. Create a `.env.local` file (git-ignored) from `.env.example` and set only the non-sensitive values that Expo can expose publicly (for example `EXPO_PUBLIC_BACKEND_URL`). Keep Supabase URLs and keys scoped by environment using the `SUPABASE_*_{ENV}` entries.
2. When running locally, set `APP_ENV` to the target profile (`dev`, `stg`, or `prod`). The Expo CLI automatically loads `.env.local`.
3. For EAS builds, store the secrets with `eas secret:create --scope build --name SUPABASE_URL_DEV --value "https://..."` (repeat for `SUPABASE_ANON_KEY_DEV`, `SUPABASE_URL_STG`, `SUPABASE_ANON_KEY_STG`, `SUPABASE_URL_PROD`, `SUPABASE_ANON_KEY_PROD`). EAS injects those variables so `app.config.ts` can forward them to the runtime.
4. Use the matching profile defined in `eas.json` (`dev`, `stg`, or `prod`). Each profile sets `APP_ENV` automatically; only public values should be prefixed with `EXPO_PUBLIC_`.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
