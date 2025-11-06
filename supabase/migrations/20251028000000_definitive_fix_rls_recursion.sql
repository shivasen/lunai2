/*
# [Fix] Harden get_my_role() to prevent RLS recursion

This migration replaces the existing `get_my_role()` function with a more secure and robust version.
The primary purpose is to fix an "infinite recursion" error that occurs when a Row Level Security (RLS) policy on the `profiles` table calls this function.

## Query Description:
This operation uses `CREATE OR REPLACE FUNCTION` to update the function in-place. This is a safe operation that will not drop any dependent objects like your security policies.
The function is being updated to use `SECURITY DEFINER`. This allows the function to execute with the permissions of the user who defined it (the owner), temporarily bypassing the RLS policy that causes the recursive loop. This is the standard and recommended way to solve this specific issue in Supabase.
Additionally, we are setting a fixed `search_path` to `public` within the function. This is a security best practice that prevents potential `search_path` manipulation attacks and resolves the "Function Search Path Mutable" security warning.

## Metadata:
- Schema-Category: "Safe"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true (The old function definition can be restored if needed)

## Structure Details:
- Function Modified: `public.get_my_role()`

## Security Implications:
- RLS Status: No change to RLS status on tables.
- Policy Changes: No. This fixes the function used by existing policies.
- Auth Requirements: The function will now run with definer's rights, which is necessary for it to work correctly.

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Negligible. This is a very fast function call.
*/

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
-- Key change: SECURITY DEFINER allows the function to bypass the RLS policy that calls it.
SECURITY DEFINER
-- Key change: SET search_path prevents search path hijacking attacks and resolves the security warning.
SET search_path = public
AS $$
BEGIN
  -- This query now runs with the function owner's permissions, not the caller's.
  -- It can therefore read from the profiles table without re-triggering the RLS policy.
  RETURN (
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$;
