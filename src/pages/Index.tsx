import { useState } from 'react';
import { CourseUrlInput } from '@/components/CourseUrlInput';
import { CourseCard } from '@/components/CourseCard';
import { VideoPlayer } from '@/components/VideoPlayer';
import { PlaylistView } from '@/components/PlaylistView';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookOpen, Video, Users } from 'lucide-react';
import heroImage from '@/assets/hero-image.jpg';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  completed: boolean;
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
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentView, setCurrentView] = useState<'dashboard' | 'player' | 'playlist'>('dashboard');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  // Mock data generator for demo
  const generateMockCourse = (url: string, type: 'video' | 'playlist'): Course => {
    const mockVideos: Video[] = type === 'playlist' ? [
      {
        id: '1',
        title: 'Introduction to React Hooks',
        thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=225&fit=crop&crop=faces',
        duration: '12:34',
        completed: true
      },
      {
        id: '2', 
        title: 'useState and useEffect Deep Dive',
        thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&h=225&fit=crop&crop=faces',
        duration: '18:22',
        completed: true
      },
      {
        id: '3',
        title: 'Custom Hooks and Performance',
        thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=225&fit=crop&crop=faces',
        duration: '15:45',
        completed: false
      },
      {
        id: '4',
        title: 'Advanced React Patterns',
        thumbnail: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=225&fit=crop&crop=faces',
        duration: '22:18',
        completed: false
      }
    ] : [
      {
        id: '1',
        title: url.includes('react') ? 'React Complete Tutorial' : 'Single Video Course',
        thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=225&fit=crop&crop=faces',
        duration: '45:32',
        completed: false
      }
    ];

    const completedCount = mockVideos.filter(v => v.completed).length;
    const progress = (completedCount / mockVideos.length) * 100;

    return {
      id: Date.now().toString(),
      title: type === 'playlist' 
        ? 'Complete React Hooks Masterclass'
        : 'React Tutorial - Complete Guide',
      thumbnail: mockVideos[0].thumbnail,
      type,
      duration: type === 'video' ? mockVideos[0].duration : '1h 8m',
      videoCount: type === 'playlist' ? mockVideos.length : undefined,
      progress: Math.round(progress),
      videos: mockVideos
    };
  };

  const handleUrlSubmit = (url: string, type: 'video' | 'playlist') => {
    const newCourse = generateMockCourse(url, type);
    setCourses(prev => [newCourse, ...prev]);
  };

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    if (course.type === 'playlist') {
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

  const handleVideoComplete = (videoId: string) => {
    if (!selectedCourse) return;
    
    const updatedVideos = selectedCourse.videos!.map(v => 
      v.id === videoId ? { ...v, completed: true } : v
    );
    
    const completedCount = updatedVideos.filter(v => v.completed).length;
    const progress = (completedCount / updatedVideos.length) * 100;
    
    const updatedCourse = {
      ...selectedCourse,
      videos: updatedVideos,
      progress: Math.round(progress)
    };
    
    setSelectedCourse(updatedCourse);
    setCourses(prev => prev.map(c => c.id === selectedCourse.id ? updatedCourse : c));
  };

  const handleBack = () => {
    setCurrentView('dashboard');
    setSelectedCourse(null);
    setSelectedVideo(null);
  };

  if (currentView === 'player' && selectedVideo) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <VideoPlayer
            video={selectedVideo}
            playlist={selectedCourse?.videos}
            onVideoComplete={handleVideoComplete}
            onBack={handleBack}
          />
        </div>
      </div>
    );
  }

  if (currentView === 'playlist' && selectedCourse) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <PlaylistView
            title={selectedCourse.title}
            thumbnail={selectedCourse.thumbnail}
            videos={selectedCourse.videos!}
            onVideoSelect={handleVideoSelect}
            onBack={handleBack}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
              <div className="absolute -top-4 -right-4 bg-white rounded-xl p-4 shadow-lg border border-border/20">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 bg-course-progress rounded-full flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Course Progress</div>
                    <div className="text-muted-foreground">67% Complete</div>
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
          <CourseUrlInput onUrlSubmit={handleUrlSubmit} />
        </div>
      </section>

      {/* Courses Grid */}
      {courses.length > 0 && (
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
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
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8 px-6">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground">
          <p>Transform your YouTube learning experience into structured, ad-free courses.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;