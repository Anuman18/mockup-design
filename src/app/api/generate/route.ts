import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const {
      venue_id,
      hall_id,
      stage_width,
      stage_length,
      stage_height,
      stage_finish,
      seating_style,
      seating_count,
      stall_type,
      stall_count,
      outdoor_structure,
      branding_template_id,
      event_name,
      event_date,
      theme_colors,
      custom_prompt_addon,
      gemini_api_key
    } = body;

    const colorsStr = (theme_colors || []).join(', ');
    
    // Prompt construction logic
    let prompt = `A professional, photorealistic 3D architectural rendering of an indoor event setup. `;
    prompt += `Venue Hall Configuration: ID ${hall_id} inside Venue ID ${venue_id}. `;
    prompt += `Stage Details: Large stage measuring ${stage_width}m wide x ${stage_length}m deep x ${stage_height}m high, finished with premium ${stage_finish}. `;
    prompt += `Backdrop features custom branding panels styled in theme colors (${colorsStr}) and showing the event title "${event_name}". `;
    
    if (branding_template_id) {
      prompt += `Branding elements from template ID ${branding_template_id} are applied elegantly. `;
    }
    
    prompt += `Seating: Arranged in a precise "${seating_style}" layout with ${seating_count} modern chairs. `;
    
    if (stall_count && stall_count > 0) {
      prompt += `Exhibition space has ${stall_count} ${stall_type} octanorm stalls arranged neatly in rows. `;
    }
    
    if (outdoor_structure) {
      prompt += `Outdoor reception space includes a heavy-duty ${outdoor_structure} canopy structure. `;
    }
    
    if (custom_prompt_addon) {
      prompt += `Additional directions: "${custom_prompt_addon}". `;
    }
    
    prompt += `Lighting: Warm spotlights, ambient structural glow, photorealistic textures, volumetric lighting, 8k resolution render, unreal engine 5 architectural visualization style.`;

    const apiKey = gemini_api_key || process.env.GEMINI_API_KEY;

    if (apiKey) {
      // Execute REAL Google Gemini API image generation (Imagen 3)
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '16:9'
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error?.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const imageBytes = data.generatedImages?.[0]?.image?.imageBytes;
        if (!imageBytes) {
          throw new Error('No image bytes returned from Imagen API');
        }

        return NextResponse.json({
          success: true,
          prompt,
          image_url: `data:image/jpeg;base64,${imageBytes}`,
          metadata: {
            engine: 'Google Imagen 3 (Active)',
            resolution: '16:9',
            generation_time_seconds: 3.5
          },
          event_details: {
            name: event_name,
            date: event_date,
            theme_colors
          }
        });
      } catch (geminiErr: any) {
        console.error('Gemini Imagen API error:', geminiErr);
        return NextResponse.json({ 
          success: false, 
          error: `Gemini Imagen API error: ${geminiErr.message}` 
        }, { status: 502 });
      }
    }

    // Fallback Mock values if no API Key is provided
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const mockImages: Record<string, string> = {
      theatre: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
      cluster: 'https://images.unsplash.com/photo-1505232458627-539f97658a35?auto=format&fit=crop&w=1200&q=80',
      classroom: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
      banquet: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80',
      default: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80',
    };

    const styleKey = (seating_style || 'default').toLowerCase();
    const imageUrl = mockImages[styleKey] || mockImages.default;

    return NextResponse.json({
      success: true,
      prompt,
      image_url: imageUrl,
      metadata: {
        engine: 'DALL-E 3 (Mocked API Fallback)',
        resolution: '1024x1024',
        generation_time_seconds: 1.5,
        estimated_tokens_cost: 0.08,
      },
      event_details: {
        name: event_name,
        date: event_date,
        theme_colors,
      }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
