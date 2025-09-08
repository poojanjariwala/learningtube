-- Create storage bucket for course thumbnails
INSERT INTO storage.buckets (id, name, public) VALUES ('course-thumbnails', 'course-thumbnails', true);

-- Create storage policies for course thumbnails
CREATE POLICY "Anyone can view course thumbnails" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'course-thumbnails');

CREATE POLICY "Authenticated users can upload course thumbnails" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'course-thumbnails' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update course thumbnails" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'course-thumbnails' AND auth.uid() IS NOT NULL);

-- Add YouTube playlist ID and channel info to courses table
ALTER TABLE courses ADD COLUMN youtube_playlist_id TEXT;
ALTER TABLE courses ADD COLUMN youtube_channel_id TEXT;
ALTER TABLE courses ADD COLUMN youtube_channel_name TEXT;

-- Add YouTube video ID to lessons table
ALTER TABLE lessons ADD COLUMN youtube_video_id TEXT;

-- This new function correctly handles all streak update scenarios, including same-day activity.
CREATE OR REPLACE FUNCTION update_user_progress_stats_manual(p_user_id UUID, p_points_earned INTEGER)
RETURNS VOID AS $$
DECLARE
  profile_last_activity_date DATE;
  profile_current_streak INTEGER;
BEGIN
  -- Get the current profile state before any updates
  SELECT
    COALESCE(last_activity_date, '1970-01-01'),
    COALESCE(current_streak, 0)
  INTO
    profile_last_activity_date,
    profile_current_streak
  FROM
    profiles
  WHERE
    user_id = p_user_id;

  -- First, update points and last activity date
  UPDATE profiles
  SET
    points = COALESCE(points, 0) + p_points_earned,
    last_activity_date = CURRENT_DATE
  WHERE
    user_id = p_user_id;

  -- Then, update streak based on the state before the update
  IF profile_last_activity_date < (CURRENT_DATE - INTERVAL '1 day') THEN
    -- If the last activity was before yesterday, reset streak to 1
    UPDATE profiles
    SET
      current_streak = 1,
      longest_streak = GREATEST(COALESCE(longest_streak, 0), 1)
    WHERE
      user_id = p_user_id;
  ELSIF profile_last_activity_date = (CURRENT_DATE - INTERVAL '1 day') THEN
    -- If the last activity was yesterday, increment streak
    UPDATE profiles
    SET
      current_streak = profile_current_streak + 1,
      longest_streak = GREATEST(COALESCE(longest_streak, 0), profile_current_streak + 1)
    WHERE
      user_id = p_user_id;
  END IF;
  -- If last activity was today, do nothing to the streak.

  RETURN;
END;
$$ LANGUAGE plpgsql;


-- We are keeping the old function and trigger for historical schema consistency, 
-- but the logic is now handled by the manual call from the edge function.
CREATE OR REPLACE FUNCTION update_user_progress_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- This logic is flawed and is no longer the primary method for updating streaks.
  -- See update_user_progress_stats_manual for the correct implementation.
  UPDATE profiles 
  SET points = points + COALESCE(NEW.points_earned, 0),
      last_activity_date = CURRENT_DATE
  WHERE user_id = NEW.user_id;
  
  UPDATE profiles 
  SET current_streak = CASE 
    WHEN last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1
    WHEN last_activity_date < CURRENT_DATE - INTERVAL '1 day' THEN 1
    ELSE current_streak
  END,
  longest_streak = GREATEST(longest_streak, 
    CASE 
      WHEN last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1
      WHEN last_activity_date < CURRENT_DATE - INTERVAL '1 day' THEN 1
      ELSE current_streak
    END)
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_stats_trigger
  AFTER INSERT ON user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_user_progress_stats();
