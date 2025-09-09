import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Check, 
  Clock, 
  ChevronLeft, 
  BookOpen,
  Video 
} from 'lucide-react';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  completed: boolean;
}

interface PlaylistViewProps {
  title: string;
  thumbnail: string;
  videos: Video[];
  onVideoSelect: (video: Video) => void;
  onBack: () => void;
}

export const PlaylistView = ({ title, thumbnail, videos, onVideoSelect, onBack }: PlaylistViewProps) => {
  const [hoveredVideo, setHoveredVideo] = useState<string | null>(null);
  
  const completedCount = videos.filter(v => v.completed).length;
  const progress = (completedCount / videos.length) * 100;
  const totalDuration = videos.reduce((acc, video) => {
    const [minutes, seconds] = video.duration.split(':').map(Number);
    return acc + minutes * 60 + seconds;
  }, 0);
  
  const formatTotalDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

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
      </div>

      {/* Course Overview */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <div className="flex gap-6">
          <div className="flex-shrink-0">
            <img 
              src={thumbnail} 
              alt={title}
              className="w-48 h-32 object-cover rounded-lg shadow-md"
            />
          </div>
          
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Video className="w-4 h-4" />
                  <span>{videos.length} videos</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatTotalDuration(totalDuration)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  <span>Course</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">Course Progress</span>
                <span className="text-sm text-muted-foreground">
                  {completedCount} of {videos.length} completed
                </span>
              </div>
              <Progress value={progress} className="h-3 bg-course-progress-bg" />
              <div className="text-right">
                <span className="text-lg font-bold text-course-progress">{Math.round(progress)}%</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Video List */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Course Content</h2>
        
        <div className="space-y-3">
          {videos.map((video, index) => (
            <div
              key={video.id}
              className={`group relative p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                video.completed 
                  ? 'bg-course-progress/5 border-course-progress/20' 
                  : 'bg-card border-border hover:bg-course-card-hover hover:border-primary/30'
              }`}
              onClick={() => onVideoSelect(video)}
              onMouseEnter={() => setHoveredVideo(video.id)}
              onMouseLeave={() => setHoveredVideo(null)}
            >
              <div className="flex items-center gap-4">
                {/* Video Number/Status */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  video.completed 
                    ? 'bg-course-progress text-white' 
                    : 'bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground'
                }`}>
                  {video.completed ? <Check className="w-4 h-4" /> : index + 1}
                </div>

                {/* Thumbnail */}
                <div className="relative flex-shrink-0">
                  <img 
                    src={video.thumbnail} 
                    alt={video.title}
                    className="w-20 h-12 object-cover rounded"
                  />
                  {hoveredVideo === video.id && !video.completed && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
                      <Play className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Video Info */}
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium mb-1 line-clamp-2 ${
                    video.completed ? 'text-foreground' : 'text-foreground group-hover:text-primary'
                  }`}>
                    {video.title}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{video.duration}</span>
                    {video.completed && (
                      <Badge variant="outline" className="text-xs border-course-progress text-course-progress">
                        Completed
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Play Button */}
                <div className="flex-shrink-0">
                  <Button
                    size="sm"
                    variant={video.completed ? "outline" : "default"}
                    className={`transition-opacity ${
                      hoveredVideo === video.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};