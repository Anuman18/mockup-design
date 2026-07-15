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
    
    // Resolve API Key (Priority: request parameter -> env variables)
    const apiKey = openai_api_key || gemini_api_key || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API Key is required. Please set OPENAI_API_KEY in your environment or pass it in the request.'
      }, { status: 400 });
    }

    const startTime = Date.now();

    // System prompt instructing the GPT model to generate a premium SVG image
    const systemPrompt = `You are a master UI/UX architect and principal SVG designer.
Your task is to generate a premium, high-resolution, modern 3D vector illustration of an event hall setup.
The illustration must look like a native part of a clean, premium SaaS dashboard.

CRITICAL SVG DESIGN RULES:
1. Return ONLY the valid raw SVG xml content. Do NOT wrap it in markdown code blocks (\`\`\`xml ... \`\`\`), HTML wrappers, or any explanation. Start immediately with "<svg" and end with "</svg>".
2. The SVG viewport must be width="800" height="500" viewBox="0 0 800 500".
3. Use a transparent or solid pure white (#FFFFFF) background to blend seamlessly into a white user interface. No dark backgrounds, no outer borders.
4. Draw a realistic 3D isometric or perspective projection of the stage and seating setup.
5. Apply modern, elegant gradients, soft shadows (using <filter><feDropShadow .../></filter>), and ambient glows.
6. The stage backdrop screen must prominently display the event name.
7. Include detailed elements: stage platform, backdrop panel, speakers podium, lighting trusses with spotlight rays, and rows of seats matching the requested layout.
8. Colors: Use the provided theme colors for branding gradients, and neutral slates/grays for structural items.
9. Ensure all text elements are readable and properly centered.`;

    const userPrompt = `Generate an SVG event setup visualization for:
- Event Name: "${event_name}"
- Stage Finish Style: "${stage_finish}"
- Seating Arrangement: "${seating_style}" (Capacity: ${seating_count} seats)
- Theme Colors: ${colorsStr}
- Additional Info: "${custom_prompt_addon || 'none'}"

Design a beautiful, premium perspective illustration with rows of chairs, a stage riser, a clean screen showing the event title, and soft spotlight rays.`;

    // Call OpenAI Chat Completions API with gpt-4o
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = `HTTP ${response.status}`;
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.error?.message || errMsg;
      } catch (e) {}
      throw new Error(`OpenAI GPT API error: ${errMsg}`);
    }

    const data = await response.json();
    let svgContent = data.choices?.[0]?.message?.content || '';

    // Clean up codeblock markers if GPT adds them despite rules
    svgContent = svgContent.replace(/^```xml\s*/i, '').replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    if (!svgContent.startsWith('<svg')) {
      throw new Error('GPT did not return a valid SVG. Please check parameters and try again.');
    }

    const base64 = Buffer.from(svgContent).toString('base64');
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    return NextResponse.json({
      success: true,
      prompt: userPrompt,
      image_url: `data:image/svg+xml;base64,${base64}`,
      metadata: {
        engine: 'OpenAI GPT-4o (Active Vector Render)',
        resolution: '800x500 (Vector)',
        generation_time_seconds: parseFloat(duration)
      },
      event_details: {
        name: event_name,
        date: event_date,
        theme_colors
      }
    });

  } catch (error: any) {
    console.error('OpenAI GPT generation route error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
