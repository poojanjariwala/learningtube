import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronsRight, Loader2 } from 'lucide-react';

type QuestionWithOptions = Tables<'questions'> & {
  options: Tables<'options'>[];
};

interface QuizPlayerProps {
  quizId: string;
  onBack: () => void;
  onQuizComplete: (attemptId: string) => void;
}

export const QuizPlayer = ({ quizId, onBack, onQuizComplete }: QuizPlayerProps) => {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Tables<'quizzes'> | null>(null);
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ question_id: string; selected_option_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attemptId, setAttemptId] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuizData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Start a new quiz attempt
        const { data: attemptData, error: attemptError } = await supabase
          .from('quiz_attempts')
          .insert({ user_id: user.id, quiz_id: quizId })
          .select()
          .single();

        if (attemptError) throw attemptError;
        setAttemptId(attemptData.id);

        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single();

        if (quizError) throw quizError;
        setQuiz(quizData);

        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('*, options(*)')
          .eq('quiz_id', quizId)
          .order('order_index', { ascending: true });

        if (questionsError) throw questionsError;
        setQuestions(questionsData || []);
      } catch (err: any) {
        setError('Failed to load quiz. Please try again.');
        console.error('Error fetching quiz:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizData();
  }, [quizId, user]);

  const handleNextQuestion = async () => {
    if (!selectedAnswer) return;

    const newAnswer = {
      question_id: questions[currentQuestionIndex].id,
      selected_option_id: selectedAnswer,
    };
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);
    setSelectedAnswer(null);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Quiz finished
      await submitQuiz(updatedAnswers);
    }
  };

  const submitQuiz = async (finalAnswers: { question_id: string; selected_option_id: string }[]) => {
    if (!attemptId || !user) return;
    setLoading(true);
    try {
      const answersToInsert = finalAnswers.map(ans => ({
        attempt_id: attemptId,
        question_id: ans.question_id,
        selected_option_id: ans.selected_option_id,
      }));

      await supabase.from('user_answers').insert(answersToInsert);

      // Now, let's call a function to grade the quiz
      const { data: scoreData, error: rpcError } = await supabase.rpc('grade_quiz_attempt', {
        p_attempt_id: attemptId
      });

      if (rpcError) throw rpcError;
      
      onQuizComplete(attemptId);

    } catch (err: any) {
      setError('Failed to submit quiz. Please try again.');
      console.error('Error submitting quiz:', err);
      setLoading(false);
    }
  };

  if (loading && !quiz) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading Quiz...</p>
      </div>
    );
  }
  
  if (error) {
    return (
       <div className="flex flex-col justify-center items-center h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={onBack} variant="outline" className="mt-4">Go Back</Button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <CardTitle className="text-2xl">{quiz?.title}</CardTitle>
            </div>
            <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground">Question</p>
                <p className="text-lg font-bold">
                    <span className="text-primary">{currentQuestionIndex + 1}</span>
                    <span className="text-muted-foreground">/{questions.length}</span>
                </p>
            </div>
          </div>
          <Progress value={progress} className="mt-4 h-2" />
        </CardHeader>
        <CardContent className="py-8 px-6">
          {currentQuestion && (
            <div className="space-y-6">
              <p className="text-lg font-semibold text-foreground">{currentQuestion.question_text}</p>
              <RadioGroup value={selectedAnswer || ''} onValueChange={setSelectedAnswer} className="space-y-3">
                {currentQuestion.options.map((option) => (
                  <div key={option.id} className="flex items-center space-x-3 p-4 border rounded-lg has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-colors">
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label htmlFor={option.id} className="flex-1 cursor-pointer text-base">
                      {option.option_text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
           <Button onClick={handleNextQuestion} disabled={!selectedAnswer || loading} size="lg">
             {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
            <ChevronsRight className="h-4 w-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
