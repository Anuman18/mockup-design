import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

export interface ScreenTemplate {
  polygon: [number, number][];
  bbox: { x: number; y: number; width: number; height: number };
  safe_area: { x: number; y: number; width: number; height: number };
}

export interface StageTemplateJson {
  main_screen: ScreenTemplate;
  left_screen: ScreenTemplate | null;
  right_screen: ScreenTemplate | null;
}

/**
 * Invokes OpenAI Vision API to detect stage screen layouts in an uploaded image.
 * Falls back to proportion-based defaults if API key is missing or call fails.
 */
export async function analyzeStageLayout(
  imageBuffer: Buffer,
  W: number,
  H: number
): Promise<StageTemplateJson> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      // Resize to a manageable size for vision API (max 800px width/height) to save tokens and avoid payload limit
      const resizedBuf = await sharp(imageBuffer)
        .resize({ width: 800, height: 800, fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();

      const base64Image = resizedBuf.toString('base64');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `You are a professional computer vision assistant specializing in event production stage layouts.
Analyze the uploaded image of width W=${W} and height H=${H}.
Identify and locate the coordinates of every LED display screen on the stage.

Find:
1. "main_screen" (Center LED screen)
2. "left_screen" (Left side wing screen, if present)
3. "right_screen" (Right side wing screen, if present)

For each screen:
1. Detect its 4 corner polygon vertices [[x,y], [x,y], [x,y], [x,y]] (order: top-left, top-right, bottom-right, bottom-left) in absolute pixel coordinates. Take into account any skewing, orientation, or perspective angle visible in the photo.
2. Detect its axis-aligned bounding box {"x": number, "y": number, "width": number, "height": number} in absolute pixels.

Output a raw JSON object ONLY. Do not wrap in markdown \`\`\`json blocks.
The JSON must follow this structure:
{
  "main_screen": {
    "polygon": [[x,y], [x,y], [x,y], [x,y]],
    "bbox": {"x": number, "y": number, "width": number, "height": number}
  },
  "left_screen": {
    "polygon": [[x,y], [x,y], [x,y], [x,y]],
    "bbox": {"x": number, "y": number, "width": number, "height": number}
  } | null,
  "right_screen": {
    "polygon": [[x,y], [x,y], [x,y], [x,y]],
    "bbox": {"x": number, "y": number, "width": number, "height": number}
  } | null
}`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const contentStr = data.choices?.[0]?.message?.content;
        if (contentStr) {
          const parsed = JSON.parse(contentStr);
          
          const buildScreenData = (screen: any): ScreenTemplate | null => {
            if (!screen || !screen.bbox || !screen.polygon) return null;
            
            // Calculate a safe area inside the screen (inward margin of 8% on all sides)
            const marginX = Math.round(screen.bbox.width * 0.08);
            const marginY = Math.round(screen.bbox.height * 0.08);
            
            return {
              polygon: screen.polygon,
              bbox: screen.bbox,
              safe_area: {
                x: screen.bbox.x + marginX,
                y: screen.bbox.y + marginY,
                width: Math.max(1, screen.bbox.width - marginX * 2),
                height: Math.max(1, screen.bbox.height - marginY * 2)
              }
            };
          };

          const result: StageTemplateJson = {
            main_screen: buildScreenData(parsed.main_screen)!,
            left_screen: buildScreenData(parsed.left_screen),
            right_screen: buildScreenData(parsed.right_screen)
          };

          if (result.main_screen) {
            return result;
          }
        }
      } else {
        const errText = await response.text();
        console.warn('OpenAI vision analyzer API failed:', errText);
      }
    } catch (err) {
      console.error('Error during OpenAI vision stage analysis:', err);
    }
  }

  // Fallback default coordinates if OpenAI is offline or model fails
  console.log('Using fallback default coordinates for stage layout...');
  const mainBbox = {
    x: Math.round(W * 0.25),
    y: Math.round(H * 0.22),
    width: Math.round(W * 0.50),
    height: Math.round(H * 0.50)
  };
  const leftBbox = {
    x: Math.round(W * 0.05),
    y: Math.round(H * 0.28),
    width: Math.round(W * 0.18),
    height: Math.round(H * 0.40)
  };
  const rightBbox = {
    x: Math.round(W * 0.77),
    y: Math.round(H * 0.28),
    width: Math.round(W * 0.18),
    height: Math.round(H * 0.40)
  };

  const getPoly = (bb: any, skew = 0) => [
    [bb.x, bb.y],
    [bb.x + bb.width, bb.y + skew],
    [bb.x + bb.width, bb.y + bb.height + skew],
    [bb.x, bb.y + bb.height]
  ] as [number, number][];

  return {
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
    left_screen: {
      polygon: getPoly(leftBbox, 8),
      bbox: leftBbox,
      safe_area: {
        x: Math.round(leftBbox.x + leftBbox.width * 0.08),
        y: Math.round(leftBbox.y + leftBbox.height * 0.08),
        width: Math.round(leftBbox.width * 0.84),
        height: Math.round(leftBbox.height * 0.84)
      }
    },
    right_screen: {
      polygon: getPoly(rightBbox, -8),
      bbox: rightBbox,
      safe_area: {
        x: Math.round(rightBbox.x + rightBbox.width * 0.08),
        y: Math.round(rightBbox.y + rightBbox.height * 0.08),
        width: Math.round(rightBbox.width * 0.84),
        height: Math.round(rightBbox.height * 0.84)
      }
    }
  };
}

export async function saveStageTemplateJson(hallId: number, template: StageTemplateJson) {
  const dir = join(process.cwd(), 'public', 'uploads', 'templates');
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `hall_${hallId}.json`), JSON.stringify(template, null, 2), 'utf-8');
}

export async function loadStageTemplateJson(hallId: number, W?: number, H?: number): Promise<StageTemplateJson | null> {
  const path = join(process.cwd(), 'public', 'uploads', 'templates', `hall_${hallId}.json`);
  try {
    const data = await readFile(path, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (W && H) {
      // Return fresh defaults based on W and H
      const mainBbox = {
        x: Math.round(W * 0.25),
        y: Math.round(H * 0.22),
        width: Math.round(W * 0.50),
        height: Math.round(H * 0.50)
      };
      return {
        main_screen: {
          polygon: [[mainBbox.x, mainBbox.y], [mainBbox.x + mainBbox.width, mainBbox.y], [mainBbox.x + mainBbox.width, mainBbox.y + mainBbox.height], [mainBbox.x, mainBbox.y + mainBbox.height]],
          bbox: mainBbox,
          safe_area: {
            x: Math.round(mainBbox.x + mainBbox.width * 0.08),
            y: Math.round(mainBbox.y + mainBbox.height * 0.08),
            width: Math.round(mainBbox.width * 0.84),
            height: Math.round(mainBbox.height * 0.84)
          }
        },
        left_screen: null,
        right_screen: null
      };
    }
    return null;
  }
}
