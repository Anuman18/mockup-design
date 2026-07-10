"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Maximize2, Trash2 } from 'lucide-react';

interface Coords { x: number; y: number; w: number; h: number; }

interface AdminBoundingBoxProps {
  imageUrl: string;
  initialCoords?: Coords | null;
  /** Called with PIXEL coordinates relative to the natural image size */
  onSave: (coords: Coords) => void;
}

export default function AdminBoundingBox({ imageUrl, initialCoords, onSave }: AdminBoundingBoxProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [coords, setCoords] = useState<Coords | null>(initialCoords ?? null);
  // naturalWidth/Height of the loaded image
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });

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

    if (coords && naturalSize.w > 0) {
      const d = getDisplayCoords(coords, canvas);
      // Dark overlay
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.clearRect(d.x, d.y, d.w, d.h);
      // Box stroke
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(d.x, d.y, d.w, d.h);
      // Inner highlight
      ctx.fillStyle = 'rgba(37,99,235,0.12)';
      ctx.fillRect(d.x, d.y, d.w, d.h);
      // Label
      ctx.font = 'bold 11px sans-serif';
      const labelY = d.y >= 22 ? d.y - 4 : d.y + d.h + 16;
      ctx.fillStyle = '#2563eb';
      ctx.fillText(`Screen Zone  [${coords.w}×${coords.h} px]`, d.x + 4, labelY);
    } else if (isDrawing) {
      const x = Math.min(startPos.x, currentPos.x);
      const y = Math.min(startPos.y, currentPos.y);
      const w = Math.abs(startPos.x - currentPos.x);
      const h = Math.abs(startPos.y - currentPos.y);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.clearRect(x, y, w, h);
      ctx.strokeStyle = '#94a3b8';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);
    }
  };

  useEffect(() => { drawCanvas(); }, [coords, isDrawing, startPos, currentPos, naturalSize]);

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
  }, [coords, naturalSize]);

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
    setCoords(null);
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
      // Convert display px → natural image px
      const scaleX = naturalSize.w / canvas.width;
      const scaleY = naturalSize.h / canvas.height;
      const pixelCoords: Coords = {
        x: Math.round(dispX * scaleX),
        y: Math.round(dispY * scaleY),
        w: Math.round(dispW * scaleX),
        h: Math.round(dispH * scaleY),
      };
      setCoords(pixelCoords);
      onSave(pixelCoords);
    }
    setIsDrawing(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Maximize2 className="w-3.5 h-3.5 text-blue-500" /> Drag to define screen zone
        </span>
        {coords && (
          <button
            type="button"
            onClick={() => { setCoords(null); onSave({ x: 0, y: 0, w: 0, h: 0 }); }}
            className="text-[10px] text-red-500 hover:underline flex items-center gap-1 font-bold uppercase tracking-wider"
          >
            <Trash2 className="w-3 h-3" /> Clear
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

      {coords ? (
        <div className="grid grid-cols-4 gap-2 bg-blue-50 border border-blue-100 p-3 rounded-lg text-center text-xs">
          {[['X', coords.x], ['Y', coords.y], ['Width', coords.w], ['Height', coords.h]].map(([label, val]) => (
            <div key={label as string}>
              <span className="text-blue-400 block text-[9px] font-bold uppercase tracking-wider">{label}</span>
              <span className="font-mono font-semibold text-blue-700">{val}px</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-slate-400 italic">
          Click and drag on the image above to define the white screen bounding box.
        </p>
      )}
    </div>
  );
}
