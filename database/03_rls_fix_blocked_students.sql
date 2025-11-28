-- Migration: Enable RLS on blocked_students table
-- Run this in your Supabase SQL Editor if the table already exists

-- Enable Row Level Security
ALTER TABLE blocked_students ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role can manage blocked_students" ON blocked_students;
DROP POLICY IF EXISTS "Users can check if they are blocked" ON blocked_students;

-- Policy: Only service role (backend) can manage blocked students
CREATE POLICY "Service role can manage blocked_students" 
ON blocked_students 
FOR ALL 
USING (auth.role() = 'service_role');

-- Policy: Allow authenticated users to check if they themselves are blocked
CREATE POLICY "Users can check if they are blocked" 
ON blocked_students 
FOR SELECT 
USING (auth.uid() = user_id);
