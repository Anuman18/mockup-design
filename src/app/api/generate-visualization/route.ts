import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import sharp from 'sharp';

/**
 * Generates the base SVG layout for a screen of width W and height H,
 * containing styled corporate typography and a premium accent design.
 */
function createScreenBaseSvg(
  W: number,
  H: number,
  title: string,
  theme: 'light' | 'dark',
  hasLogo: boolean
): Buffer {
  const isDark = theme === 'dark';
  const cleanTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Premium corporate colors
  const stopColor1 = isDark ? '#0f172a' : '#ffffff';
  const stopColor2 = isDark ? '#1e293b' : '#f8fafc';
  const textColor  = isDark ? '#f8fafc' : '#0f172a';
  const accentColor = isDark ? '#38bdf8' : '#2563eb'; // Cyan glowing line in dark, Royal Blue in light

  // Responsive typography sizing
  const fontSize = Math.min(W * 0.058, H * 0.16, 42);

  // Layout lines
  let textBlock = '';
  if (cleanTitle.length > 22) {
    const mid = Math.floor(cleanTitle.length / 2);
    let splitIdx = cleanTitle.indexOf(' ', mid);
    if (splitIdx === -1) splitIdx = cleanTitle.lastIndexOf(' ', mid);
    if (splitIdx === -1) splitIdx = mid;

    const line1 = cleanTitle.substring(0, splitIdx).trim();
    const line2 = cleanTitle.substring(splitIdx).trim();

    // Vertically center lines, accounting for logo at the top if present
    const startY = hasLogo ? (H * 0.58) : (H * 0.48);

    textBlock = `
      <text x="50%" y="${startY}" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}px" font-weight="800" fill="${textColor}" text-anchor="middle" letter-spacing="-0.02em">
        <tspan x="50%" dy="0">${line1}</tspan>
        <tspan x="50%" dy="${fontSize + 8}">${line2}</tspan>
      </text>
    `;
  } else {
    const startY = hasLogo ? (H * 0.63) : (H * 0.54);
    textBlock = `
      <text x="50%" y="${startY}" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}px" font-weight="900" fill="${textColor}" text-anchor="middle" letter-spacing="-0.025em">${cleanTitle}</text>
    `;
  }

  // Accent highlight line below text
  const lineW = Math.min(W * 0.35, 180);
  const lineY = H * 0.82;

  const svg = `
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="screenGrad_${W}_${H}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${stopColor1}" />
          <stop offset="100%" stop-color="${stopColor2}" />
        </linearGradient>
      </defs>
      
      <!-- Panel Base -->
      <rect width="100%" height="100%" fill="url(#screenGrad_${W}_${H})" rx="4" />
      
      <!-- Subtle Tech grid effect for dark theme -->
      ${isDark ? `
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(56, 189, 248, 0.03)" stroke-width="1"/>
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" />
      ` : ''}
      
      <!-- Accent Line -->
      <rect x="${(W - lineW) / 2}" y="${lineY}" width="${lineW}" height="4" rx="2" fill="${accentColor}" opacity="0.85" />
      
      <!-- Event Typography -->
      ${textBlock}
    </svg>
  `;

  return Buffer.from(svg);
}

/**
 * Renders database template preset text logo badges inside SVG
 */
function createPresetLogosSvg(
  W: number,
  H: number,
  logos: string[],
  theme: 'light' | 'dark'
): Buffer {
  const N = logos.length;
  const isDark = theme === 'dark';
  const badgeBg = isDark ? 'rgba(30, 41, 59, 0.7)' : '#f8fafc';
  const badgeBorder = isDark ? '#334155' : '#cbd5e1';
  const badgeTextColor = isDark ? '#cbd5e1' : '#334155';

  let badgeW = Math.min(W * 0.18, 140);
  let badgeH = Math.min(H * 0.14, 38);
  let gap = Math.min(20, W * 0.03);

  const marginX = 20;
  const availableW = W - marginX * 2;
  const totalNeededW = N * badgeW + (N - 1) * gap;

  if (totalNeededW > availableW) {
    const scale = availableW / totalNeededW;
    badgeW = badgeW * scale;
    gap = gap * scale;
    badgeH = badgeH * scale;
  }

  let logoElements = '';
  if (N === 1) {
    const lx = W - badgeW - 15;
    const ly = 12;
    logoElements = `
      <rect x="${lx}" y="${ly}" width="${badgeW}" height="${badgeH}" rx="6" fill="${badgeBg}" stroke="${badgeBorder}" stroke-width="1"/>
      <text x="${lx + badgeW / 2}" y="${ly + badgeH / 2 + 4}" font-family="system-ui, sans-serif" font-size="${Math.max(8, badgeH * 0.35)}px" font-weight="bold" fill="${badgeTextColor}" text-anchor="middle">${logos[0]}</text>
    `;
  } else if (N > 1) {
    const rowW = N * badgeW + (N - 1) * gap;
    const startX = (W - rowW) / 2;
    const ly = 12;

    logoElements = logos.map((logo, i) => {
      const lx = startX + i * (badgeW + gap);
      return `
        <rect x="${lx}" y="${ly}" width="${badgeW}" height="${badgeH}" rx="6" fill="${badgeBg}" stroke="${badgeBorder}" stroke-width="1"/>
        <text x="${lx + badgeW / 2}" y="${ly + badgeH / 2 + 4}" font-family="system-ui, sans-serif" font-size="${Math.max(8, badgeH * 0.35)}px" font-weight="bold" fill="${badgeTextColor}" text-anchor="middle">${logo}</text>
      `;
    }).join('\n');
  }

  const svg = `
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      ${logoElements}
    </svg>
  `;
  return Buffer.from(svg);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const hallId      = formData.get('hallId') as string;
    const eventName   = formData.get('eventName') as string;
    const screenConfig = (formData.get('screenConfig') || 'center') as 'center' | 'wings' | 'all';
    const screenTheme  = (formData.get('screenTheme') || 'light') as 'light' | 'dark';
    const logosJson   = formData.get('logos') as string;
    const customLogo  = formData.get('customLogo') as File | null;

    if (!hallId || isNaN(parseInt(hallId, 10))) {
      return NextResponse.json({ error: 'Valid hallId is required' }, { status: 400 });
    }
    if (!eventName?.trim()) {
      return NextResponse.json({ error: 'Event Title is required' }, { status: 400 });
    }

    const logos: string[] = logosJson ? JSON.parse(logosJson) : [];
    const hasCustomLogo = customLogo && customLogo.size > 0;
    const hasLogos = hasCustomLogo || logos.length > 0;

    // Fetch venue hall
    const hall = await prisma.venueHall.findUnique({
      where: { id: parseInt(hallId, 10) },
    });
    if (!hall) {
      return NextResponse.json({ error: 'Hall not found' }, { status: 404 });
    }
    console.log('API RESOLVED HALL MASK COORDS:', {
      id: hall.id,
      name: hall.name,
      center: { x: hall.centerMaskX, y: hall.centerMaskY, w: hall.centerMaskWidth, h: hall.centerMaskHeight },
      left: { x: hall.leftMaskX, y: hall.leftMaskY, w: hall.leftMaskWidth, h: hall.leftMaskHeight },
      right: { x: hall.rightMaskX, y: hall.rightMaskY, w: hall.rightMaskWidth, h: hall.rightMaskHeight },
    });
    if (!hall.baseImageUrl) {
      return NextResponse.json({ error: 'This hall has no base image configured.' }, { status: 422 });
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
        return NextResponse.json({ error: `Failed to fetch base image: ${response.statusText}` }, { status: 502 });
      }
      const arrayBuf = await response.arrayBuffer();
      baseImageBuffer = Buffer.from(arrayBuf);
    }

    const baseMetadata = await sharp(baseImageBuffer).metadata();
    const baseW = baseMetadata.width ?? 1200;
    const baseH = baseMetadata.height ?? 800;

    // Prepare custom logo file buffer if uploaded
    let customLogoBuffer: Buffer | null = null;
    if (hasCustomLogo) {
      const arrayBuf = await customLogo.arrayBuffer();
      customLogoBuffer = Buffer.from(arrayBuf);
    }

    const composites: any[] = [];

    // Helper to generate composite screen layers
    const addScreenComposite = async (
      x: number,
      y: number,
      w: number,
      h: number
    ) => {
      if (!w || w <= 0 || !h || h <= 0) return;
      const clampedX = Math.max(0, Math.min(x, baseW - 1));
      const clampedY = Math.max(0, Math.min(y, baseH - 1));
      const clampedW = Math.max(1, Math.min(w, baseW - clampedX));
      const clampedH = Math.max(1, Math.min(h, baseH - clampedY));

      // 1. Create Base screen with text
      const baseSvg = createScreenBaseSvg(clampedW, clampedH, eventName, screenTheme, hasLogos);
      let screenSharp = sharp(baseSvg);

      // 2. Overlay Logo badges
      const innerComposites: any[] = [];

      if (customLogoBuffer) {
        // Option 1: Custom Logo File Uploaded (PNG/JPG)
        // Set badge dimensions based on screen size
        const badgeW = Math.round(Math.min(clampedW * 0.22, 140));
        const badgeH = Math.round(Math.min(clampedH * 0.16, 42));

        // Position: Top-right margin
        const lx = clampedW - badgeW - 15;
        const ly = 12;

        const resizedLogo = await sharp(customLogoBuffer)
          .resize({ width: badgeW, height: badgeH, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .toBuffer();

        innerComposites.push({
          input: resizedLogo,
          left: lx,
          top: ly,
        });
      } else if (logos.length > 0) {
        // Option 2: Preset database template text badges
        const presetsSvg = createPresetLogosSvg(clampedW, clampedH, logos, screenTheme);
        innerComposites.push({
          input: presetsSvg,
          left: 0,
          top: 0,
        });
      }

      let screenOverlayBuffer: Buffer;
      if (innerComposites.length > 0) {
        screenOverlayBuffer = await screenSharp
          .composite(innerComposites)
          .png()
          .toBuffer();
      } else {
        screenOverlayBuffer = await screenSharp.png().toBuffer();
      }

      composites.push({
        input: screenOverlayBuffer,
        left: clampedX,
        top: clampedY,
      });
    };

    // Composite according to screen configuration selector
    // 1. Center Screen
    await addScreenComposite(
      hall.centerMaskX,
      hall.centerMaskY,
      hall.centerMaskWidth,
      hall.centerMaskHeight
    );

    // 2. Left and Right Wing Screens
    if (screenConfig === 'wings' || screenConfig === 'all') {
      await addScreenComposite(
        hall.leftMaskX,
        hall.leftMaskY,
        hall.leftMaskWidth,
        hall.leftMaskHeight
      );
      await addScreenComposite(
        hall.rightMaskX,
        hall.rightMaskY,
        hall.rightMaskWidth,
        hall.rightMaskHeight
      );
    }

    if (composites.length === 0) {
      return NextResponse.json({
        error: `No screen coordinates defined for this hall. Please edit coordinates in the Admin panel.`
      }, { status: 422 });
    }

    // Composite all active screens onto the base image
    const compositedBuffer = await sharp(baseImageBuffer)
      .resize({ width: baseW, height: baseH, fit: 'inside' })
      .composite(composites)
      .png()
      .toBuffer();

    const base64 = compositedBuffer.toString('base64');
    return NextResponse.json({
      imageBase64: `data:image/png;base64,${base64}`,
      mimeType: 'image/png',
      hallName: hall.name,
      eventName: eventName,
      screensProcessed: composites.length,
    });

  } catch (error: any) {
    console.error('Compositing failed:', error);
    return NextResponse.json({ error: `Compositing failed: ${error.message}` }, { status: 500 });
  }
}
