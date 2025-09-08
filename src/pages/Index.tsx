import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CourseUrlInput } from '@/components/CourseUrlInput';
import { CourseCard } from '@/components/CourseCard';
import { VideoPlayer } from '@/components/VideoPlayer';
import { PlaylistView } from '@/components/PlaylistView';
import { Leaderboard } from '@/components/Leaderboard';
import { ProfilePage } from '@/components/ProfilePage';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, BookOpen, Video, Users, LogOut, User, Trophy, Flame } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import heroImage from '@/assets/hero-image.jpg';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from '@/hooks/use-mobile';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  completed: boolean;
  youtube_video_id?: string;
  course_id?: string;
}

interface Course {
  id: string;
  title: string;
  thumbnail: string;
  type: 'video' | 'playlist';
  duration?: string;
  videoCount?: number;
  progress: number;
  videos?: Video[];
}

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentView, setCurrentView] = useState<'dashboard' | 'player' | 'playlist' | 'profile'>('dashboard');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobile();

  const loadUserData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }, [user]);

  const loadCourses = useCallback(async () => {
    if(!user) return;
    try {
      const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
      if (!profile) return;

      const { data: coursesData, error } = await supabase
        .from('courses')
        .select(`*, lessons(*, user_progress(*))`)
        .eq('instructor_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedCourses = coursesData?.map(course => {
        const lessons = course.lessons || [];
        const completedLessons = lessons.filter(lesson => 
          lesson.user_progress && lesson.user_progress.some(up => up.completed_at)
        ).length;
        
        const videos = lessons
          .sort((a, b) => a.order_index - b.order_index)
          .map(lesson => ({
            id: lesson.id,
            title: lesson.title,
            thumbnail: `https://img.youtube.com/vi/${lesson.youtube_video_id}/maxresdefault.jpg`,
            duration: `${lesson.duration_minutes}m`,
            completed: lesson.user_progress && lesson.user_progress.some(up => up.completed_at),
            youtube_video_id: lesson.youtube_video_id,
            course_id: course.id,
          }));

        const progress = lessons.length > 0 ? Math.round((completedLessons / lessons.length) * 100) : 0;

        return {
          id: course.id,
          title: course.title,
          thumbnail: course.thumbnail_url || (videos[0]?.thumbnail || ''),
          type: course.youtube_playlist_id ? 'playlist' : 'video' as 'video' | 'playlist',
          duration: `${course.duration_minutes}m`,
          videoCount: lessons.length,
          progress,
          videos
        };
      }) || [];

      setCourses(formattedCourses);
    } catch (error) {
      console.error('Error loading courses:', error);
      toast({
        title: "Error",
        description: "Failed to load courses. Please try again.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (user) {
      loadUserData();
      loadCourses();
    }
  }, [user, loading, navigate, loadUserData, loadCourses]);

  const handleUrlSubmit = async (url: string, type: 'video' | 'playlist') => {
    if (!user) return navigate('/auth');
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('youtube-integration', {
        body: { action: 'fetchCourse', url, type }
      });

      if (error) throw new Error(error.message);

      toast({
        title: "Course added!",
        description: "Your YouTube course has been successfully imported.",
      });
      await loadCourses();
    } catch (error: any) {
      console.error('Error adding course:', error);
      toast({
        title: "Error adding course",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    if (course.type === 'playlist' || (course.videos && course.videos.length > 1)) {
      setCurrentView('playlist');
    } else {
      setSelectedVideo(course.videos![0]);
      setCurrentView('player');
    }
  };

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
    setCurrentView('player');
  };

  const handleVideoComplete = async (videoId: string, watchPercentage: number) => {
    if (!user || !selectedCourse) return;
    try {
      await supabase.functions.invoke('youtube-integration', {
        body: { action: 'markComplete', lessonId: videoId, watchPercentage: Math.round(watchPercentage) }
      });
      await loadCourses();
      await loadUserData();
      toast({
        title: "Progress saved!",
        description: `Video completed. Points earned!`,
      });
    } catch (error) {
      console.error('Error marking video as complete:', error);
      toast({
        title: "Error",
        description: "Failed to save progress.",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    setCurrentView('dashboard');
    setSelectedCourse(null);
    setSelectedVideo(null);
    loadCourses(); // Refresh courses on back
    loadUserData(); // Refresh user data on back
  };

  const handleProfileView = () => setCurrentView('profile');
  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // ... (loading and user checks remain the same)
  
  if (currentView === 'player' && selectedVideo) {
    return (
      <div className="min-h-screen bg-background">
        <VideoPlayer
          video={selectedVideo}
          playlist={selectedCourse?.videos}
          onVideoComplete={handleVideoComplete}
          onBack={handleBack}
          onNextVideo={(nextVideoId) => {
            const nextVideo = selectedCourse?.videos?.find(v => v.id === nextVideoId);
            if (nextVideo) setSelectedVideo(nextVideo);
          }}
          userProfile={userProfile}
        />
      </div>
    );
  }

  // ... (other view returns remain the same)
  
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground hidden sm:block">LearnTube</h1>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              {userProfile && (
                isMobile ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Avatar className="h-9 w-9 cursor-pointer">
                        <AvatarImage src={userProfile.avatar_url} alt={userProfile.full_name || 'User'} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {userProfile.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleProfileView} className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Trophy className="mr-2 h-4 w-4 text-yellow-500" />
                        <span>{userProfile.points || 0} Points</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Flame className="mr-2 h-4 w-4 text-orange-500" />
                        <span>{userProfile.current_streak || 0} Day Streak</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Card className="bg-card/80 cursor-pointer hover:bg-card/90 transition-colors" onClick={handleProfileView}>
                    <CardContent className="p-2 sm:p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                           <AvatarImage src={userProfile.avatar_url} alt={userProfile.full_name || 'User'} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                            {userProfile.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="hidden sm:flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium">{userProfile.points || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Flame className="h-4 w-4 text-orange-500" />
                            <span className="font-medium">{userProfile.current_streak || 0}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              )}
              
              <ThemeToggle />
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-background"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-medium">
                  <GraduationCap className="w-5 h-5" />
                  <span>YouTube Course Platform</span>
                </div>
                <h1 className="text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                  Transform YouTube into
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> Structured Courses</span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Convert any YouTube video or playlist into a beautiful, ad-free learning experience 
                  with progress tracking and course-style organization.
                </p>
              </div>

              <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-primary" />
                  <span>Ad-free viewing</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span>Progress tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span>Course organization</span>
                </div>
              </div>

              <Button 
                size="lg" 
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                onClick={() => document.getElementById('course-input')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Start Learning Now
              </Button>
            </div>

            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src={heroImage} 
                  alt="Course Platform Interface"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-card rounded-xl p-4 shadow-lg border border-border/20">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 bg-course-progress rounded-full flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Course Progress</div>
                    <div className="text-muted-foreground">Track Your Learning</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
        
        {/* ... (Rest of the component remains the same) ... */}
    </div>
  );
};

export default Index;
