-- Fix function search path by updating the existing function
CREATE OR REPLACE FUNCTION public.update_user_progress_stats()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;