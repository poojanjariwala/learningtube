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

-- This function replaces the old trigger and function with a single, efficient RPC.
-- It handles progress updates, points, and streak calculations in one database call.
CREATE OR REPLACE FUNCTION mark_lesson_complete(
    p_user_id UUID,
    p_lesson_id UUID,
    p_course_id UUID,
    p_watch_percentage INTEGER
)
RETURNS VOID AS $$
DECLARE
    v_points_earned INTEGER;
    v_is_already_completed BOOLEAN;
    v_profile_last_activity_date DATE;
    v_profile_current_streak INTEGER;
BEGIN
    -- Check if the lesson is already fully completed (watch_percentage >= 90)
    SELECT EXISTS (
        SELECT 1
        FROM user_progress
        WHERE user_id = p_user_id
          AND lesson_id = p_lesson_id
          AND watch_percentage >= 90
    )
    INTO v_is_already_completed;

    -- Get points for the lesson, default to 100
    SELECT points_reward INTO v_points_earned FROM lessons WHERE id = p_lesson_id;
    v_points_earned := COALESCE(v_points_earned, 100);

    -- Insert or update the user's progress for this lesson
    INSERT INTO user_progress (user_id, lesson_id, course_id, watch_percentage, points_earned, completed_at)
    VALUES (p_user_id, p_lesson_id, p_course_id, p_watch_percentage, v_points_earned, CASE WHEN p_watch_percentage >= 90 THEN NOW() ELSE NULL END)
    ON CONFLICT (user_id, lesson_id) DO UPDATE
    SET
        watch_percentage = GREATEST(user_progress.watch_percentage, EXCLUDED.watch_percentage),
        points_earned = CASE WHEN user_progress.watch_percentage < 90 AND EXCLUDED.watch_percentage >= 90 THEN EXCLUDED.points_earned ELSE user_progress.points_earned END,
        completed_at = CASE WHEN user_progress.watch_percentage < 90 AND EXCLUDED.watch_percentage >= 90 THEN NOW() ELSE user_progress.completed_at END;

    -- Only award points and update streak if the lesson is newly completed
    IF COALESCE(v_is_already_completed, FALSE) = FALSE AND p_watch_percentage >= 90 THEN
        -- Get the current profile state
        SELECT
            COALESCE(last_activity_date, '1970-01-01'),
            COALESCE(current_streak, 0)
        INTO
            v_profile_last_activity_date,
            v_profile_current_streak
        FROM
            profiles
        WHERE
            user_id = p_user_id;

        -- Update points and last activity date for a new completion
        UPDATE profiles
        SET points = COALESCE(points, 0) + v_points_earned,
            last_activity_date = CURRENT_DATE
        WHERE user_id = p_user_id;

        -- Check if the last activity was before today to update the streak
        IF v_profile_last_activity_date < CURRENT_DATE THEN
            IF v_profile_last_activity_date = (CURRENT_DATE - INTERVAL '1 day') THEN
                -- Increment streak if the last activity was yesterday
                UPDATE profiles
                SET
                    current_streak = v_profile_current_streak + 1,
                    longest_streak = GREATEST(COALESCE(longest_streak, 0), v_profile_current_streak + 1)
                WHERE user_id = p_user_id;
            ELSE
                -- Reset streak to 1 if the last activity was before yesterday
                UPDATE profiles
                SET
                    current_streak = 1,
                    longest_streak = GREATEST(COALESCE(longest_streak, 0), 1)
                WHERE user_id = p_user_id;
            END IF;
        END IF;
    END IF;

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- The old trigger is no longer needed as the logic is now handled by the RPC call.
DROP TRIGGER IF EXISTS update_user_stats_trigger ON public.user_progress;
DROP FUNCTION IF EXISTS public.update_user_progress_stats();
