/*
  # [Fix]: Client Portal Initial Schema
  This migration script fixes the "table 'public.profiles' does not exist" error by creating the necessary tables, storage bucket, and security policies for the client portal. This is a foundational script and is safe to run if the tables do not already exist.

  ## Query Description: [This script is non-destructive for existing data in other tables. It creates the `profiles` and `documents` tables, a `documents` storage bucket, and applies Row Level Security (RLS) policies. If these objects already exist from a partial or failed previous attempt, `CREATE IF NOT EXISTS` and `INSERT ON CONFLICT` will prevent errors.]

  ## Metadata:
  - Schema-Category: ["Structural"]
  - Impact-Level: ["Low"]
  - Requires-Backup: [false]
  - Reversible: [true]

  ## Structure Details:
  - Tables Created: `public.profiles`, `public.documents`
  - Storage Buckets Created: `documents`
  - RLS Policies Created:
    - `profiles`: Allows users to read/update their own profile.
    - `documents`: Allows admins full access, and customers read access to their own documents.
    - `storage.objects`: Allows authenticated uploads, admin full access, and customers read access to their own files based on the file path.

  ## Security Implications:
  - RLS Status: [Enabled] on `profiles` and `documents` tables.
  - Policy Changes: [Yes] - New policies are created to enforce data access rules.
  - Auth Requirements: [Policies rely on `auth.uid()` to identify the current user and their role from the `profiles` table.]

  ## Performance Impact:
  - Indexes: [Primary keys and foreign keys are indexed.]
  - Triggers: [No triggers are added.]
  - Estimated Impact: [Low. Standard schema setup.]
*/

-- Step 1: Create Profiles Table
-- This table stores public user data and their role (admin or customer).
-- It's linked to the auth.users table.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'customer'))
);
COMMENT ON TABLE public.profiles IS 'Stores public user data and roles for the client portal.';

-- Step 2: Create Documents Table
-- This table stores metadata about uploaded invoices and quotations.
CREATE TABLE IF NOT EXISTS public.documents (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'quotation')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.documents IS 'Stores metadata for uploaded invoices and quotations.';

-- Step 3: Create Storage Bucket for Documents
-- This creates a dedicated, private bucket for storing the document files.
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;
COMMENT ON BUCKET documents IS 'Private storage for client invoices and quotations.';

-- Step 4: Enable Row Level Security (RLS)
-- Enable RLS on the tables to enforce access policies.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS Policies for Profiles Table
-- Drop existing policies if they exist to ensure a clean slate.
DROP POLICY IF EXISTS "Allow individual read access on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual update access on profiles" ON public.profiles;

-- Users can view their own profile information.
CREATE POLICY "Allow individual read access on profiles"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile.
CREATE POLICY "Allow individual update access on profiles"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Step 6: Create RLS Policies for Documents Table
-- Drop existing policies if they exist.
DROP POLICY IF EXISTS "Allow admin full access on documents" ON public.documents;
DROP POLICY IF EXISTS "Allow customer read access on documents" ON public.documents;

-- Admins can perform any action on all documents.
CREATE POLICY "Allow admin full access on documents"
ON public.documents FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Customers can view their own documents.
CREATE POLICY "Allow customer read access on documents"
ON public.documents FOR SELECT
USING (auth.uid() = user_id);

-- Step 7: Create RLS Policies for Storage (storage.objects)
-- Drop existing policies if they exist to ensure a clean slate.
DROP POLICY IF EXISTS "Allow authenticated uploads to documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin full access to storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow customer read access to their own storage objects" ON storage.objects;

-- Allow any authenticated user to upload files. The path will be validated by the application logic.
CREATE POLICY "Allow authenticated uploads to documents bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Admins have full access to all objects in the 'documents' bucket.
CREATE POLICY "Allow admin full access to storage objects"
ON storage.objects FOR ALL
USING (
    bucket_id = 'documents' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Customers can download files where their user ID is the first folder in the file path.
-- This is crucial because the admin uploads the file, so the 'owner' is the admin.
CREATE POLICY "Allow customer read access to their own storage objects"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
);
