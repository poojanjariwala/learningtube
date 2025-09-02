import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  SkipBack, 
  SkipForward,
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
  onVideoComplete: (videoId: string) => void;
  onBack: () => void;
}

export const VideoPlayer = ({ video, playlist, onVideoComplete, onBack }: VideoPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const updateTime = () => setCurrentTime(videoElement.currentTime);
    const updateDuration = () => setDuration(videoElement.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      onVideoComplete(video.id);
    };

    videoElement.addEventListener('timeupdate', updateTime);
    videoElement.addEventListener('loadedmetadata', updateDuration);
    videoElement.addEventListener('ended', handleEnded);

    return () => {
      videoElement.removeEventListener('timeupdate', updateTime);
      videoElement.removeEventListener('loadedmetadata', updateDuration);
      videoElement.removeEventListener('ended', handleEnded);
    };
  }, [video.id, onVideoComplete]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const currentVideoIndex = playlist?.findIndex(v => v.id === video.id) ?? 0;
  const completedVideos = playlist?.filter(v => v.completed).length ?? 0;
  const totalVideos = playlist?.length ?? 1;
  const courseProgress = (completedVideos / totalVideos) * 100;

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
        <div ref={playerRef} className="relative bg-black">
          {/* YouTube Embed Player */}
          <div className="relative aspect-video bg-black">
            {video.youtube_video_id ? (
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${video.youtube_video_id}?autoplay=0&rel=0&modestbranding=1&controls=1`}
                title={video.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            ) : (
              <div className="relative w-full h-full">
                <img 
                  src={video.thumbnail} 
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="bg-primary/90 text-primary-foreground p-4 rounded-full shadow-lg cursor-pointer hover:bg-primary transition-colors" onClick={togglePlay}>
                    {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Video element (hidden - used for demo controls) */}
          <video
            ref={videoRef}
            className="hidden"
            src="#" // This would be the downloaded video file
          />

          {/* Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="space-y-3">
              {/* Progress Bar */}
              <div className="space-y-1">
                <Progress value={progress} className="h-1 bg-white/20" />
                <div className="flex justify-between text-xs text-white/80">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCurrentTime(Math.max(0, currentTime - 10))}
                    className="text-white hover:bg-white/20"
                  >
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={togglePlay}
                    className="text-white hover:bg-white/20"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCurrentTime(Math.min(duration, currentTime + 10))}
                    className="text-white hover:bg-white/20"
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={toggleMute}
                    className="text-white hover:bg-white/20"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-white/20"
                >
                  <Maximize className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Video Info */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">{video.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Duration: {video.duration}</span>
              {video.completed && (
                <div className="flex items-center gap-1 text-course-progress">
                  <Check className="w-4 h-4" />
                  Completed
                </div>
              )}
            </div>
          </div>
          
          {!video.completed && (
            <Button 
              onClick={() => onVideoComplete(video.id)}
              className="bg-course-progress hover:bg-course-progress/90 text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              Mark as Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};