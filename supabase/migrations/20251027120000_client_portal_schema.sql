/*
# [Client Portal] Initial Schema & Policies
This script sets up the database structure for a multi-role (admin, customer) client portal. It includes tables for user profiles, invoices, and quotations, and establishes strict Row Level Security (RLS) policies to ensure data privacy and security.

## Query Description: This migration is foundational and non-destructive.
1.  It creates new tables (`profiles`, `invoices`, `quotations`) and a new type (`user_role`).
2.  It sets up a trigger to automatically create a user profile upon sign-up.
3.  It enables Row Level Security and defines policies so that users can only access their own data, while admins have full access.
4.  It configures policies for Supabase Storage to secure file access.

There is no risk to existing data, as this script only adds new objects to the database.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true (by dropping the created objects)

## Structure Details:
- **Types Created**:
  - `public.user_role` (ENUM: 'admin', 'customer')
- **Tables Created**:
  - `public.profiles`: Stores user role and links to `auth.users`.
  - `public.invoices`: Stores metadata for invoice files.
  - `public.quotations`: Stores metadata for quotation files.
- **Functions Created**:
  - `public.handle_new_user()`: Trigger function to populate the `profiles` table.
- **Triggers Created**:
  - `on_auth_user_created`: Fires after a new user signs up.

## Security Implications:
- RLS Status: Enabled on all new tables.
- Policy Changes: Yes, new policies are created to enforce data segregation between customers and admins.
- Auth Requirements: Policies rely on `auth.uid()` to identify the logged-in user.

## Performance Impact:
- Indexes: Primary keys and foreign keys are indexed by default.
- Triggers: A single, lightweight trigger on `auth.users` for profile creation.
- Estimated Impact: Negligible on existing operations.
*/

-- 1. Create a custom type for user roles
CREATE TYPE public.user_role AS ENUM ('admin', 'customer');

-- 2. Create a table for public user profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role public.user_role DEFAULT 'customer'::public.user_role NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Stores public profile information for each user, including their role.';
COMMENT ON COLUMN public.profiles.id IS 'References the user in auth.users.';
COMMENT ON COLUMN public.profiles.role IS 'Specifies if the user is an admin or a customer.';

-- 3. Create a function to automatically create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create a trigger to execute the function upon new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Create tables for invoices and quotations
CREATE TABLE public.invoices (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_size BIGINT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE public.invoices IS 'Stores metadata for uploaded invoice files.';

CREATE TABLE public.quotations (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_size BIGINT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE public.quotations IS 'Stores metadata for uploaded quotation files.';

-- 6. Enable Row Level Security (RLS) for all new tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for the 'profiles' table
CREATE POLICY "Users can view their own profile."
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles."
  ON public.profiles FOR SELECT
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 8. Create RLS policies for 'invoices' and 'quotations' tables
CREATE POLICY "Customers can view their own documents."
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all documents."
  ON public.invoices FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Customers can view their own documents."
  ON public.quotations FOR SELECT
  USING (auth.uid() = user_id);
  
CREATE POLICY "Admins can manage all documents."
  ON public.quotations FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 9. Create Storage Buckets and Policies
-- NOTE: Buckets must be created manually in the Supabase Dashboard if they don't exist.
-- This script sets up the security policies for them.

-- Create buckets (run this in dashboard if needed, or if permissions allow)
-- This might fail if the role does not have permission, which is common.
-- In that case, create 'invoices' and 'quotations' buckets manually.
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false), ('quotations', 'quotations', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for 'invoices' bucket
CREATE POLICY "Admins can upload invoices."
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'invoices' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Users can view their own invoices."
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all invoices."
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'invoices' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can delete invoices."
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'invoices' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Policies for 'quotations' bucket
CREATE POLICY "Admins can upload quotations."
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'quotations' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Users can view their own quotations."
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'quotations' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all quotations."
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'quotations' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can delete quotations."
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'quotations' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
