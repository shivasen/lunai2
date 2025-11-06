/*
# [Fix] Safely Update `get_my_role` Function to Prevent Recursion

This migration safely updates the `get_my_role` function to resolve the "infinite recursion" error and the "Function Search Path Mutable" security warning. It uses `CREATE OR REPLACE FUNCTION` to avoid the dependency errors encountered previously.

## Query Description:
This operation replaces the existing `get_my_role` function with a more secure and robust version. It does NOT drop any dependent objects like RLS policies, ensuring your security rules remain intact. The new function uses the `SECURITY DEFINER` property to safely check a user's role without causing a recursive loop. It also sets a fixed `search_path` to mitigate potential security vulnerabilities. This change is safe and essential for the client portal's functionality.

## Metadata:
- Schema-Category: ["Structural", "Safe"]
- Impact-Level: ["Low"]
- Requires-Backup: false
- Reversible: true (The old function definition can be restored)

## Structure Details:
- Modifies: `public.get_my_role()` function

## Security Implications:
- RLS Status: No change to RLS policies themselves. This function is *used by* RLS policies.
- Policy Changes: No.
- Auth Requirements: The function is designed to be called by authenticated users.
- This change *improves* security by setting a fixed `search_path` and using `SECURITY DEFINER` correctly.

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Negligible. The function logic is simple and efficient.
*/

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
-- Set a secure search path to prevent hijacking.
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- This query now safely checks the role from the profiles table
  -- without causing recursion because it runs with the permissions of the function owner.
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'customer');
END;
$$;
