import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { action, url, courseId } = await req.json();

    if (action === 'fetchCourse') {
      // Extract video/playlist ID from URL
      const videoMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      const playlistMatch = url.match(/(?:youtube\.com\/playlist\?list=)([^&\n?#]+)/);
      
      let courseData;
      
      if (playlistMatch) {
        courseData = await fetchPlaylistData(playlistMatch[1]);
      } else if (videoMatch) {
        courseData = await fetchVideoData(videoMatch[1]);
      } else {
        throw new Error('Invalid YouTube URL');
      }

      // Get or create instructor profile
      let { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({ user_id: user.id, full_name: user.email?.split('@')[0] })
          .select('id')
          .single();
        
        if (profileError) throw profileError;
        profile = newProfile;
      }

      // Create course in database
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .insert({
          title: courseData.title,
          description: courseData.description,
          thumbnail_url: courseData.thumbnail,
          duration_minutes: courseData.duration,
          instructor_id: profile.id,
          youtube_playlist_id: courseData.playlistId,
          youtube_channel_id: courseData.channelId,
          youtube_channel_name: courseData.channelName,
          is_published: true
        })
        .select()
        .single();

      if (courseError) throw courseError;

      // Create lessons if it's a playlist
      if (courseData.videos && courseData.videos.length > 0) {
        const lessons = courseData.videos.map((video: any, index: number) => ({
          course_id: course.id,
          title: video.title,
          description: video.description,
          video_url: `https://www.youtube.com/watch?v=${video.id}`,
          youtube_video_id: video.id,
          duration_minutes: video.duration,
          order_index: index,
          points_reward: 100
        }));

        const { error: lessonsError } = await supabase
          .from('lessons')
          .insert(lessons);

        if (lessonsError) throw lessonsError;
      } else {
        // Single video course
        const { error: lessonError } = await supabase
          .from('lessons')
          .insert({
            course_id: course.id,
            title: courseData.title,
            description: courseData.description,
            video_url: url,
            youtube_video_id: courseData.videoId,
            duration_minutes: courseData.duration,
            order_index: 0,
            points_reward: 100
          });

        if (lessonError) throw lessonError;
      }

      return new Response(JSON.stringify({ course }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'markComplete') {
      const { lessonId, watchPercentage = 100 } = await req.json();
      
      // Check if progress already exists
      const { data: existingProgress } = await supabase
        .from('user_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .single();

      if (!existingProgress) {
        // Get lesson info for points
        const { data: lesson } = await supabase
          .from('lessons')
          .select('points_reward, course_id')
          .eq('id', lessonId)
          .single();

        if (lesson) {
          // Insert progress record
          const { error: progressError } = await supabase
            .from('user_progress')
            .insert({
              user_id: user.id,
              lesson_id: lessonId,
              course_id: lesson.course_id,
              watch_percentage: watchPercentage,
              points_earned: lesson.points_reward
            });

          if (progressError) throw progressError;
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in youtube-integration function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchPlaylistData(playlistId: string) {
  // Fetch playlist info
  const playlistResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${youtubeApiKey}`
  );
  const playlistData = await playlistResponse.json();
  
  if (!playlistData.items?.[0]) {
    throw new Error('Playlist not found');
  }

  const playlist = playlistData.items[0];

  // Fetch playlist videos
  const videosResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50&key=${youtubeApiKey}`
  );
  const videosData = await videosResponse.json();

  const videoIds = videosData.items?.map((item: any) => item.contentDetails.videoId).join(',') || '';
  
  // Get video durations
  const videoDetailsResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${youtubeApiKey}`
  );
  const videoDetailsData = await videoDetailsResponse.json();

  const videos = videoDetailsData.items?.map((video: any) => ({
    id: video.id,
    title: video.snippet.title,
    description: video.snippet.description,
    duration: parseDuration(video.contentDetails.duration),
    thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url
  })) || [];

  const totalDuration = videos.reduce((sum: number, video: any) => sum + video.duration, 0);

  return {
    title: playlist.snippet.title,
    description: playlist.snippet.description,
    thumbnail: playlist.snippet.thumbnails.high?.url || playlist.snippet.thumbnails.default?.url,
    duration: totalDuration,
    playlistId,
    channelId: playlist.snippet.channelId,
    channelName: playlist.snippet.channelTitle,
    videos
  };
}

async function fetchVideoData(videoId: string) {
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${youtubeApiKey}`
  );
  const data = await response.json();
  
  if (!data.items?.[0]) {
    throw new Error('Video not found');
  }

  const video = data.items[0];

  return {
    title: video.snippet.title,
    description: video.snippet.description,
    thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
    duration: parseDuration(video.contentDetails.duration),
    videoId,
    channelId: video.snippet.channelId,
    channelName: video.snippet.channelTitle
  };
}

function parseDuration(duration: string): number {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1]?.replace('H', '') || '0');
  const minutes = parseInt(match[2]?.replace('M', '') || '0');
  const seconds = parseInt(match[3]?.replace('S', '') || '0');
  
  return hours * 60 + minutes + Math.ceil(seconds / 60);
}