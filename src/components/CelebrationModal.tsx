import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Flame, Star, CheckCircle } from 'lucide-react';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  pointsEarned: number;
  totalPoints: number;
  currentStreak: number;
  videoTitle: string;
  watchPercentage: number;
}

export const CelebrationModal = ({
  isOpen,
  onClose,
  pointsEarned,
  totalPoints,
  currentStreak,
  videoTitle,
  watchPercentage
}: CelebrationModalProps) => {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Play celebration sound
      const audio = new Audio('/lovable-uploads/celebration-sound.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // If audio fails to play, continue without sound
        console.log('Could not play celebration sound');
      });
      
      setShowAnimation(true);
      
      // Reset animation after a bit
      const timer = setTimeout(() => setShowAnimation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md text-center bg-gradient-to-br from-primary/10 via-accent/5 to-background border-primary/20">
        <div className="space-y-6 py-4">
          {/* Fire Icon with Animation */}
          <div className="relative">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 via-red-500 to-yellow-400 ${showAnimation ? 'animate-bounce' : ''}`}>
              <div className="text-4xl font-bold text-white">
                {Math.round(watchPercentage)}
              </div>
            </div>
            <div className="absolute -top-2 -left-2">
              <div className={`w-8 h-8 ${showAnimation ? 'animate-pulse' : ''}`}>
                <Star className="w-full h-full text-yellow-400 fill-yellow-400" />
              </div>
            </div>
            <div className="absolute -top-2 -right-2">
              <div className={`w-8 h-8 ${showAnimation ? 'animate-pulse' : ''}`}>
                <Star className="w-full h-full text-yellow-400 fill-yellow-400" />
              </div>
            </div>
          </div>

          {/* Success Message */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {watchPercentage >= 90 ? 'Well Done! 🥳' : 'Great Progress! 💪'}
            </h2>
            <p className="text-muted-foreground">
              {watchPercentage >= 90 
                ? 'You completed the video!' 
                : `You've watched ${Math.round(watchPercentage)}% of the video`
              }
            </p>
          </div>

          {/* Video Title */}
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-sm font-medium text-foreground truncate" title={videoTitle}>
              {videoTitle}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="bg-yellow-500/10 rounded-lg p-3">
                <Trophy className="w-6 h-6 text-yellow-500 mx-auto" />
              </div>
              <div className="text-center">
                <div className="font-bold text-lg text-foreground">+{pointsEarned}</div>
                <div className="text-xs text-muted-foreground">Points Earned</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="bg-orange-500/10 rounded-lg p-3">
                <Flame className="w-6 h-6 text-orange-500 mx-auto" />
              </div>
              <div className="text-center">
                <div className="font-bold text-lg text-foreground">{currentStreak}</div>
                <div className="text-xs text-muted-foreground">Day Streak</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="bg-primary/10 rounded-lg p-3">
                <CheckCircle className="w-6 h-6 text-primary mx-auto" />
              </div>
              <div className="text-center">
                <div className="font-bold text-lg text-foreground">{totalPoints}</div>
                <div className="text-xs text-muted-foreground">Total Points</div>
              </div>
            </div>
          </div>

          {/* Progress Badge */}
          <div className="flex justify-center">
            <Badge 
              variant="outline" 
              className={`text-sm px-4 py-2 ${
                watchPercentage >= 90 
                  ? 'bg-course-progress/10 text-course-progress border-course-progress/20' 
                  : 'bg-primary/10 text-primary border-primary/20'
              }`}
            >
              {watchPercentage >= 90 ? 'Video Completed' : `${Math.round(watchPercentage)}% Progress`}
            </Badge>
          </div>

          {/* Continue Button */}
          <Button 
            onClick={onClose}
            className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
          >
            Continue Learning
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};