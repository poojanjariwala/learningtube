-- Create quizzes table to store quiz metadata
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on quizzes
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Create policies for quizzes
CREATE POLICY "Users can view quizzes for their courses"
ON public.quizzes
FOR SELECT
USING (
  course_id IN (
    SELECT id FROM public.courses WHERE instructor_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Instructors can manage quizzes for their courses"
ON public.quizzes
FOR ALL
USING (
  course_id IN (
    SELECT id FROM public.courses WHERE instructor_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  course_id IN (
    SELECT id FROM public.courses WHERE instructor_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS on questions
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Create policies for questions
CREATE POLICY "Users can view questions for quizzes they can access"
ON public.questions
FOR SELECT
USING (
  quiz_id IN (
    SELECT id FROM public.quizzes
  )
);

CREATE POLICY "Instructors can manage questions for their quizzes"
ON public.questions
FOR ALL
USING (
  quiz_id IN (
    SELECT id FROM public.quizzes WHERE course_id IN (
      SELECT id FROM public.courses WHERE instructor_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  quiz_id IN (
    SELECT id FROM public.quizzes WHERE course_id IN (
      SELECT id FROM public.courses WHERE instructor_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  )
);

-- Create options table
CREATE TABLE public.options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS on options
ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;

-- Create policies for options
CREATE POLICY "Users can view options for questions they can access"
ON public.options
FOR SELECT
USING (
  question_id IN (
    SELECT id FROM public.questions
  )
);

CREATE POLICY "Instructors can manage options for their questions"
ON public.options
FOR ALL
USING (
  question_id IN (
    SELECT id FROM public.questions WHERE quiz_id IN (
      SELECT id FROM public.quizzes WHERE course_id IN (
        SELECT id FROM public.courses WHERE instructor_id IN (
          SELECT id FROM public.profiles WHERE user_id = auth.uid()
        )
      )
    )
  )
)
WITH CHECK (
  question_id IN (
    SELECT id FROM public.questions WHERE quiz_id IN (
      SELECT id FROM public.quizzes WHERE course_id IN (
        SELECT id FROM public.courses WHERE instructor_id IN (
          SELECT id FROM public.profiles WHERE user_id = auth.uid()
        )
      )
    )
  )
);

-- Create quiz_attempts table
CREATE TABLE public.quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score INTEGER,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on quiz_attempts
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies for quiz_attempts
CREATE POLICY "Users can manage their own quiz attempts"
ON public.quiz_attempts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create user_answers table
CREATE TABLE public.user_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option_id UUID NOT NULL REFERENCES public.options(id) ON DELETE CASCADE,
  is_correct BOOLEAN
);

-- Enable RLS on user_answers
ALTER TABLE public.user_answers ENABLE ROW LEVEL SECURITY;

-- Create policies for user_answers
CREATE POLICY "Users can manage their own answers"
ON public.user_answers
FOR ALL
USING (
  attempt_id IN (
    SELECT id FROM public.quiz_attempts WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  attempt_id IN (
    SELECT id FROM public.quiz_attempts WHERE user_id = auth.uid()
  )
);

-- Create trigger for updated_at on quizzes
CREATE TRIGGER update_quizzes_updated_at
BEFORE UPDATE ON public.quizzes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
