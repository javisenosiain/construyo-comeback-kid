import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoGenerationRequest {
  projectId: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  testimonialText?: string;
  videoType?: 'before_after' | 'testimonial' | 'progress';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      projectId,
      beforeImageUrl,
      afterImageUrl,
      testimonialText,
      videoType = 'before_after'
    }: VideoGenerationRequest = await req.json();

    console.log('Starting video generation for project:', projectId);

    // Create video generation record
    const { data: videoGeneration, error: insertError } = await supabase
      .from('video_generations')
      .insert({
        user_id: user.id,
        project_id: projectId,
        video_type: videoType,
        before_image_url: beforeImageUrl,
        after_image_url: afterImageUrl,
        testimonial_text: testimonialText,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating video generation record:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create video generation record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log analytics
    await supabase.from('video_analytics').insert({
      user_id: user.id,
      video_generation_id: videoGeneration.id,
      event_type: 'generation_started',
      event_data: { project_id: projectId, video_type: videoType }
    });

    // Start background video generation
    EdgeRuntime.waitUntil(generateVideoWithRunwayML(
      videoGeneration.id,
      beforeImageUrl,
      afterImageUrl,
      testimonialText,
      videoType,
      supabase
    ));

    return new Response(JSON.stringify({
      success: true,
      videoGenerationId: videoGeneration.id,
      status: 'processing',
      message: 'Video generation started. You will be notified when it\'s complete.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in video generation:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Generate video using RunwayML API with before/after images and testimonials
 * Sample call for project "proj456"
 */
async function generateVideoWithRunwayML(
  videoGenerationId: string,
  beforeImageUrl: string,
  afterImageUrl: string,
  testimonialText: string | undefined,
  videoType: string,
  supabase: any
) {
  const runwayApiKey = Deno.env.get('RUNWAYML_API_KEY');
  
  if (!runwayApiKey) {
    console.error('RunwayML API key not configured');
    await updateVideoStatus(supabase, videoGenerationId, 'failed', 'RunwayML API key not configured');
    return;
  }

  try {
    // Update status to processing
    await updateVideoStatus(supabase, videoGenerationId, 'processing');

    // Create video prompt based on type and testimonial
    const videoPrompt = generateVideoPrompt(videoType, testimonialText);
    
    console.log('Creating video with RunwayML for generation:', videoGenerationId);

    // Call RunwayML API to create video
    const videoResponse = await createRunwayMLVideo(
      runwayApiKey,
      beforeImageUrl,
      afterImageUrl,
      videoPrompt
    );

    if (videoResponse.error) {
      throw new Error(`RunwayML API error: ${videoResponse.error}`);
    }

    // Wait for video processing with retry logic
    const finalVideo = await waitForVideoCompletion(
      runwayApiKey,
      videoResponse.taskId,
      supabase,
      videoGenerationId
    );

    if (finalVideo.videoUrl) {
      // Update database with completed video
      await supabase
        .from('video_generations')
        .update({
          status: 'completed',
          video_url: finalVideo.videoUrl,
          thumbnail_url: finalVideo.thumbnailUrl,
          duration: finalVideo.duration,
          runwayml_task_id: videoResponse.taskId,
          completed_at: new Date().toISOString(),
          metadata: {
            runway_task_id: videoResponse.taskId,
            processing_time: finalVideo.processingTime
          }
        })
        .eq('id', videoGenerationId);

      // Log completion analytics
      await supabase.from('video_analytics').insert({
        user_id: (await supabase.from('video_generations').select('user_id').eq('id', videoGenerationId).single()).data.user_id,
        video_generation_id: videoGenerationId,
        event_type: 'generation_completed',
        event_data: {
          duration: finalVideo.duration,
          processing_time: finalVideo.processingTime
        }
      });

      console.log('Video generation completed successfully:', videoGenerationId);
    } else {
      throw new Error('Video generation failed - no video URL returned');
    }

  } catch (error) {
    console.error('Error in RunwayML video generation:', error);
    await updateVideoStatus(
      supabase,
      videoGenerationId,
      'failed',
      error.message
    );
  }
}

/**
 * Create video using RunwayML API
 */
async function createRunwayMLVideo(
  apiKey: string,
  beforeImageUrl: string,
  afterImageUrl: string,
  prompt: string
): Promise<{ taskId?: string; error?: string }> {
  try {
    const response = await fetch('https://api.runwayml.com/v1/image_to_video', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        promptImage: beforeImageUrl,
        promptText: prompt,
        model: 'gen3a_turbo', // Fast model for quick generation
        aspectRatio: '16:9',
        duration: 5, // 5 second video
        watermark: false,
        enhance_prompt: true
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('RunwayML API error:', error);
      return { error: `API request failed: ${error}` };
    }

    const data = await response.json();
    return { taskId: data.id };

  } catch (error) {
    console.error('Error calling RunwayML API:', error);
    return { error: error.message };
  }
}

/**
 * Wait for video completion with retry logic and rate limiting
 */
async function waitForVideoCompletion(
  apiKey: string,
  taskId: string,
  supabase: any,
  videoGenerationId: string,
  maxRetries = 60, // 10 minutes with 10 second intervals
  retryInterval = 10000 // 10 seconds
): Promise<{ videoUrl?: string; thumbnailUrl?: string; duration?: number; processingTime?: number }> {
  const startTime = Date.now();
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await new Promise(resolve => setTimeout(resolve, retryInterval));

      const response = await fetch(`https://api.runwayml.com/v1/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        console.error(`Status check failed (attempt ${attempt + 1}):`, await response.text());
        continue;
      }

      const taskData = await response.json();
      console.log(`Video status check (attempt ${attempt + 1}):`, taskData.status);

      if (taskData.status === 'SUCCEEDED' && taskData.output) {
        const processingTime = Math.round((Date.now() - startTime) / 1000);
        return {
          videoUrl: taskData.output[0],
          thumbnailUrl: taskData.output[0] + '?frame=1', // Get first frame as thumbnail
          duration: 5, // 5 second video
          processingTime
        };
      }

      if (taskData.status === 'FAILED') {
        throw new Error(`Video generation failed: ${taskData.failure_reason || 'Unknown error'}`);
      }

      // Update progress if available
      if (taskData.progress) {
        await supabase
          .from('video_generations')
          .update({
            metadata: {
              progress: taskData.progress,
              status: taskData.status,
              attempt: attempt + 1
            }
          })
          .eq('id', videoGenerationId);
      }

    } catch (error) {
      console.error(`Error checking video status (attempt ${attempt + 1}):`, error);
      
      // If we're on the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw error;
      }
    }
  }

  throw new Error('Video generation timed out after maximum retries');
}

/**
 * Generate video prompt based on type and testimonial
 */
function generateVideoPrompt(videoType: string, testimonialText?: string): string {
  const basePrompts = {
    before_after: "Transform this construction project from before to after state with smooth transitions, professional lighting, and dynamic camera movements showcasing the renovation progress",
    testimonial: "Create an inspiring before and after transformation video with elegant transitions and overlay space for customer testimonials",
    progress: "Show construction progress with time-lapse style transitions, highlighting key milestones and professional craftsmanship"
  };

  let prompt = basePrompts[videoType as keyof typeof basePrompts] || basePrompts.before_after;

  if (testimonialText) {
    prompt += `. Include overlay areas for testimonial text: "${testimonialText}"`;
  }

  return prompt;
}

/**
 * Update video generation status in database
 */
async function updateVideoStatus(
  supabase: any,
  videoGenerationId: string,
  status: string,
  errorMessage?: string
) {
  const updateData: any = { status };
  
  if (errorMessage) {
    updateData.error_message = errorMessage;
  }

  await supabase
    .from('video_generations')
    .update(updateData)
    .eq('id', videoGenerationId);
}