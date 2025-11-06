/*
# [Fix] Resolve RLS Infinite Recursion

This migration script definitively resolves the "infinite recursion" error by replacing the `get_my_role` helper function with a secure, non-recursive version.

## Query Description:
This operation replaces the existing `get_my_role()` function. It does NOT delete any data or policies. It modifies the function to run with `SECURITY DEFINER` privileges, which allows it to bypass the user's Row Level Security (RLS) policies when checking the `profiles` table. This is the standard and safe Supabase pattern for breaking recursion loops in RLS. It also sets a secure `search_path` to address the "Function Search Path Mutable" security warning.

- **Impact on Data:** None. No data will be lost or altered.
- **Risks:** Minimal. This is a standard fix for a common Supabase RLS configuration issue.
- **Safety:** This change is safe and reversible by deploying a previous version of the function if needed.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Function Modified: `public.get_my_role()`

## Security Implications:
- RLS Status: This fix is specifically for an RLS issue.
- Policy Changes: No. Policies that depend on this function will now work correctly.
- Auth Requirements: The function will now execute with the definer's privileges (`postgres`), which is necessary to break the RLS loop.

## Performance Impact:
- Indexes: None.
- Triggers: None.
- Estimated Impact: Negligible. The function execution will be slightly different but should not have a noticeable performance impact.
*/

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
-- Set a secure search path to prevent hijacking and address security warnings.
SET search_path = public
STABLE
AS $$
BEGIN
  -- This function runs as the 'postgres' user, which bypasses RLS on the 'profiles' table,
  -- thus breaking the recursive loop.
  RETURN (
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$;

-- Grant execute permission to authenticated users so they can call the function
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
