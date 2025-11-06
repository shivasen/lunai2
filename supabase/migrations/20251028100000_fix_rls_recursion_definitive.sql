/*
# [Fix] Resolve Infinite Recursion in RLS Policy

This migration script fixes the "infinite recursion detected in policy for relation 'profiles'" error.
The error occurs because a security policy on the `profiles` table calls a function (`get_my_role`) which in turn tries to read from the `profiles` table, creating a loop.

This script replaces the function with a version that uses `SECURITY DEFINER`. This allows the function to execute with the permissions of its owner, bypassing the RLS check within the function and safely breaking the recursion loop. This is the standard and secure Supabase pattern for this scenario.

This script also sets a secure `search_path` for the function, which resolves the "Function Search Path Mutable" security warning.

## Query Description:
This operation replaces an existing SQL function. It is a safe, non-destructive operation that does not affect any stored data. It only changes the execution context of the function to fix a security policy loop.

## Metadata:
- Schema-Category: "Safe"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true (by restoring the previous function definition)

## Structure Details:
- Modifies function: `public.get_my_role()`

## Security Implications:
- RLS Status: No change to RLS status on tables.
- Policy Changes: No. Policies will now function correctly without recursion.
- Auth Requirements: The function uses `auth.uid()` to securely identify the current user.
- `SECURITY DEFINER`: Used to break the RLS recursion loop. The function is defined to run with the privileges of the user who owns it, not the calling user. The `search_path` is explicitly set to `public` to prevent search path hijacking attacks.

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Negligible. May slightly improve query performance by removing the recursion error.
*/

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
-- Set a secure search path to prevent hijacking attacks.
SET search_path = public
AS $$
BEGIN
  -- This query now runs with the function owner's permissions, bypassing the RLS policy on `profiles` and preventing recursion.
  RETURN (
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$;

-- It's good practice to ensure the correct role owns the function.
-- In Supabase, the `postgres` role is the superuser that typically owns these objects.
ALTER FUNCTION public.get_my_role() OWNER TO postgres;

-- Ensure the 'authenticated' role can execute this function for RLS policies.
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
