/*
  # [Client Portal] Initial Schema Setup (v2)
  Fixes a syntax error in the previous migration. Creates the necessary tables, storage, and policies for the client portal.

  ## Query Description:
  This script sets up the foundational database structure for a multi-tenant client portal.
  - It creates a `profiles` table to store user roles (admin/customer).
  - It establishes a `documents` table for invoices and quotations, linked to users.
  - It sets up a private `documents` storage bucket.
  - It implements Row Level Security (RLS) to ensure users can only access their own data.
  This is a structural setup and does not affect existing data in unrelated tables.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true (by dropping tables and policies)

  ## Structure Details:
  - Tables Created: `profiles`, `documents`
  - Storage Buckets Created: `documents` (private)
  - RLS Policies Created: On `profiles` and `documents` tables.

  ## Security Implications:
  - RLS Status: Enabled on new tables.
  - Policy Changes: Yes, adds policies for data isolation.
  - Auth Requirements: Policies are based on `auth.uid()`.

  ## Performance Impact:
  - Indexes: Primary keys and foreign keys are indexed automatically.
  - Triggers: A trigger is added to create user profiles automatically.
  - Estimated Impact: Low, as it only affects new tables.
*/

-- 1. Profiles Table
-- Stores user-specific data and roles.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'customer'))
);

COMMENT ON TABLE public.profiles IS 'Stores user-specific data like full name and role, linked to the authentication system.';
COMMENT ON COLUMN public.profiles.role IS 'Defines user role: ''admin'' for full access, ''customer'' for restricted access.';

-- 2. Documents Table
-- Stores metadata for uploaded invoices and quotations.
CREATE TABLE IF NOT EXISTS public.documents (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'quotation')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE
);

COMMENT ON TABLE public.documents IS 'Metadata for client documents like invoices and quotations.';
COMMENT ON COLUMN public.documents.user_id IS 'Foreign key linking the document to a specific user profile.';
COMMENT ON COLUMN public.documents.file_path IS 'The unique path to the file in the Supabase storage bucket.';

-- 3. Create Storage Bucket
-- A private bucket to securely store document files.
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 4. Auto-create user profile on new user sign-up
-- This trigger ensures a profile is created for every new user.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'customer'); -- Default role is 'customer'
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for Profiles
-- Users can only see their own profile. Admins can see all profiles.
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
CREATE POLICY "Users can view their own profile."
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles." ON public.profiles;
CREATE POLICY "Admins can view all profiles."
  ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- 7. RLS Policies for Documents
-- Customers can only see their own documents. Admins can see all.
DROP POLICY IF EXISTS "Customers can view their own documents." ON public.documents;
CREATE POLICY "Customers can view their own documents."
  ON public.documents FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all documents." ON public.documents;
CREATE POLICY "Admins can view all documents."
  ON public.documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- 8. RLS Policies for Storage
-- Define access rules for the 'documents' bucket.
DROP POLICY IF EXISTS "Allow authenticated users to view their own files" ON storage.objects;
CREATE POLICY "Allow authenticated users to view their own files"
  FOR SELECT ON storage.objects
  USING (
    bucket_id = 'documents' AND
    auth.uid() = (storage.foldername(name))[1]::uuid
  );

DROP POLICY IF EXISTS "Allow admins to access all files" ON storage.objects;
CREATE POLICY "Allow admins to access all files"
  FOR ALL ON storage.objects
  USING (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
