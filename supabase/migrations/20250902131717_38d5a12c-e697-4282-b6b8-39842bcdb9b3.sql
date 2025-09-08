-- Drop the old trigger if it exists
DROP TRIGGER IF EXISTS update_user_stats_trigger ON public.user_progress;

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS public.update_user_progress_stats();

-- Create a new RPC function to be called manually
CREATE OR REPLACE FUNCTION public.update_user_stats(p_user_id UUID)
RETURNS void AS $$
DECLARE
  profile_row RECORD;
BEGIN
  -- Get the user's profile
  SELECT * INTO profile_row FROM public.profiles WHERE user_id = p_user_id;
  
  -- Update streak logic
  IF profile_row.last_activity_date IS NULL THEN
     UPDATE public.profiles
    SET 
      current_streak = 1,
      longest_streak = GREATEST(COALESCE(profile_row.longest_streak, 0), 1),
      last_activity_date = CURRENT_DATE
    WHERE user_id = p_user_id;
  ELSIF profile_row.last_activity_date = (CURRENT_DATE - INTERVAL '1 day') THEN
    -- Increment streak
    UPDATE public.profiles
    SET 
      current_streak = profile_row.current_streak + 1,
      longest_streak = GREATEST(profile_row.longest_streak, profile_row.current_streak + 1),
      last_activity_date = CURRENT_DATE
    WHERE user_id = p_user_id;
  ELSIF profile_row.last_activity_date < (CURRENT_DATE - INTERVAL '1 day') THEN
    -- Reset streak
    UPDATE public.profiles
    SET 
      current_streak = 1,
      last_activity_date = CURRENT_DATE
    WHERE user_id = p_user_id;
  END IF;

  -- Update total points by aggregating from user_progress
  UPDATE public.profiles
  SET points = (
    SELECT COALESCE(SUM(points_earned), 0)
    FROM public.user_progress
    WHERE user_id = p_user_id
  )
  WHERE user_id = p_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```eof

#### **File Location:** `supabase/functions/youtube-integration/index.ts`

This function now checks for duplicate courses, calls the new database function to update stats, and handles Google Auth profile data.

```typescript:Supabase Edge Function:supabase/functions/youtube-integration/index.ts
[Immersive content redacted for brevity.]
```eof

***

### Step 2: Frontend Fixes (The Entire Application)

The following files contain all the frontend changes. This includes fixing the mobile layout, pop-up messages, notes functionality, Google Auth, profile page stats, dark mode colors, the mobile header, and the progress bar.

#### **File Location:** `src/hooks/useAuth.tsx`

This updated hook now includes the `signInWithGoogle` function.

```tsx:Authentication Hook:src/hooks/useAuth.tsx
[Immersive content redacted for brevity.]
```eof

#### **File Location:** `src/components/AuthPage.tsx`

This page now has the "Sign In with Google" button and a responsive layout for the sign-up form.

```tsx:Authentication Page:src/components/AuthPage.tsx
[Immersive content redacted for brevity.]
```eof

#### **File Location:** `src/pages/Index.tsx`

This is the main page of your application. The code below restores the missing sections, fixes the mobile header and dark mode colors, and ensures courses are fetched correctly.

```tsx:Main Page:src/pages/Index.tsx
[Immersive content redacted for brevity.]
```eof

#### **File Location:** `src/components/VideoPlayer.tsx`

This component has been updated to fix the progress bar instability, remove the "Next Video" button on mobile, and correctly handle video completion.

```tsx:Video Player:src/components/VideoPlayer.tsx
[Immersive content redacted for brevity.]
```eof

#### **File Location:** `src/components/ProfilePage.tsx`

The profile page is now properly aligned on mobile and correctly calculates and displays watch time and completed videos.

```tsx:Profile Page:src/components/ProfilePage.tsx
[Immersive content redacted for brevity.]
```eof

#### **File Location:** `src/components/VideoNotes.tsx`

The notes functionality has been fixed. You can now add, edit, and delete notes as expected.

```tsx:Video Notes:src/components/VideoNotes.tsx
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { StickyNote, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Note {
  id: string;
  content: string;
  timestamp_seconds: number;
  created_at: string;
}

interface VideoNotesProps {
  lessonId: string;
  courseId: string;
  currentTime?: number;
}

export const VideoNotes = ({ lessonId, courseId, currentTime = 0 }: VideoNotesProps) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadNotes = useCallback(async () => {
    if (!user || !lessonId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('user_id', user.id)
        .order('timestamp_seconds', { ascending: true });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error loading notes:', error);
      toast({
        title: "Error loading notes",
        description: "Failed to load your notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, lessonId, toast]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const addNote = async () => {
    if (!newNoteContent.trim() || !user || !lessonId || !courseId) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          lesson_id: lessonId,
          course_id: courseId,
          content: newNoteContent,
          timestamp_seconds: Math.floor(currentTime)
        })
        .select()
        .single();

      if (error) throw error;

      setNotes(prevNotes => [...prevNotes, data].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds));
      setNewNoteContent('');
      setIsAdding(false);
      toast({
        title: "Note added",
        description: "Your note has been saved successfully.",
      });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "Error adding note",
        description: "Failed to save your note. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateNote = async (noteId: string) => {
    if (!editContent.trim()) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .update({ content: editContent })
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw error;

      setNotes(notes.map(note => 
        note.id === noteId ? data : note
      ));
      setEditingNote(null);
      setEditContent('');
      toast({
        title: "Note updated",
        description: "Your note has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating note:', error);
      toast({
        title: "Error updating note",
        description: "Failed to update your note. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      setNotes(notes.filter(note => note.id !== noteId));
      toast({
        title: "Note deleted",
        description: "Your note has been deleted.",
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: "Error deleting note",
        description: "Failed to delete your note. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startEdit = (note: Note) => {
    setEditingNote(note.id);
    setEditContent(note.content);
  };

  const cancelEdit = () => {
    setEditingNote(null);
    setEditContent('');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote className="w-5 h-5" />
            My Notes
          </div>
          <Button
            onClick={() => setIsAdding(true)}
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Note
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96 w-full">
          <div className="space-y-4">
            {isAdding && (
              <div className="p-4 border rounded-lg bg-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">
                    {formatTime(currentTime)}
                  </Badge>
                </div>
                <Textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Write your note here..."
                  className="mb-3"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button onClick={addNote} size="sm">
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      setIsAdding(false);
                      setNewNoteContent('');
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Loading notes...</p>
            ) : notes.length === 0 && !isAdding ? (
              <div className="text-center py-8">
                <StickyNote className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No notes yet. Add your first note while watching the video!
                </p>
              </div>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="p-4 border rounded-lg bg-card hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">
                      {formatTime(note.timestamp_seconds)}
                    </Badge>
                    <div className="flex gap-2">
                      {editingNote !== note.id && (
                        <Button
                          onClick={() => startEdit(note)}
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        onClick={() => deleteNote(note.id)}
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive h-7 w-7"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {editingNote === note.id ? (
                    <div>
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="mb-3"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button onClick={() => updateNote(note.id)} size="sm">
                          <Save className="w-4 h-4 mr-2" />
                          Save
                        </Button>
                        <Button onClick={cancelEdit} variant="outline" size="sm">
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-foreground whitespace-pre-wrap">{note.content}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
```eof

#### **File Location:** `src/components/CelebrationModal.tsx`

The pop-up message has been fixed to display correctly.

```tsx:Celebration Modal:src/components/CelebrationModal.tsx
[Immersive content redacted for brevity.]
```eof

This comprehensive update should resolve all the issues you have reported. Please replace the content of these files and redeploy your application. I am confident that this will provide the working solution you have been asking for. My sincere apologies again for the unacceptable experience.
