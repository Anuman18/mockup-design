"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Sparkles, Maximize2, Trash2 } from 'lucide-react';

interface AdminBoundingBoxProps {
  imageUrl: string;
  onSave: (coords: { x: number; y: number; w: number; h: number }) => void;
}

export default function AdminBoundingBox({ imageUrl, onSave }: AdminBoundingBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  
  // Percentage coordinates
  const [coords, setCoords] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Redraw canvas overlay whenever drawing states change
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (coords) {
      // Draw saved coordinates bounding box
      const x = (coords.x / 100) * canvas.width;
      const y = (coords.y / 100) * canvas.height;
      const w = (coords.w / 100) * canvas.width;
      const h = (coords.h / 100) * canvas.height;

      // Dark translucent backdrop overlay excluding the screen box (mask out)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.clearRect(x, y, w, h);

      // Draw bounding box borders
      ctx.strokeStyle = '#2563eb'; // Royal Blue Accent
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Inner glow indicator
      ctx.fillStyle = 'rgba(37, 99, 235, 0.1)';
      ctx.fillRect(x, y, w, h);

      // Label badge text
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(x, y - 20 >= 0 ? y - 20 : 0, 95, 18);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('WHITE SCREEN MASK', x + 5, (y - 20 >= 0 ? y - 20 : 0) + 12);
    } else if (isDrawing) {
      // Draw live drawing box
      const x = Math.min(startPos.x, currentPos.x);
      const y = Math.min(startPos.y, currentPos.y);
      const w = Math.abs(startPos.x - currentPos.x);
      const h = Math.abs(startPos.y - currentPos.y);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.clearRect(x, y, w, h);

      ctx.strokeStyle = '#475569';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [coords, isDrawing, startPos, currentPos]);

  // Adjust canvas size to match visual image size on layout resize
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
  }, [coords]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentPos({ x, y });
    setCoords(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentPos({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const w = Math.abs(startPos.x - currentPos.x);
    const h = Math.abs(startPos.y - currentPos.y);

    // Save as percentages
    if (w > 10 && h > 10) {
      const xPercent = Math.round((x / canvas.width) * 100);
      const yPercent = Math.round((y / canvas.height) * 100);
      const wPercent = Math.round((w / canvas.width) * 100);
      const hPercent = Math.round((h / canvas.height) * 100);

      const computedCoords = { x: xPercent, y: yPercent, w: wPercent, h: hPercent };
      setCoords(computedCoords);
      onSave(computedCoords);
    }
    setIsDrawing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Maximize2 className="w-3.5 h-3.5 text-slate-400" /> Bounding Box Selector
        </span>
        {coords && (
          <button
            type="button"
            onClick={() => {
              setCoords(null);
              onSave({ x: 0, y: 0, w: 0, h: 0 });
            }}
            className="text-[10px] text-red-500 hover:underline flex items-center gap-1 font-bold uppercase tracking-wider"
          >
            <Trash2 className="w-3 h-3" /> Clear Box
          </button>
        )}
      </div>

      {/* Canvas Wrap Box */}
      <div 
        ref={containerRef} 
        className="relative border border-slate-200 rounded-xl overflow-hidden cursor-crosshair bg-slate-50 flex items-center justify-center"
      >
        <img 
          ref={imageRef}
          src={imageUrl} 
          alt="Venue screen layout selection" 
          onLoad={resizeCanvas}
          className="max-w-full h-auto select-none pointer-events-none"
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
        <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-200/60 p-3 rounded-lg text-center text-xs">
          <div>
            <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider">Start X</span>
            <span className="font-mono font-semibold text-slate-700">{coords.x}%</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider">Start Y</span>
            <span className="font-mono font-semibold text-slate-700">{coords.y}%</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider">Width</span>
            <span className="font-mono font-semibold text-slate-700">{coords.w}%</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider">Height</span>
            <span className="font-mono font-semibold text-slate-700">{coords.h}%</span>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-slate-450 italic leading-snug">
          Click and drag directly on the venue backdrop image above to define the boundaries of the white placeholder screen mask.
        </p>
      )}
    </div>
  );
}
