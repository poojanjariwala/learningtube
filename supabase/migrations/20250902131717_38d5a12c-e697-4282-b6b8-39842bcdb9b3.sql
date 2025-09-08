-- Fix function search path by updating the existing function
CREATE OR REPLACE FUNCTION public.update_user_progress_stats()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_last_activity_date DATE;
BEGIN
  -- Get the last activity date for the user
  SELECT last_activity_date INTO profile_last_activity_date
  FROM profiles
  WHERE user_id = NEW.user_id;

  -- Update points and last activity date
  UPDATE profiles 
  SET 
    points = points + COALESCE(NEW.points_earned, 0),
    last_activity_date = CURRENT_DATE
  WHERE user_id = NEW.user_id;
  
  -- Update streak logic
  IF profile_last_activity_date IS NOT NULL THEN
    IF profile_last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN
      UPDATE profiles 
      SET 
        current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1)
      WHERE user_id = NEW.user_id;
    ELSIF profile_last_activity_date < CURRENT_DATE - INTERVAL '1 day' THEN
      UPDATE profiles 
      SET current_streak = 1
      WHERE user_id = NEW.user_id;
    END IF;
  ELSE
    UPDATE profiles
    SET current_streak = 1,
        longest_streak = GREATEST(longest_streak, 1)
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;
