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

-- Create a function to update user points and streaks
CREATE OR REPLACE FUNCTION update_user_progress_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update points in profiles table
  UPDATE profiles 
  SET points = points + COALESCE(NEW.points_earned, 0),
      last_activity_date = CURRENT_DATE
  WHERE user_id = NEW.user_id;
  
  -- Update streak logic
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

-- Create trigger to automatically update user stats when progress is made
CREATE TRIGGER update_user_stats_trigger
  AFTER INSERT ON user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_user_progress_stats();