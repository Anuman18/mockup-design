"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, Building2, Layers, ChevronRight, ChevronLeft,
  Upload, Sparkles, Loader2, Check, ZoomIn, Download,
  Calendar, Type, Users, Star, Palette, Layout, X, Eye
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface City    { id: number; name: string; state: string; }
interface Venue   { id: number; cityId: number; name: string; address: string; }
interface Hall    { id: number; venueId: number; name: string; length: number; width: number; height: number; capacity: number; baseImageUrl?: string | null; maskX: number; maskY: number; maskWidth: number; maskHeight: number; }
interface Template{ id: number; name: string; value: string; }
interface Logo    { id: number; logoName: string; }
interface Branding{ id: number; templateName: string; logos: Logo[]; }

const STEP_LABELS = ['Venue', 'Event Setup', 'Branding', 'Generate'];

// ─── Step Indicator ───────────────────────────────────────────────────────────
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

// ─── SelectCard ──────────────────────────────────────────────────────────────
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

// ─── StyleCard ────────────────────────────────────────────────────────────────
function StyleCard({ label, emoji, selected, onClick }: { label: string; emoji: string; selected: boolean; onClick: () => void; }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-2 text-center group ${selected ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'}`}
    >
      <span className="text-3xl">{emoji}</span>
      <span className={`text-xs font-semibold leading-tight ${selected ? 'text-blue-700' : 'text-slate-600'}`}>{label}</span>
      {selected && <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>}
    </button>
  );
}

const STAGE_EMOJIS: Record<string, string> = {
  'Royal Staggered Wood Set': '🏛️',
  'Seamless Gloss Acrylic Set': '💎',
  'LED Digital Backdrop Truss': '🎆',
  'Natural Bamboo & Floral': '🌿',
  'Minimalist White Riser': '⬜',
};
const SEATING_EMOJIS: Record<string, string> = {
  'Theatre Rows Layout': '🎭',
  'Cluster Round Tables (Banquet)': '🍽️',
  'Classroom Desks Layout': '📚',
  'U-Shape Conference': '🤝',
  'Cocktail Standing': '🥂',
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [step, setStep] = useState(0);

  // Step 0 — Venue selection
  const [cities,     setCities]     = useState<City[]>([]);
  const [venues,     setVenues]     = useState<Venue[]>([]);
  const [halls,      setHalls]      = useState<Hall[]>([]);
  const [selCity,    setSelCity]    = useState<City | null>(null);
  const [selVenue,   setSelVenue]   = useState<Venue | null>(null);
  const [selHall,    setSelHall]    = useState<Hall | null>(null);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [loadingHalls,  setLoadingHalls]  = useState(false);

  // Step 1 — Event setup
  const [stages,    setStages]    = useState<Template[]>([]);
  const [seatings,  setSeatings]  = useState<Template[]>([]);
  const [selStage,  setSelStage]  = useState<Template | null>(null);
  const [selSeating,setSelSeating]= useState<Template | null>(null);

  // Step 2 — Branding
  const [brandings,    setBrandings]    = useState<Branding[]>([]);
  const [selBranding,  setSelBranding]  = useState<Branding | null>(null);
  const [eventName,    setEventName]    = useState('');
  const [eventDate,    setEventDate]    = useState('');
  const [bannerFile,   setBannerFile]   = useState<File | null>(null);
  const [bannerPreview,setBannerPreview]= useState('');
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Step 3 — Generate
  const [generating, setGenerating] = useState(false);
  const [resultImage, setResultImage] = useState('');
  const [genError,    setGenError]    = useState('');

  // ── Data Loaders ───────────────────────────────────────────────────────────
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

  // ── Banner handler ─────────────────────────────────────────────────────────
  const handleBanner = (file: File) => {
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  // ── Generate ───────────────────────────────────────────────────────────────
  const generate = async () => {
    if (!selHall || !bannerFile) return;
    setGenerating(true);
    setGenError('');
    setResultImage('');

    try {
      const fd = new FormData();
      fd.append('hallId',    String(selHall.id));
      fd.append('eventName', eventName);
      fd.append('eventDate', eventDate);
      fd.append('bannerImage', bannerFile);

      const r = await fetch('/api/generate-visualization', { method: 'POST', body: fd });
      const data = await r.json();

      if (!r.ok) throw new Error(data.error || 'Generation failed');
      setResultImage(data.imageBase64);
    } catch (e: any) {
      setGenError(e.message || 'Unknown error occurred');
    }
    setGenerating(false);
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const canGoNext = () => {
    if (step === 0) return !!selHall;
    if (step === 1) return !!selStage && !!selSeating;
    if (step === 2) return !!selBranding && !!eventName.trim() && !!bannerFile;
    return true;
  };

  const next = () => { if (canGoNext()) setStep(s => Math.min(s + 1, 3)); };
  const back = () => setStep(s => Math.max(s - 1, 0));

  // ── Download ───────────────────────────────────────────────────────────────
  const download = () => {
    const a = document.createElement('a');
    a.href = resultImage;
    a.download = `${eventName || 'eventelligence'}-visualization.png`;
    a.click();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">Eventelligence</h1>
              <p className="text-[10px] text-slate-400 tracking-widest uppercase">Event Visualization Platform</p>
            </div>
          </div>
          <a href="/admin" className="text-xs font-medium text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-300 px-3 py-1.5 rounded-lg transition">
            Admin Panel
          </a>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full tracking-widest uppercase mb-4">AI Powered</span>
          <h2 className="text-4xl font-extrabold text-slate-900 leading-tight mb-3">
            Visualize Your Event<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Before It Happens</span>
          </h2>
          <p className="text-slate-500 text-base max-w-xl mx-auto">Upload your banner and we'll overlay it perfectly on your chosen venue hall's real backdrop.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/60 p-8">
          <StepIndicator current={step} />

          {/* ── STEP 0: Venue Selection ──────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-500" /> Select Your Venue
              </h3>

              {/* City */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">1. Choose City</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

              {/* Venue */}
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

              {/* Hall */}
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
                  {/* Hall preview */}
                  {selHall?.baseImageUrl && (
                    <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                      <div className="relative">
                        <img src={selHall.baseImageUrl} alt={selHall.name} className="w-full h-48 object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <div className="absolute bottom-3 left-3 text-white">
                          <p className="font-bold text-sm">{selHall.name}</p>
                          <p className="text-xs opacity-80">{selVenue.name}</p>
                        </div>
                        {selHall.maskWidth > 0 && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" /> Screen zone configured
                          </div>
                        )}
                        {!selHall.maskWidth && (
                          <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                            ⚠ No screen zone
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 1: Event Setup ──────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-8 animate-fade-in">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Layout className="w-5 h-5 text-blue-500" /> Event Setup
              </h3>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-3">Stage Style</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {stages.map(s => (
                    <StyleCard key={s.id} label={s.name} emoji={STAGE_EMOJIS[s.name] || '🎪'} selected={selStage?.id === s.id} onClick={() => setSelStage(s)} />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-3">Seating Arrangement</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {seatings.map(s => (
                    <StyleCard key={s.id} label={s.name} emoji={SEATING_EMOJIS[s.name] || '💺'} selected={selSeating?.id === s.id} onClick={() => setSelSeating(s)} />
                  ))}
                </div>
              </div>

              {selStage && selSeating && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-700 flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-500 shrink-0" />
                  <span><b>{selStage.name}</b> stage with <b>{selSeating.name}</b> seating</span>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Branding & Details ───────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Star className="w-5 h-5 text-blue-500" /> Branding & Event Details
              </h3>

              {/* Branding template */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Select Branding Package</label>
                <div className="space-y-2">
                  {brandings.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelBranding(b)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selBranding?.id === b.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-200'}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-semibold ${selBranding?.id === b.id ? 'text-blue-700' : 'text-slate-700'}`}>{b.templateName}</p>
                        {selBranding?.id === b.id && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {b.logos.map(l => (
                          <span key={l.id} className="bg-slate-100 text-slate-500 text-[11px] px-2 py-0.5 rounded-full">{l.logoName}</span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Event Name & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Event Name *</label>
                  <div className="relative">
                    <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      placeholder="e.g. MSME Summit 2025"
                      value={eventName}
                      onChange={e => setEventName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Event Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      value={eventDate}
                      onChange={e => setEventDate(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
              </div>

              {/* Banner Upload */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Upload Your Banner *</label>
                {bannerPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-blue-200 group">
                    <img src={bannerPreview} alt="Banner preview" className="w-full h-40 object-contain bg-slate-50" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => { setBannerFile(null); setBannerPreview(''); }}
                        className="bg-white text-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                    <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" /> Banner ready
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="banner-upload"
                    className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-2xl p-10 cursor-pointer transition-all hover:bg-blue-50/50 group"
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleBanner(f); }}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
                      <Upload className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-700">Drop your banner here</p>
                      <p className="text-xs text-slate-400 mt-1">or click to browse · PNG, JPG, WEBP</p>
                    </div>
                    <input id="banner-upload" type="file" accept="image/*" className="hidden" ref={bannerInputRef} onChange={e => { const f = e.target.files?.[0]; if (f) handleBanner(f); }} />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3: Generate ─────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" /> Generate Visualization
              </h3>

              {/* Summary */}
              {!resultImage && !generating && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Your Event Summary</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-slate-400 text-xs block">City</span><b className="text-slate-800">{selCity?.name}</b></div>
                    <div><span className="text-slate-400 text-xs block">Venue</span><b className="text-slate-800">{selVenue?.name}</b></div>
                    <div><span className="text-slate-400 text-xs block">Hall</span><b className="text-slate-800">{selHall?.name}</b></div>
                    <div><span className="text-slate-400 text-xs block">Capacity</span><b className="text-slate-800">{selHall?.capacity} pax</b></div>
                    <div><span className="text-slate-400 text-xs block">Stage</span><b className="text-slate-800">{selStage?.name}</b></div>
                    <div><span className="text-slate-400 text-xs block">Seating</span><b className="text-slate-800">{selSeating?.name}</b></div>
                    <div><span className="text-slate-400 text-xs block">Event</span><b className="text-slate-800">{eventName}</b></div>
                    <div><span className="text-slate-400 text-xs block">Date</span><b className="text-slate-800">{eventDate || '—'}</b></div>
                    <div><span className="text-slate-400 text-xs block">Branding</span><b className="text-slate-800">{selBranding?.templateName}</b></div>
                  </div>

                  {selHall?.maskWidth === 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 flex items-start gap-2">
                      <span className="text-lg">⚠️</span>
                      <p><b>No screen zone configured</b> for this hall. The banner will be placed in the center. For precise placement, go to <a href="/admin" className="underline">Admin → Halls → Edit Mask</a>.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {genError && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-sm text-red-700">
                  <X className="w-4 h-4 shrink-0 mt-0.5" />
                  <div><b>Generation failed:</b> {genError}</div>
                </div>
              )}

              {/* Loading */}
              {generating && (
                <div className="text-center py-16 space-y-4">
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="w-20 h-20 rounded-full border-4 border-blue-100" />
                    <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto w-7 h-7 text-blue-600" />
                  </div>
                  <p className="text-slate-600 font-semibold">Compositing your banner onto the venue…</p>
                  <p className="text-slate-400 text-sm">This takes just a few seconds.</p>
                </div>
              )}

              {/* Result */}
              {resultImage && !generating && (
                <div className="space-y-4">
                  <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg">
                    <img src={resultImage} alt="Generated visualization" className="w-full h-auto" />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={download}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Download PNG
                    </button>
                    <button
                      onClick={() => window.open(resultImage, '_blank')}
                      className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold text-sm hover:bg-slate-200 transition flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" /> Open Full Size
                    </button>
                  </div>
                  <button
                    onClick={() => { setResultImage(''); setGenError(''); }}
                    className="w-full text-blue-600 text-sm font-medium hover:underline"
                  >
                    ↩ Try with a different banner
                  </button>
                </div>
              )}

              {/* Generate button */}
              {!resultImage && !generating && (
                <button
                  onClick={generate}
                  disabled={!selHall || !bannerFile}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-bold text-base hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  <Sparkles className="w-5 h-5" /> Generate AI Visualization
                </button>
              )}
            </div>
          )}

          {/* ── Navigation Buttons ───────────────────────────────────────── */}
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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.25s ease-out both; }
      `}</style>
    </div>
  );
}
