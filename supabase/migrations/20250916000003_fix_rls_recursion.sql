/*
# [Fix] RLS Infinite Recursion
This script resolves an infinite recursion error in the Row Level Security (RLS) policies for the 'profiles', 'documents', and 'storage.objects' tables. The error occurred because policies designed to grant admin access were recursively querying the 'profiles' table, creating a loop.

## Query Description: This operation will:
1.  Drop the existing, faulty RLS policies on the `profiles`, `documents`, and `storage.objects` tables.
2.  Create a new `get_user_role()` helper function with `SECURITY DEFINER` to safely retrieve the current user's role without triggering RLS checks.
3.  Re-create the policies for all three tables using the new, non-recursive helper function.
This change is safe and essential for the client portal's functionality. It does not affect existing data.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Medium"
- Requires-Backup: false
- Reversible: true (by restoring the old policies)

## Structure Details:
- Affected Tables: `public.profiles`, `public.documents`, `storage.objects`
- Affected Objects: RLS Policies
- New Objects: `public.get_user_role()` function

## Security Implications:
- RLS Status: Policies are being redefined to be more secure and functional.
- Policy Changes: Yes. The core logic is being fixed to prevent recursion.
- Auth Requirements: Policies correctly use `auth.uid()` and the new helper function.

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Positive. The infinite loop is removed, which was causing queries to fail and timeout. The new function call is highly efficient.
*/

-- STEP 1: Drop all existing RLS policies on the affected tables to ensure a clean slate.
-- It's safer to drop and recreate than to alter.
DROP POLICY IF EXISTS "Allow individual user access to their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin to view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual user to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin and individual user read access" ON public.profiles;

DROP POLICY IF EXISTS "Allow admin full access to all documents" ON public.documents;
DROP POLICY IF EXISTS "Allow individual user to see their own documents" ON public.documents;

DROP POLICY IF EXISTS "Allow admin full access to documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow user to manage their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow user to view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow user to upload to their own folder" ON storage.objects;


-- STEP 2: Create a helper function to safely get the current user's role.
-- The SECURITY DEFINER context allows this function to bypass the RLS policies on `public.profiles`,
-- thus preventing the infinite recursion.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
-- SET search_path = public is a security best practice for SECURITY DEFINER functions.
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 'anon';
  ELSE
    RETURN (
      SELECT role
      FROM public.profiles
      WHERE id = auth.uid()
      LIMIT 1
    );
  END IF;
END;
$$;


-- STEP 3: Recreate RLS policies for the 'profiles' table using the helper function.

-- Policy for SELECT:
-- Allows users to see their own profile.
-- Allows users with the 'admin' role to see all profiles.
CREATE POLICY "Allow admin and individual user read access"
ON public.profiles
FOR SELECT
USING (
  (public.get_user_role() = 'admin') OR (auth.uid() = id)
);

-- Policy for UPDATE:
-- Allows users to update their own profile only.
CREATE POLICY "Allow individual user to update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


-- STEP 4: Recreate RLS policies for the 'documents' table.

-- Policy for ALL actions (for admins):
-- Allows users with the 'admin' role to perform any action on any document.
CREATE POLICY "Allow admin full access to all documents"
ON public.documents
FOR ALL
USING (public.get_user_role() = 'admin')
WITH CHECK (public.get_user_role() = 'admin');

-- Policy for SELECT (for customers):
-- Allows customers to view only their own documents.
CREATE POLICY "Allow individual user to see their own documents"
ON public.documents
FOR SELECT
USING (auth.uid() = user_id);


-- STEP 5: Recreate RLS policies for the 'storage.objects' table.

-- Policy for ALL actions (for admins):
-- Allows admins to do anything within the 'documents' bucket.
CREATE POLICY "Allow admin full access to documents bucket"
ON storage.objects
FOR ALL
USING (
    bucket_id = 'documents' AND
    public.get_user_role() = 'admin'
);

-- Policy for SELECT (for customers):
-- Allows customers to view files only within their own folder (named after their user_id).
CREATE POLICY "Allow user to view their own documents"
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for INSERT (for admins, who specify the customer's folder)
-- This policy is implicitly handled by the admin's full access policy.

-- Policy for DELETE (for admins)
-- This is also covered by the admin's full access policy.
