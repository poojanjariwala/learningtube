import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Youtube, Upload, Link2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CourseUrlInputProps {
  onUrlSubmit: (url: string, type: 'video' | 'playlist') => void;
  isLoading?: boolean;
}

export const CourseUrlInput = ({ onUrlSubmit, isLoading = false }: CourseUrlInputProps) => {
  const [url, setUrl] = useState('');
  const { toast } = useToast();

  const detectUrlType = (url: string): 'video' | 'playlist' | null => {
    if (url.includes('playlist')) return 'playlist';
    if (url.includes('watch') || url.includes('youtu.be')) return 'video';
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a YouTube URL",
        variant: "destructive"
      });
      return;
    }

    const urlType = detectUrlType(url);
    if (!urlType) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube video or playlist URL",
        variant: "destructive"
      });
      return;
    }
    
    onUrlSubmit(url, urlType);
    setUrl('');
  };

  return (
    <Card className="p-8 bg-course-card border-2 border-border/50 shadow-[var(--shadow-course)] hover:shadow-[var(--shadow-hover)] transition-all duration-300">
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mb-4">
          <Youtube className="h-8 w-8 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Create Your Course</h2>
        <p className="text-muted-foreground">Paste any YouTube video or playlist URL to start learning</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Input
            type="url"
            placeholder="https://youtube.com/watch?v=... or https://youtube.com/playlist?list=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="pl-12 h-12 text-base bg-background border-border/60 focus:border-primary/60 transition-colors"
            disabled={isLoading}
          />
          <Link2 className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        </div>
        
        <Button 
          type="submit" 
          disabled={isLoading || !url.trim()}
          className="w-full h-12 text-base bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold shadow-md hover:shadow-lg transition-all duration-200"
        >
          {isLoading ? (
            <>
              <Upload className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Youtube className="mr-2 h-5 w-5" />
              Create Course
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 p-4 bg-secondary/50 rounded-lg">
        <h3 className="font-semibold text-sm text-foreground mb-2">Supported URLs:</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Single videos: youtube.com/watch?v=...</li>
          <li>• Playlists: youtube.com/playlist?list=...</li>
          <li>• Short URLs: youtu.be/...</li>
        </ul>
      </div>
    </Card>
  );
};