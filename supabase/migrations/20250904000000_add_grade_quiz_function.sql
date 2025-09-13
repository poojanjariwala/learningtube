-- Function to grade a quiz attempt
CREATE OR REPLACE FUNCTION public.grade_quiz_attempt(p_attempt_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  v_score integer;
BEGIN
  -- Calculate the score
  SELECT
    count(*)
  INTO
    v_score
  FROM
    public.user_answers ua
  JOIN
    public.options o ON ua.selected_option_id = o.id
  WHERE
    ua.attempt_id = p_attempt_id AND o.is_correct = true;

  -- Update the attempt with the score and completion time
  UPDATE
    public.quiz_attempts
  SET
    score = v_score,
    completed_at = now()
  WHERE
    id = p_attempt_id;

  RETURN v_score;
END;
$$;
