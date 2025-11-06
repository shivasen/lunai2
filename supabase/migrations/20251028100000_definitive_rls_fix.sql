/*
# [Definitive Fix] Resolve RLS Infinite Recursion on 'profiles' table

This script provides a final, comprehensive fix for the persistent "infinite recursion" error. It safely replaces the problematic database function without deleting any dependent security policies.

## Detailed Explanation:
The error occurs because a security policy on the 'profiles' table uses a function (`get_my_role`) that itself tries to read from the 'profiles' table, creating an endless loop.

This script fixes the issue by redefining the function with `SECURITY DEFINER`. This is a standard, secure practice that causes the function to run with the elevated permissions of its owner, bypassing the recursive security check and breaking the loop.

This is the definitive solution for this specific database configuration problem.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Replaces the function: `public.get_my_role()`

## Security Implications:
- The function is hardened by setting a secure `search_path`, which also resolves the "Function Search Path Mutable" security warning.
- Permissions are explicitly set to ensure only authenticated users can execute the function.
*/

-- Step 1: Safely replace the function using 'CREATE OR REPLACE'.
-- This updates the function in-place without breaking dependencies.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
-- Step 2: Use SECURITY DEFINER to break the recursion loop.
-- The function will run as its owner, who is not subject to RLS policies.
SECURITY DEFINER
-- Step 3: Set a secure search path. This prevents potential hijacking
-- and resolves the "Function Search Path Mutable" security warning.
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Step 4: Securely fetch the role for the currently authenticated user.
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Step 5: Return the fetched role, or 'customer' if no profile exists.
  RETURN COALESCE(user_role, 'customer');
END;
$$;

-- Step 6: Set the correct ownership for the function.
-- In Supabase, this should be the 'postgres' user for security definer functions.
ALTER FUNCTION public.get_my_role() OWNER TO postgres;

-- Step 7: Reset permissions to a secure default.
-- Revoke execution from everyone initially.
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM public;

-- Step 8: Grant execute permission ONLY to authenticated users.
-- This ensures anonymous users cannot call this function.
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
