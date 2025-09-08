import { useState, useEffect } from 'react';
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
import { CelebrationModal } from '@/components/CelebrationModal';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  completed: boolean;
  watch_percentage?: number;
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
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<any>(null);

  // Check authentication
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Load user data and courses
  useEffect(() => {
    if (user) {
      loadUserData();
      loadCourses();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadCourses = async () => {
    try {
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const { data: coursesData, error } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          thumbnail_url,
          duration_minutes,
          instructor_id,
          youtube_playlist_id,
          lessons (
            id,
            title,
            video_url,
            youtube_video_id,
            duration_minutes,
            order_index
          ),
          user_progress (
            lesson_id,
            watch_percentage
          )
        `)
        .eq('instructor_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedCourses = coursesData?.map(course => {
        const lessons = course.lessons || [];
        const completedLessons = course.user_progress.filter(p => p.watch_percentage && p.watch_percentage >= 90).length;
        
        const videos = lessons
          .sort((a, b) => a.order_index - b.order_index)
          .map(lesson => {
            const progressData = course.user_progress.find(p => p.lesson_id === lesson.id);
            return {
              id: lesson.id,
              title: lesson.title,
              thumbnail: `https://img.youtube.com/vi/${lesson.youtube_video_id}/maxresdefault.jpg`,
              duration: `${lesson.duration_minutes}m`,
              completed: (progressData?.watch_percentage ?? 0) >= 90,
              watch_percentage: progressData?.watch_percentage ?? 0,
              youtube_video_id: lesson.youtube_video_id,
              course_id: course.id,
            };
          });

        const progress = lessons.length > 0 ? Math.round((completedLessons / lessons.length) * 100) : 0;
        
        const courseType = course.youtube_playlist_id ? 'playlist' : 'video';
        
        const singleVideo = (courseType === 'video' && lessons.length > 0) ? videos[0] : null;

        return {
          id: course.id,
          title: course.title,
          thumbnail: course.thumbnail_url || (videos[0]?.thumbnail || ''),
          type: courseType,
          duration: `${course.duration_minutes}m`,
          videoCount: lessons.length,
          progress,
          videos: courseType === 'playlist' ? videos : (singleVideo ? [singleVideo] : [])
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
  };

  const handleUrlSubmit = async (url: string, type: 'video' | 'playlist') => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('youtube-integration', {
        body: { action: 'fetchCourse', url, type }
      });

      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Course added!",
        description: "Your YouTube course has been successfully imported.",
      });

      await loadCourses();
    } catch (error: any) {
      console.error('Error adding course:', error);
      toast({
        title: "Error adding course",
        description: error.message || "Please check the URL and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    if (course.type === 'playlist') {
      setCurrentView('playlist');
    } else {
      if (course.videos && course.videos.length > 0) {
        setSelectedVideo(course.videos[0]);
        setCurrentView('player');
      }
    }
  };

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
    setCurrentView('player');
  };

  const handleVideoComplete = async (videoId: string, watchPercentage: number, videoTitle: string) => {
    if (!user || !selectedCourse) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('youtube-integration', {
        body: {
          action: 'markComplete',
          lessonId: videoId,
          courseId: selectedCourse.id,
          watchPercentage: Math.round(watchPercentage)
        }
      });
      if (error) {
        console.error("Function invoke error:", error);
        throw error;
      }
      
      const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      if(updatedProfile) {
        setUserProfile(updatedProfile);
        setCelebrationData({
          pointsEarned: 100, // This can be dynamic in future
          totalPoints: updatedProfile.points,
          currentStreak: updatedProfile.current_streak,
          videoTitle,
          watchPercentage
        });
        setShowCelebration(true);
      }

      await loadCourses();

    } catch (error) {
      console.error('Error marking video as complete:', error);
      toast({
        title: "Error",
        description: "Failed to save progress. Please try again.",
        variant: "destructive",
      });
    }
  };


  const handleBack = () => {
    loadCourses(); // Refresh courses on back
    setCurrentView('dashboard');
    setSelectedCourse(null);
    setSelectedVideo(null);
  };

  const handleProfileView = () => {
    setCurrentView('profile');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (currentView === 'player' && selectedVideo) {
    return (
      <VideoPlayer
        key={selectedVideo.id}
        video={selectedVideo}
        playlist={selectedCourse?.videos}
        onVideoComplete={handleVideoComplete}
        onBack={handleBack}
        onNextVideo={() => {
          if (selectedCourse?.videos) {
            const currentIndex = selectedCourse.videos.findIndex(v => v.id === selectedVideo.id);
            const nextVideo = selectedCourse.videos[currentIndex + 1];
            if (nextVideo) {
              setSelectedVideo(nextVideo);
            }
          }
        }}
        userProfile={userProfile}
      />
    );
  }

  if (currentView === 'playlist' && selectedCourse) {
    return (
      <PlaylistView
        title={selectedCourse.title}
        thumbnail={selectedCourse.thumbnail}
        videos={selectedCourse.videos!}
        onVideoSelect={handleVideoSelect}
        onBack={handleBack}
      />
    );
  }

  if (currentView === 'profile') {
    return <ProfilePage onBack={handleBack} />;
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Header with user info */}
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
                          <AvatarImage src={userProfile.avatar_url || user.user_metadata.avatar_url} alt={userProfile.full_name || user.user_metadata.full_name} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                            {(userProfile.full_name || user.user_metadata.full_name || user.email)?.charAt(0).toUpperCase()}
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
                            <AvatarImage src={userProfile.avatar_url || user.user_metadata.avatar_url} alt={userProfile.full_name || user.user_metadata.full_name} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                              {(userProfile.full_name || user.user_metadata.full_name || user.email)?.charAt(0).toUpperCase()}
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

        {/* Course Input Section */}
        <section id="course-input" className="py-20 px-6">
          <div className="max-w-2xl mx-auto">
            <CourseUrlInput onUrlSubmit={handleUrlSubmit} isLoading={isSubmitting} />
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12 px-6">
          <div className="max-w-7xl mx-auto">
            <Tabs defaultValue="courses" className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
                <TabsTrigger value="courses" className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  My Courses
                </TabsTrigger>
                <TabsTrigger value="leaderboard" className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Leaderboard
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="courses" className="space-y-8">
                {courses.length > 0 ? (
                  <div>
                    <div className="text-center mb-8">
                      <h2 className="text-3xl font-bold text-foreground mb-4">Your Courses</h2>
                      <p className="text-muted-foreground">Continue your learning journey</p>
                    </div>
                    
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {courses.map((course) => (
                        <CourseCard
                          key={course.id}
                          id={course.id}
                          title={course.title}
                          thumbnail={course.thumbnail}
                          type={course.type}
                          duration={course.duration}
                          videoCount={course.videoCount}
                          progress={course.progress}
                          onClick={() => handleCourseClick(course)}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto text-center">
                    <div className="bg-muted/30 rounded-2xl p-12">
                      <BookOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-6" />
                      <h3 className="text-xl font-semibold text-foreground mb-4">No courses yet</h3>
                      <p className="text-muted-foreground mb-6">
                        Add your first YouTube video or playlist to get started with your learning journey.
                      </p>
                      <Button 
                        onClick={() => document.getElementById('course-input')?.scrollIntoView({ behavior: 'smooth' })}
                        className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                      >
                        Add Your First Course
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="leaderboard">
                <div className="max-w-2xl mx-auto">
                  <Leaderboard />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border bg-muted/30 py-8 px-6">
          <div className="max-w-7xl mx-auto text-center text-muted-foreground">
            <p>Transform your YouTube learning experience into structured, ad-free courses.</p>
          </div>
        </footer>
      </div>
      {showCelebration && celebrationData && (
        <CelebrationModal
          isOpen={showCelebration}
          onClose={() => setShowCelebration(false)}
          {...celebrationData}
        />
      )}
    </>
  );
};

export default Index;
