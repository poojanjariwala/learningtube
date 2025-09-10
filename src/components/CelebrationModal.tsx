import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Check, Star, Flame } from 'lucide-react';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  pointsEarned: number;
  totalPoints: number;
  videoTitle: string;
  watchPercentage: number;
}

export const CelebrationModal = ({
  isOpen,
  onClose,
  pointsEarned,
  totalPoints,
  videoTitle,
  watchPercentage
}: CelebrationModalProps) => {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Play celebration sound only on completion
      if (watchPercentage >= 90) {
        const audio = new Audio('/lovable-uploads/celebration-sound.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {
          console.log('Could not play celebration sound');
        });
      }
      
      setShowAnimation(true);
      
      const timer = setTimeout(() => setShowAnimation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, watchPercentage]);

  const isCompleted = watchPercentage >= 90;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md text-center bg-gradient-to-br from-primary/10 via-accent/5 to-background border-primary/20">
        <div className="space-y-6 py-4 relative">
          
          {isCompleted && (
            <>
              <Star className={`absolute top-0 left-4 w-8 h-8 text-yellow-400 fill-yellow-400 transition-transform duration-500 ${showAnimation ? 'scale-110 rotate-12' : 'scale-100'}`} />
              <Star className={`absolute top-0 right-4 w-8 h-8 text-yellow-400 fill-yellow-400 transition-transform duration-500 ${showAnimation ? 'scale-110 -rotate-12' : 'scale-100'}`} />
            </>
          )}

          {/* Icon Display */}
          <div className="flex justify-center">
            {isCompleted ? (
              <div className={`relative inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-orange-400 via-red-500 to-yellow-400 transition-transform duration-300 ${showAnimation ? 'scale-105' : 'scale-100'}`}>
                <span className="text-5xl font-bold text-white">100</span>
              </div>
            ) : (
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 ${showAnimation ? 'animate-bounce' : ''}`}>
                <div className="text-4xl font-bold text-white">
                  {Math.round(watchPercentage)}%
                </div>
              </div>
            )}
          </div>
          
          {/* Success Message */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {isCompleted ? 'Well Done! 🥳' : 'Great Progress! 💪'}
            </h2>
            <p className="text-muted-foreground">
              {isCompleted 
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
          <div className="flex justify-center gap-8">
            <div className="flex flex-col items-center space-y-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                <div className="text-center">
                    <div className="font-bold text-lg text-foreground">+{pointsEarned}</div>
                    <div className="text-xs text-muted-foreground">Points Earned</div>
                </div>
            </div>
            
            <div className="flex flex-col items-center space-y-2">
                <Check className="w-6 h-6 text-primary" />
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
                isCompleted 
                  ? 'bg-green-500/10 text-green-700 border-green-500/20' 
                  : 'bg-primary/10 text-primary border-primary/20'
              }`}
            >
              {isCompleted ? 'Video Completed' : `${Math.round(watchPercentage)}% Progress`}
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
