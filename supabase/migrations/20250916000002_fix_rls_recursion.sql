/*
# [Fix] RLS Infinite Recursion
Corrects the Row Level Security (RLS) policies to prevent an infinite recursion error when querying the 'profiles' table. This is achieved by creating a SECURITY DEFINER function to safely check user roles.

## Query Description:
This script will first drop all existing RLS policies on the `profiles` and `documents` tables, as well as policies on the `storage.objects` for the 'documents' bucket. It then creates a helper function `get_my_role()` that can safely retrieve a user's role. Finally, it re-creates all the necessary security policies using this safe function. There is no risk of data loss.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Medium"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Tables affected: public.profiles, public.documents, storage.objects
- Functions created: public.get_my_role()
- Policies dropped and recreated for all affected tables.

## Security Implications:
- RLS Status: Enabled
- Policy Changes: Yes. This script fixes faulty policies to correctly enforce security rules.
- Auth Requirements: Policies rely on `auth.uid()` and the new helper function.

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Negligible. The helper function is lightweight.
*/

-- Step 1: Drop all potentially faulty policies to ensure a clean slate.
DROP POLICY IF EXISTS "Allow admin to read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow user to read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow user to insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow user to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin to delete profiles" ON public.profiles;

DROP POLICY IF EXISTS "Allow admin to manage all documents" ON public.documents;
DROP POLICY IF EXISTS "Allow customer to read their own documents" ON public.documents;

DROP POLICY IF EXISTS "Allow admin full access to documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow customer to read their own files in documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin to insert files in documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin to update files in documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin to delete files in documents bucket" ON storage.objects;


-- Step 2: Create a helper function to get the current user's role safely.
-- This function uses SECURITY DEFINER to bypass the RLS policy on the profiles table,
-- thus preventing the infinite recursion error.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set a secure search path for the function to prevent hijacking.
ALTER FUNCTION public.get_my_role() SET search_path = '';


-- Step 3: Re-create RLS policies for the 'profiles' table using the safe helper function.
-- Admins can view all profiles.
CREATE POLICY "Allow admin to read all profiles"
  ON public.profiles FOR SELECT
  USING (public.get_my_role() = 'admin');

-- Any authenticated user can view their own profile.
CREATE POLICY "Allow user to read their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Any authenticated user can insert their own profile.
CREATE POLICY "Allow user to insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Any authenticated user can update their own profile.
CREATE POLICY "Allow user to update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can delete any profile.
CREATE POLICY "Allow admin to delete profiles"
  ON public.profiles FOR DELETE
  USING (public.get_my_role() = 'admin');


-- Step 4: Re-create RLS policies for the 'documents' table.
-- Admins have full access to all documents.
CREATE POLICY "Allow admin to manage all documents"
  ON public.documents FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- Customers can only view documents linked to their user_id.
CREATE POLICY "Allow customer to read their own documents"
  ON public.documents FOR SELECT
  USING (auth.uid() = user_id);


-- Step 5: Re-create RLS policies for the 'documents' bucket in Supabase Storage.
-- Admins have full access to the 'documents' bucket.
CREATE POLICY "Allow admin full access to documents bucket"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'documents' AND public.get_my_role() = 'admin')
  WITH CHECK (bucket_id = 'documents' AND public.get_my_role() = 'admin');

-- Customers can only view files within their own folder (folder name must be their user_id).
CREATE POLICY "Allow customer to read their own files in documents bucket"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
