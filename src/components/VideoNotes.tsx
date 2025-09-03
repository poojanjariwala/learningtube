import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (user) {
      loadNotes();
    }
  }, [user, lessonId]);

  const loadNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('user_id', user!.id)
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
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const addNote = async () => {
    if (!newNoteContent.trim()) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user!.id,
          lesson_id: lessonId,
          course_id: courseId,
          content: newNoteContent,
          timestamp_seconds: Math.floor(currentTime)
        })
        .select()
        .single();

      if (error) throw error;

      setNotes([...notes, data]);
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
      const { error } = await supabase
        .from('notes')
        .update({ content: editContent })
        .eq('id', noteId);

      if (error) throw error;

      setNotes(notes.map(note => 
        note.id === noteId ? { ...note, content: editContent } : note
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

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StickyNote className="w-5 h-5" />
            My Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading notes...</p>
        </CardContent>
      </Card>
    );
  }

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

            {notes.length === 0 ? (
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
                      <Button
                        onClick={() => startEdit(note)}
                        size="sm"
                        variant="ghost"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => deleteNote(note.id)}
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
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
                    <p className="text-foreground">{note.content}</p>
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