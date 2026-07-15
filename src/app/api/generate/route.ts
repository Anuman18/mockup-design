import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import sharp from 'sharp';
import { loadStageTemplateJson, analyzeStageLayout, saveStageTemplateJson } from '@/lib/stage-analyzer';

/**
 * Trims transparent border padding from logo buffer, resizes, and base64 encodes it.
 */
async function processCustomLogo(logoBuf: Buffer, maxW: number, maxH: number): Promise<string | null> {
  try {
    const trimmed = await sharp(logoBuf)
      .trim()
      .resize({
        width: Math.round(maxW),
        height: Math.round(maxH),
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();
    return trimmed.toString('base64');
  } catch (err) {
    console.error('Failed to process custom logo:', err);
    return null;
  }
}

/**
 * Generates the transparent SVG overlay containing the background image,
 * styled event text, LED grid textures, glowing borders, and drop shadow halos.
 * Everything is placed inside the skewed <g> container to ensure correct perspective.
 */
function createScreenTextOverlaySvg(
  W: number,
  H: number,
  base64Wallpaper: string,
  title: string,
  subtitle: string,
  dateText: string,
  venueText: string,
  footerText: string,
  theme: 'light' | 'dark',
  base64Logos: string[],
  presetLogos: string[],
  perspectiveAngle: number
): Buffer {
  const isDark = theme === 'dark';
  const cleanTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cleanSub = subtitle ? subtitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
  const cleanDate = dateText ? dateText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
  const cleanVenue = venueText ? venueText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
  const cleanFooter = footerText ? footerText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

  const textColor  = isDark ? '#f8fafc' : '#0f172a';
  const subTextColor = isDark ? '#94a3b8' : '#475569';
  const accentColor = isDark ? '#38bdf8' : '#1d4ed8';

  // Dynamic Title Sizing to prevent overflow
  let titleSize = Math.min(W * 0.052, H * 0.13, 38);
  const maxCharCount = 24;
  if (cleanTitle.length > maxCharCount) {
    const scaleFactor = maxCharCount / cleanTitle.length;
    titleSize = Math.max(12, titleSize * scaleFactor);
  }

  const subSize = Math.max(9, titleSize * 0.45);
  const dateSize = Math.max(8, titleSize * 0.4);

  const hasLogos = base64Logos.length > 0 || presetLogos.length > 0;

  let titleTextBlock = '';
  if (cleanTitle.length > 18) {
    const mid = Math.floor(cleanTitle.length / 2);
    let splitIdx = cleanTitle.indexOf(' ', mid);
    if (splitIdx === -1) splitIdx = cleanTitle.lastIndexOf(' ', mid);
    if (splitIdx === -1) splitIdx = mid;

    const line1 = cleanTitle.substring(0, splitIdx).trim();
    const line2 = cleanTitle.substring(splitIdx).trim();
    const startY = hasLogos ? (H * 0.50) : (H * 0.42);

    titleTextBlock = `
      <text x="50%" y="${startY}" font-family="system-ui, -apple-system, sans-serif" font-size="${titleSize}px" font-weight="800" fill="${textColor}" text-anchor="middle" letter-spacing="-0.02em">
        <tspan x="50%" dy="0">${line1}</tspan>
        <tspan x="50%" dy="${titleSize + 6}">${line2}</tspan>
      </text>
    `;
  } else {
    const startY = hasLogos ? (H * 0.56) : (H * 0.46);
    titleTextBlock = `
      <text x="50%" y="${startY}" font-family="system-ui, -apple-system, sans-serif" font-size="${titleSize}px" font-weight="900" fill="${textColor}" text-anchor="middle" letter-spacing="-0.025em">${cleanTitle}</text>
    `;
  }

  const lineW = Math.min(W * 0.4, 200);
  const lineY = H * 0.76;

  // Build the Header Logo row directly inside the SVG
  let logoRowSvg = '';
  if (base64Logos.length > 0) {
    const total = base64Logos.length;
    const logoW = Math.round(Math.min(W * 0.16, 120));
    const logoH = Math.round(Math.min(H * 0.12, 34));
    const gap = Math.round(Math.min(15, W * 0.02));
    const rowW = total * logoW + (total - 1) * gap;
    const startX = (W - rowW) / 2;
    const ly = 14;

    logoRowSvg = base64Logos.map((b64, i) => {
      const lx = startX + i * (logoW + gap);
      return `<image href="data:image/png;base64,${b64}" x="${lx}" y="${ly}" width="${logoW}" height="${logoH}" />`;
    }).join('\n');
  } else if (presetLogos.length > 0) {
    const N = presetLogos.length;
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

    logoRowSvg = presetLogos.map((logo, i) => {
      const lx = startX + i * (badgeW + gap);
      return `
        <rect x="${lx}" y="${ly}" width="${badgeW}" height="${badgeH}" rx="6" fill="${badgeBg}" stroke="${badgeBorder}" stroke-width="1"/>
        <text x="${lx + badgeW / 2}" y="${ly + badgeH / 2 + 4}" font-family="system-ui, sans-serif" font-size="${Math.max(7, badgeH * 0.35)}px" font-weight="700" fill="${badgeTextColor}" text-anchor="middle" letter-spacing="-0.01em">${logo}</text>
      `;
    }).join('\n');
  }

  const svg = `
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Screen contact shadow to anchor screen on wall -->
        <filter id="screenShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.25"/>
        </filter>
        
        <!-- Ceiling Ambient Shadow mapping physical stage ceilings -->
        <linearGradient id="ceilingShadow_${W}_${H}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(0, 0, 0, 0.5)" />
          <stop offset="18%" stop-color="rgba(0, 0, 0, 0.15)" />
          <stop offset="100%" stop-color="rgba(0, 0, 0, 0)" />
        </linearGradient>

        <!-- Stage Spotlight highlight matching real stage spots -->
        <radialGradient id="spotlightGlow_${W}_${H}" cx="50%" cy="0%" r="90%">
          <stop offset="0%" stop-color="${isDark ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255, 255, 255, 0.75)'}" />
          <stop offset="55%" stop-color="${isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255, 255, 255, 0.22)'}" />
          <stop offset="100%" stop-color="rgba(0, 0, 0, 0)" />
        </radialGradient>

        <!-- Anti-reflective matte noise texture for real LED feel -->
        <filter id="matteBackdropTexture_${W}_${H}">
          <feTurbulence type="fractalNoise" baseFrequency="0.98" numOctaves="4" result="noise" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.06 0" />
          <feComposite operator="in" in2="SourceGraphic" />
        </filter>

        <!-- Crop the background image and overlays to match the rounded bezel -->
        <clipPath id="screenClip_${W}_${H}">
          <rect x="0" y="0" width="${W}" height="${H}" rx="6" />
        </clipPath>
      </defs>
      
      <!-- Transform container for realistic perspective skewing, clipped to screen boundaries -->
      <g transform="skewY(${perspectiveAngle})" transform-origin="center" clip-path="url(#screenClip_${W}_${H})">
        <!-- Render the OpenAI-generated background image -->
        <image href="data:image/png;base64,${base64Wallpaper}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" x="0" y="0" />

        <!-- Screen Outer Glowing Border backdrop -->
        <rect width="100%" height="100%" fill="none" filter="url(#screenShadow)" />
        
        <!-- Overhead spotlight illumination overlay -->
        <rect width="100%" height="100%" fill="url(#spotlightGlow_${W}_${H})" />

        <!-- Realistic high-density LED panel pixel grid pattern -->
        <pattern id="ledGridPattern" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.65" fill="${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'}" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#ledGridPattern)" />

        <!-- Matte texture grain layer -->
        <rect width="100%" height="100%" filter="url(#matteBackdropTexture_${W}_${H})" />

        <!-- Ceiling frame shadow overlay -->
        <rect width="100%" height="100%" fill="url(#ceilingShadow_${W}_${H})" />

        <!-- Outer physical metal cabinet frame border (black bezel) -->
        <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="5.5" fill="none" stroke="${isDark ? '#0f172a' : '#1c1917'}" stroke-width="2" opacity="0.95" />
        
        <!-- Inner LED bezel glowing border line -->
        <rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="4.5" fill="none" stroke="${isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(37, 99, 235, 0.18)'}" stroke-width="1" />
        
        <!-- Render Logo Row (Custom or Preset) -->
        ${logoRowSvg}

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
    const customPrompt  = (formData.get('customPrompt') || '') as string;

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

    // Load or dynamically generate Stage Template JSON
    let analysis;
    const hasDbCoordinates = hall.centerMaskWidth > 0;

    if (hasDbCoordinates) {
      // Use perfect, seeded database coordinates as the primary source of truth
      const getPoly = (bb: { x: number, y: number, width: number, height: number }, skew = 0) => [
        [bb.x, bb.y],
        [bb.x + bb.width, bb.y + skew],
        [bb.x + bb.width, bb.y + bb.height + skew],
        [bb.x, bb.y + bb.height]
      ] as [number, number][];

      const mainBbox = { x: hall.centerMaskX, y: hall.centerMaskY, width: hall.centerMaskWidth, height: hall.centerMaskHeight };
      const leftBbox = { x: hall.leftMaskX, y: hall.leftMaskY, width: hall.leftMaskWidth, height: hall.leftMaskHeight };
      const rightBbox = { x: hall.rightMaskX, y: hall.rightMaskY, width: hall.rightMaskWidth, height: hall.rightMaskHeight };

      analysis = {
        main_screen: {
          polygon: getPoly(mainBbox, 0),
          bbox: mainBbox,
          safe_area: {
            x: Math.round(mainBbox.x + mainBbox.width * 0.08),
            y: Math.round(mainBbox.y + mainBbox.height * 0.08),
            width: Math.round(mainBbox.width * 0.84),
            height: Math.round(mainBbox.height * 0.84)
          }
        },
        left_screen: hall.leftMaskWidth > 0 ? {
          polygon: getPoly(leftBbox, 3.5),
          bbox: leftBbox,
          safe_area: {
            x: Math.round(leftBbox.x + leftBbox.width * 0.08),
            y: Math.round(leftBbox.y + leftBbox.height * 0.08),
            width: Math.round(leftBbox.width * 0.84),
            height: Math.round(leftBbox.height * 0.84)
          }
        } : null,
        right_screen: hall.rightMaskWidth > 0 ? {
          polygon: getPoly(rightBbox, -3.5),
          bbox: rightBbox,
          safe_area: {
            x: Math.round(rightBbox.x + rightBbox.width * 0.08),
            y: Math.round(rightBbox.y + rightBbox.height * 0.08),
            width: Math.round(rightBbox.width * 0.84),
            height: Math.round(rightBbox.height * 0.84)
          }
        } : null
      };
    } else {
      // Fallback: load JSON template or generate layout via dynamic stage analysis
      analysis = await loadStageTemplateJson(hall.id, baseW, baseH);
      if (!analysis || !analysis.main_screen) {
        try {
          console.log(`No stage template found for hall ${hall.id}. Performing Stage Layout Analysis dynamically...`);
          analysis = await analyzeStageLayout(baseImageBuffer, baseW, baseH);
          await saveStageTemplateJson(hall.id, analysis);
          // Sync detected bounding box back to database coordinates
          await prisma.venueHall.update({
            where: { id: hall.id },
            data: {
              centerMaskX:      analysis.main_screen.bbox.x,
              centerMaskY:      analysis.main_screen.bbox.y,
              centerMaskWidth:  analysis.main_screen.bbox.width,
              centerMaskHeight: analysis.main_screen.bbox.height,
              leftMaskX:        analysis.left_screen?.bbox.x ?? 0,
              leftMaskY:        analysis.left_screen?.bbox.y ?? 0,
              leftMaskWidth:    analysis.left_screen?.bbox.width ?? 0,
              leftMaskHeight:   analysis.left_screen?.bbox.height ?? 0,
              rightMaskX:       analysis.right_screen?.bbox.x ?? 0,
              rightMaskY:       analysis.right_screen?.bbox.y ?? 0,
              rightMaskWidth:   analysis.right_screen?.bbox.width ?? 0,
              rightMaskHeight:  analysis.right_screen?.bbox.height ?? 0,
            }
          });
        } catch (analyzeErr) {
          console.error('Dynamic stage analysis failed, using static coords fallback:', analyzeErr);
        }
      }
    }

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

    let stylingDetails = `A sophisticated, modern, luxury corporate keynote aesthetic inspired by Apple, Microsoft Build, Google I/O, NVIDIA GTC, Adobe MAX, and AWS re:Invent stage visuals.

Visual Language:
- Elegant flowing abstract wave compositions
- Premium futuristic digital curves
- Soft volumetric light gradients
- Glassmorphism-inspired lighting
- Luxury ambient glow
- Minimal geometric structures
- Smooth layered depth using only graphic elements
- Dynamic flowing ribbons
- Subtle technology-inspired patterns
- High-end digital motion-inspired composition
- Clean negative space for stage presentation
- Perfect visual balance and symmetry`;

    if (customPrompt.trim()) {
      stylingDetails = `Aesthetic/Style Guidelines (User Requested):
${customPrompt.trim()}

Visual Language:
- Elegant abstract event backdrop wallpaper
- Clean negative space in center for text presentation
- Soft volumetric lighting and ambient glow
- Harmonious gradients and premium layout depth`;
    }

    const prompt = `Create a premium corporate event LED screen background designed specifically for dynamic content placement.

This image will be used as the base artwork inside a real LED wall on a conference stage. The design must leave dedicated clean presentation zones where software-generated content (logos, event title, speaker names, sponsor logos, QR codes, agenda, etc.) will later be placed automatically.

Design Requirements:
${stylingDetails}

Content Safe Area:
- Create a large clean central content zone covering approximately 60-70% of the image.
- The center must have a subtle bright gradient so dark text remains readable.
- Keep decorative graphics around the outer edges only.
- Never place important visual elements inside the center safe area.
- The safe area must blend naturally with the artwork, not look like a white rectangle.
- Create smooth feathered transitions from the decorative edges into the clean center.
- Ensure enough empty breathing space for logos and text.

Visual Integration:
- The wallpaper should feel like it was designed for a real LED display.
- No hard borders.
- No visible frames.
- No isolated white boxes.
- No cut-out appearance.
- The background should naturally guide the viewer's eyes toward the center.
- Decorative elements should softly fade into the content area.

Colors:
${colorsStr}

Image Quality:
- Ultra HD
- 8K quality
- Extremely sharp
- Professional commercial artwork
- Large-format LED display quality
- Premium digital art

Strictly DO NOT generate:
- People
- Stage
- Auditorium
- Furniture
- Podium
- Screens
- Mockups
- Physical objects
- Text
- Logos
- Branding
- Icons
- Watermarks
- UI Elements
- Borders
- Frames
- Posters`;

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

    // If the selected hall is Taj Lands End Ballroom (hallId = 19), cover the chrome stanchion stand
    if (hall.id === 19) {
      try {
        const carpetPatch = await sharp(baseImageBuffer)
          .extract({ left: 780, top: 710, width: 120, height: 90 })
          .blur(2.5)
          .toBuffer();
        
        composites.push({
          input: carpetPatch,
          left: 920,
          top: 670
        });
      } catch (err) {
        console.warn('Failed to patch stanchion base:', err);
      }
    }

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

      // Process uploaded custom logo buffers (removing transparent padding and resizing proportionally)
      const base64CustomLogos: string[] = [];
      const maxLogoW = Math.round(clampedW * 0.16);
      const maxLogoH = Math.round(clampedH * 0.12);

      for (const logoBuf of activeCustomLogos) {
        const b64 = await processCustomLogo(logoBuf, maxLogoW, maxLogoH);
        if (b64) base64CustomLogos.push(b64);
      }

      // 1. Resize the OpenAI generated abstract wallpaper to the screen dimensions
      const screenBaseBuffer = await sharp(wallpaperBuffer)
        .resize(clampedW, clampedH, { fit: 'cover' })
        .png()
        .toBuffer();
      const base64Wallpaper = screenBaseBuffer.toString('base64');

      // 2. Create the unified SVG containing skewed background, headers, texts, and embedded skewed logos
      const textOverlaySvg = createScreenTextOverlaySvg(
        clampedW,
        clampedH,
        base64Wallpaper,
        finalTitle,
        finalSub,
        finalDate,
        finalVenue,
        finalFooter,
        screenTheme,
        base64CustomLogos,
        activeLogosList,
        skew
      );

      composites.push({
        input: textOverlaySvg,
        left: clampedX,
        top: clampedY,
      });
    };

    // Composite Center Screen
    const mainScreen = analysis.main_screen;
    if (mainScreen) {
      await addScreenComposite(
        mainScreen.bbox.x,
        mainScreen.bbox.y,
        mainScreen.bbox.width,
        mainScreen.bbox.height,
        'center'
      );
    }

    // Composite Left & Right Wings
    if (screenConfig === 'wings' || screenConfig === 'all') {
      const leftScreen = analysis.left_screen;
      if (leftScreen) {
        await addScreenComposite(
          leftScreen.bbox.x,
          leftScreen.bbox.y,
          leftScreen.bbox.width,
          leftScreen.bbox.height,
          'left'
        );
      }
      const rightScreen = analysis.right_screen;
      if (rightScreen) {
        await addScreenComposite(
          rightScreen.bbox.x,
          rightScreen.bbox.y,
          rightScreen.bbox.width,
          rightScreen.bbox.height,
          'right'
        );
      }
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
