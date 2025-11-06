/*
# [CRITICAL FIX] Resolve Infinite Recursion in RLS Policies
This migration script provides a definitive fix for the "infinite recursion" error that occurs when RLS policies on the 'profiles' table call a helper function which in turn reads from 'profiles'.

## Query Description:
This script replaces the existing `get_my_role()` function with a new version that uses the `SECURITY DEFINER` paradigm. This is the standard and secure Supabase pattern to break recursive policy checks. The function will execute with the permissions of its owner, allowing it to read the user's role from the `profiles` table without re-triggering the same RLS policies. It also explicitly sets a secure `search_path` to prevent potential security vulnerabilities. THIS OPERATION IS SAFE and will not alter any data. It only redefines a helper function.

## Metadata:
- Schema-Category: ["Structural", "Safe"]
- Impact-Level: ["Low"]
- Requires-Backup: false
- Reversible: true (by restoring the previous function definition)

## Structure Details:
- Function `public.get_my_role()` will be replaced.

## Security Implications:
- RLS Status: No change to RLS status on any table.
- Policy Changes: No. This script does not alter policies, it fixes the function they depend on.
- Auth Requirements: The function uses `auth.uid()` to identify the current user.
- This change resolves the "Function Search Path Mutable" security warning.

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Negligible. This is a very fast operation.
*/

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
-- SECURITY DEFINER is the key to fixing the recursion. It runs the function
-- as the user who created it (the 'definer'), which bypasses the RLS policies
-- of the user who is calling it (the 'invoker').
SECURITY DEFINER
-- SET search_path is a security best practice to prevent search path hijacking.
SET search_path = public, pg_temp
AS $$
BEGIN
  -- This query can now read from public.profiles without triggering the RLS policy
  -- that called this function in the first place, because we are in a SECURITY DEFINER context.
  RETURN (
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$;

-- Re-grant execute permissions to the authenticated role to ensure it can be called.
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
-- Also grant to service_role for server-side operations.
GRANT EXECUTE ON FUNCTION public.get_my_role() TO service_role;
