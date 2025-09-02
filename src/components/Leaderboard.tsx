import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardUser {
  id: string;
  full_name: string;
  points: number;
  current_streak: number;
  longest_streak: number;
}

export const Leaderboard = () => {
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, points, current_streak, longest_streak')
        .order('points', { ascending: false })
        .limit(10);

      if (error) throw error;
      setLeaders(data || []);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">#{position}</span>;
    }
  };

  const getRankBadgeVariant = (position: number) => {
    switch (position) {
      case 1:
        return "default";
      case 2:
        return "secondary";
      case 3:
        return "outline";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {leaders.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">No learners yet. Be the first!</p>
          </div>
        ) : (
          leaders.map((user, index) => (
            <div
              key={user.id}
              className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                index < 3 ? 'bg-muted/30' : 'hover:bg-muted/20'
              }`}
            >
              <div className="flex items-center gap-3">
                {getRankIcon(index + 1)}
                <Badge variant={getRankBadgeVariant(index + 1)} className="min-w-[2rem] justify-center">
                  {index + 1}
                </Badge>
              </div>
              
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {user.full_name || 'Anonymous User'}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    <span>{user.points} points</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    <span>{user.current_streak} day streak</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-lg font-bold text-foreground">{user.points}</p>
                <p className="text-xs text-muted-foreground">points</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};