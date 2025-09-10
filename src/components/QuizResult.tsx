import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, ChevronLeft, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

type QuizAttempt = Tables<'quiz_attempts'>;
type QuestionWithOptions = Tables<'questions'> & {
  options: Tables<'options'>[];
};
type UserAnswer = Tables<'user_answers'>;

interface QuizResultProps {
  attemptId: string;
  onBack: () => void;
  onRetakeQuiz: () => void;
}

export const QuizResult = ({ attemptId, onBack, onRetakeQuiz }: QuizResultProps) => {
  const { user } = useAuth();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [quiz, setQuiz] = useState<Tables<'quizzes'> | null>(null);
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([]);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResultData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data: attemptData, error: attemptError } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('id', attemptId)
          .single();

        if (attemptError) throw attemptError;
        setAttempt(attemptData);

        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', attemptData.quiz_id)
          .single();
        
        if (quizError) throw quizError;
        setQuiz(quizData);

        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('*, options(*)')
          .eq('quiz_id', attemptData.quiz_id)
          .order('order_index', { ascending: true });

        if (questionsError) throw questionsError;
        setQuestions(questionsData || []);

        const { data: answersData, error: answersError } = await supabase
          .from('user_answers')
          .select('*')
          .eq('attempt_id', attemptId);

        if (answersError) throw answersError;
        setUserAnswers(answersData || []);

      } catch (err: any) {
        setError('Failed to load quiz results. Please try again.');
        console.error('Error fetching results:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResultData();
  }, [attemptId, user]);
  
  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;
  }

  const scorePercentage = attempt && questions.length > 0 ? (attempt.score! / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Course
        </Button>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Quiz Results</CardTitle>
            <p className="text-muted-foreground">{quiz?.title}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <p className="text-lg font-medium">Your Score</p>
              <div className="text-6xl font-bold text-primary">{Math.round(scorePercentage)}%</div>
              <div className="w-full max-w-sm">
                <Progress value={scorePercentage} className="h-3" />
              </div>
              <p className="text-muted-foreground">You answered {attempt?.score} out of {questions.length} questions correctly.</p>
            </div>
            
            <ScrollArea className="h-96 w-full p-4 border rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Review Your Answers</h3>
              <div className="space-y-6">
                {questions.map((question, index) => {
                  const userAnswer = userAnswers.find(a => a.question_id === question.id);
                  const selectedOption = question.options.find(o => o.id === userAnswer?.selected_option_id);
                  const isCorrect = selectedOption?.is_correct;

                  return (
                    <div key={question.id}>
                      <div className="flex items-start gap-4">
                        <div className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                          {isCorrect ? <CheckCircle2 className="h-4 w-4 text-white" /> : <XCircle className="h-4 w-4 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{index + 1}. {question.question_text}</p>
                          <div className="mt-2 space-y-2">
                            {question.options.map(option => (
                              <div key={option.id} className={`p-2 rounded-md text-sm flex items-center gap-2 ${
                                option.is_correct ? 'bg-green-100 dark:bg-green-900' : 
                                (option.id === selectedOption?.id ? 'bg-red-100 dark:bg-red-900' : 'bg-muted/30')
                              }`}>
                                {option.is_correct ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : 
                                 (option.id === selectedOption?.id ? <XCircle className="h-4 w-4 text-red-600" /> : <div className="w-4 h-4" />)}
                                <span>{option.option_text}</span>
                                {option.id === selectedOption?.id && <span className="text-xs text-muted-foreground ml-auto">(Your answer)</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="flex justify-center gap-4">
            <Button onClick={onRetakeQuiz}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retake Quiz
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
