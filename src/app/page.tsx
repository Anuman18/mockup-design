"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, Building2, Layers, ChevronRight, ChevronLeft,
  Sparkles, Loader2, Check, Download, Eye,
  Calendar, Type, Star, Palette, Layout, X, Upload, Info,
  Image as ImageIcon
} from 'lucide-react';

interface City    { id: number; name: string; state: string; }
interface Venue   { id: number; cityId: number; name: string; address: string; }
interface Hall    { id: number; venueId: number; name: string; length: number; width: number; height: number; capacity: number; baseImageUrl?: string | null; floorPlanUrl?: string | null; refPhotoUrl1?: string | null; refPhotoUrl2?: string | null; centerMaskX: number; centerMaskY: number; centerMaskWidth: number; centerMaskHeight: number; leftMaskX: number; leftMaskY: number; leftMaskWidth: number; leftMaskHeight: number; rightMaskX: number; rightMaskY: number; rightMaskWidth: number; rightMaskHeight: number; }
interface Template{ id: number; name: string; value: string; }
interface Logo    { id: number; logoName: string; }
interface Branding{ id: number; templateName: string; logos: Logo[]; }

const STEP_LABELS = ['Venue Selection', 'Layout Setup', 'Theme & Branding', 'Generate'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEP_LABELS.map((label, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${i < current ? 'bg-blue-600 text-white' : i === current ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-slate-100 text-slate-400'}`}>
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-[11px] mt-1.5 font-semibold tracking-wide ${i === current ? 'text-blue-600' : 'text-slate-400'}`}>{label}</span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div className={`h-0.5 w-16 mx-1 mb-5 transition-all duration-500 ${i < current ? 'bg-blue-600' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function SelectCard({ label, sub, selected, onClick, icon }: { label: string; sub?: string; selected: boolean; onClick: () => void; icon?: React.ReactNode; }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-3 group ${selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'}`}
    >
      {icon && <div className={`mt-0.5 shrink-0 ${selected ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'}`}>{icon}</div>}
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${selected ? 'text-blue-700' : 'text-slate-700'}`}>{label}</p>
        {sub && <p className={`text-xs mt-0.5 truncate ${selected ? 'text-blue-500' : 'text-slate-400'}`}>{sub}</p>}
      </div>
      {selected && <Check className="w-4 h-4 text-blue-600 ml-auto shrink-0 mt-0.5" />}
    </button>
  );
}

function StyleCard({ label, selected, onClick, svgIcon }: { label: string; selected: boolean; onClick: () => void; svgIcon: React.ReactNode; }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-3 text-center group ${selected ? 'border-blue-500 bg-blue-50/40 shadow-md shadow-blue-100' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'}`}
    >
      <div className={`w-16 h-12 flex items-center justify-center rounded-lg border bg-slate-50 transition-all ${selected ? 'border-blue-350 bg-blue-50/70' : 'border-slate-200'}`}>
        {svgIcon}
      </div>
      <span className={`text-[11px] font-bold leading-tight uppercase tracking-wider ${selected ? 'text-blue-700' : 'text-slate-600'}`}>{label}</span>
      {selected && <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>}
    </button>
  );
}

// ─── Stage Blueprint Vector Drawings ─────────────────────────────────────────
const STAGE_SVGS: Record<string, React.ReactNode> = {
  'Royal Staggered Wood Set': (
    <svg className="w-12 h-8 text-slate-500" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="16" width="40" height="10" rx="1" fill="#e2e8f0" stroke="currentColor" strokeWidth="1" />
      <rect x="8" y="10" width="32" height="6" rx="1" fill="#cbd5e1" stroke="currentColor" strokeWidth="1" />
      <rect x="14" y="4" width="20" height="6" rx="1" fill="#94a3b8" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
  'Seamless Gloss Acrylic Set': (
    <svg className="w-12 h-8 text-slate-500" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="24" cy="18" rx="20" ry="8" fill="#e2e8f0" stroke="currentColor" strokeWidth="1" />
      <ellipse cx="24" cy="14" rx="14" ry="5" fill="#cbd5e1" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
  'LED Digital Backdrop Truss': (
    <svg className="w-12 h-8 text-slate-500" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="22" width="44" height="6" fill="#cbd5e1" stroke="currentColor" strokeWidth="1" />
      <line x1="6" y1="4" x2="6" y2="22" stroke="currentColor" strokeWidth="1.5" />
      <line x1="42" y1="4" x2="42" y2="22" stroke="currentColor" strokeWidth="1.5" />
      <line x1="6" y1="4" x2="42" y2="4" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="8" width="28" height="14" fill="#e2e8f0" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
  'Natural Bamboo & Floral': (
    <svg className="w-12 h-8 text-slate-500" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="16" width="36" height="10" rx="4" fill="#f1f5f9" stroke="currentColor" strokeWidth="1" />
      <circle cx="10" cy="10" r="4" fill="#cbd5e1" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="38" cy="10" r="4" fill="#cbd5e1" stroke="currentColor" strokeWidth="0.75" />
      <path d="M 6 22 Q 12 18 18 22 T 30 22 T 42 22" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
  'Minimalist White Riser': (
    <svg className="w-12 h-8 text-slate-500" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="12" width="32" height="12" rx="1" fill="#f8fafc" stroke="currentColor" strokeWidth="1" />
      <line x1="8" y1="18" x2="40" y2="18" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  )
};

// ─── Seating Blueprint Vector Drawings ───────────────────────────────────────
const SEATING_SVGS: Record<string, React.ReactNode> = {
  'Theatre Rows Layout': (
    <svg className="w-12 h-8 text-slate-500" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="8" r="1.5" fill="currentColor" /><circle cx="18" cy="8" r="1.5" fill="currentColor" /><circle cx="26" cy="8" r="1.5" fill="currentColor" /><circle cx="34" cy="8" r="1.5" fill="currentColor" /><circle cx="42" cy="8" r="1.5" fill="currentColor" />
      <circle cx="10" cy="16" r="1.5" fill="currentColor" /><circle cx="18" cy="16" r="1.5" fill="currentColor" /><circle cx="26" cy="16" r="1.5" fill="currentColor" /><circle cx="34" cy="16" r="1.5" fill="currentColor" /><circle cx="42" cy="16" r="1.5" fill="currentColor" />
      <circle cx="10" cy="24" r="1.5" fill="currentColor" /><circle cx="18" cy="24" r="1.5" fill="currentColor" /><circle cx="26" cy="24" r="1.5" fill="currentColor" /><circle cx="34" cy="24" r="1.5" fill="currentColor" /><circle cx="42" cy="24" r="1.5" fill="currentColor" />
    </svg>
  ),
  'Cluster Round Tables (Banquet)': (
    <svg className="w-12 h-8 text-slate-500" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="10" r="5" fill="#cbd5e1" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="14" cy="3" r="1" fill="currentColor" /><circle cx="8" cy="10" r="1" fill="currentColor" /><circle cx="14" cy="17" r="1" fill="currentColor" /><circle cx="20" cy="10" r="1" fill="currentColor" />
      <circle cx="34" cy="20" r="5" fill="#cbd5e1" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="34" cy="13" r="1" fill="currentColor" /><circle cx="28" cy="20" r="1" fill="currentColor" /><circle cx="34" cy="27" r="1" fill="currentColor" /><circle cx="40" cy="20" r="1" fill="currentColor" />
    </svg>
  ),
  'Classroom Desks Layout': (
    <svg className="w-12 h-8 text-slate-500" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="14" height="3" fill="#cbd5e1" stroke="currentColor" strokeWidth="0.5" />
      <circle cx="10" cy="13" r="1" fill="currentColor" /><circle cx="16" cy="13" r="1" fill="currentColor" />
      <rect x="28" y="6" width="14" height="3" fill="#cbd5e1" stroke="currentColor" strokeWidth="0.5" />
      <circle cx="32" cy="13" r="1" fill="currentColor" /><circle cx="38" cy="13" r="1" fill="currentColor" />
      <rect x="6" y="18" width="14" height="3" fill="#cbd5e1" stroke="currentColor" strokeWidth="0.5" />
      <circle cx="10" cy="25" r="1" fill="currentColor" /><circle cx="16" cy="25" r="1" fill="currentColor" />
    </svg>
  ),
  'U-Shape Conference': (
    <svg className="w-12 h-8 text-slate-500" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M 12 8 L 12 24 L 36 24 L 36 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="8" cy="10" r="1" fill="currentColor" /><circle cx="8" cy="17" r="1" fill="currentColor" /><circle cx="8" cy="24" r="1" fill="currentColor" />
      <circle cx="16" cy="28" r="1" fill="currentColor" /><circle cx="24" cy="28" r="1" fill="currentColor" /><circle cx="32" cy="28" r="1" fill="currentColor" />
      <circle cx="40" cy="10" r="1" fill="currentColor" /><circle cx="40" cy="17" r="1" fill="currentColor" /><circle cx="40" cy="24" r="1" fill="currentColor" />
    </svg>
  ),
  'Cocktail Standing': (
    <svg className="w-12 h-8 text-slate-500" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="2.5" fill="#e2e8f0" stroke="currentColor" strokeWidth="0.5" />
      <circle cx="26" cy="22" r="2.5" fill="#e2e8f0" stroke="currentColor" strokeWidth="0.5" />
      <circle cx="38" cy="8" r="2.5" fill="#e2e8f0" stroke="currentColor" strokeWidth="0.5" />
      <circle cx="18" cy="26" r="1" fill="currentColor" /><circle cx="32" cy="12" r="1" fill="currentColor" /><circle cx="44" cy="18" r="1" fill="currentColor" />
    </svg>
  )
};

export default function HomePage() {
  const [step, setStep] = useState(0);

  // Data state
  const [cities,     setCities]     = useState<City[]>([]);
  const [venues,     setVenues]     = useState<Venue[]>([]);
  const [halls,      setHalls]      = useState<Hall[]>([]);
  const [selCity,    setSelCity]    = useState<City | null>(null);
  const [selVenue,   setSelVenue]   = useState<Venue | null>(null);
  const [selHall,    setSelHall]    = useState<Hall | null>(null);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [loadingHalls,  setLoadingHalls]  = useState(false);

  // Technical layout details view tabs
  const [techViewTab, setTechViewTab] = useState<'base' | 'blueprint' | 'gallery'>('base');

  // Setup options
  const [stages,    setStages]    = useState<Template[]>([]);
  const [seatings,  setSeatings]  = useState<Template[]>([]);
  const [selStage,  setSelStage]  = useState<Template | null>(null);
  const [selSeating,setSelSeating]= useState<Template | null>(null);

  // Branding options
  const [brandings,       setBrandings]       = useState<Branding[]>([]);
  const [selBranding,     setSelBranding]     = useState<Branding | null>(null);
  const [selectedLogos,   setSelectedLogos]   = useState<string[]>([]);
  
  // New visual branding inputs
  const [eventName,       setEventName]       = useState('');
  const [eventSubtitle,   setEventSubtitle]   = useState('');
  const [eventDate,       setEventDate]       = useState('');
  const [eventVenue,      setEventVenue]      = useState('');
  const [footerText,      setFooterText]      = useState('');
  const [screenConfig,    setScreenConfig]    = useState<'center' | 'wings' | 'all'>('center');
  const [screenTheme,     setScreenTheme]     = useState<'light' | 'dark'>('light');
  const [wingDisplayMode, setWingDisplayMode] = useState<'mirror' | 'extended'>('mirror');

  // Multiple Custom Logos
  const [customLogoFiles, setCustomLogoFiles] = useState<{ id: string; file: File; preview: string; }[]>([]);

  // Visualization Generation
  const [generating,  setGenerating]  = useState(false);
  const [resultImage, setResultImage] = useState('');
  const [simulationImage, setSimulationImage] = useState('');
  const [genMode,     setGenMode]     = useState<'composite' | 'simulation'>('composite');
  const [genError,    setGenError]    = useState('');

  useEffect(() => {
    fetch('/api/cities').then(r => r.json()).then(d => setCities(Array.isArray(d) ? d : []));
    fetch('/api/templates').then(r => r.json()).then(d => {
      setStages(Array.isArray(d.stages) ? d.stages : []);
      setSeatings(Array.isArray(d.seatings) ? d.seatings : []);
    });
    fetch('/api/brandings').then(r => r.json()).then(d => setBrandings(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    if (!selCity) { setVenues([]); setSelVenue(null); setHalls([]); setSelHall(null); return; }
    setLoadingVenues(true);
    fetch(`/api/venues?cityId=${selCity.id}`).then(r => r.json()).then(d => {
      setVenues(Array.isArray(d) ? d : []);
      setSelVenue(null); setHalls([]); setSelHall(null);
      setLoadingVenues(false);
    });
  }, [selCity]);

  useEffect(() => {
    if (!selVenue) { setHalls([]); setSelHall(null); return; }
    setLoadingHalls(true);
    fetch(`/api/halls?venueId=${selVenue.id}`).then(r => r.json()).then(d => {
      setHalls(Array.isArray(d) ? d : []);
      setSelHall(null);
      setLoadingHalls(false);
    });
  }, [selVenue]);

  // Set initial logos when template is selected
  useEffect(() => {
    if (selBranding) {
      setSelectedLogos(selBranding.logos.map(l => l.logoName));
    } else {
      setSelectedLogos([]);
    }
  }, [selBranding]);

  // Auto-populate venue text field when hall is selected
  useEffect(() => {
    if (selHall && selVenue) {
      setEventVenue(`${selVenue.name}, ${selCity?.name ?? ''}`);
    }
  }, [selHall]);

  const handleLogoToggle = (logoName: string) => {
    setSelectedLogos(prev =>
      prev.includes(logoName) ? prev.filter(l => l !== logoName) : [...prev, logoName]
    );
  };

  const handleCustomLogoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const list = Array.from(files);
    const mapped = list.map(f => ({
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      file: f,
      preview: URL.createObjectURL(f)
    }));
    setCustomLogoFiles(prev => [...prev, ...mapped].slice(0, 5)); // cap at 5 logos
    setSelBranding(null);
    setSelectedLogos([]);
  };

  const removeCustomLogo = (id: string) => {
    setCustomLogoFiles(prev => prev.filter(item => item.id !== id));
  };

  const generate = async () => {
    if (!selHall || !eventName.trim()) return;
    setGenerating(true);
    setGenError('');
    setResultImage('');

    try {
      const fd = new FormData();
      fd.append('hallId',       String(selHall.id));
      fd.append('eventName',    eventName);
      fd.append('eventSubtitle', eventSubtitle);
      fd.append('eventDate',    eventDate);
      fd.append('eventVenue',   eventVenue);
      fd.append('footerText',   footerText);
      fd.append('screenConfig', screenConfig);
      fd.append('screenTheme',  screenTheme);
      fd.append('wingDisplayMode', wingDisplayMode);
      fd.append('logos',        JSON.stringify(selectedLogos));

      // Append all custom co-sponsor logos
      customLogoFiles.forEach((item, index) => {
        fd.append(`customLogo_${index}`, item.file);
      });

      const r = await fetch('/api/generate-visualization', { method: 'POST', body: fd });
      const data = await r.json();

      if (!r.ok) throw new Error(data.error || 'Generation failed');
      setResultImage(data.imageBase64);
    } catch (e: any) {
      setGenError(e.message || 'Unknown error occurred');
    }
    setGenerating(false);
  };

  const generateSimulation = async () => {
    if (!selHall || !eventName.trim()) return;
    setGenerating(true);
    setGenError('');
    setSimulationImage('');

    try {
      const colors = screenTheme === 'dark' 
        ? ['Deep Navy Blue', 'Electric Cyan', 'Dark Slate Gray'] 
        : ['Classic Royal Blue', 'Soft Off-White', 'Polished Silver'];

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_id: selVenue?.id || 1,
          hall_id: selHall.id,
          stage_width: selHall.width || 12,
          stage_length: selHall.length || 6,
          stage_height: 3,
          stage_finish: selStage?.name || 'Standard Riser',
          seating_style: selSeating?.name || 'Theatre Rows',
          seating_count: selHall.capacity || 200,
          event_name: eventName,
          event_date: eventDate,
          theme_colors: colors,
          custom_prompt_addon: eventSubtitle
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'OpenAI DALL-E 3 simulation generation failed');
      setSimulationImage(data.image_url);
    } catch (e: any) {
      setGenError(e.message || 'Unknown error occurred during simulation');
    }
    setGenerating(false);
  };

  const canGoNext = () => {
    if (step === 0) return !!selHall;
    if (step === 1) return !!selStage && !!selSeating;
    if (step === 2) return !!eventName.trim() && (selectedLogos.length > 0 || customLogoFiles.length > 0);
    return true;
  };

  const next = () => { if (canGoNext()) setStep(s => Math.min(s + 1, 3)); };
  const back = () => setStep(s => Math.max(s - 1, 0));

  const download = () => {
    const a = document.createElement('a');
    a.href = resultImage;
    a.download = `${eventName || 'eventelligence'}-visualization.png`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100" style={{ fontFamily: "'Inter', sans-serif" }}>
      <nav className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">Eventelligence</h1>
              <p className="text-[10px] text-slate-400 tracking-widest uppercase">Dynamic Layout Visualizer</p>
            </div>
          </div>
          <a href="/admin" className="text-xs font-semibold text-slate-600 hover:text-blue-600 border border-slate-250 hover:border-blue-400 px-3 py-1.5 rounded-lg transition-all">
            Admin Panel
          </a>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <span className="inline-block bg-blue-100 text-blue-700 text-[10px] font-extrabold px-3 py-1 rounded-full tracking-widest uppercase mb-4">Branding Visualizer</span>
          <h2 className="text-4xl font-black text-slate-900 leading-tight mb-3">
            Dynamic Venue Layout &<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Dynamic Branding Engine</span>
          </h2>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">Overlay your event title and corporate logos dynamically inside venue screens on-the-fly.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/60 p-8">
          <StepIndicator current={step} />

          {/* ── STEP 0: Venue Selection ──────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-500" /> Select City and Venue
              </h3>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">1. Choose City</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {cities.map(c => (
                    <SelectCard
                      key={c.id}
                      label={c.name}
                      sub={c.state}
                      selected={selCity?.id === c.id}
                      onClick={() => setSelCity(c)}
                      icon={<MapPin className="w-4 h-4" />}
                    />
                  ))}
                </div>
              </div>

              {selCity && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">2. Choose Venue</label>
                  {loadingVenues ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-4"><Loader2 className="w-4 h-4 animate-spin" /> Loading venues…</div>
                  ) : venues.length === 0 ? (
                    <p className="text-slate-400 text-sm py-4">No venues in {selCity.name} yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {venues.map(v => (
                        <SelectCard key={v.id} label={v.name} sub={v.address} selected={selVenue?.id === v.id} onClick={() => setSelVenue(v)} icon={<Building2 className="w-4 h-4" />} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selVenue && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">3. Choose Hall</label>
                  {loadingHalls ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-4"><Loader2 className="w-4 h-4 animate-spin" /> Loading halls…</div>
                  ) : halls.length === 0 ? (
                    <p className="text-slate-400 text-sm py-4">No halls configured for this venue.</p>
                  ) : (
                    <div className="space-y-2">
                      {halls.map(h => (
                        <SelectCard
                          key={h.id}
                          label={h.name}
                          sub={`${h.length}m × ${h.width}m · Capacity: ${h.capacity}`}
                          selected={selHall?.id === h.id}
                          onClick={() => setSelHall(h)}
                          icon={<Layers className="w-4 h-4" />}
                        />
                      ))}
                    </div>
                  )}

                  {selHall && (
                    <div className="mt-6 border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-slate-50 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Layout & Technical Details</p>
                          <h4 className="text-base font-extrabold text-slate-800">{selHall.name}</h4>
                        </div>

                        {/* Layout selector tabs */}
                        <div className="flex border border-slate-250 rounded-xl overflow-hidden text-xs bg-white">
                          <button type="button" onClick={() => setTechViewTab('base')} className={`px-3 py-1.5 font-bold transition-all ${techViewTab === 'base' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Backdrop</button>
                          {selHall.floorPlanUrl && <button type="button" onClick={() => setTechViewTab('blueprint')} className={`px-3 py-1.5 font-bold border-l border-slate-200 transition-all ${techViewTab === 'blueprint' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Blueprint</button>}
                          {(selHall.refPhotoUrl1 || selHall.refPhotoUrl2) && <button type="button" onClick={() => setTechViewTab('gallery')} className={`px-3 py-1.5 font-bold border-l border-slate-200 transition-all ${techViewTab === 'gallery' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Gallery</button>}
                        </div>
                      </div>

                      {/* Display active tech layout */}
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-inner relative h-56 flex items-center justify-center">
                        {techViewTab === 'base' && selHall.baseImageUrl && (
                          <img src={selHall.baseImageUrl} alt={selHall.name} className="w-full h-full object-cover" />
                        )}
                        {techViewTab === 'blueprint' && selHall.floorPlanUrl && (
                          <img src={selHall.floorPlanUrl} alt="Floor blueprint plan" className="w-full h-full object-contain p-2 bg-slate-50" />
                        )}
                        {techViewTab === 'gallery' && (
                          <div className="grid grid-cols-2 gap-2 w-full h-full p-2 bg-slate-50">
                            {selHall.refPhotoUrl1 ? <img src={selHall.refPhotoUrl1} alt="Aux angle 1" className="w-full h-full object-cover rounded-lg border" /> : <div className="bg-slate-100 flex items-center justify-center rounded-lg text-slate-350 text-[10px]">No Photo</div>}
                            {selHall.refPhotoUrl2 ? <img src={selHall.refPhotoUrl2} alt="Aux angle 2" className="w-full h-full object-cover rounded-lg border" /> : <div className="bg-slate-100 flex items-center justify-center rounded-lg text-slate-350 text-[10px]">No Photo</div>}
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 text-white text-xs flex justify-between items-center">
                          <span>Physical Size: {selHall.length}m × {selHall.width}m × {selHall.height}m</span>
                          <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">Cap: {selHall.capacity} PAX</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 1: Layout Setup ─────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-8 animate-fade-in">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Layout className="w-5 h-5 text-blue-500" /> Setup Layout Templates
              </h3>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-3">Stage Style</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {stages.map(s => (
                    <StyleCard key={s.id} label={s.name} svgIcon={STAGE_SVGS[s.name] || <ImageIcon className="w-6 h-6 text-slate-400" />} selected={selStage?.id === s.id} onClick={() => setSelStage(s)} />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-3">Seating Arrangement</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {seatings.map(s => (
                    <StyleCard key={s.id} label={s.name} svgIcon={SEATING_SVGS[s.name] || <ImageIcon className="w-6 h-6 text-slate-400" />} selected={selSeating?.id === s.id} onClick={() => setSelSeating(s)} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Theme & Branding ─────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in max-h-[70vh] overflow-y-auto pr-2">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Star className="w-5 h-5 text-blue-500" /> Branding & Title Configurator
              </h3>

              {/* Event Title & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Event Title *</label>
                  <div className="relative">
                    <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      placeholder="e.g. Annual Tech Summit"
                      value={eventName}
                      onChange={e => setEventName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Event Subtitle / Slogan</label>
                  <div className="relative">
                    <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      placeholder="e.g. Empowering Digital Infrastructure"
                      value={eventSubtitle}
                      onChange={e => setEventSubtitle(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Event Date, Venue and Organizer Footer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Event Date</label>
                  <input
                    placeholder="e.g. October 24, 2026"
                    value={eventDate}
                    onChange={e => setEventDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Event Venue Location</label>
                  <input
                    placeholder="e.g. Taj Lands End, Mumbai"
                    value={eventVenue}
                    onChange={e => setEventVenue(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Organizer Footer Bar</label>
                  <input
                    placeholder="e.g. Ministry of IT, Govt of India"
                    value={footerText}
                    onChange={e => setFooterText(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              {/* Layout splits, themes, and screen configs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Screen Selection</label>
                  <select
                    value={screenConfig}
                    onChange={e => setScreenConfig(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  >
                    <option value="center">Center LED Only</option>
                    <option value="wings">Center + Side Wings</option>
                    <option value="all">Full End-to-End LED</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Screen Style Theme</label>
                  <select
                    value={screenTheme}
                    onChange={e => setScreenTheme(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white font-medium text-slate-750"
                  >
                    <option value="light">Minimalist Light (Clean White)</option>
                    <option value="dark">Premium Corporate (Navy/LED Grid)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Wing Content Mode</label>
                  <select
                    value={wingDisplayMode}
                    onChange={e => setWingDisplayMode(e.target.value as any)}
                    disabled={screenConfig === 'center'}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white disabled:opacity-50"
                  >
                    <option value="mirror">Mirror Center Screen</option>
                    <option value="extended">Extended Content (Logos & Details)</option>
                  </select>
                </div>
              </div>

              {/* Custom Sponsor Logos Multi-Upload Option */}
              <div className="border-t border-slate-100 pt-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Upload Multiple Sponsor Logos (Up to 5 PNG/JPG)</label>
                
                {customLogoFiles.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 bg-slate-50 p-3 rounded-2xl border">
                    {customLogoFiles.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-white rounded-lg border p-2 text-xs">
                        <div className="flex items-center gap-2">
                          <img src={item.preview} alt="upload preview" className="w-10 h-8 object-contain bg-slate-50 border rounded" />
                          <span className="font-semibold truncate max-w-[130px]">{item.file.name}</span>
                        </div>
                        <button type="button" onClick={() => removeCustomLogo(item.id)} className="text-red-500 hover:text-red-700 font-bold uppercase text-[10px]">Remove</button>
                      </div>
                    ))}
                  </div>
                )}

                {customLogoFiles.length < 5 && (
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-250 hover:border-blue-400 rounded-xl p-4 cursor-pointer hover:bg-blue-50/20 transition-all text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    <Upload className="w-4 h-4 text-blue-500" /> Upload Sponsor Logo File
                    <input type="file" multiple accept="image/png, image/jpeg, image/jpg" onChange={handleCustomLogoAdd} className="hidden" />
                  </label>
                )}
              </div>

              {/* Preset Branding Templates */}
              {customLogoFiles.length === 0 && (
                <>
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-4 text-slate-400 text-xs uppercase font-bold tracking-widest">Or Use Presets</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Select Branding Package</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {brandings.map(b => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelBranding(b)}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${selBranding?.id === b.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-200'}`}
                        >
                          <p className="text-xs font-bold text-slate-800">{b.templateName}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{b.logos.length} Sponsors</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selBranding && (
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Select Logos to Include ({selectedLogos.length})</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                        {selBranding.logos.map(logo => {
                          const isSelected = selectedLogos.includes(logo.logoName);
                          return (
                            <button
                              key={logo.id}
                              type="button"
                              onClick={() => handleLogoToggle(logo.logoName)}
                              className={`p-3 rounded-lg border-2 text-center transition-all ${isSelected ? 'border-blue-500 bg-white shadow-sm' : 'border-transparent text-slate-500 bg-slate-100 hover:bg-slate-200/60'}`}
                            >
                              <p className="text-xs font-bold truncate">{logo.logoName}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── STEP 3: Generate ─────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-500" /> Render Visualization
                </span>
              </h3>

              {/* Mode Toggle Selector */}
              <div className="flex border border-slate-200 rounded-2xl overflow-hidden text-xs bg-slate-50 p-1 w-fit mx-auto">
                <button
                  type="button"
                  onClick={() => setGenMode('composite')}
                  className={`px-5 py-2.5 rounded-xl font-bold transition-all duration-150 ${genMode === 'composite' ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-850'}`}
                >
                  Stage Backdrop Composite
                </button>
                <button
                  type="button"
                  onClick={() => setGenMode('simulation')}
                  className={`px-5 py-2.5 rounded-xl font-bold transition-all duration-150 ${genMode === 'simulation' ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-850'}`}
                >
                  3D AI Layout Simulation
                </button>
              </div>

              {genError && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-sm text-red-700">
                  <X className="w-4 h-4 shrink-0 mt-0.5" />
                  <div><b>Generation error:</b> {genError}</div>
                </div>
              )}

              {/* ── MODE 1: COMPOSITE ── */}
              {genMode === 'composite' && (
                <>
                  {!resultImage && !generating && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Configuration Summary</p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-slate-400 text-xs block">City</span><b className="text-slate-800">{selCity?.name}</b></div>
                        <div><span className="text-slate-400 text-xs block">Venue</span><b className="text-slate-800">{selVenue?.name}</b></div>
                        <div><span className="text-slate-400 text-xs block">Hall</span><b className="text-slate-800">{selHall?.name}</b></div>
                        <div><span className="text-slate-400 text-xs block">Stage Style</span><b className="text-slate-800">{selStage?.name}</b></div>
                        <div><span className="text-slate-400 text-xs block">Seating</span><b className="text-slate-800">{selSeating?.name}</b></div>
                        <div><span className="text-slate-400 text-xs block">Event Name</span><b className="text-slate-800">{eventName}</b></div>
                        <div><span className="text-slate-400 text-xs block">Screen Config</span><b className="text-slate-800 uppercase text-xs">{screenConfig} ({wingDisplayMode} Mode)</b></div>
                        <div><span className="text-slate-400 text-xs block">Theme Style</span><b className="text-slate-800 uppercase text-xs">{screenTheme} Theme</b></div>
                        <div>
                          <span className="text-slate-400 text-xs block">Logo Mode</span>
                          <b className="text-slate-800 text-xs">
                            {customLogoFiles.length > 0 ? `Custom (${customLogoFiles.length} uploaded)` : `Presets (${selectedLogos.length} selected)`}
                          </b>
                        </div>
                      </div>
                    </div>
                  )}

                  {generating && (
                    <div className="text-center py-16 space-y-4">
                      <div className="relative w-20 h-20 mx-auto">
                        <div className="w-20 h-20 rounded-full border-4 border-blue-100" />
                        <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                        <Sparkles className="absolute inset-0 m-auto w-7 h-7 text-blue-600" />
                      </div>
                      <p className="text-slate-600 font-semibold">Generating visual overlay layout…</p>
                      <p className="text-slate-400 text-sm">Overlaying sponsors and title text.</p>
                    </div>
                  )}

                  {resultImage && !generating && (
                    <div className="space-y-4">
                      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg">
                        <img src={resultImage} alt="Generated event visualization" className="w-full h-auto" />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={download}
                          className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" /> Download Rendering
                        </button>
                        <button
                          onClick={() => window.open(resultImage, '_blank')}
                          className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold text-sm hover:bg-slate-200 transition flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" /> Open Full Screen
                        </button>
                      </div>
                      <button
                        onClick={() => { setResultImage(''); setGenError(''); }}
                        className="w-full text-blue-600 text-sm font-medium hover:underline text-center block mt-3"
                      >
                        ↩ Make changes or try another layout
                      </button>
                    </div>
                  )}

                  {!resultImage && !generating && (
                    <button
                      onClick={generate}
                      disabled={!selHall || !eventName.trim() || (selectedLogos.length === 0 && customLogoFiles.length === 0)}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-bold text-base hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      <Sparkles className="w-5 h-5" /> Generate AI Layout
                    </button>
                  )}
                </>
              )}

              {/* ── MODE 2: SIMULATION ── */}
              {genMode === 'simulation' && (
                <>
                  {!simulationImage && !generating && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">OpenAI DALL-E 3 Simulation parameters</p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-slate-400 text-xs block">Engine</span><b className="text-slate-800">DALL-E 3 (GPT Image Model)</b></div>
                        <div><span className="text-slate-400 text-xs block">UI Blending</span><b className="text-slate-800">Seamless Isolated #FFFFFF</b></div>
                        <div><span className="text-slate-400 text-xs block">Stage finish</span><b className="text-slate-800">{selStage?.name}</b></div>
                        <div><span className="text-slate-400 text-xs block">Seating setup</span><b className="text-slate-800">{selSeating?.name}</b></div>
                        <div><span className="text-slate-400 text-xs block">Capacity</span><b className="text-slate-800">{selHall?.capacity} modern seats</b></div>
                        <div><span className="text-slate-400 text-xs block">Title Text</span><b className="text-slate-800">{eventName}</b></div>
                      </div>
                    </div>
                  )}

                  {generating && (
                    <div className="text-center py-16 space-y-4">
                      <div className="relative w-20 h-20 mx-auto">
                        <div className="w-20 h-20 rounded-full border-4 border-blue-100" />
                        <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                        <Sparkles className="absolute inset-0 m-auto w-7 h-7 text-blue-600 animate-pulse" />
                      </div>
                      <p className="text-slate-600 font-semibold">Simulating 3D architectural setup using DALL-E 3…</p>
                      <p className="text-slate-400 text-sm">Synthesizing isolated rendering on pure white background.</p>
                    </div>
                  )}

                  {simulationImage && !generating && (
                    <div className="space-y-6">
                      {/* White-blend borderless card for native appearance */}
                      <div className="bg-white flex items-center justify-center p-0 overflow-hidden mx-auto max-w-[500px]">
                        <img src={simulationImage} alt="Simulated event setup" className="w-full h-auto max-h-[500px] object-contain block mix-blend-multiply" />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = simulationImage;
                            a.download = `${eventName || 'simulation'}-3d-model.png`;
                            a.click();
                          }}
                          className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" /> Download Simulation
                        </button>
                        <button
                          onClick={() => window.open(simulationImage, '_blank')}
                          className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold text-sm hover:bg-slate-200 transition flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" /> Open Full Screen
                        </button>
                      </div>
                      <button
                        onClick={() => { setSimulationImage(''); setGenError(''); }}
                        className="w-full text-blue-600 text-sm font-medium hover:underline text-center block mt-3"
                      >
                        ↩ Regenerate with new setup parameters
                      </button>
                    </div>
                  )}

                  {!simulationImage && !generating && (
                    <button
                      onClick={generateSimulation}
                      disabled={!selHall || !eventName.trim()}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-bold text-base hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      <Sparkles className="w-5 h-5" /> Generate 3D AI Simulation
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Navigation ────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={back}
              disabled={step === 0}
              className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-0 disabled:cursor-default transition px-4 py-2 rounded-xl hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            {step < 3 && (
              <button
                onClick={next}
                disabled={!canGoNext()}
                className="flex items-center gap-2 bg-blue-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-md shadow-blue-200"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.25s ease-out both; }
      `}</style>
    </div>
  );
}
