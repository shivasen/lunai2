/*
# [Fix] Harden get_my_role() function to prevent recursion

This script replaces the existing `get_my_role()` function with a more secure and robust version.
It uses `SECURITY DEFINER` to break the infinite recursion loop that occurs when RLS policies on the `profiles` table call a function that also reads from `profiles`.
It also sets a fixed `search_path` to resolve the "Function Search Path Mutable" security warning.

## Query Description:
This operation safely replaces a database function. It does not alter any table data. It is designed to fix a critical error preventing the application from loading user data. There is no risk to existing data.

## Metadata:
- Schema-Category: "Safe"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true (by restoring the previous function definition)

## Structure Details:
- Function: `public.get_my_role()`

## Security Implications:
- RLS Status: This change is required to make RLS policies work correctly.
- Policy Changes: No
- Auth Requirements: The function uses `auth.uid()` to identify the current user.
- `SECURITY DEFINER`: The function will run with the privileges of the owner, which is necessary to bypass the caller's RLS policies and prevent recursion.

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Positive. Resolves a blocking error.
*/

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
-- SET search_path = public will address the security warning
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- This query now runs as the function owner, bypassing the caller's RLS policy on `profiles`
  -- and preventing the infinite recursion.
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN user_role;
END;
$$;
