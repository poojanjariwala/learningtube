import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Clock, Video, ListVideo } from 'lucide-react';

interface CourseCardProps {
  id: string;
  title: string;
  thumbnail: string;
  type: 'video' | 'playlist';
  duration?: string;
  videoCount?: number;
  progress: number;
  onClick: () => void;
}

export const CourseCard = ({ 
  title, 
  thumbnail, 
  type, 
  duration, 
  videoCount, 
  progress, 
  onClick 
}: CourseCardProps) => {
  return (
    <Card 
      className="group cursor-pointer bg-course-card hover:bg-course-card-hover border border-border/40 hover:border-primary/30 transition-all duration-300 overflow-hidden shadow-[var(--shadow-course)] hover:shadow-[var(--shadow-hover)] hover:-translate-y-1"
      onClick={onClick}
    >
      <div className="relative overflow-hidden">
        <img 
          src={thumbnail} 
          alt={title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
        <div className="absolute top-3 left-3">
          <Badge 
            variant={type === 'playlist' ? 'default' : 'secondary'}
            className={`text-xs font-medium shadow-sm ${
              type === 'playlist' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {type === 'playlist' ? (
              <>
                <ListVideo className="w-3 h-3 mr-1" />
                Playlist
              </>
            ) : (
              <>
                <Video className="w-3 h-3 mr-1" />
                Video
              </>
            )}
          </Badge>
        </div>
        <div className="absolute bottom-3 right-3">
          <div className="bg-black/70 text-white px-2 py-1 rounded text-xs font-medium backdrop-blur-sm">
            {duration || '00:00'}
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-primary/90 text-primary-foreground p-3 rounded-full shadow-lg">
            <Play className="w-6 h-6 ml-0.5" />
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          {type === 'playlist' && videoCount && (
            <div className="flex items-center gap-1">
              <Video className="w-4 h-4" />
              <span>{videoCount} videos</span>
            </div>
          )}
          {duration && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{duration}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">{progress}%</span>
          </div>
          <Progress 
            value={progress} 
            className="h-2 bg-course-progress-bg [&>[data-state=complete]]:bg-course-progress"
          />
        </div>
      </div>
    </Card>
  );
};