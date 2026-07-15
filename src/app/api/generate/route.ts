import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import sharp from 'sharp';

/**
 * Generates the transparent SVG overlay containing styled event text,
 * LED grid textures, glowing borders, and drop shadow halos.
 */
function createScreenTextOverlaySvg(
  W: number,
  H: number,
  title: string,
  subtitle: string,
  dateText: string,
  venueText: string,
  footerText: string,
  theme: 'light' | 'dark',
  hasLogos: boolean,
  perspectiveAngle: number
): Buffer {
  const isDark = theme === 'dark';
  const cleanTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cleanSub = subtitle ? subtitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
  const cleanDate = dateText ? dateText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
  const cleanVenue = venueText ? venueText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
  const cleanFooter = footerText ? footerText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

  const textColor  = isDark ? '#f8fafc' : '#1c1917';
  const subTextColor = isDark ? '#94a3b8' : '#57534e';
  const accentColor = isDark ? '#38bdf8' : '#2563eb';

  const titleSize = Math.min(W * 0.052, H * 0.13, 38);
  const subSize = Math.max(9, titleSize * 0.45);
  const dateSize = Math.max(8, titleSize * 0.4);

  let titleTextBlock = '';
  if (cleanTitle.length > 22) {
    const mid = Math.floor(cleanTitle.length / 2);
    let splitIdx = cleanTitle.indexOf(' ', mid);
    if (splitIdx === -1) splitIdx = cleanTitle.lastIndexOf(' ', mid);
    if (splitIdx === -1) splitIdx = mid;

    const line1 = cleanTitle.substring(0, splitIdx).trim();
    const line2 = cleanTitle.substring(splitIdx).trim();
    const startY = hasLogos ? (H * 0.52) : (H * 0.44);

    titleTextBlock = `
      <text x="50%" y="${startY}" font-family="system-ui, -apple-system, sans-serif" font-size="${titleSize}px" font-weight="800" fill="${textColor}" text-anchor="middle" letter-spacing="-0.02em">
        <tspan x="50%" dy="0">${line1}</tspan>
        <tspan x="50%" dy="${titleSize + 6}">${line2}</tspan>
      </text>
    `;
  } else {
    const startY = hasLogos ? (H * 0.58) : (H * 0.48);
    titleTextBlock = `
      <text x="50%" y="${startY}" font-family="system-ui, -apple-system, sans-serif" font-size="${titleSize}px" font-weight="900" fill="${textColor}" text-anchor="middle" letter-spacing="-0.025em">${cleanTitle}</text>
    `;
  }

  const lineW = Math.min(W * 0.4, 200);
  const lineY = H * 0.76;

  const svg = `
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Screen Outer Glowing Halo -->
        <filter id="screenGlow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="${accentColor}" flood-opacity="0.25"/>
        </filter>
        
        <!-- Ceiling Ambient Shadow -->
        <linearGradient id="ceilingShadow_${W}_${H}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(0, 0, 0, 0.45)" />
          <stop offset="16%" stop-color="rgba(0, 0, 0, 0.15)" />
          <stop offset="100%" stop-color="rgba(0, 0, 0, 0)" />
        </linearGradient>

        <!-- Stage Spotlight highlight -->
        <radialGradient id="spotlightGlow_${W}_${H}" cx="50%" cy="0%" r="90%">
          <stop offset="0%" stop-color="${isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.7)'}" />
          <stop offset="55%" stop-color="${isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.18)'}" />
          <stop offset="100%" stop-color="rgba(0, 0, 0, 0)" />
        </radialGradient>

        <!-- Anti-reflective matte noise texture -->
        <filter id="matteBackdropTexture_${W}_${H}">
          <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="3" result="noise" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.05 0" />
          <feComposite operator="in" in2="SourceGraphic" />
        </filter>
      </defs>
      
      <!-- Transform container for realistic perspective skewing -->
      <g transform="skewY(${perspectiveAngle})" transform-origin="center">
        <!-- Transparent background screen glow base -->
        <rect width="100%" height="100%" fill="none" filter="url(#screenGlow)" />
        
        <!-- Overhead spotlight illumination overlay -->
        <rect width="100%" height="100%" fill="url(#spotlightGlow_${W}_${H})" rx="6" />

        <!-- Realistic high-density LED panel pixel grid pattern -->
        <pattern id="ledGridPattern" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.65" fill="${isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'}" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#ledGridPattern)" rx="6" />

        <!-- Matte texture grain layer -->
        <rect width="100%" height="100%" filter="url(#matteBackdropTexture_${W}_${H})" rx="6" />

        <!-- Ceiling frame shadow overlay -->
        <rect width="100%" height="100%" fill="url(#ceilingShadow_${W}_${H})" rx="6" />

        <!-- Thin LED screen frame border bezel -->
        <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="5.5" fill="none" stroke="${isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(37, 99, 235, 0.2)'}" stroke-width="1.5" />
        
        <!-- Subtitle -->
        ${cleanSub ? `
          <text x="50%" y="${H * 0.28}" font-family="system-ui, sans-serif" font-size="${subSize}px" font-weight="600" fill="${accentColor}" text-anchor="middle" letter-spacing="0.08em" text-transform="uppercase">${cleanSub}</text>
        ` : ''}

        <!-- Event Typography Title -->
        ${titleTextBlock}

        <!-- Accent Line divider -->
        <line x1="${(W - lineW) / 2}" y1="${lineY}" x2="${(W + lineW) / 2}" y2="${lineY}" stroke="${isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(37, 99, 235, 0.25)'}" stroke-width="1.5" />

        <!-- Date and Venue details footer -->
        ${cleanDate || cleanVenue ? `
          <text x="50%" y="${lineY + 16}" font-family="system-ui, sans-serif" font-size="${dateSize}px" font-weight="600" fill="${subTextColor}" text-anchor="middle">
            ${cleanDate} ${cleanDate && cleanVenue ? ' | ' : ''} ${cleanVenue}
          </text>
        ` : ''}

        <!-- Organizer Footer text -->
        ${cleanFooter ? `
          <text x="50%" y="${H - 12}" font-family="system-ui, sans-serif" font-size="${Math.max(7, dateSize * 0.75)}px" font-weight="500" fill="${subTextColor}" opacity="0.6" text-anchor="middle" letter-spacing="0.05em">${cleanFooter}</text>
        ` : ''}
      </g>
    </svg>
  `;

  return Buffer.from(svg);
}

/**
 * Renders multiple preset text logo badges inline as styled glass cards.
 */
function createPresetLogosSvg(
  W: number,
  H: number,
  logos: string[],
  theme: 'light' | 'dark',
  perspectiveAngle: number
): Buffer {
  const N = logos.length;
  const isDark = theme === 'dark';
  const badgeBg = isDark ? 'rgba(30, 41, 59, 0.75)' : 'rgba(255, 255, 255, 0.9)';
  const badgeBorder = isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(37, 99, 235, 0.15)';
  const badgeTextColor = isDark ? '#e2e8f0' : '#1e293b';

  let badgeW = Math.min(W * 0.18, 120);
  let badgeH = Math.min(H * 0.12, 34);
  let gap = Math.min(15, W * 0.025);

  const marginX = 20;
  const availableW = W - marginX * 2;
  const totalNeededW = N * badgeW + (N - 1) * gap;

  if (totalNeededW > availableW) {
    const scale = availableW / totalNeededW;
    badgeW = badgeW * scale;
    gap = gap * scale;
    badgeH = badgeH * scale;
  }

  const rowW = N * badgeW + (N - 1) * gap;
  const startX = (W - rowW) / 2;
  const ly = 14;

  const logoElements = logos.map((logo, i) => {
    const lx = startX + i * (badgeW + gap);
    return `
      <rect x="${lx}" y="${ly}" width="${badgeW}" height="${badgeH}" rx="6" fill="${badgeBg}" stroke="${badgeBorder}" stroke-width="1"/>
      <text x="${lx + badgeW / 2}" y="${ly + badgeH / 2 + 4}" font-family="system-ui, sans-serif" font-size="${Math.max(7, badgeH * 0.35)}px" font-weight="700" fill="${badgeTextColor}" text-anchor="middle" letter-spacing="-0.01em">${logo}</text>
    `;
  }).join('\n');

  const svg = `
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <g transform="skewY(${perspectiveAngle})" transform-origin="center">
        ${logoElements}
      </g>
    </svg>
  `;
  return Buffer.from(svg);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const hallId        = formData.get('hallId') as string;
    const eventName     = formData.get('eventName') as string;
    const eventSubtitle  = (formData.get('eventSubtitle') || '') as string;
    const eventDate     = (formData.get('eventDate') || '') as string;
    const eventVenue    = (formData.get('eventVenue') || '') as string;
    const footerText    = (formData.get('footerText') || '') as string;
    const screenConfig  = (formData.get('screenConfig') || 'center') as 'center' | 'wings' | 'all';
    const screenTheme   = (formData.get('screenTheme') || 'light') as 'light' | 'dark';
    const wingDisplayMode = (formData.get('wingDisplayMode') || 'mirror') as 'mirror' | 'extended';
    const logosJson     = formData.get('logos') as string;

    if (!hallId || isNaN(parseInt(hallId, 10))) {
      return NextResponse.json({ success: false, error: 'Valid hallId is required' }, { status: 400 });
    }
    if (!eventName?.trim()) {
      return NextResponse.json({ success: false, error: 'Event Title is required' }, { status: 400 });
    }

    const logos: string[] = logosJson ? JSON.parse(logosJson) : [];

    // Parse all custom uploaded logo files (customLogo_0, customLogo_1...)
    const customLogoBuffers: Buffer[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('customLogo') && value instanceof File && value.size > 0) {
        const bytes = await value.arrayBuffer();
        customLogoBuffers.push(Buffer.from(bytes));
      }
    }

    // Fetch venue hall
    const hall = await prisma.venueHall.findUnique({
      where: { id: parseInt(hallId, 10) },
    });
    if (!hall) {
      return NextResponse.json({ success: false, error: 'Hall not found' }, { status: 404 });
    }
    if (!hall.baseImageUrl) {
      return NextResponse.json({ success: false, error: 'This hall has no base image configured.' }, { status: 422 });
    }

    // Load base venue image
    let baseImageBuffer: Buffer;
    const imageUrl = hall.baseImageUrl;

    if (imageUrl.startsWith('/')) {
      const { readFile } = await import('fs/promises');
      const { join } = await import('path');
      baseImageBuffer = await readFile(join(process.cwd(), 'public', imageUrl));
    } else {
      const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) {
        return NextResponse.json({ success: false, error: `Failed to fetch base image: ${response.statusText}` }, { status: 502 });
      }
      const arrayBuf = await response.arrayBuffer();
      baseImageBuffer = Buffer.from(arrayBuf);
    }

    const baseMetadata = await sharp(baseImageBuffer).metadata();
    const baseW = baseMetadata.width ?? 1200;
    const baseH = baseMetadata.height ?? 800;

    // Resolve API Key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API Key is required. Please set OPENAI_API_KEY in your environment.'
      }, { status: 400 });
    }

    // Formulate a beautiful prompt for the digital corporate screen wallpaper design
    const colorsStr = screenTheme === 'dark'
      ? 'deep navy blue, dark slate gray, futuristic glowing teal curves, and rich blue gradients'
      : 'soft warm off-white, light gray gradients, metallic clean silver curves, and subtle sky blue accents';

    const prompt = `A premium, high-resolution abstract corporate presentation slide background wallpaper.
The design must be modern, clean, and minimalist, featuring elegant glowing digital waves, smooth gradient transitions, and professional high-tech corporate branding aesthetics in colors: ${colorsStr}.
It must look like a professional, clean digital canvas design, with NO text, NO logos, NO physical stage structures, NO furniture, NO podiums, and NO outer frames. Just the clean abstract digital wallpaper design.`;

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

    let wallpaperBuffer: Buffer;
    if (firstObj.b64_json) {
      wallpaperBuffer = Buffer.from(firstObj.b64_json, 'base64');
    } else if (firstObj.url) {
      const imageRes = await fetch(firstObj.url);
      if (!imageRes.ok) {
        throw new Error(`Failed to fetch generated wallpaper from URL: ${imageRes.statusText}`);
      }
      const arrayBuffer = await imageRes.arrayBuffer();
      wallpaperBuffer = Buffer.from(arrayBuffer);
    } else {
      throw new Error('OpenAI returned neither b64_json nor url.');
    }

    const composites: any[] = [];

    // Helper to generate composite screen layers on top of the OpenAI background image
    const addScreenComposite = async (
      x: number,
      y: number,
      w: number,
      h: number,
      screenRole: 'center' | 'left' | 'right'
    ) => {
      if (!w || w <= 0 || !h || h <= 0) return;
      const clampedX = Math.max(0, Math.min(x, baseW - 1));
      const clampedY = Math.max(0, Math.min(y, baseH - 1));
      const clampedW = Math.max(1, Math.min(w, baseW - clampedX));
      const clampedH = Math.max(1, Math.min(h, baseH - clampedY));

      // Perspective Angle skew factor mapping
      let skew = 0;
      if (screenRole === 'left') skew = 3.5;
      if (screenRole === 'right') skew = -3.5;

      let finalTitle = eventName;
      let finalSub = eventSubtitle;
      let finalDate = eventDate;
      let finalVenue = eventVenue;
      let finalFooter = footerText;
      let activeLogosList = [...logos];
      let activeCustomLogos = [...customLogoBuffers];

      if (wingDisplayMode === 'extended') {
        if (screenRole === 'left') {
          finalTitle = 'SPONSORS & CO-HOSTS';
          finalSub = 'OFFICIAL BRAND PARTNERS';
          finalDate = '';
          finalVenue = '';
          finalFooter = '';
        } else if (screenRole === 'right') {
          finalTitle = eventVenue;
          finalSub = 'SESSION TIMINGS & VENUE';
          finalDate = eventDate;
          finalVenue = '';
          finalFooter = footerText;
          activeLogosList = [];
          activeCustomLogos = [];
        } else {
          finalDate = '';
          finalVenue = '';
        }
      }

      const hasScreenLogos = activeCustomLogos.length > 0 || activeLogosList.length > 0;

      // 1. Resize the OpenAI generated abstract wallpaper to the screen dimensions
      const screenBaseBuffer = await sharp(wallpaperBuffer)
        .resize(clampedW, clampedH, { fit: 'cover' })
        .png()
        .toBuffer();

      // 2. Create the transparent text and design decorations SVG overlay
      const textOverlaySvg = createScreenTextOverlaySvg(
        clampedW,
        clampedH,
        finalTitle,
        finalSub,
        finalDate,
        finalVenue,
        finalFooter,
        screenTheme,
        hasScreenLogos,
        skew
      );

      // 3. Composite logos and text overlays on top of the resized OpenAI background
      const innerComposites: any[] = [{
        input: textOverlaySvg,
        left: 0,
        top: 0
      }];

      if (activeCustomLogos.length > 0) {
        const totalLogosCount = activeCustomLogos.length;
        const logoW = Math.round(Math.min(clampedW * 0.16, 120));
        const logoH = Math.round(Math.min(clampedH * 0.12, 34));
        const logoGap = Math.round(Math.min(15, clampedW * 0.02));

        const rowW = totalLogosCount * logoW + (totalLogosCount - 1) * logoGap;
        const startX = (clampedW - rowW) / 2;
        const ly = 14;

        for (let i = 0; i < totalLogosCount; i++) {
          const lx = startX + i * (logoW + logoGap);
          const resizedBuf = await sharp(activeCustomLogos[i])
            .resize({ width: logoW, height: logoH, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .toBuffer();

          innerComposites.push({
            input: resizedBuf,
            left: Math.round(lx),
            top: Math.round(ly),
          });
        }
      } else if (activeLogosList.length > 0) {
        const presetsSvg = createPresetLogosSvg(clampedW, clampedH, activeLogosList, screenTheme, skew);
        innerComposites.push({
          input: presetsSvg,
          left: 0,
          top: 0,
        });
      }

      const compositedScreenBuffer = await sharp(screenBaseBuffer)
        .composite(innerComposites)
        .png()
        .toBuffer();

      composites.push({
        input: compositedScreenBuffer,
        left: clampedX,
        top: clampedY,
      });
    };

    // Composite Center Screen
    await addScreenComposite(
      hall.centerMaskX,
      hall.centerMaskY,
      hall.centerMaskWidth,
      hall.centerMaskHeight,
      'center'
    );

    // Composite Left & Right Wings
    if (screenConfig === 'wings' || screenConfig === 'all') {
      await addScreenComposite(
        hall.leftMaskX,
        hall.leftMaskY,
        hall.leftMaskWidth,
        hall.leftMaskHeight,
        'left'
      );
      await addScreenComposite(
        hall.rightMaskX,
        hall.rightMaskY,
        hall.rightMaskWidth,
        hall.rightMaskHeight,
        'right'
      );
    }

    if (composites.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No screen coordinates defined for this hall.`
      }, { status: 422 });
    }

    // Composite everything onto the base image of the hotel/hall room
    const finalCompositedBuffer = await sharp(baseImageBuffer)
      .resize({ width: baseW, height: baseH, fit: 'inside' })
      .composite(composites)
      .png()
      .toBuffer();

    const base64 = finalCompositedBuffer.toString('base64');
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    return NextResponse.json({
      success: true,
      image_url: `data:image/png;base64,${base64}`,
      metadata: {
        engine: `OpenAI ${selectedModelName} (Active)`,
        resolution: `${baseW}x${baseH}`,
        generation_time_seconds: parseFloat(duration)
      }
    });

  } catch (error: any) {
    console.error('OpenAI image generation route error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
