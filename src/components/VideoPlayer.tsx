import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  watch_percentage?: number;
  youtube_video_id?: string;
  course_id?: string;
}

interface VideoPlayerProps {
  video: Video;
  playlist?: Video[];
  onVideoComplete: (videoId: string, watchPercentage: number, videoTitle: string) => Promise<void>;
  onBack: () => void;
  onNextVideo?: () => void;
  userProfile?: any;
  setShowCelebration: (show: boolean) => void;
  setCelebrationData: (data: any) => void;
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
  userProfile,
  setShowCelebration,
  setCelebrationData
}: VideoPlayerProps) => {
  const [player, setPlayer] = useState<any>(null);
  const [watchTime, setWatchTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [watchPercentage, setWatchPercentage] = useState(video.watch_percentage || 0);
  const [progressMilestones, setProgressMilestones] = useState(new Set<number>());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const playerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [localPlaylist, setLocalPlaylist] = useState(playlist);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [completionData, setCompletionData] = useState<any>(null);

  useEffect(() => {
    setLocalPlaylist(playlist);
  }, [playlist]);

  const currentVideoIndex = localPlaylist?.findIndex(v => v.id === video.id) ?? 0;
  const completedVideos = localPlaylist?.filter(v => v.completed).length ?? 0;
  const totalVideos = localPlaylist?.length ?? 1;
  const courseProgress = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;
  const hasNextVideo = currentVideoIndex >= 0 && currentVideoIndex < (localPlaylist?.length || 0) - 1;

  // Track fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);

      if (!isCurrentlyFullscreen && videoCompleted && completionData) {
        setShowCelebration(true);
        setCelebrationData(completionData);
        setVideoCompleted(false);
        setCompletionData(null);
      }
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
  }, [videoCompleted, completionData, setShowCelebration, setCelebrationData]);

  useEffect(() => {
    if (!video.youtube_video_id) return;

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
      playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1, fs: 1, cc_load_policy: 0, iv_load_policy: 3, autohide: 0 },
      events: { onReady: onPlayerReady, onStateChange: onPlayerStateChange }
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
    } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
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

          const milestones = [30, 50, 90];
          milestones.forEach(milestone => {
            if (percentage >= milestone && !progressMilestones.has(milestone)) {
              setProgressMilestones(prev => new Set([...prev, milestone]));
              if (milestone === 90 && !video.completed) {
                handleProgressUpdate(percentage, true);
                clearInterval(interval);
              } else if (milestone < 90) {
                handleProgressUpdate(percentage, false);
              }
            }
          });
        }
      }
    }, 1000);
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
    if (isCompletion && !video.completed) {
      if (localPlaylist) {
        const updatedPlaylist = localPlaylist.map(v =>
            v.id === video.id ? { ...v, completed: true, watch_percentage: 100 } : v
        );
        setLocalPlaylist(updatedPlaylist);
      }
      await onVideoComplete(video.id, percentage, video.title);
      setVideoCompleted(true);
    }
  };

  useEffect(() => {
    setProgressMilestones(new Set());
    setWatchPercentage(video.watch_percentage || 0);
    return () => {
      stopTracking();
    };
  }, [video.id, video.watch_percentage]);

  return (
    <div className={`${isMobile ? 'p-4' : 'max-w-6xl mx-auto p-6'} space-y-6`}>
      <div className={`flex items-center justify-between ${isMobile ? 'flex-wrap gap-2' : ''}`}>
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        {localPlaylist && !isMobile && (
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

      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'} gap-6`}>
        <div className={`${isMobile ? 'col-span-1' : 'lg:col-span-2'} space-y-4`}>
          <Card className="overflow-hidden bg-black">
            <div className="relative bg-black aspect-video">
              {video.youtube_video_id ? (
                <div ref={playerRef} className="w-full h-full"></div>
              ) : (
                <div className="relative w-full h-full">
                  <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="bg-primary/90 text-primary-foreground p-4 rounded-full shadow-lg">
                      <p className="text-white">Video not available</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
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
              {hasNextVideo && (
                <Button onClick={onNextVideo} className="flex-shrink-0">
                  Next Video
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>

            {duration > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Progress</span>
                  <span>{Math.round(watchPercentage)}%</span>
                </div>
                <Progress value={watchPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground">Video will auto-complete at 90% watched</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <VideoNotes lessonId={video.id} courseId={video.course_id || ''} currentTime={currentVideoTime} />

          {localPlaylist && localPlaylist.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Playlist</h3>
              <ScrollArea className={`${isMobile ? 'h-64' : 'h-96'}`}>
                <div className="space-y-2">
                  {localPlaylist.map((playlistVideo) => (
                    <div
                      key={playlistVideo.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        playlistVideo.id === video.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        if (onNextVideo && playlistVideo.id !== video.id) {
                            const targetIndex = localPlaylist.findIndex(v => v.id === playlistVideo.id);
                            if (targetIndex > currentVideoIndex) {
                                // This logic is simplified; a better implementation would involve passing a specific video selection handler
                                onNextVideo();
                            }
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                          {playlistVideo.thumbnail && (
                            <img src={playlistVideo.thumbnail} alt={playlistVideo.title} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2">{playlistVideo.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            {playlistVideo.duration}
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

          {isMobile && localPlaylist && (
            <div className="p-4 border rounded-lg bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Course Progress</span>
                <Badge variant="outline">{currentVideoIndex + 1} of {totalVideos}</Badge>
              </div>
              <Progress value={courseProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{Math.round(courseProgress)}% complete</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
