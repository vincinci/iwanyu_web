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
```

After adding these, redeploy the project for uploads to work on www.iwanyu.store.
