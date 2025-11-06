/*
# [Harden and Fix `get_my_role` Function]
This script replaces the `get_my_role` function with a more secure and robust version. It uses `SECURITY DEFINER` to run with elevated privileges, which bypasses the calling user's Row Level Security policies. This is the standard and correct way to resolve the "infinite recursion" error that occurs when a policy depends on a function that reads from the same table. It also explicitly sets the `search_path` to `public`, which resolves the "Function Search Path Mutable" security warning.

## Query Description: [This operation replaces a database helper function. It is a safe, non-destructive change designed to fix a critical bug and improve security. It does not affect any user data.]

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Replaces the function: `public.get_my_role()`

## Security Implications:
- RLS Status: Corrects a recursive RLS policy issue.
- Policy Changes: No
- Auth Requirements: Grants EXECUTE permission to the `authenticated` role.

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Negligible.
*/

-- Drop the existing function if it exists, to ensure a clean replacement
DROP FUNCTION IF EXISTS public.get_my_role();

-- Create the new, secure function
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
-- Set a secure search path to prevent hijacking and resolve the security warning
SET search_path = public
AS $$
BEGIN
  -- The SECURITY DEFINER context allows this query to bypass the RLS policy
  -- on the 'profiles' table that would otherwise cause an infinite recursion loop.
  RETURN (
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$;

-- Grant execute permission to authenticated users so they can use it
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
