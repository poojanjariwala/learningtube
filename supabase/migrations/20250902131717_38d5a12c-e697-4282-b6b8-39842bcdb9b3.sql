-- Create a standalone function to be called from the edge function
CREATE OR REPLACE FUNCTION public.update_user_progress_stats_manual(p_user_id UUID, p_points_earned INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_last_activity_date DATE;
  profile_current_streak INT;
  profile_longest_streak INT;
BEGIN
  -- Get the current profile state
  SELECT last_activity_date, current_streak, longest_streak 
  INTO profile_last_activity_date, profile_current_streak, profile_longest_streak
  FROM profiles
  WHERE user_id = p_user_id;

  -- Update points and last activity date
  UPDATE profiles 
  SET 
    points = points + COALESCE(p_points_earned, 0),
    last_activity_date = CURRENT_DATE
  WHERE user_id = p_user_id;
  
  -- Update streak logic
  IF profile_last_activity_date IS NOT NULL THEN
    IF profile_last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN
      UPDATE profiles 
      SET 
        current_streak = profile_current_streak + 1,
        longest_streak = GREATEST(COALESCE(profile_longest_streak, 0), profile_current_streak + 1)
      WHERE user_id = p_user_id;
    ELSIF profile_last_activity_date < CURRENT_DATE - INTERVAL '1 day' THEN
      UPDATE profiles 
      SET current_streak = 1
      WHERE user_id = p_user_id;
    END IF;
  ELSE
    UPDATE profiles
    SET 
        current_streak = 1,
        longest_streak = GREATEST(COALESCE(profile_longest_streak, 0), 1)
    WHERE user_id = p_user_id;
  END IF;
END;
$$;

-- Drop the old trigger if it exists
DROP TRIGGER IF EXISTS update_user_stats_trigger ON public.user_progress;

