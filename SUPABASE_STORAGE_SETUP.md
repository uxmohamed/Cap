# Supabase Storage Setup for Cap

This guide walks you through setting up Supabase Storage as your default storage backend for Cap.

## 🔧 Prerequisites

- Supabase project: `iqcfsckyuzdvwhxtrwke`
- Supabase database already configured ✅

## 📋 Setup Steps

### 1. Get Supabase Service Role Key

1. Go to [Supabase Dashboard](https://app.supabase.com/project/iqcfsckyuzdvwhxtrwke)
2. Navigate to **Settings** → **API**
3. Copy the **`service_role`** key (NOT the anon key)

### 2. Set Environment Variables

Create/update your `.env` file with:

```bash
# Database (already configured)
DATABASE_URL="postgresql://postgres.iqcfsckyuzdvwhxtrwke:qrf8sZaPOUPIyotY@aws-1-eu-north-1.pooler.supabase.com:6543/postgres"

# Supabase Storage Configuration
CAP_AWS_ENDPOINT=https://iqcfsckyuzdvwhxtrwke.supabase.co/storage/v1/s3
CAP_AWS_REGION=us-east-1
CAP_AWS_BUCKET=capso-videos
CAP_AWS_ACCESS_KEY=iqcfsckyuzdvwhxtrwke
CAP_AWS_SECRET_KEY=<YOUR_SUPABASE_SERVICE_ROLE_KEY>
S3_PATH_STYLE=true

# Other required vars
WEB_URL=http://localhost:3000
CLERK_SECRET_KEY=your-clerk-secret-key
DATABASE_ENCRYPTION_KEY=your-encryption-key
```

### 3. Create Storage Bucket and Policies

Run these SQL commands in your Supabase SQL Editor:

1. Go to **SQL Editor** in Supabase Dashboard
2. Copy and paste this SQL:

```sql
-- Supabase Storage Setup for Cap
-- Create storage bucket for video uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('capso-videos', 'capso-videos', false);

-- Create RLS policies for bucket access
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to own folder" ON storage.objects
FOR INSERT WITH CHECK (
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view their own files
CREATE POLICY "Users can view own files" ON storage.objects
FOR SELECT USING (
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update own files" ON storage.objects
FOR UPDATE USING (
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create public access policy for videos marked as public
CREATE POLICY "Public videos are viewable" ON storage.objects
FOR SELECT USING (
  bucket_id = 'capso-videos' AND
  EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = (storage.foldername(name))[2] 
    AND videos.public = true
  )
);

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

3. Click **Run**

This will:
- ✅ Create `capso-videos` bucket
- ✅ Set up Row Level Security policies
- ✅ Allow users to upload to their own folders
- ✅ Enable public access for public videos

### 4. File Structure

Your videos will be stored as:
```
capso-videos/
├── {userId1}/
│   ├── {videoId1}/
│   │   ├── result.mp4
│   │   └── screenshot/screen-capture.jpg
│   └── {videoId2}/
│       └── result.mp4
└── {userId2}/
    └── {videoId3}/
        └── result.mp4
```

### 5. Test the Setup

1. Start your application
2. Upload a video through the desktop app
3. Check the Supabase Storage dashboard to see files

## 🎯 Benefits of Supabase Storage

- ✅ **Integrated**: Same provider as your database
- ✅ **Secure**: Row Level Security policies
- ✅ **Global CDN**: Fast file delivery worldwide
- ✅ **S3 Compatible**: Works with existing S3 code
- ✅ **Cost Effective**: Generous free tier
- ✅ **Image Optimization**: Automatic resizing/compression

## 🔍 Troubleshooting

**Issue**: Access denied errors
- **Solution**: Check your service role key is correct

**Issue**: Bucket not found
- **Solution**: Ensure you ran the SQL setup script

**Issue**: Files not uploading
- **Solution**: Verify S3_PATH_STYLE=true in your environment

## 🔄 Migration from MinIO/AWS S3

If you have existing files in MinIO or AWS S3, you can migrate them by:
1. Downloading files from current storage
2. Uploading to Supabase Storage with same folder structure
3. Updating database references if needed

Your Cap application is now configured to use Supabase Storage! 🚀
