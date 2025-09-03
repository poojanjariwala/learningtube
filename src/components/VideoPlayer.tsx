import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CelebrationModal } from '@/components/CelebrationModal';
import { VideoNotes } from '@/components/VideoNotes';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  completed: boolean;
  youtube_video_id?: string;
  course_id?: string;
}

interface VideoPlayerProps {
  video: Video;
  playlist?: Video[];
  onVideoComplete: (videoId: string, watchPercentage: number) => void;
  onBack: () => void;
  onNextVideo?: () => void;
  userProfile?: any;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const VideoPlayer = ({ 
  video, 
  playlist, 
  onVideoComplete, 
  onBack, 
  onNextVideo,
  userProfile 
}: VideoPlayerProps) => {
  const [player, setPlayer] = useState<any>(null);
  const [watchTime, setWatchTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [watchPercentage, setWatchPercentage] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<any>(null);
  const [progressMilestones, setProgressMilestones] = useState(new Set<number>());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const playerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const currentVideoIndex = playlist?.findIndex(v => v.id === video.id) ?? 0;
  const completedVideos = playlist?.filter(v => v.completed).length ?? 0;
  const totalVideos = playlist?.length ?? 1;
  const courseProgress = (completedVideos / totalVideos) * 100;
  const hasNextVideo = currentVideoIndex >= 0 && currentVideoIndex < (playlist?.length || 0) - 1;

  // Track fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!video.youtube_video_id) return;

    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = initializePlayer;
    } else {
      initializePlayer();
    }

    return () => {
      if (player) {
        player.destroy();
      }
    };
  }, [video.youtube_video_id]);

  const initializePlayer = () => {
    if (!playerRef.current || !video.youtube_video_id) return;

    const newPlayer = new window.YT.Player(playerRef.current, {
      height: '100%',
      width: '100%',
      videoId: video.youtube_video_id,
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        fs: 1,
        cc_load_policy: 0,
        iv_load_policy: 3,
        autohide: 0
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange
      }
    });

    setPlayer(newPlayer);
  };

  const onPlayerReady = (event: any) => {
    const videoDuration = event.target.getDuration();
    setDuration(videoDuration);
  };

  const onPlayerStateChange = (event: any) => {
    if (event.data === window.YT.PlayerState.PLAYING) {
      startTracking();
    } else if (event.data === window.YT.PlayerState.PAUSED || 
               event.data === window.YT.PlayerState.ENDED) {
      stopTracking();
    }

    if (event.data === window.YT.PlayerState.ENDED) {
      handleVideoEnd();
    }
  };

  const startTracking = () => {
    const interval = setInterval(() => {
      if (player && player.getCurrentTime) {
        const currentTime = player.getCurrentTime();
        const videoDuration = player.getDuration();
        
        setWatchTime(currentTime);
        setCurrentVideoTime(currentTime);
        
        if (videoDuration > 0) {
          const percentage = Math.min((currentTime / videoDuration) * 100, 100);
          setWatchPercentage(percentage);
          
          // Check for progress milestones (30%, 50%, 90%)
          const milestones = [30, 50, 90];
          milestones.forEach(milestone => {
            if (percentage >= milestone && !progressMilestones.has(milestone)) {
              setProgressMilestones(prev => new Set([...prev, milestone]));
              
              if (milestone === 90 && !video.completed) {
                // Complete the video
                handleProgressUpdate(percentage, true);
                clearInterval(interval);
              } else if (milestone < 90) {
                // Show progress celebration
                handleProgressUpdate(percentage, false);
              }
            }
          });
        }
      }
    }, 1000);

    // Store interval reference for cleanup
    (window as any).trackingInterval = interval;
  };

  const stopTracking = () => {
    if ((window as any).trackingInterval) {
      clearInterval((window as any).trackingInterval);
      (window as any).trackingInterval = null;
    }
  };

  const handleVideoEnd = () => {
    if (!video.completed) {
      handleProgressUpdate(100, true);
    }
  };

  const handleProgressUpdate = async (percentage: number, isCompletion: boolean) => {
    if (isCompletion) {
      await onVideoComplete(video.id, percentage);
    }
    
    // Show celebration modal with proper fullscreen handling
    const celebrationInfo = {
      title: isCompletion ? 'Video Completed! 🎉' : `${Math.round(percentage)}% Progress!`,
      message: isCompletion 
        ? `Great job completing "${video.title}"!` 
        : `Keep going! You're doing great.`,
      pointsEarned: isCompletion ? 100 : Math.floor(percentage * 0.5),
      totalPoints: (userProfile?.points || 0) + (isCompletion ? 100 : Math.floor(percentage * 0.5)),
      streakCount: userProfile?.current_streak || 0,
      videoTitle: video.title,
      watchPercentage: percentage
    };

    showCelebrationModal(celebrationInfo);
  };

  const showCelebrationModal = (data: any) => {
    setCelebrationData(data);
    
    // Handle fullscreen mode - create overlay instead of modal
    if (isFullscreen) {
      // Create fullscreen celebration overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        color: white;
        text-align: center;
        font-family: system-ui, -apple-system, sans-serif;
      `;
      
      overlay.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          padding: 2rem;
          border-radius: 1rem;
          max-width: 400px;
          margin: 1rem;
        ">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
          <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">${data.title}</h2>
          <p style="margin-bottom: 1rem;">${data.message}</p>
          ${data.streakCount ? `<p>Streak: ${data.streakCount} days 🔥</p>` : ''}
          ${data.pointsEarned ? `<p>Points earned: +${data.pointsEarned}</p>` : ''}
          ${data.totalPoints ? `<p>Total points: ${data.totalPoints}</p>` : ''}
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      // Auto remove after 3 seconds
      setTimeout(() => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
      }, 3000);
      
      // Remove on click
      overlay.addEventListener('click', () => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
      });
    } else {
      setShowCelebration(true);
    }
    
    // Play celebration sound
    const audio = new Audio('/celebration-sound.mp3');
    audio.play().catch(console.error);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // Reset progress milestones when video changes
    setProgressMilestones(new Set());
    setWatchPercentage(0);
    
    return () => {
      stopTracking();
    };
  }, [video.id]);

  return (
    <div className={`${isMobile ? 'p-4' : 'max-w-6xl mx-auto p-6'} space-y-6`}>
      {/* Header */}
      <div className={`flex items-center justify-between ${isMobile ? 'flex-wrap gap-2' : ''}`}>
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        
        {hasNextVideo && (
          <Button 
            onClick={onNextVideo}
            size="sm"
            className="flex items-center gap-2"
          >
            Next Video
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
        
        {playlist && !isMobile && (
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm">
              Video {currentVideoIndex + 1} of {totalVideos}
            </Badge>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Course Progress: {Math.round(courseProgress)}%</span>
              <Progress value={courseProgress} className="w-24 h-2" />
            </div>
          </div>
        )}
      </div>

      {/* Video Player and Content */}
      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'} gap-6`}>
        <div className={`${isMobile ? 'col-span-1' : 'lg:col-span-2'} space-y-4`}>
          {/* Video Player */}
          <Card className="overflow-hidden bg-black">
            <div className="relative bg-black aspect-video">
              {video.youtube_video_id ? (
                <div ref={playerRef} className="w-full h-full"></div>
              ) : (
                <div className="relative w-full h-full">
                  <img 
                    src={video.thumbnail} 
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="bg-primary/90 text-primary-foreground p-4 rounded-full shadow-lg">
                      <p className="text-white">Video not available</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Video Info */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-foreground mb-2`}>{video.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Duration: {video.duration}</span>
                  {duration > 0 && (
                    <span>Watch Progress: {Math.round(watchPercentage)}%</span>
                  )}
                  {video.completed && (
                    <div className="flex items-center gap-1 text-course-progress">
                      <Check className="w-4 h-4" />
                      Completed
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {duration > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Progress</span>
                  <span>{Math.round(watchPercentage)}%</span>
                </div>
                <Progress value={watchPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Video will auto-complete at 90% watched
                </p>
              </div>
            )}

            {/* Mobile Next Video Button */}
            {isMobile && hasNextVideo && (
              <div className="flex justify-center pt-4">
                <Button 
                  onClick={onNextVideo}
                  className="flex items-center gap-2"
                >
                  Next Video
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className={`space-y-4 ${isMobile ? 'order-first' : ''}`}>
          {/* Video Notes */}
          <VideoNotes 
            lessonId={video.id} 
            courseId={video.course_id || ''} 
            currentTime={currentVideoTime}
          />

          {/* Playlist */}
          {playlist && playlist.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Playlist</h3>
              <ScrollArea className={`${isMobile ? 'h-64' : 'h-96'}`}>
                <div className="space-y-2">
                  {playlist.map((playlistVideo, index) => (
                    <div
                      key={playlistVideo.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        playlistVideo.id === video.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        if (onNextVideo && playlistVideo.id !== video.id) {
                          const targetIndex = playlist.findIndex(v => v.id === playlistVideo.id);
                          if (targetIndex > currentVideoIndex) {
                            onNextVideo();
                          }
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                          {playlistVideo.thumbnail && (
                            <img 
                              src={playlistVideo.thumbnail} 
                              alt={playlistVideo.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2">
                            {playlistVideo.title}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {playlistVideo.duration} • {playlistVideo.completed ? 'Completed' : 'Not watched'}
                          </p>
                        </div>
                        {playlistVideo.completed && (
                          <Check className="w-4 h-4 text-course-progress flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Mobile Course Progress */}
          {isMobile && playlist && (
            <div className="p-4 border rounded-lg bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Course Progress</span>
                <Badge variant="outline">{currentVideoIndex + 1} of {totalVideos}</Badge>
              </div>
              <Progress value={courseProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round(courseProgress)}% complete
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Celebration Modal */}
      {celebrationData && (
        <CelebrationModal
          isOpen={showCelebration}
          onClose={() => setShowCelebration(false)}
          pointsEarned={celebrationData.pointsEarned}
          totalPoints={celebrationData.totalPoints}
          currentStreak={celebrationData.streakCount}
          videoTitle={celebrationData.videoTitle}
          watchPercentage={celebrationData.watchPercentage}
        />
      )}
    </div>
  );
};