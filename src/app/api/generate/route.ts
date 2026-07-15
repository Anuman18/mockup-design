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
      openai_api_key,
      gemini_api_key
    } = body;

    const colorsStr = (theme_colors || []).join(', ');
    
    // Premium Prompt Engineering to generate highly realistic 3D layouts isolated on solid white
    let prompt = `A highly realistic, professional 3D architectural visualization of a luxury corporate event stage setup.
The entire stage setup is centered and isolated on a solid, clean, pure white background (#FFFFFF).
The borders of the image must fade completely into solid pure white (#FFFFFF), with no outer borders, frames, or dark edges, blending seamlessly into a clean software interface.

Setup Configuration:
- Stage: Riser with a premium ${stage_finish} style finish.
- Seating: Modern corporate chairs arranged in a "${seating_style}" layout (Capacity: ${seating_count} seats).
- Backdrop: Large digital LED screen setup. The central screen has glowing pixels and displays the event title "${event_name}".
- Lighting: Professional overhead lighting trusses casting realistic volumetric spotlights, subtle screen glow, and soft ambient reflections onto the glossy stage floor.
- Colors: Accent corporate theme colors are ${colorsStr}.
${stall_count && stall_count > 0 ? `- Exhibition Area: ${stall_count} ${stall_type} octanorm exhibition booths next to the stage.` : ''}
${outdoor_structure ? `- Canopy: A robust ${outdoor_structure} truss frame.` : ''}
${custom_prompt_addon ? `- Additional custom elements: ${custom_prompt_addon}` : ''}

Aesthetics:
- High-fidelity photo-realistic rendering.
- Detailed textures: polished wood/metal finishes, realistic chair upholstery, and crisp screen content.
- Professional studio lighting and soft drop shadows on the pure white floor.
- Clean composition, crisp 8k resolution, suitable for a premium event planning presentation.
- Exclude: vignetting, black backgrounds, frames, collages, text watermarks outside the screens.`;

    // Resolve API Key (Priority: body parameters -> env variables)
    const apiKey = openai_api_key || gemini_api_key || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API Key is required. Please set OPENAI_API_KEY in your environment or pass it in the request.'
      }, { status: 400 });
    }

    const startTime = Date.now();

    // List of candidate OpenAI GPT Image generation models (ordered by priority)
    const candidateModels = [
      'gpt-image-2',
      'gpt-image-1.5',
      'gpt-image-1',
      'chatgpt-image-latest'
    ];

    let lastErrorMsg = '';
    let responseData = null;
    let selectedModelName = '';

    for (const model of candidateModels) {
      try {
        console.log(`Attempting image generation using OpenAI model: ${model}`);
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            prompt,
            n: 1,
            size: '1024x1024'
          })
        });

        if (response.ok) {
          responseData = await response.json();
          selectedModelName = model;
          break;
        } else {
          const errText = await response.text();
          let msg = `HTTP ${response.status}`;
          try {
            const errJson = JSON.parse(errText);
            msg = errJson.error?.message || msg;
          } catch (e) {}
          console.warn(`Model ${model} failed: ${msg}`);
          lastErrorMsg = msg;
        }
      } catch (err: any) {
        console.warn(`Error invoking model ${model}:`, err);
        lastErrorMsg = err.message || String(err);
      }
    }

    if (!responseData) {
      throw new Error(`OpenAI Image generation failed on all candidate models. Last error: ${lastErrorMsg}`);
    }

    // Extract base64 image content from OpenAI response
    const firstObj = responseData.data?.[0];
    if (!firstObj) {
      throw new Error('OpenAI returned an empty dataset.');
    }

    let base64Image = '';

    if (firstObj.b64_json) {
      base64Image = `data:image/png;base64,${firstObj.b64_json}`;
    } else if (firstObj.url) {
      // If a URL is returned instead of b64_json, fetch it and convert to base64
      const imageRes = await fetch(firstObj.url);
      if (!imageRes.ok) {
        throw new Error(`Failed to fetch generated image from URL: ${imageRes.statusText}`);
      }
      const arrayBuffer = await imageRes.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      base64Image = `data:image/png;base64,${base64}`;
    } else {
      throw new Error('OpenAI returned neither b64_json nor url.');
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    return NextResponse.json({
      success: true,
      prompt,
      image_url: base64Image,
      metadata: {
        engine: `OpenAI ${selectedModelName} (Active)`,
        resolution: '1024x1024',
        generation_time_seconds: parseFloat(duration)
      },
      event_details: {
        name: event_name,
        date: event_date,
        theme_colors
      }
    });

  } catch (error: any) {
    console.error('OpenAI image generation route error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
