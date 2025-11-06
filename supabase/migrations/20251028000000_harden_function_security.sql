/*
# [Function Security Hardening]
This migration hardens an existing database function to improve security, specifically addressing the 'Function Search Path Mutable' warning. It explicitly sets the `search_path` for the `get_my_role` function to prevent potential hijacking vulnerabilities.

## Query Description: [This operation modifies the `get_my_role` function to enhance security. It is a safe, non-destructive change that ensures the function executes in a controlled environment. No data will be affected.]

## Metadata:
- Schema-Category: ["Safe", "Structural"]
- Impact-Level: ["Low"]
- Requires-Backup: [false]
- Reversible: [true]

## Structure Details:
- Modifies function: `public.get_my_role()`

## Security Implications:
- RLS Status: [Unaffected]
- Policy Changes: [No]
- Auth Requirements: [None]
- Mitigates: Search path hijacking vulnerability.

## Performance Impact:
- Indexes: [Unaffected]
- Triggers: [Unaffected]
- Estimated Impact: [Negligible performance impact. Improves security and stability.]
*/

-- Harden the get_my_role function by setting a secure search_path
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
-- Set a secure search path to prevent hijacking
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- This query should now be safe from recursion after the previous fix.
  -- We are just adding the search_path setting for extra security.
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN user_role;
END;
$$;
