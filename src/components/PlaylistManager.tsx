import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListVideo, Plus, Trash2, Edit, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Playlist {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  lessons: any[];
}

interface Lesson {
  id: string;
  title: string;
  course_id: string;
  youtube_video_id?: string;
  duration_minutes: number;
  course: {
    title: string;
  };
}

interface PlaylistManagerProps {
  onPlayPlaylist?: (playlist: Playlist) => void;
}

export const PlaylistManager = ({ onPlayPlaylist }: PlaylistManagerProps) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadPlaylists();
      loadAvailableLessons();
    }
  }, [user]);

  const loadPlaylists = async () => {
    try {
      const { data, error } = await supabase
        .from('user_playlists')
        .select(`
          *,
          playlist_lessons(
            lesson_id,
            order_index,
            lessons(
              id,
              title,
              youtube_video_id,
              duration_minutes,
              course:courses(title)
            )
          )
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const playlistsWithLessons = data?.map(playlist => ({
        ...playlist,
        lessons: playlist.playlist_lessons
          ?.sort((a, b) => a.order_index - b.order_index)
          .map(pl => pl.lessons) || []
      })) || [];

      setPlaylists(playlistsWithLessons);
    } catch (error) {
      console.error('Error loading playlists:', error);
      toast({
        title: "Error loading playlists",
        description: "Failed to load your playlists. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableLessons = async () => {
    try {
      // First get the user's profile to find their courses
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          course_id,
          youtube_video_id,
          duration_minutes,
          course:courses(title)
        `)
        .eq('courses.instructor_id', profile.id)
        .not('youtube_video_id', 'is', null);

      if (error) throw error;
      setAvailableLessons(data || []);
    } catch (error) {
      console.error('Error loading lessons:', error);
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;

    try {
      const { data: playlist, error } = await supabase
        .from('user_playlists')
        .insert({
          user_id: user!.id,
          name: newPlaylistName,
          description: newPlaylistDescription
        })
        .select()
        .single();

      if (error) throw error;

      // Add selected lessons to playlist
      if (selectedLessons.length > 0) {
        const playlistLessons = selectedLessons.map((lessonId, index) => ({
          playlist_id: playlist.id,
          lesson_id: lessonId,
          order_index: index
        }));

        const { error: lessonsError } = await supabase
          .from('playlist_lessons')
          .insert(playlistLessons);

        if (lessonsError) throw lessonsError;
      }

      setNewPlaylistName('');
      setNewPlaylistDescription('');
      setSelectedLessons([]);
      setIsCreating(false);
      loadPlaylists();

      toast({
        title: "Playlist created",
        description: "Your playlist has been created successfully.",
      });
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast({
        title: "Error creating playlist",
        description: "Failed to create playlist. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deletePlaylist = async (playlistId: string) => {
    try {
      const { error } = await supabase
        .from('user_playlists')
        .delete()
        .eq('id', playlistId);

      if (error) throw error;

      setPlaylists(playlists.filter(p => p.id !== playlistId));
      toast({
        title: "Playlist deleted",
        description: "Your playlist has been deleted.",
      });
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast({
        title: "Error deleting playlist",
        description: "Failed to delete playlist. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleLessonSelection = (lessonId: string) => {
    setSelectedLessons(prev => 
      prev.includes(lessonId) 
        ? prev.filter(id => id !== lessonId)
        : [...prev, lessonId]
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Playlists</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading playlists...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListVideo className="w-5 h-5" />
            My Playlists
          </div>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Playlist
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Playlist</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Playlist Name</label>
                  <Input
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="Enter playlist name"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Description (Optional)</label>
                  <Textarea
                    value={newPlaylistDescription}
                    onChange={(e) => setNewPlaylistDescription(e.target.value)}
                    placeholder="Enter playlist description"
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Select Videos</label>
                  <ScrollArea className="h-64 border rounded-md p-4 mt-1">
                    {availableLessons.length === 0 ? (
                      <p className="text-muted-foreground text-center">No videos available</p>
                    ) : (
                      availableLessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className={`p-3 border rounded cursor-pointer mb-2 transition-colors ${
                            selectedLessons.includes(lesson.id)
                              ? 'bg-primary/10 border-primary'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => toggleLessonSelection(lesson.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{lesson.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {lesson.course?.title} • {lesson.duration_minutes} min
                              </p>
                            </div>
                            {selectedLessons.includes(lesson.id) && (
                              <Badge>Selected</Badge>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createPlaylist} disabled={!newPlaylistName.trim()}>
                    Create Playlist
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {playlists.length === 0 ? (
          <div className="text-center py-8">
            <ListVideo className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">
              No playlists yet. Create your first playlist!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {playlists.map((playlist) => (
              <div key={playlist.id} className="border rounded-lg p-4 bg-card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{playlist.name}</h3>
                    {playlist.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {playlist.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">
                        {playlist.lessons.length} videos
                      </Badge>
                      <Badge variant="outline">
                        {playlist.lessons.reduce((acc, lesson) => acc + (lesson.duration_minutes || 0), 0)} min total
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {playlist.lessons.length > 0 && (
                      <Button
                        size="sm"
                        onClick={() => onPlayPlaylist?.(playlist)}
                        className="flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Play
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deletePlaylist(playlist.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {playlist.lessons.length > 0 && (
                  <ScrollArea className="h-32">
                    <div className="space-y-2">
                      {playlist.lessons.map((lesson, index) => (
                        <div key={lesson.id} className="text-sm flex items-center gap-2 p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground">#{index + 1}</span>
                          <span className="flex-1">{lesson.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {lesson.duration_minutes} min
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};