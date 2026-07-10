"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, Building2, Layers, ChevronRight, ChevronLeft,
  Sparkles, Loader2, Check, Download, Eye,
  Calendar, Type, Star, Palette, Layout, X, Upload
} from 'lucide-react';

interface City    { id: number; name: string; state: string; }
interface Venue   { id: number; cityId: number; name: string; address: string; }
interface Hall    { id: number; venueId: number; name: string; length: number; width: number; height: number; capacity: number; baseImageUrl?: string | null; centerMaskX: number; centerMaskY: number; centerMaskWidth: number; centerMaskHeight: number; leftMaskX: number; leftMaskY: number; leftMaskWidth: number; leftMaskHeight: number; rightMaskX: number; rightMaskY: number; rightMaskWidth: number; rightMaskHeight: number; }
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

  // Setup options
  const [stages,    setStages]    = useState<Template[]>([]);
  const [seatings,  setSeatings]  = useState<Template[]>([]);
  const [selStage,  setSelStage]  = useState<Template | null>(null);
  const [selSeating,setSelSeating]= useState<Template | null>(null);

  // Branding options
  const [brandings,       setBrandings]       = useState<Branding[]>([]);
  const [selBranding,     setSelBranding]     = useState<Branding | null>(null);
  const [selectedLogos,   setSelectedLogos]   = useState<string[]>([]);
  const [eventName,       setEventName]       = useState('');
  const [eventDate,       setEventDate]       = useState('');
  const [screenConfig,    setScreenConfig]    = useState<'center' | 'wings' | 'all'>('center');
  const [screenTheme,     setScreenTheme]     = useState<'light' | 'dark'>('light');

  // Custom Logo Upload
  const [customLogoFile,    setCustomLogoFile]    = useState<File | null>(null);
  const [customLogoPreview, setCustomLogoPreview] = useState<string>('');
  const customLogoInputRef = useRef<HTMLInputElement>(null);

  // Visualization Generation
  const [generating,  setGenerating]  = useState(false);
  const [resultImage, setResultImage] = useState('');
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

  const handleLogoToggle = (logoName: string) => {
    setSelectedLogos(prev =>
      prev.includes(logoName) ? prev.filter(l => l !== logoName) : [...prev, logoName]
    );
  };

  const handleCustomLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomLogoFile(file);
      setCustomLogoPreview(URL.createObjectURL(file));
      // Reset selected database template logos when custom logo is uploaded to prevent confusion
      setSelBranding(null);
      setSelectedLogos([]);
    }
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
      fd.append('eventDate',    eventDate);
      fd.append('screenConfig', screenConfig);
      fd.append('screenTheme',  screenTheme);
      fd.append('logos',        JSON.stringify(selectedLogos));

      if (customLogoFile) {
        fd.append('customLogo', customLogoFile);
      }

      const r = await fetch('/api/generate-visualization', { method: 'POST', body: fd });
      const data = await r.json();

      if (!r.ok) throw new Error(data.error || 'Generation failed');
      setResultImage(data.imageBase64);
    } catch (e: any) {
      setGenError(e.message || 'Unknown error occurred');
    }
    setGenerating(false);
  };

  const canGoNext = () => {
    if (step === 0) return !!selHall;
    if (step === 1) return !!selStage && !!selSeating;
    if (step === 2) return !!eventName.trim() && (selectedLogos.length > 0 || !!customLogoFile);
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

                  {selHall?.baseImageUrl && (
                    <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative">
                      <img src={selHall.baseImageUrl} alt={selHall.name} className="w-full h-48 object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                      <div className="absolute bottom-3 left-3 text-white">
                        <p className="font-bold text-sm">{selHall.name}</p>
                        <p className="text-xs opacity-80">{selVenue.name}</p>
                      </div>
                      <div className="absolute top-2 right-2 bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Screen zones configured
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
            </div>
          )}

          {/* ── STEP 2: Theme & Branding ─────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Star className="w-5 h-5 text-blue-500" /> Branding & Title Configurator
              </h3>

              {/* Event Title */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Event Title *</label>
                <div className="relative">
                  <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    placeholder="Enter event name (e.g. Annual Tech Summit 2026)"
                    value={eventName}
                    onChange={e => setEventName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                  />
                </div>
              </div>

              {/* Screen configuration & Theme Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Screen Configuration</label>
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
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Screen Theme Style</label>
                  <select
                    value={screenTheme}
                    onChange={e => setScreenTheme(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white font-medium text-slate-700"
                  >
                    <option value="light">Minimalist Light (Clean White)</option>
                    <option value="dark">Premium Corporate (Navy/Blue Gradient)</option>
                  </select>
                </div>
              </div>

              {/* Custom Logo Upload Option */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Insert Custom Logo (PNG / JPG)</label>
                {customLogoPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-blue-200 bg-slate-50 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={customLogoPreview} alt="Custom logo preview" className="w-16 h-12 object-contain bg-white rounded border border-slate-200" />
                      <div>
                        <p className="text-xs font-bold text-slate-700">{customLogoFile?.name}</p>
                        <p className="text-[10px] text-slate-400">Size: {((customLogoFile?.size ?? 0) / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setCustomLogoFile(null); setCustomLogoPreview(''); }}
                      className="text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1"
                    >
                      <X className="w-4 h-4" /> Remove Logo
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-250 hover:border-blue-400 rounded-xl p-4 cursor-pointer hover:bg-blue-50/20 transition-all text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    <Upload className="w-4 h-4 text-blue-500" /> Upload custom logo file
                    <input type="file" accept="image/png, image/jpeg, image/jpg" ref={customLogoInputRef} onChange={handleCustomLogoChange} className="hidden" />
                  </label>
                )}
              </div>

              {/* Preset Branding Templates */}
              {!customLogoFile && (
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
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" /> Render Visualization
              </h3>

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
                    <div><span className="text-slate-400 text-xs block">Screen Config</span><b className="text-slate-800 uppercase text-xs">{screenConfig} Screen</b></div>
                    <div><span className="text-slate-400 text-xs block">Theme Style</span><b className="text-slate-800 uppercase text-xs">{screenTheme} Theme</b></div>
                    <div>
                      <span className="text-slate-400 text-xs block">Logo Mode</span>
                      <b className="text-slate-800 text-xs">
                        {customLogoFile ? `Custom Logo: ${customLogoFile.name}` : `Presets: ${selectedLogos.join(', ')}`}
                      </b>
                    </div>
                  </div>
                </div>
              )}

              {genError && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-sm text-red-700">
                  <X className="w-4 h-4 shrink-0 mt-0.5" />
                  <div><b>Compositing error:</b> {genError}</div>
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
                  disabled={!selHall || !eventName.trim() || (selectedLogos.length === 0 && !customLogoFile)}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-bold text-base hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  <Sparkles className="w-5 h-5" /> Generate AI Layout
                </button>
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
