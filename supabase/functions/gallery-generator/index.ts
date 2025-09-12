import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateGalleryRequest {
  projectId: string;
  galleryType: 'photo' | 'video' | 'mixed';
  title?: string;
  description?: string;
  config?: {
    maxImages?: number;
    videoLength?: number;
    style?: string;
    includeText?: boolean;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from auth header
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { projectId, galleryType, title, description, config }: GenerateGalleryRequest = await req.json();

    console.log(`Starting gallery generation for project: ${projectId}, type: ${galleryType}`);
    const startTime = Date.now();

    // Step 1: Create gallery record with pending status
    const { data: gallery, error: galleryError } = await supabaseClient
      .from('project_galleries')
      .insert({
        user_id: user.id,
        project_id: projectId,
        gallery_type: galleryType,
        title: title || `${galleryType} Gallery - Project ${projectId}`,
        description: description || `Auto-generated ${galleryType} gallery for project timeline`,
        generation_config: config || {},
        ai_provider: galleryType === 'video' ? 'openai' : 'openai'
      })
      .select()
      .single();

    if (galleryError) {
      console.error('Error creating gallery record:', galleryError);
      throw new Error('Failed to create gallery record');
    }

    console.log(`Gallery record created with ID: ${gallery.id}`);

    try {
      // Step 2: Update status to processing
      await supabaseClient
        .from('project_galleries')
        .update({ generation_status: 'processing' })
        .eq('id', gallery.id);

      // Step 3: Fetch project media from the media table
      const { data: mediaFiles, error: mediaError } = await supabaseClient
        .from('media')
        .select('*')
        .eq('job_id', projectId)
        .order('created_at', { ascending: true });

      if (mediaError) {
        console.error('Error fetching media:', mediaError);
        throw new Error('Failed to fetch project media');
      }

      console.log(`Found ${mediaFiles?.length || 0} media files for project`);

      if (!mediaFiles || mediaFiles.length === 0) {
        throw new Error('No media files found for this project');
      }

      // Step 4: Filter and prepare media based on gallery type
      const filteredMedia = mediaFiles.filter(media => {
        if (galleryType === 'photo') return media.type === 'photo' || media.type === 'image';
        if (galleryType === 'video') return media.type === 'video';
        return true; // mixed type includes all
      });

      if (filteredMedia.length === 0) {
        throw new Error(`No ${galleryType} files found for this project`);
      }

      // Limit media based on config
      const maxItems = config?.maxImages || 20;
      const selectedMedia = filteredMedia.slice(0, maxItems);

      console.log(`Processing ${selectedMedia.length} media files`);

      // Step 5: Generate gallery based on type
      let galleryResult;
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      if (galleryType === 'video') {
        // For video generation, create a compilation script and use OpenAI to generate captions
        galleryResult = await generateVideoCompilation(selectedMedia, config, openaiApiKey);
      } else {
        // For photo galleries, create an organized gallery with AI-generated descriptions
        galleryResult = await generatePhotoGallery(selectedMedia, config, openaiApiKey);
      }

      // Step 6: Store gallery in cloud storage (simulated with Supabase storage)
      const storagePath = `galleries/${user.id}/${gallery.id}`;
      
      // For this example, we'll create a JSON representation of the gallery
      const galleryData = {
        id: gallery.id,
        projectId,
        type: galleryType,
        media: selectedMedia.map(m => ({
          url: m.url,
          type: m.type,
          created_at: m.created_at
        })),
        generated: galleryResult,
        metadata: {
          generatedAt: new Date().toISOString(),
          mediaCount: selectedMedia.length,
          aiProvider: 'openai'
        }
      };

      // Upload to storage bucket
      const { error: uploadError } = await supabaseClient.storage
        .from('portfolio')
        .upload(`${storagePath}/gallery.json`, JSON.stringify(galleryData, null, 2), {
          contentType: 'application/json',
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading to storage:', uploadError);
        // Continue anyway, as this is not critical
      }

      // Get public URL
      const { data: urlData } = supabaseClient.storage
        .from('portfolio')
        .getPublicUrl(`${storagePath}/gallery.json`);

      const processingTime = Math.round((Date.now() - startTime) / 1000);

      // Step 7: Update gallery record with completion
      const { error: updateError } = await supabaseClient
        .from('project_galleries')
        .update({
          generation_status: 'completed',
          gallery_url: urlData.publicUrl,
          thumbnail_url: selectedMedia[0]?.url || null,
          storage_path: storagePath,
          media_count: selectedMedia.length,
          processing_time_seconds: processingTime,
          completed_at: new Date().toISOString()
        })
        .eq('id', gallery.id);

      if (updateError) {
        console.error('Error updating gallery record:', updateError);
        throw new Error('Failed to update gallery record');
      }

      // Step 8: Log analytics
      await supabaseClient
        .from('gallery_analytics')
        .insert({
          user_id: user.id,
          gallery_id: gallery.id,
          event_type: 'generation_completed',
          event_data: {
            processing_time_seconds: processingTime,
            media_count: selectedMedia.length,
            gallery_type: galleryType,
            ai_provider: 'openai'
          }
        });

      console.log(`Gallery generation completed in ${processingTime} seconds`);

      return new Response(
        JSON.stringify({
          success: true,
          galleryId: gallery.id,
          galleryUrl: urlData.publicUrl,
          mediaCount: selectedMedia.length,
          processingTime: processingTime,
          message: 'Gallery generated successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (processingError) {
      console.error('Error during gallery generation:', processingError);
      
      // Update gallery record with error status
      await supabaseClient
        .from('project_galleries')
        .update({
          generation_status: 'failed',
          error_message: processingError.message,
          processing_time_seconds: Math.round((Date.now() - startTime) / 1000)
        })
        .eq('id', gallery.id);

      // Log analytics for failed generation
      await supabaseClient
        .from('gallery_analytics')
        .insert({
          user_id: user.id,
          gallery_id: gallery.id,
          event_type: 'generation_failed',
          event_data: {
            error: processingError.message,
            processing_time_seconds: Math.round((Date.now() - startTime) / 1000)
          }
        });

      throw processingError;
    }

  } catch (error) {
    console.error('Error in gallery-generator function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Generate a video compilation from media files using AI
 */
async function generateVideoCompilation(media: any[], config: any, openaiApiKey: string) {
  console.log('Generating video compilation...');
  
  // Use OpenAI to generate a video script and descriptions
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional video editor creating compilation scripts for construction/building project timelines. Generate engaging captions and transitions.'
        },
        {
          role: 'user',
          content: `Create a video compilation script for a construction project with ${media.length} media files. Include:
          1. Opening title card text
          2. Transition descriptions between clips
          3. Closing message
          4. Timeline captions for each major phase
          
          Media timeline: ${media.map((m, i) => `${i+1}. ${m.type} from ${new Date(m.created_at).toLocaleDateString()}`).join(', ')}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    }),
  });

  const result = await response.json();
  
  return {
    type: 'video_script',
    script: result.choices[0].message.content,
    mediaFiles: media.map(m => m.url),
    duration: config?.videoLength || 60,
    style: config?.style || 'professional'
  };
}

/**
 * Generate a photo gallery with AI-generated descriptions
 */
async function generatePhotoGallery(media: any[], config: any, openaiApiKey: string) {
  console.log('Generating photo gallery...');
  
  // Use OpenAI to generate descriptions and organize the gallery
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional photographer organizing construction/building project photo galleries. Create engaging descriptions and categorize photos by project phases.'
        },
        {
          role: 'user',
          content: `Organize ${media.length} photos into a professional gallery for a construction project. Provide:
          1. Gallery title and description
          2. Photo categories/phases (e.g., "Site Preparation", "Foundation", "Framing", etc.)
          3. Individual photo captions
          4. Overall project narrative
          
          Photo timeline: ${media.map((m, i) => `Photo ${i+1} from ${new Date(m.created_at).toLocaleDateString()}`).join(', ')}`
        }
      ],
      max_tokens: 1200,
      temperature: 0.8
    }),
  });

  const result = await response.json();
  
  return {
    type: 'photo_gallery',
    organization: result.choices[0].message.content,
    photos: media.map((m, i) => ({
      url: m.url,
      order: i + 1,
      date: m.created_at,
      phase: getProjectPhase(i, media.length)
    })),
    style: config?.style || 'grid'
  };
}

/**
 * Determine project phase based on photo position in timeline
 */
function getProjectPhase(index: number, total: number): string {
  const progress = index / total;
  
  if (progress < 0.2) return 'Site Preparation';
  if (progress < 0.4) return 'Foundation';
  if (progress < 0.6) return 'Structural Work';
  if (progress < 0.8) return 'Interior & Finishing';
  return 'Completion';
}