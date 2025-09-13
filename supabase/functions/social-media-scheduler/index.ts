import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
const canvaApiKey = Deno.env.get('CANVA_API_KEY');
const bufferApiKey = Deno.env.get('BUFFER_ACCESS_TOKEN');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Auto-Schedule Instagram/Facebook Posts via Zapier, Canva, and Buffer
 * 
 * This function pulls project galleries/videos from Construyo CRM,
 * uses Canva API to create post graphics with project images,
 * schedules posts via Buffer API, and logs analytics.
 * 
 * Features:
 * - Pull project galleries from CRM
 * - Create graphics with Canva API
 * - Schedule posts with Buffer API
 * - Handle API errors and rate limits with retry logic
 * - Log post scheduling and engagement metrics
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, platform, scheduleType, scheduledFor, customCaption, zapierWebhook } = await req.json();

    console.log(`Starting social media scheduling for project: ${projectId}`);

    // 1. Pull project galleries/videos from Construyo CRM
    const { data: galleryData, error: galleryError } = await supabase
      .from('project_galleries')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (galleryError || !galleryData) {
      console.error('Gallery fetch error:', galleryError);
      throw new Error(`No gallery found for project ${projectId}`);
    }

    // 2. Generate AI caption if not provided
    let caption = customCaption;
    if (!caption && openaiApiKey) {
      caption = await generateAICaption(galleryData);
    }

    // 3. Create post graphics with Canva API
    let canvaDesignId = null;
    let mediaUrls = galleryData.media_urls || [];

    if (canvaApiKey && mediaUrls.length > 0) {
      try {
        canvaDesignId = await createCanvaDesign(mediaUrls[0], caption);
        console.log('Canva design created:', canvaDesignId);
      } catch (error) {
        console.warn('Canva design creation failed, using original media:', error);
      }
    }

    // 4. Create social media post record
    const { data: postData, error: postError } = await supabase
      .from('social_media_posts')
      .insert({
        user_id: galleryData.user_id,
        project_id: projectId,
        gallery_id: galleryData.id,
        platform: platform.toLowerCase(),
        status: 'draft',
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        content_type: galleryData.media_urls?.length > 1 ? 'carousel' : 'image',
        caption: caption,
        media_urls: mediaUrls,
        hashtags: generateHashtags(galleryData),
        canva_design_id: canvaDesignId,
        zapier_workflow_id: zapierWebhook
      })
      .select()
      .single();

    if (postError) {
      console.error('Post creation error:', postError);
      throw new Error('Failed to create social media post record');
    }

    // 5. Schedule post via Buffer API with retry logic
    let bufferPostId = null;
    if (bufferApiKey) {
      bufferPostId = await scheduleWithBuffer(postData, platform);
    }

    // 6. Trigger Zapier workflow if provided
    if (zapierWebhook) {
      await triggerZapierWorkflow(zapierWebhook, {
        projectId,
        platform,
        postId: postData.id,
        caption,
        mediaUrls,
        scheduledFor
      });
    }

    // 7. Update post with scheduling results
    await supabase
      .from('social_media_posts')
      .update({
        status: bufferPostId ? 'scheduled' : 'draft',
        buffer_post_id: bufferPostId
      })
      .eq('id', postData.id);

    // 8. Log analytics
    await supabase
      .from('social_media_analytics')
      .insert({
        user_id: galleryData.user_id,
        post_id: postData.id,
        platform: platform.toLowerCase(),
        event_type: 'post_scheduled',
        event_data: {
          project_id: projectId,
          scheduled_for: scheduledFor,
          has_canva_design: !!canvaDesignId,
          has_buffer_id: !!bufferPostId,
          media_count: mediaUrls.length
        }
      });

    console.log('Social media post scheduled successfully:', postData.id);

    return new Response(JSON.stringify({
      success: true,
      postId: postData.id,
      status: bufferPostId ? 'scheduled' : 'draft',
      bufferPostId,
      canvaDesignId,
      message: 'Social media post scheduled successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Social media scheduling error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      message: 'Failed to schedule social media post'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * Generate AI-powered caption using OpenAI
 */
async function generateAICaption(galleryData: any): Promise<string> {
  if (!openaiApiKey) return "Check out our latest project! 🏗️ #construction #renovation";

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'You are a social media expert for construction companies. Create engaging Instagram/Facebook captions that showcase completed projects professionally.'
          },
          {
            role: 'user',
            content: `Create an engaging social media caption for this completed construction project:
            
            Project: ${galleryData.title || 'Construction Project'}
            Description: ${galleryData.description || 'Professional renovation work'}
            
            Requirements:
            - Professional yet engaging tone
            - Include relevant construction hashtags
            - Highlight craftsmanship and quality
            - Keep under 200 characters
            - Include call-to-action for quotes`
          }
        ],
        max_completion_tokens: 150
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content || "Professional construction work completed! Contact us for your next project. 🏗️ #construction";
  } catch (error) {
    console.error('AI caption generation error:', error);
    return "Another successful project completed! 🏗️ Contact us for your construction needs. #construction #renovation";
  }
}

/**
 * Create design with Canva API
 */
async function createCanvaDesign(imageUrl: string, caption: string): Promise<string | null> {
  if (!canvaApiKey) return null;

  try {
    // Note: This is a simplified example. Actual Canva API implementation would require
    // proper authentication flow and design template handling
    const response = await fetch('https://api.canva.com/rest/v1/designs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${canvaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        design_type: 'Instagram-Post',
        content: {
          elements: [
            {
              type: 'image',
              url: imageUrl
            },
            {
              type: 'text',
              content: caption,
              position: { x: 10, y: 10 }
            }
          ]
        }
      }),
    });

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Canva design creation error:', error);
    return null;
  }
}

/**
 * Schedule post with Buffer API with retry logic
 */
async function scheduleWithBuffer(postData: any, platform: string, retryCount = 0): Promise<string | null> {
  if (!bufferApiKey || retryCount >= 3) return null;

  try {
    // Get Buffer profile ID for the platform
    const profileResponse = await fetch('https://api.bufferapp.com/1/profiles.json', {
      headers: {
        'Authorization': `Bearer ${bufferApiKey}`,
      },
    });

    const profiles = await profileResponse.json();
    const profile = profiles.find((p: any) => 
      p.service.toLowerCase() === platform.toLowerCase() && p.default
    );

    if (!profile) {
      throw new Error(`No ${platform} profile found in Buffer`);
    }

    // Schedule the post
    const scheduleResponse = await fetch('https://api.bufferapp.com/1/updates/create.json', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bufferApiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: postData.caption,
        profile_ids: profile.id,
        media: JSON.stringify({
          link: postData.media_urls[0],
          description: postData.caption
        }),
        scheduled_at: postData.scheduled_for || undefined,
        now: postData.scheduled_for ? 'false' : 'true'
      }),
    });

    const scheduleData = await scheduleResponse.json();
    
    if (!scheduleResponse.ok) {
      throw new Error(`Buffer API error: ${scheduleData.message}`);
    }

    return scheduleData.id;
  } catch (error) {
    console.error(`Buffer scheduling error (attempt ${retryCount + 1}):`, error);
    
    // Exponential backoff retry
    if (retryCount < 2) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      return scheduleWithBuffer(postData, platform, retryCount + 1);
    }
    
    return null;
  }
}

/**
 * Trigger Zapier workflow
 */
async function triggerZapierWorkflow(webhookUrl: string, data: any): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
        source: 'construyo-social-scheduler'
      }),
    });
    console.log('Zapier workflow triggered successfully');
  } catch (error) {
    console.error('Zapier webhook error:', error);
  }
}

/**
 * Generate relevant hashtags for construction posts
 */
function generateHashtags(galleryData: any): string[] {
  const baseHashtags = ['#construction', '#renovation', '#building', '#contractor'];
  const projectHashtags = [];
  
  const title = galleryData.title?.toLowerCase() || '';
  const description = galleryData.description?.toLowerCase() || '';
  
  if (title.includes('kitchen') || description.includes('kitchen')) {
    projectHashtags.push('#kitchenrenovation', '#kitchendesign');
  }
  if (title.includes('bathroom') || description.includes('bathroom')) {
    projectHashtags.push('#bathroomrenovation', '#bathroomdesign');
  }
  if (title.includes('extension') || description.includes('extension')) {
    projectHashtags.push('#homeextension', '#homerenovation');
  }
  
  return [...baseHashtags, ...projectHashtags].slice(0, 8);
}