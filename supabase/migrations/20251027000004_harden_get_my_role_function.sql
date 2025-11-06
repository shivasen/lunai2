/*
# [SECURITY HARDENING] Set Function Search Path
This operation updates the `get_my_role` function to explicitly set its `search_path`. This is a security best practice that prevents potential context-switching attacks and resolves the "Function Search Path Mutable" warning.

## Query Description:
This is a safe, non-destructive update to an existing function's configuration. It does not alter data or table structures.

## Metadata:
- Schema-Category: ["Safe", "Security"]
- Impact-Level: ["Low"]
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Modifies function: `public.get_my_role()`

## Security Implications:
- RLS Status: Unchanged
- Policy Changes: No
- Auth Requirements: Admin privileges to alter functions.
- Mitigates: "Function Search Path Mutable" warning.

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Negligible.
*/
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
-- Set a secure search path to prevent hijacking
SET search_path = public
AS $$
BEGIN
  -- Check if the user exists in the profiles table and return their role
  RETURN (
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$;
