import { prisma } from '../lib/db';
import sharp from 'sharp';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';

async function main() {
  console.log('Fetching halls...');
  const halls = await prisma.venueHall.findMany();
  
  const publicDir = path.join(process.cwd(), 'public', 'debug');
  await mkdir(publicDir, { recursive: true });

  for (const h of halls) {
    if (!h.baseImageUrl) continue;
    console.log(`Processing ${h.name} (ID: ${h.id})...`);
    
    let baseBuf: Buffer;
    if (h.baseImageUrl.startsWith('/')) {
      const { readFile } = await import('fs/promises');
      baseBuf = await readFile(path.join(process.cwd(), 'public', h.baseImageUrl));
    } else {
      const res = await fetch(h.baseImageUrl);
      const arrayBuf = await res.arrayBuffer();
      baseBuf = Buffer.from(arrayBuf);
    }
    
    const meta = await sharp(baseBuf).metadata();
    const W = meta.width ?? 1200;
    const H = meta.height ?? 800;
    
    // Draw red/green/blue outlines for center, left, right masks
    const svg = `
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        <!-- Center Mask (Red) -->
        ${h.centerMaskWidth > 0 ? `
          <rect x="${h.centerMaskX}" y="${h.centerMaskY}" width="${h.centerMaskWidth}" height="${h.centerMaskHeight}" fill="none" stroke="red" stroke-width="4"/>
          <text x="${h.centerMaskX + 10}" y="${h.centerMaskY + 25}" fill="red" font-size="20px" font-weight="bold">CENTER</text>
        ` : ''}
        
        <!-- Left Mask (Green) -->
        ${h.leftMaskWidth > 0 ? `
          <rect x="${h.leftMaskX}" y="${h.leftMaskY}" width="${h.leftMaskWidth}" height="${h.leftMaskHeight}" fill="none" stroke="green" stroke-width="4"/>
          <text x="${h.leftMaskX + 10}" y="${h.leftMaskY + 25}" fill="green" font-size="20px" font-weight="bold">LEFT</text>
        ` : ''}
        
        <!-- Right Mask (Blue) -->
        ${h.rightMaskWidth > 0 ? `
          <rect x="${h.rightMaskX}" y="${h.rightMaskY}" width="${h.rightMaskWidth}" height="${h.rightMaskHeight}" fill="none" stroke="blue" stroke-width="4"/>
          <text x="${h.rightMaskX + 10}" y="${h.rightMaskY + 25}" fill="blue" font-size="20px" font-weight="bold">RIGHT</text>
        ` : ''}
      </svg>
    `;
    
    const out = await sharp(baseBuf)
      .resize({ width: W, height: H, fit: 'inside' })
      .composite([{
        input: Buffer.from(svg),
        left: 0,
        top: 0
      }])
      .png()
      .toBuffer();
      
    const filename = `debug_hall_${h.id}.png`;
    await writeFile(path.join(publicDir, filename), out);
    console.log(`Saved ${filename}`);
  }
  
  console.log('Done!');
}

main().catch(console.error);
