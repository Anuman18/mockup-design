"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Maximize2, Trash2 } from 'lucide-react';

interface Coords { x: number; y: number; w: number; h: number; }

interface MultiScreenCoords {
  center: Coords | null;
  left: Coords | null;
  right: Coords | null;
}

interface AdminBoundingBoxProps {
  imageUrl: string;
  initialCoords?: MultiScreenCoords | null;
  /** Callback fired whenever any screen's coordinates change */
  onChange: (coords: MultiScreenCoords) => void;
}

type ScreenType = 'center' | 'left' | 'right';

export default function AdminBoundingBox({ imageUrl, initialCoords, onChange }: AdminBoundingBoxProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeScreen, setActiveScreen] = useState<ScreenType>('center');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

  const [screens, setScreens] = useState<MultiScreenCoords>({
    center: initialCoords?.center ?? null,
    left: initialCoords?.left ?? null,
    right: initialCoords?.right ?? null,
  });

  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });

  // Distribute config changes up
  const updateScreen = (type: ScreenType, coords: Coords | null) => {
    const updated = { ...screens, [type]: coords };
    setScreens(updated);
    onChange(updated);
  };

  const getDisplayCoords = (pixelCoords: Coords, canvas: HTMLCanvasElement): Coords => {
    if (!naturalSize.w || !naturalSize.h) return pixelCoords;
    const scaleX = canvas.width / naturalSize.w;
    const scaleY = canvas.height / naturalSize.h;
    return {
      x: pixelCoords.x * scaleX,
      y: pixelCoords.y * scaleY,
      w: pixelCoords.w * scaleX,
      h: pixelCoords.h * scaleY,
    };
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw active drawing box first
    if (isDrawing) {
      const x = Math.min(startPos.x, currentPos.x);
      const y = Math.min(startPos.y, currentPos.y);
      const w = Math.abs(startPos.x - currentPos.x);
      const h = Math.abs(startPos.y - currentPos.y);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.clearRect(x, y, w, h);
      ctx.strokeStyle = '#94a3b8';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);
      return;
    }

    // Color theme mapping for the screens
    const colors: Record<ScreenType, { border: string; bg: string; text: string; label: string }> = {
      center: { border: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)', text: '#1e40af', label: 'CENTER SCREEN' },
      left:   { border: '#7c3aed', bg: 'rgba(124, 58, 237, 0.1)', text: '#5b21b6', label: 'LEFT WING' },
      right:  { border: '#db2777', bg: 'rgba(219, 39, 119, 0.1)', text: '#9d174d', label: 'RIGHT WING' },
    };

    // Draw configured screens
    (Object.keys(screens) as ScreenType[]).forEach((type) => {
      const coordsVal = screens[type];
      if (coordsVal && naturalSize.w > 0) {
        const d = getDisplayCoords(coordsVal, canvas);
        const style = colors[type];
        const isActive = activeScreen === type;

        // Draw overlay container
        ctx.strokeStyle = style.border;
        ctx.lineWidth = isActive ? 3 : 1.5;
        ctx.setLineDash([]);
        ctx.strokeRect(d.x, d.y, d.w, d.h);

        ctx.fillStyle = isActive ? style.bg : 'rgba(148, 163, 184, 0.05)';
        ctx.fillRect(d.x, d.y, d.w, d.h);

        // Badge banner
        ctx.font = 'bold 9px sans-serif';
        ctx.fillStyle = style.border;
        const textLabel = `${style.label} (${coordsVal.w}x${coordsVal.h}px)`;
        const textWidth = ctx.measureText(textLabel).width;

        ctx.fillRect(d.x, d.y - 15 >= 0 ? d.y - 15 : d.y, textWidth + 8, 15);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(textLabel, d.x + 4, (d.y - 15 >= 0 ? d.y - 15 : d.y) + 11);
      }
    });
  };

  useEffect(() => { drawCanvas(); }, [screens, isDrawing, startPos, currentPos, naturalSize, activeScreen]);

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;
    drawCanvas();
  };

  useEffect(() => {
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [screens, naturalSize, activeScreen]);

  const handleImageLoad = () => {
    const img = imageRef.current;
    if (!img) return;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    resizeCanvas();
  };

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    setIsDrawing(true);
    setStartPos(pos);
    setCurrentPos(pos);
    updateScreen(activeScreen, null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setCurrentPos(getCanvasPos(e));
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    const canvas = canvasRef.current!;

    const dispX = Math.min(startPos.x, currentPos.x);
    const dispY = Math.min(startPos.y, currentPos.y);
    const dispW = Math.abs(startPos.x - currentPos.x);
    const dispH = Math.abs(startPos.y - currentPos.y);

    if (dispW > 8 && dispH > 8 && naturalSize.w > 0) {
      const scaleX = naturalSize.w / canvas.width;
      const scaleY = naturalSize.h / canvas.height;
      const pixelCoords: Coords = {
        x: Math.round(dispX * scaleX),
        y: Math.round(dispY * scaleY),
        w: Math.round(dispW * scaleX),
        h: Math.round(dispH * scaleY),
      };
      updateScreen(activeScreen, pixelCoords);
    }
    setIsDrawing(false);
  };

  return (
    <div className="space-y-3">
      {/* Target Screen Selector */}
      <div className="flex flex-wrap gap-2 items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex gap-1 bg-slate-150 rounded-xl p-1 text-xs">
          {(['center', 'left', 'right'] as ScreenType[]).map((type) => {
            const hasCoords = !!screens[type];
            const colorsMap = { center: 'text-blue-600', left: 'text-violet-600', right: 'text-pink-600' };
            const activeBgs = { center: 'bg-blue-600 text-white', left: 'bg-violet-600 text-white', right: 'bg-pink-600 text-white' };
            return (
              <button
                key={type}
                type="button"
                onClick={() => setActiveScreen(type)}
                className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${activeScreen === type ? activeBgs[type] : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <span className={`w-2 h-2 rounded-full ${activeScreen === type ? 'bg-white' : hasCoords ? (type === 'center' ? 'bg-blue-500' : type === 'left' ? 'bg-violet-500' : 'bg-pink-500') : 'bg-slate-350'}`} />
                {type} Screen {hasCoords && '✓'}
              </button>
            );
          })}
        </div>

        {screens[activeScreen] && (
          <button
            type="button"
            onClick={() => updateScreen(activeScreen, null)}
            className="text-[10px] text-red-500 hover:underline flex items-center gap-1 font-bold uppercase tracking-wider"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear {activeScreen}
          </button>
        )}
      </div>

      <div className="relative border border-slate-200 rounded-xl overflow-hidden cursor-crosshair bg-slate-50">
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Venue layout"
          onLoad={handleImageLoad}
          className="w-full h-auto select-none pointer-events-none block"
        />
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="absolute top-0 left-0 w-full h-full"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200/60 p-3 rounded-lg text-[11px]">
        {(['center', 'left', 'right'] as ScreenType[]).map((type) => {
          const c = screens[type];
          return (
            <div key={type} className={`p-2 rounded-lg border ${activeScreen === type ? 'border-slate-300 bg-white' : 'border-slate-200'}`}>
              <p className="font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center justify-between">
                <span>{type} Screen</span>
                {!c && <span className="text-[9px] text-slate-400 font-normal">None</span>}
              </p>
              {c ? (
                <div className="font-mono text-slate-600 space-y-0.5">
                  <p>X: {c.x}px, Y: {c.y}px</p>
                  <p>Size: {c.w}×{c.h}px</p>
                </div>
              ) : (
                <p className="text-slate-450 italic">Drag to draw</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
