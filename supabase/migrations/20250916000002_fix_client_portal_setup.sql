/*
# [Migration] Client Portal Setup V3

This script sets up the necessary database schema and storage for the Lunai client portal. It corrects a syntax error in a previous version of the storage security policy.

## Query Description:
This migration creates tables for user profiles and documents, sets up a private storage bucket, and configures Row Level Security (RLS) to ensure users can only access their own data.

- **profiles**: Stores user roles and full names, linked to Supabase Auth.
- **documents**: Tracks uploaded files, linking them to users.
- **storage.objects**: Policies are applied to the 'documents' bucket for secure file access.

This script is safe to run on a new setup. If you have partially run a previous version, it's best to delete any created tables (`documents`, `profiles`) and the storage bucket (`documents`) before running this to ensure a clean state.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Medium"
- Requires-Backup: false
- Reversible: false

## Structure Details:
- Tables created: `public.profiles`, `public.documents`
- Functions created: `public.handle_new_user`
- Triggers created: `on_auth_user_created` on `auth.users`
- Storage Buckets created: `documents` (private)
- RLS Policies created for: `profiles`, `documents`, `storage.objects`

## Security Implications:
- RLS Status: Enabled on all new tables.
- Policy Changes: Yes, policies are created to restrict data access based on user roles (admin, customer) and ownership.
- Auth Requirements: Policies rely on `auth.uid()` to identify the current user.

## Performance Impact:
- Indexes: Primary keys and foreign keys are indexed automatically.
- Triggers: An `AFTER INSERT` trigger is added to `auth.users`.
- Estimated Impact: Low. The trigger is lightweight and essential for profile creation.
*/

-- 1. PROFILES TABLE
-- Stores public user data.
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'customer'
);
COMMENT ON TABLE public.profiles IS 'Stores public profile information for each user.';

-- 2. NEW USER TRIGGER
-- Automatically create a profile for new users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'customer');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function after a new user is created.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. DOCUMENTS TABLE
-- Stores metadata about uploaded invoices and quotations.
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'quotation')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.documents IS 'Metadata for uploaded client documents.';

-- 4. STORAGE BUCKET
-- Create a private bucket for storing documents.
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- 5. ROW LEVEL SECURITY (RLS) SETUP

-- PROFILES RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- DOCUMENTS RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage all documents"
  ON public.documents FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Customers can view their own documents"
  ON public.documents FOR SELECT
  USING (auth.uid() = user_id);

-- STORAGE RLS
CREATE POLICY "Admins can manage all storage documents"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'documents' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    bucket_id = 'documents' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Customers can view their own storage documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    auth.uid() = (SELECT user_id FROM public.documents WHERE file_path = storage.objects.name)
  );
