/*
# [Operation Name]
Definitively Fix RLS Recursion with SECURITY DEFINER

## Query Description: [This operation replaces the 'get_my_role' function to permanently fix the "infinite recursion" error. The previous attempts failed because of a dependency lock. This script uses 'CREATE OR REPLACE' to update the function in-place, preserving your security policies. It defines the function with 'SECURITY DEFINER', which allows it to bypass the RLS policy that calls it, thus breaking the recursive loop. It also sets a secure 'search_path' to prevent security vulnerabilities and resolve a security warning.]

## Metadata:
- Schema-Category: ["Structural", "Safe"]
- Impact-Level: ["Low"]
- Requires-Backup: [false]
- Reversible: [false]

## Structure Details:
- Function 'public.get_my_role' will be replaced.

## Security Implications:
- RLS Status: [Unaffected]
- Policy Changes: [No]
- Auth Requirements: [Admin]
- This is the standard, secure Supabase pattern for this exact problem.

## Performance Impact:
- Estimated Impact: [Positive. Fixes a non-performant, recursive function call.]
*/

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
-- Set a safe search path to prevent a 'Function Search Path Mutable' security warning.
SET search_path = public, pg_temp
AS $$
BEGIN
  -- This function now runs with definer privileges, bypassing the RLS policy
  -- that was causing the recursion. It can now safely query the profiles table.
  -- It returns the 'role' of the currently authenticated user.
  RETURN (
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$;

-- Re-grant execute permissions to the authenticated role
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
