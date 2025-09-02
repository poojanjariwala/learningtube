import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CelebrationModal } from '@/components/CelebrationModal';
import { 
  ChevronLeft,
  Check
} from 'lucide-react';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  completed: boolean;
  youtube_video_id?: string;
}

interface VideoPlayerProps {
  video: Video;
  playlist?: Video[];
  onVideoComplete: (videoId: string, watchPercentage: number) => void;
  onBack: () => void;
  userProfile?: any;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const VideoPlayer = ({ video, playlist, onVideoComplete, onBack, userProfile }: VideoPlayerProps) => {
  const [player, setPlayer] = useState<any>(null);
  const [watchTime, setWatchTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [watchPercentage, setWatchPercentage] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<any>(null);
  const [progressMilestones, setProgressMilestones] = useState(new Set<number>());
  const playerRef = useRef<HTMLDivElement>(null);

  const currentVideoIndex = playlist?.findIndex(v => v.id === video.id) ?? 0;
  const completedVideos = playlist?.filter(v => v.completed).length ?? 0;
  const totalVideos = playlist?.length ?? 1;
  const courseProgress = (completedVideos / totalVideos) * 100;

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
    
    // Show celebration modal
    setCelebrationData({
      pointsEarned: isCompletion ? 100 : Math.floor(percentage * 0.5),
      totalPoints: (userProfile?.points || 0) + (isCompletion ? 100 : Math.floor(percentage * 0.5)),
      currentStreak: userProfile?.current_streak || 0,
      videoTitle: video.title,
      watchPercentage: percentage
    });
    setShowCelebration(true);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Courses
        </Button>
        
        {playlist && (
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
            <h1 className="text-2xl font-bold text-foreground mb-2">{video.title}</h1>
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
      </div>

      {/* Celebration Modal */}
      {celebrationData && (
        <CelebrationModal
          isOpen={showCelebration}
          onClose={() => setShowCelebration(false)}
          pointsEarned={celebrationData.pointsEarned}
          totalPoints={celebrationData.totalPoints}
          currentStreak={celebrationData.currentStreak}
          videoTitle={celebrationData.videoTitle}
          watchPercentage={celebrationData.watchPercentage}
        />
      )}
    </div>
  );
};