-- Update RLS policy to show only user's own courses
DROP POLICY IF EXISTS "Anyone can view published courses" ON courses;

CREATE POLICY "Users can view their own courses" 
ON courses 
FOR SELECT 
USING (
  instructor_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Delete any existing preloaded courses (optional - remove if you want to keep existing data)
-- DELETE FROM courses WHERE instructor_id IS NULL;

-- Update course creation to link to current user's profile
-- This ensures new courses are properly linked to the user who created them