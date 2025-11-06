/*
# [Fix] Definitive Fix for RLS Infinite Recursion

This script replaces the `get_my_role` function with a version that uses `SECURITY DEFINER` to permanently resolve the "infinite recursion" error. This is the standard and safe Supabase pattern for this issue. It also hardens the function by setting a secure search path.

## Query Description:
This operation safely replaces an existing database function. It is designed to be non-destructive and will not affect any existing data. The policies that depend on this function will automatically use the new, corrected version. This is a low-risk, essential fix for the core authentication and authorization logic.

## Metadata:
- Schema-Category: ["Structural", "Safe"]
- Impact-Level: ["Low"]
- Requires-Backup: false
- Reversible: true (The old function definition can be restored from previous migrations)

## Structure Details:
- Function `public.get_my_role()`: Replaced in-place.

## Security Implications:
- RLS Status: No change to RLS status on tables.
- Policy Changes: No. Policies will now function correctly.
- Auth Requirements: This function is used by RLS policies to check the role of the currently authenticated user.
- `SECURITY DEFINER`: The function is now defined with `SECURITY DEFINER`, allowing it to bypass the recursive RLS check safely.
- `search_path`: Explicitly set to `public` to mitigate the "Function Search Path Mutable" security warning.

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Negligible. May slightly improve query performance by resolving the recursion issue.
*/

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;
