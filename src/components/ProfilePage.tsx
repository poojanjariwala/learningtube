import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Flame, 
  BookOpen, 
  Clock, 
  Award,
  TrendingUp,
  Calendar,
  Target,
  ChevronLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ProfilePageProps {
  onBack: () => void;
}

interface UserStats {
  totalCourses: number;
  completedCourses: number;
  totalWatchTime: number;
  achievements: any[];
}

export const ProfilePage = ({ onBack }: ProfilePageProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<UserStats>({
    totalCourses: 0,
    completedCourses: 0,
    totalWatchTime: 0,
    achievements: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProfileAndStats();
    }
  }, [user]);

  const loadProfileAndStats = async () => {
    setLoading(true);
    try {
      if (!user) return;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (profileError) throw profileError;
      setProfile(profileData);
      
      if (!profileData) {
        setLoading(false);
        return;
      };

      const { data: allUserCourses, error: allCoursesError } = await supabase
        .from('courses')
        .select(`id, lessons (id)`)
        .eq('instructor_id', profileData.id);
      if (allCoursesError) throw allCoursesError;

      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select(`lesson_id, completed_at, lessons!inner(course_id, duration_minutes)`)
        .eq('user_id', user.id);
      if (progressError) throw progressError;

      let completedCoursesCount = 0;
      allUserCourses?.forEach(course => {
        const totalLessons = course.lessons.length;
        if (totalLessons === 0) return;

        const completedLessonsInCourse = progressData.filter(
          p => p.lessons?.course_id === course.id && p.completed_at
        ).length;

        if (totalLessons > 0 && completedLessonsInCourse === totalLessons) {
          completedCoursesCount++;
        }
      });

      const totalWatchTime = progressData.reduce((acc, p) => acc + (p.lessons?.duration_minutes || 0), 0);

      const { data: achievementsData } = await supabase
        .from('user_achievements')
        .select(`*, achievement:achievements(*)`)
        .eq('user_id', user.id);

      setStats({
        totalCourses: allUserCourses.length,
        completedCourses: completedCoursesCount,
        totalWatchTime,
        achievements: achievementsData || []
      });

    } catch (error) {
      console.error('Error loading profile and stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatWatchTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getStreakMessage = (streak: number) => {
    if (streak === 0) return "Start your learning streak today!";
    if (streak === 1) return "Great start! Keep it going.";
    if (streak < 7) return "Building momentum!";
    if (streak < 30) return "Impressive consistency!";
    return "You're a learning champion!";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        <Card>
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
                  {profile?.full_name || 'Learning Enthusiast'}
                </h1>
                <p className="text-muted-foreground mb-3 sm:mb-4">{user?.email}</p>
                <div className="flex items-center justify-center sm:justify-start gap-4 sm:gap-6">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span className="text-md sm:text-lg font-semibold">{profile?.points || 0} points</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <span className="text-md sm:text-lg font-semibold">{profile?.current_streak || 0} day streak</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <Card>
            <CardContent className="p-4 sm:p-6 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg inline-flex">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{stats.totalCourses}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Courses Started</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg inline-flex">
                  <Target className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{stats.completedCourses}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg inline-flex">
                  <Clock className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{formatWatchTime(stats.totalWatchTime)}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Watch Time</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg inline-flex">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{profile?.longest_streak || 0}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Best Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              Learning Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{profile?.current_streak || 0} days</p>
                  <p className="text-muted-foreground">{getStreakMessage(profile?.current_streak || 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Best streak</p>
                  <p className="text-lg font-semibold">{profile?.longest_streak || 0} days</p>
                </div>
              </div>
              {profile?.last_activity_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Last activity: {new Date(profile.last_activity_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.achievements.length === 0 ? (
              <div className="text-center py-8">
                <Award className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No achievements yet. Keep learning to unlock them!</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {stats.achievements.map((userAchievement) => (
                  <div key={userAchievement.id} className="flex items-center gap-3 p-4 border rounded-lg">
                    <div className="text-2xl">{userAchievement.achievement?.icon || '🏆'}</div>
                    <div>
                      <p className="font-medium">{userAchievement.achievement?.name}</p>
                      <p className="text-sm text-muted-foreground">{userAchievement.achievement?.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Earned {new Date(userAchievement.earned_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
