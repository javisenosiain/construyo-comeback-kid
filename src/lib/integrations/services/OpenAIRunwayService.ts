import { BaseIntegrationService } from './BaseIntegrationService';

export class OpenAIRunwayService extends BaseIntegrationService {
  private provider: 'openai' | 'runwayml';
  private baseUrl: string;

  constructor(rateLimiter: any, retryHandler: any, logger: any, provider: 'openai' | 'runwayml') {
    super(provider, rateLimiter, retryHandler, logger);
    this.provider = provider;
    this.baseUrl = provider === 'openai' 
      ? 'https://api.openai.com/v1' 
      : 'https://api.runwayml.com/v1';
  }

  async executeAction(action: string, data: any, metadata?: any): Promise<any> {
    if (this.provider === 'openai') {
      return await this.executeOpenAIAction(action, data, metadata);
    } else {
      return await this.executeRunwayAction(action, data, metadata);
    }
  }

  private async executeOpenAIAction(action: string, data: any, metadata?: any): Promise<any> {
    switch (action) {
      case 'generate_image':
        return await this.generateImage(data);
      case 'generate_content':
        return await this.generateContent(data);
      case 'generate_description':
        return await this.generateDescription(data);
      case 'optimize_content':
        return await this.optimizeContent(data);
      default:
        throw new Error(`Unknown OpenAI action: ${action}`);
    }
  }

  private async executeRunwayAction(action: string, data: any, metadata?: any): Promise<any> {
    switch (action) {
      case 'generate_video':
        return await this.generateVideo(data);
      case 'generate_image':
        return await this.generateRunwayImage(data);
      case 'upscale_image':
        return await this.upscaleImage(data);
      case 'edit_video':
        return await this.editVideo(data);
      default:
        throw new Error(`Unknown RunwayML action: ${action}`);
    }
  }

  // OpenAI Methods
  async generateImage(imageData: any): Promise<any> {
    const url = `${this.baseUrl}/images/generations`;
    
    const payload = {
      model: imageData.model || 'gpt-image-1',
      prompt: imageData.prompt,
      n: imageData.count || 1,
      size: imageData.size || '1024x1024',
      quality: imageData.quality || 'standard',
      response_format: 'url'
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async generateContent(contentData: any): Promise<any> {
    const url = `${this.baseUrl}/chat/completions`;
    
    const payload = {
      model: contentData.model || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: contentData.systemPrompt || 'You are a helpful assistant that creates professional marketing content.'
        },
        {
          role: 'user',
          content: contentData.prompt
        }
      ],
      max_tokens: contentData.maxTokens || 1000,
      temperature: contentData.temperature || 0.7
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async generateDescription(descriptionData: any): Promise<any> {
    const prompt = `Create a professional description for a ${descriptionData.projectType} project with the following details:
    - Client: ${descriptionData.clientName}
    - Services: ${descriptionData.services?.join(', ') || 'Professional services'}
    - Location: ${descriptionData.location || 'Local area'}
    - Special features: ${descriptionData.features?.join(', ') || 'Quality workmanship'}
    
    Make it engaging, professional, and highlight the key benefits for potential customers.`;

    return await this.generateContent({
      prompt,
      maxTokens: 200,
      temperature: 0.8
    });
  }

  async optimizeContent(contentData: any): Promise<any> {
    const prompt = `Optimize the following content for ${contentData.purpose || 'marketing'}:
    
    "${contentData.content}"
    
    Requirements:
    - Keep it ${contentData.tone || 'professional'} in tone
    - Target audience: ${contentData.audience || 'potential customers'}
    - Length: ${contentData.length || 'concise but informative'}
    - Include call-to-action: ${contentData.includeCallToAction !== false}`;

    return await this.generateContent({
      prompt,
      maxTokens: contentData.maxTokens || 300,
      temperature: 0.7
    });
  }

  // RunwayML Methods
  async generateVideo(videoData: any): Promise<any> {
    const url = `${this.baseUrl}/generate`;
    
    const payload = {
      mode: videoData.mode || 'gen2',
      prompt: videoData.prompt,
      duration: videoData.duration || 4,
      seed: videoData.seed,
      ...(videoData.imageUrl && { init_image: videoData.imageUrl }),
      ...(videoData.style && { style: videoData.style })
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async generateRunwayImage(imageData: any): Promise<any> {
    const url = `${this.baseUrl}/generate/image`;
    
    const payload = {
      prompt: imageData.prompt,
      model: imageData.model || 'runway-image-1',
      width: imageData.width || 1024,
      height: imageData.height || 1024,
      num_outputs: imageData.count || 1
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async upscaleImage(upscaleData: any): Promise<any> {
    const url = `${this.baseUrl}/upscale`;
    
    const payload = {
      image: upscaleData.imageUrl,
      scale_factor: upscaleData.scaleFactor || 2,
      model: upscaleData.model || 'esrgan'
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async editVideo(editData: any): Promise<any> {
    const url = `${this.baseUrl}/edit`;
    
    const payload = {
      video: editData.videoUrl,
      prompt: editData.prompt,
      mode: editData.mode || 'inpainting',
      ...(editData.mask && { mask: editData.mask })
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Combined workflow methods
  async generateProjectShowcase(projectData: any): Promise<any> {
    const results = {
      description: null,
      images: [],
      video: null
    };

    try {
      // Generate project description
      const descriptionResult = await this.generateDescription({
        projectType: projectData.type,
        clientName: projectData.clientName,
        services: projectData.services,
        location: projectData.location,
        features: projectData.features
      });

      results.description = descriptionResult.choices[0].message.content;

      // Generate showcase images if this is OpenAI
      if (this.provider === 'openai' && projectData.generateImages) {
        const imagePrompts = [
          `Professional ${projectData.type} project showcase for ${projectData.clientName}, high quality, modern design`,
          `Before and after comparison of ${projectData.type} project, professional photography style`,
          `Detail shot of ${projectData.type} work, emphasizing quality and craftsmanship`
        ];

        for (const prompt of imagePrompts.slice(0, projectData.imageCount || 2)) {
          const imageResult = await this.generateImage({
            prompt,
            quality: 'standard',
            size: '1024x1024'
          });
          results.images.push(imageResult.data[0]);
        }
      }

      // Generate video if this is RunwayML
      if (this.provider === 'runwayml' && projectData.generateVideo) {
        const videoPrompt = `Professional showcase video of ${projectData.type} project, smooth camera movement, highlighting quality work`;
        
        const videoResult = await this.generateVideo({
          prompt: videoPrompt,
          duration: projectData.videoDuration || 4,
          style: 'cinematic'
        });
        results.video = videoResult;
      }

    } catch (error) {
      console.error(`Error generating showcase content:`, error);
      throw error;
    }

    return results;
  }

  async getStatus(): Promise<any> {
    try {
      // Test API connection with a simple request
      if (this.provider === 'openai') {
        const url = `${this.baseUrl}/models`;
        await this.makeApiCall(url);
      } else {
        // For RunwayML, we'll just check if the API key is configured
        // as they might not have a simple status endpoint
      }

      return {
        service: this.provider,
        enabled: this.config?.enabled || false,
        configured: !!this.config?.apiKey,
        connected: true,
        lastActivity: await this.getLastActivity()
      };
    } catch (error) {
      return {
        service: this.provider,
        enabled: this.config?.enabled || false,
        configured: !!this.config?.apiKey,
        connected: false,
        error: error.message,
        lastActivity: await this.getLastActivity()
      };
    }
  }
}