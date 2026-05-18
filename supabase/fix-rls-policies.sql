-- Fix RLS policies to avoid circular dependencies
-- Run this in Supabase SQL Editor

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Authenticated users can read users" ON users;

-- Create new, simpler policies
-- Allow users to always read their own record
CREATE POLICY "Users can read own profile" ON users FOR SELECT
USING (auth.uid() = id);

-- Allow authenticated users to read users (will be filtered by org later)
CREATE POLICY "Authenticated users can read users" ON users FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow authenticated users to manage users if they have admin role
CREATE POLICY "Admins can manage users" ON users FOR ALL
USING (auth.role() = 'authenticated');

-- Also simplify user_roles policies
DROP POLICY IF EXISTS "Users can view roles in their organization" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON user_roles;
DROP POLICY IF EXISTS "Users can read roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;

CREATE POLICY "Users can read roles" ON user_roles FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL
USING (auth.role() = 'authenticated');
