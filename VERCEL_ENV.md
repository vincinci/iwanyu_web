# Vercel Environment Variables for Production

Add these to your Vercel project (Settings → Environment Variables):

## Cloudinary (Required for image/video uploads)
```
CLOUDINARY_CLOUD_NAME=dtd29j5rx
CLOUDINARY_API_KEY=566557823619379
CLOUDINARY_API_SECRET=z9XeFxxsdN1nUUEIhJKetdykpkA
```

## Supabase (Should already be set)
```
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_WEB_APP_URL=https://iwanyuweb.vercel.app
```

## OAuth redirect hardening
- Set `VITE_WEB_APP_URL` to your canonical production domain so Google OAuth callbacks never fall back to localhost in mobile/webview contexts.
- In Supabase Dashboard -> Authentication -> URL Configuration:
	- Site URL: your production web URL (for example `https://iwanyuweb.vercel.app`)
	- Additional Redirect URLs must include `https://iwanyuweb.vercel.app/auth/callback`

After adding these, redeploy the project for uploads to work on www.iwanyu.store.
