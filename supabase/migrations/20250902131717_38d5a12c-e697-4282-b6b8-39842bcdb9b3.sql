-- Drop the old trigger if it exists
DROP TRIGGER IF EXISTS update_user_stats_trigger ON public.user_progress;

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS public.update_user_progress_stats();

-- Create a new RPC function to be called manually
CREATE OR REPLACE FUNCTION public.update_user_stats(p_user_id UUID)
RETURNS void AS $$
DECLARE
  profile_row RECORD;
BEGIN
  -- Get the user's profile
  SELECT * INTO profile_row FROM public.profiles WHERE user_id = p_user_id;
  
  -- Update streak logic
  IF profile_row.last_activity_date IS NULL THEN
     UPDATE public.profiles
    SET 
      current_streak = 1,
      longest_streak = GREATEST(COALESCE(profile_row.longest_streak, 0), 1),
      last_activity_date = CURRENT_DATE
    WHERE user_id = p_user_id;
  ELSIF profile_row.last_activity_date = (CURRENT_DATE - INTERVAL '1 day') THEN
    -- Increment streak
    UPDATE public.profiles
    SET 
      current_streak = profile_row.current_streak + 1,
      longest_streak = GREATEST(profile_row.longest_streak, profile_row.current_streak + 1),
      last_activity_date = CURRENT_DATE
    WHERE user_id = p_user_id;
  ELSIF profile_row.last_activity_date < (CURRENT_DATE - INTERVAL '1 day') THEN
    -- Reset streak
    UPDATE public.profiles
    SET 
      current_streak = 1,
      last_activity_date = CURRENT_DATE
    WHERE user_id = p_user_id;
  END IF;

  -- Update total points by aggregating from user_progress
  UPDATE public.profiles
  SET points = (
    SELECT COALESCE(SUM(points_earned), 0)
    FROM public.user_progress
    WHERE user_id = p_user_id
  )
  WHERE user_id = p_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

