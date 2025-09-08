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

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) throw new Error('Invalid authentication');

    const requestBody = await req.json();
    const { action } = requestBody;

    if (action === 'fetchCourse') {
      const { url } = requestBody;
      const videoMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      const playlistMatch = url.match(/(?:youtube\.com\/playlist\?list=)([^&\n?#]+)/);
      
      let courseData;
      let youtubeId: string | null = null;
      let courseType: 'video' | 'playlist' | null = null;
      
      if (playlistMatch) {
        youtubeId = playlistMatch[1];
        courseType = 'playlist';
        courseData = await fetchPlaylistData(youtubeId);
      } else if (videoMatch) {
        youtubeId = videoMatch[1];
        courseType = 'video';
        courseData = await fetchVideoData(youtubeId);
      } else {
        throw new Error('Invalid YouTube URL');
      }

      const { data: profile } = await supabaseAdmin.from('profiles').select('id').eq('user_id', user.id).single();
      if (!profile) throw new Error('Profile not found');

      if (youtubeId) {
        if (courseType === 'playlist') {
            const { data: existingCourse, error: existingCourseError } = await supabaseAdmin
              .from('courses')
              .select('id')
              .eq('youtube_playlist_id', youtubeId)
              .eq('instructor_id', profile.id)
              .maybeSingle();
            if (existingCourseError) throw existingCourseError;
            if (existingCourse) throw new Error('This course has already been added.');
        } else { 
            const { data: existingCourses, error: existingCoursesError } = await supabaseAdmin
                .from('courses')
                .select('id, lessons!inner(youtube_video_id)')
                .eq('instructor_id', profile.id)
                .is('youtube_playlist_id', null)
                .eq('lessons.youtube_video_id', youtubeId)
                .limit(1)
                .maybeSingle();
            if (existingCoursesError) throw existingCoursesError;
            if (existingCourses) throw new Error('This course has already been added.');
        }
      }
      
      const { data: course, error: courseError } = await supabaseAdmin
        .from('courses')
        .insert({
          title: courseData.title,
          description: courseData.description,
          thumbnail_url: courseData.thumbnail,
          duration_minutes: courseData.duration,
          instructor_id: profile.id,
          youtube_playlist_id: courseType === 'playlist' ? youtubeId : null,
          youtube_channel_id: courseData.channelId,
          youtube_channel_name: courseData.channelName,
          is_published: true,
        })
        .select()
        .single();
      if (courseError) throw courseError;
      
      const lessons = (courseType === 'playlist' ? courseData.videos : [courseData]).map((video: any, index: number) => ({
        course_id: course.id,
        title: video.title,
        description: video.description,
        video_url: `https://www.youtube.com/watch?v=${video.videoId || video.id}`,
        youtube_video_id: video.videoId || video.id,
        duration_minutes: video.duration,
        order_index: index,
        points_reward: 100
      }));
      
      if (lessons.length > 0) {
        const { error: lessonsError } = await supabaseAdmin.from('lessons').insert(lessons);
        if (lessonsError) throw lessonsError;
      }

      return new Response(JSON.stringify({ course }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'markComplete') {
        const { lessonId, courseId, watchPercentage = 100 } = requestBody;
      
         const { error: rpcError } = await supabaseAdmin.rpc('mark_lesson_complete', {
            p_user_id: user.id,
            p_lesson_id: lessonId,
            p_course_id: courseId,
            p_watch_percentage: watchPercentage
         });

         if (rpcError) throw rpcError;

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    throw new Error('Invalid action');

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});


async function fetchPlaylistData(playlistId: string) {
  const playlistResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${youtubeApiKey}`
  );
  const playlistData = await playlistResponse.json();
  if (!playlistData.items?.[0]) throw new Error('Playlist not found');
  const playlist = playlistData.items[0];

  let allVideos: any[] = [];
  let nextPageToken = '';

  do {
    const videosResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${youtubeApiKey}&pageToken=${nextPageToken}`
    );
    const videosData = await videosResponse.json();
    if (videosData.items) {
      allVideos = allVideos.concat(videosData.items);
    }
    nextPageToken = videosData.nextPageToken;
  } while (nextPageToken);

  const videoIds = allVideos?.map((item: any) => item.snippet.resourceId.videoId).join(',') || '';
  
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
  if (!data.items?.[0]) throw new Error('Video not found');
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
  
  return Math.round(hours * 60 + minutes + seconds / 60);
}
