import { NextResponse } from 'next/server';
import { readDB } from '@/lib/db';
import sharp from 'sharp';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { venue_id, base_image_base64, banner_base64, mask_x, mask_y, mask_w, mask_h } = body;

    if (!banner_base64) {
      return NextResponse.json({ error: 'Banner Base64 data is required' }, { status: 400 });
    }

    if (!venue_id && !base_image_base64) {
      return NextResponse.json({ error: 'Either Venue ID or Base Image Base64 data is required' }, { status: 400 });
    }

    let baseImageBuffer: Buffer;
    let venue: any = null;

    if (base_image_base64) {
      try {
        const base64Data = base_image_base64.replace(/^data:image\/\w+;base64,/, "");
        baseImageBuffer = Buffer.from(base64Data, 'base64');
      } catch (decodeErr: any) {
        return NextResponse.json({ error: 'Failed decoding base venue image base64 data.' }, { status: 400 });
      }
    } else {
      // Load venue metadata
      const db = readDB();
      venue = db.venues.find(v => v.id === Number(venue_id));
      if (!venue) {
        return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
      }

      const baseImageUrl = venue.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80';

      // Fetch the base venue image buffer
      try {
        if (baseImageUrl.startsWith('/uploads/')) {
          const fs = require('fs');
          const path = require('path');
          const localPath = path.join(process.cwd(), 'public', baseImageUrl);
          baseImageBuffer = fs.readFileSync(localPath);
        } else {
          const response = await fetch(baseImageUrl);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const arrayBuffer = await response.arrayBuffer();
          baseImageBuffer = Buffer.from(arrayBuffer);
        }
      } catch (fetchErr: any) {
        return NextResponse.json({ 
          error: `Failed to load base venue image: ${fetchErr.message}.` 
        }, { status: 500 });
      }
    }

    // 2. Decode the user's banner base64 string
    let bannerBuffer: Buffer;
    try {
      const base64Data = banner_base64.replace(/^data:image\/\w+;base64,/, "");
      bannerBuffer = Buffer.from(base64Data, 'base64');
    } catch (decodeErr: any) {
      return NextResponse.json({ error: 'Failed decoding event banner base64 data.' }, { status: 400 });
    }

    // 3. Automated Computer Vision Scan to detect white screen placeholder
    // Fetch raw pixel array
    const baseSharp = sharp(baseImageBuffer);
    const { data: rawPixels, info } = await baseSharp
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;
    const channels = info.channels;

    // 3. Grid-Density Maximal Rectangle Detection Solver
    const S = 8; // block size in pixels
    const scanHeightLimit = Math.round(height * 0.70);
    const gridW = Math.floor(width / S);
    const gridH = Math.floor(scanHeightLimit / S);

    // Initialize 2D grid
    const grid: number[][] = Array(gridH).fill(0).map(() => Array(gridW).fill(0));

    // Fill grid density based on cool-white screen threshold matching
    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        let whitePixelsInBlock = 0;
        const startY = gy * S;
        const startX = gx * S;

        for (let dy = 0; dy < S; dy++) {
          for (let dx = 0; dx < S; dx++) {
            const py = startY + dy;
            const px = startX + dx;
            
            // Check boundary limits
            if (py >= height || px >= width) continue;

            const index = (py * width + px) * channels;
            const r = rawPixels[index];
            const g = rawPixels[index + 1];
            const b = rawPixels[index + 2];

            if (r >= 200 && g >= 215 && b >= 215) {
              whitePixelsInBlock++;
            }
          }
        }

        // Cell is active if at least 40% of its pixels are white/light screen
        const densityRatio = whitePixelsInBlock / (S * S);
        if (densityRatio >= 0.40) {
          grid[gy][gx] = 1;
        }
      }
    }

    // Solve for the maximal rectangle of 1s in the binary grid matrix
    let maxArea = 0;
    let bestStartX = 0;
    let bestStartY = 0;
    let bestEndX = -1;
    let bestEndY = -1;

    const heights = Array(gridW).fill(0);

    for (let r = 0; r < gridH; r++) {
      for (let c = 0; c < gridW; c++) {
        if (grid[r][c] === 1) {
          heights[c]++;
        } else {
          heights[c] = 0;
        }
      }

      // Largest rectangle in histogram solver using monotonic stack
      const stack: number[] = [];
      let i = 0;
      while (i < gridW) {
        if (stack.length === 0 || heights[i] >= heights[stack[stack.length - 1]]) {
          stack.push(i);
          i++;
        } else {
          const tp = stack.pop()!;
          const h = heights[tp];
          const w = stack.length === 0 ? i : i - stack[stack.length - 1] - 1;
          const area = h * w;
          if (area > maxArea) {
            maxArea = area;
            bestEndX = i - 1;
            bestStartX = stack.length === 0 ? 0 : stack[stack.length - 1] + 1;
            bestEndY = r;
            bestStartY = r - h + 1;
          }
        }
      }
      while (stack.length > 0) {
        const tp = stack.pop()!;
        const h = heights[tp];
        const w = stack.length === 0 ? i : i - stack[stack.length - 1] - 1;
        const area = h * w;
        if (area > maxArea) {
          maxArea = area;
          bestEndX = i - 1;
          bestStartX = stack.length === 0 ? 0 : stack[stack.length - 1] + 1;
          bestEndY = r;
          bestStartY = r - h + 1;
        }
      }
    }

    let destX = 0;
    let destY = 0;
    let destW = 0;
    let destH = 0;
    let detectionMethod = 'Grid-Density Segmentation';

    // Check if custom user coordinates are provided from the canvas editor
    if (mask_w !== undefined && mask_h !== undefined && Number(mask_w) > 0 && Number(mask_h) > 0) {
      detectionMethod = 'Custom Bounding Box';
      destX = Math.round((Number(mask_x) / 100) * width);
      destY = Math.round((Number(mask_y) / 100) * height);
      destW = Math.round((Number(mask_w) / 100) * width);
      destH = Math.round((Number(mask_h) / 100) * height);
    } else if (maxArea >= 15 && bestEndX >= bestStartX && bestEndY >= bestStartY) {
      // Verify if we found a reasonably sized screen area (at least 15 grid blocks)
      destX = bestStartX * S;
      destY = bestStartY * S;
      destW = (bestEndX - bestStartX + 1) * S;
      destH = (bestEndY - bestStartY + 1) * S;
    } else {
      // Fall back to stored coordinates if no screen detected automatically
      detectionMethod = 'Manual Bounding Box Fallback';
      const fallback_x = venue ? (venue.mask_x ? venue.mask_x : 20) : 20;
      const fallback_y = venue ? (venue.mask_y ? venue.mask_y : 15) : 15;
      const fallback_w = venue ? (venue.mask_w ? venue.mask_w : 60) : 60;
      const fallback_h = venue ? (venue.mask_h ? venue.mask_h : 40) : 40;

      destX = Math.round((fallback_x / 100) * width);
      destY = Math.round((fallback_y / 100) * height);
      destW = Math.round((fallback_w / 100) * width);
      destH = Math.round((fallback_h / 100) * height);
    }

    // Strict boundary validation to prevent 0 width/height errors in sharp
    if (destW <= 0 || destH <= 0 || isNaN(destW) || isNaN(destH)) {
      detectionMethod = 'Emergency Auto Center Fallback';
      destW = Math.max(10, Math.round(width * 0.6));
      destH = Math.max(10, Math.round(height * 0.4));
      destX = Math.max(0, Math.round((width - destW) / 2));
      destY = Math.max(0, Math.round((height - destH) / 2));
    }

    // 4. Resize user banner to match target screen pixel dimensions
    const resizedBannerBuffer = await sharp(bannerBuffer)
      .resize(destW, destH, { fit: 'fill' })
      .toBuffer();

    // 5. Composite overlay banner onto the base venue image
    // Instantiating a fresh sharp instance to prevent raw buffer rendering issues
    const compositedBuffer = await sharp(baseImageBuffer)
      .composite([{
        input: resizedBannerBuffer,
        left: destX,
        top: destY
      }])
      .png()
      .toBuffer();

    const outputBase64 = `data:image/png;base64,${compositedBuffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      composited_image: outputBase64,
      details: {
        method: detectionMethod,
        detected_white_pixels: maxArea,
        base_resolution: `${width}x${height}px`,
        overlay_box: { x: destX, y: destY, w: destW, h: destH }
      }
    });

  } catch (error: any) {
    console.error('Compositing failed:', error);
    return NextResponse.json({ error: `Compositing failed: ${error.message}` }, { status: 500 });
  }
}
