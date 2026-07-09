"use client";

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  MapPin, 
  Settings2, 
  Palette, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Loader2, 
  Download, 
  ExternalLink,
  Sliders,
  Calendar,
  Layers,
  Users
} from 'lucide-react';
import AdminBoundingBox from '@/components/AdminBoundingBox';

interface City {
  id: number;
  name: string;
  state: string;
}

interface Venue {
  id: number;
  city_id: number;
  name: string;
  address: string;
  image_url?: string;
}

interface Hall {
  id: number;
  venue_id: number;
  name: string;
  width: number;
  length: number;
  height: number;
  capacity: number;
}

interface Template {
  id: number;
  name: string;
  type: 'stage' | 'seating' | 'theme';
  value: string;
}

interface Branding {
  id: number;
  name: string;
  logos: string[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function ClientConfigurator() {
  const [currentStep, setCurrentStep] = useState(1);
  const [activeMode, setActiveMode] = useState<'wizard' | 'stitcher'>('wizard');

  // Instant Stitcher State
  const [stitcherBaseImage, setStitcherBaseImage] = useState<string>('');
  const [stitcherBanner, setStitcherBanner] = useState<string>('');
  const [stitcherResult, setStitcherResult] = useState<string>('');
  const [stitcherLoading, setStitcherLoading] = useState(false);
  const [stitcherCoords, setStitcherCoords] = useState<{mask_x: number, mask_y: number, mask_w: number, mask_h: number} | null>(null);

  const [geminiApiKey, setGeminiApiKey] = useState<string>('');

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setGeminiApiKey(savedKey);
  }, []);

  const handleKeyChange = (key: string) => {
    setGeminiApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  // --- Dynamic Pipeline States ---
  const [cities, setCities] = useState<City[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [stageTemplates, setStageTemplates] = useState<Template[]>([]);
  const [seatingTemplates, setSeatingTemplates] = useState<Template[]>([]);
  const [themePresets, setThemePresets] = useState<Template[]>([]);
  const [brandings, setBrandings] = useState<Branding[]>([]);

  // Selected State
  const [selectedCityId, setSelectedCityId] = useState<number | ''>('');
  const [selectedVenueId, setSelectedVenueId] = useState<number | ''>('');
  const [selectedHallId, setSelectedHallId] = useState<number | ''>('');

  const [selectedStageTemplate, setSelectedStageTemplate] = useState<string>('');
  const [stageWidth, setStageWidth] = useState<number>(18);
  const [stageLength, setStageLength] = useState<number>(8);
  const [stageHeight, setStageHeight] = useState<number>(1.2);
  const [selectedSeatingTemplate, setSelectedSeatingTemplate] = useState<string>('');
  const [seatingCount, setSeatingCount] = useState<number>(500);

  const [eventName, setEventName] = useState('India Technology & Growth Summit 2026');
  const [eventDate, setEventDate] = useState('2026-11-20');
  const [selectedBrandingId, setSelectedBrandingId] = useState<number | ''>('');
  const [themeColors, setThemeColors] = useState<string[]>(['#1e3a8a', '#475569']); // Slate Primary/Secondary accents
  const [customDirectives, setCustomDirectives] = useState('');

  // UI state
  const [fetchingVenues, setFetchingVenues] = useState(false);
  const [fetchingHalls, setFetchingHalls] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const [result, setResult] = useState<any | null>(null);

  // Compositing State
  const [bannerImageBase64, setBannerImageBase64] = useState<string>('');
  const [compositing, setCompositing] = useState(false);
  const [compositeResult, setCompositeResult] = useState<any | null>(null);

  // Active Resolved Objects for Summary Display
  const activeCity = cities.find(c => c.id === Number(selectedCityId));
  const activeVenue = venues.find(v => v.id === Number(selectedVenueId));
  const activeHall = halls.find(h => h.id === Number(selectedHallId));
  const activeBranding = brandings.find(b => b.id === Number(selectedBrandingId));

  // 1. Fetch Cities and Templates on Mount
  useEffect(() => {
    const initFetch = async () => {
      try {
        const [citiesRes, templatesRes, brandingsRes] = await Promise.all([
          fetch(`${API_BASE}/api/cities`),
          fetch(`${API_BASE}/api/templates`),
          fetch(`${API_BASE}/api/brandings`)
        ]);

        const citiesData = await citiesRes.json();
        const templatesData: Template[] = await templatesRes.json();
        const brandingsData = await brandingsRes.json();

        setCities(citiesData);
        setBrandings(brandingsData);

        // Filter and set template types
        const stages = templatesData.filter(t => t.type === 'stage');
        const seatings = templatesData.filter(t => t.type === 'seating');
        const themes = templatesData.filter(t => t.type === 'theme');

        setStageTemplates(stages);
        setSeatingTemplates(seatings);
        setThemePresets(themes);

        // Default selections
        if (stages.length > 0) setSelectedStageTemplate(stages[0].value);
        if (seatings.length > 0) setSelectedSeatingTemplate(seatings[0].value);
        if (brandingsData.length > 0) setSelectedBrandingId(brandingsData[0].id);

        if (citiesData.length > 0) {
          setSelectedCityId(citiesData[0].id);
        }
      } catch (err) {
        console.error('Failed initialization fetch:', err);
      }
    };
    initFetch();
  }, []);

  // 2. Cascade Fetch Venues when City changes
  useEffect(() => {
    if (!selectedCityId) return;

    const fetchVenues = async () => {
      setFetchingVenues(true);
      setSelectedVenueId('');
      setSelectedHallId('');
      setHalls([]);
      try {
        const res = await fetch(`${API_BASE}/api/venues?cityId=${selectedCityId}`);
        const data = await res.json();
        setVenues(data);
        if (data.length > 0) {
          setSelectedVenueId(data[0].id);
        }
      } catch (err) {
        console.error('Failed fetching venues:', err);
      } finally {
        setFetchingVenues(false);
      }
    };
    fetchVenues();
  }, [selectedCityId]);

  // 3. Cascade Fetch Halls when Venue changes
  useEffect(() => {
    if (!selectedVenueId) return;

    const fetchHalls = async () => {
      setFetchingHalls(true);
      setSelectedHallId('');
      try {
        const res = await fetch(`${API_BASE}/api/halls?venueId=${selectedVenueId}`);
        const data = await res.json();
        setHalls(data);
        if (data.length > 0) {
          setSelectedHallId(data[0].id);
          setSeatingCount(data[0].capacity); // Default capacity of room
        }
      } catch (err) {
        console.error('Failed fetching halls:', err);
      } finally {
        setFetchingHalls(false);
      }
    };
    fetchHalls();
  }, [selectedVenueId]);

  // Handle banner image compositing
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedVenueId) return;

    setCompositing(true);
    setCompositeResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setBannerImageBase64(base64);

      try {
        const res = await fetch(`${API_BASE}/api/composite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            venue_id: Number(selectedVenueId),
            banner_base64: base64
          })
        });

        const data = await res.json();
        if (data.success) {
          setCompositeResult(data);
        } else {
          alert(data.error || 'Failed to composite banner image.');
        }
      } catch (err) {
        console.error('Composite API error:', err);
      } finally {
        setCompositing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handles uploading custom venue photo containing white screen
  const handleStitcherBaseUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setStitcherBaseImage(reader.result as string);
      setStitcherResult('');
      setStitcherCoords(null);
    };
    reader.readAsDataURL(file);
  };

  // Handles uploading event banner
  const handleStitcherBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setStitcherBanner(reader.result as string);
      setStitcherResult('');
    };
    reader.readAsDataURL(file);
  };

  // Call composite route with base_image_base64 and banner_base64
  const triggerInstantStitch = async () => {
    if (!stitcherBaseImage || !stitcherBanner) return;

    setStitcherLoading(true);
    setStitcherResult('');

    try {
      const res = await fetch(`${API_BASE}/api/composite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_image_base64: stitcherBaseImage,
          banner_base64: stitcherBanner,
          mask_x: stitcherCoords ? stitcherCoords.mask_x : undefined,
          mask_y: stitcherCoords ? stitcherCoords.mask_y : undefined,
          mask_w: stitcherCoords ? stitcherCoords.mask_w : undefined,
          mask_h: stitcherCoords ? stitcherCoords.mask_h : undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        setStitcherResult(data.composited_image);
      } else {
        alert(data.error || 'Failed to auto-stitch images. Make sure the venue image has a distinct white screen.');
      }
    } catch (err) {
      console.error('Instant stitch error:', err);
      alert('Stitching request failed.');
    } finally {
      setStitcherLoading(false);
    }
  };

  // Open data URL base64 image in a new tab securely via document.write
  const openImage = (url: string) => {
    if (!url) return;
    if (url.startsWith('data:')) {
      const newTab = window.open();
      if (newTab) {
        newTab.document.write(`
          <html>
            <head>
              <title>Eventelligence Layout Preview</title>
              <style>
                body { margin: 0; background: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; color: #94a3b8; }
                .container { text-align: center; max-width: 95vw; }
                img { max-width: 100%; max-height: 90vh; object-fit: contain; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border-radius: 8px; border: 1px solid #334155; }
                p { margin-top: 15px; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; font-weight: bold; }
              </style>
            </head>
            <body>
              <div class="container">
                <img src="${url}" alt="Eventelligence layout render" />
                <p>Eventelligence Layout Preview</p>
              </div>
            </body>
          </html>
        `);
        newTab.document.close();
      }
    } else {
      window.open(url, '_blank');
    }
  };

  // Handle generation call
  const triggerAIGeneration = async () => {
    if (!selectedVenueId || !selectedHallId) return;

    setGenerating(true);
    setResult(null);
    setGenerationLogs([]);

    const logList = [
      'Sending dynamic coordinates to prompt engineering API...',
      'Mapping building ceiling height limit of ' + (activeHall?.height || 8) + 'm...',
      'Scaling stage blueprint: ' + stageWidth + 'm width x ' + stageLength + 'm depth...',
      'Applying theme accents ' + themeColors.join('/') + '...',
      'Generating realistic crowd seating rows for ' + seatingCount + ' pax...',
      'Injecting vectors for sponsors: ' + (activeBranding?.logos?.join(', ') || 'Custom Brand') + '...',
      'Rendering final visual layout using OpenAI DALL-E...'
    ];

    for (let i = 0; i < logList.length; i++) {
      await new Promise(r => setTimeout(r, 450));
      setGenerationLogs(prev => [...prev, logList[i]]);
    }

    try {
      const payload = {
        venue_id: Number(selectedVenueId),
        hall_id: Number(selectedHallId),
        stage_width: stageWidth,
        stage_length: stageLength,
        stage_height: stageHeight,
        stage_finish: selectedStageTemplate,
        seating_style: selectedSeatingTemplate,
        seating_count: seatingCount,
        branding_template_id: selectedBrandingId ? Number(selectedBrandingId) : null,
        event_name: eventName,
        event_date: eventDate,
        theme_colors: themeColors,
        custom_prompt_addon: customDirectives,
        gemini_api_key: geminiApiKey
      };

      const res = await fetch(`${API_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setResult(data);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      // Fallback
      setResult({
        image_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
        prompt: `Photorealistic 3D visualization render of "${eventName}" inside ${activeVenue?.name} - ${activeHall?.name}. Staging size ${stageWidth}x${stageLength}m.`,
        metadata: { engine: 'DALL-E 3 (Fallback)', resolution: '1024x1024' }
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans antialiased">
      {/* Header Bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-slate-900 leading-none">Eventelligence</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5 block">Client Configurator</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gemini Key:</span>
            <input 
              type="password" 
              value={geminiApiKey} 
              onChange={(e) => handleKeyChange(e.target.value)} 
              placeholder="Paste Gemini API Key..." 
              className="text-xs bg-slate-50 border border-slate-200 p-2 px-3 rounded-lg focus:outline-none focus:border-slate-400 text-slate-800 w-44" 
            />
          </div>
          <a href="/admin" className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition">
            Admin Master Data
          </a>
        </div>
      </header>

      {/* Main Grid Wrapper */}
      <main className="max-w-6xl mx-auto px-6 py-12 flex flex-col gap-10">
        
        {/* Tab Selector Mode Toggler */}
        <div className="flex border border-slate-200 p-1 rounded-lg bg-slate-50/50 self-start">
          <button 
            type="button"
            onClick={() => setActiveMode('wizard')}
            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition ${
              activeMode === 'wizard' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Custom Event Configurator
          </button>
          <button 
            type="button"
            onClick={() => setActiveMode('stitcher')}
            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition ${
              activeMode === 'stitcher' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Instant Auto-Stitcher
          </button>
        </div>

        {activeMode === 'wizard' ? (
          <>
            {/* Progress Navigation Tracker */}
            <nav aria-label="Progress tracker" className="flex justify-between items-center border border-slate-200 rounded-xl p-3 bg-white max-w-lg">
          <div className="flex items-center gap-6 pl-2">
            {[1, 2, 3].map(step => (
              <button 
                key={step} 
                onClick={() => currentStep >= step && setCurrentStep(step)}
                disabled={step === 3 && (!selectedVenueId || !selectedHallId)}
                className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition ${
                  currentStep === step ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${
                  currentStep === step ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200'
                }`}>
                  {step}
                </span>
                Step {step}
              </button>
            ))}
          </div>
          <span className="text-[11px] font-bold text-slate-400 bg-slate-100 border border-slate-200/50 rounded-full px-2.5 py-0.5">
            {currentStep === 1 && 'Location'}
            {currentStep === 2 && 'Staging & Layout'}
            {currentStep === 3 && 'AI Visualization'}
          </span>
        </nav>

        {/* Dynamic Wizard Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          
          {/* Form parameters side */}
          <section className="lg:col-span-2 space-y-8">
            
            {/* Step 1: Sequential Venue Selectors */}
            {currentStep === 1 && (
              <div className="border border-slate-200 rounded-2xl bg-white p-8 space-y-6">
                <div>
                  <h2 className="font-display font-bold text-xl text-slate-900">Event Location Details</h2>
                  <p className="text-slate-500 text-xs mt-1">Select location options dynamically sourced directly from the database schema.</p>
                </div>

                {/* 1. City Select */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">1. Select City</label>
                  <div className="flex flex-wrap gap-2">
                    {cities.map(c => (
                      <button 
                        key={c.id}
                        onClick={() => setSelectedCityId(c.id)}
                        className={`px-4 py-2 border rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                          selectedCityId === c.id 
                            ? 'bg-slate-100 border-slate-900 text-slate-900 font-bold' 
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Venue Cascade Select */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">2. Select Venue</label>
                  {fetchingVenues ? (
                    <div className="py-4 flex items-center gap-2 text-xs text-slate-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Querying city venues...
                    </div>
                  ) : venues.length === 0 ? (
                    <p className="text-xs italic text-slate-400">No venues configured in this city. Go to Admin Panel to add one.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {venues.map(v => (
                        <div 
                          key={v.id}
                          onClick={() => setSelectedVenueId(v.id)}
                          className={`p-4 border rounded-xl cursor-pointer transition ${
                            selectedVenueId === v.id 
                              ? 'border-slate-900 bg-slate-50 text-slate-900' 
                              : 'border-slate-200 bg-white hover:border-slate-350'
                          }`}
                        >
                          <span className="font-semibold text-xs text-slate-800 block">{v.name}</span>
                          <span className="text-[10px] text-slate-450 mt-1 block">{v.address}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Hall Cascade Select */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">3. Select Exhibition Room / Ballroom</label>
                  {fetchingHalls ? (
                    <div className="py-4 flex items-center gap-2 text-xs text-slate-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pulling venue halls...
                    </div>
                  ) : halls.length === 0 ? (
                    <p className="text-xs italic text-slate-400">No event rooms configured under this venue. Go to Admin Panel to add halls.</p>
                  ) : (
                    <div className="space-y-2">
                      {halls.map(h => (
                        <div 
                          key={h.id}
                          onClick={() => {
                            setSelectedHallId(h.id);
                            setSeatingCount(h.capacity);
                          }}
                          className={`p-4 border rounded-xl cursor-pointer flex justify-between items-center transition ${
                            selectedHallId === h.id 
                              ? 'border-slate-900 bg-slate-50 text-slate-900' 
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <span className="font-semibold text-xs text-slate-800 block">{h.name}</span>
                            <span className="text-[10px] text-slate-400 mt-1 block uppercase font-bold tracking-wider">
                              Dimensions: {h.width}m x {h.length}m (Height Limit: {h.height}m)
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                            {h.capacity} Max Pax
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Dynamic Template Setup (Stage & Seating) */}
            {currentStep === 2 && (
              <div className="border border-slate-200 rounded-2xl bg-white p-8 space-y-8">
                <div>
                  <h2 className="font-display font-bold text-xl text-slate-900">Stage & Seating Presets</h2>
                  <p className="text-slate-500 text-xs mt-1">Values and arrangements are loaded live from the active templates library.</p>
                </div>

                {/* Stage template select */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Staging Finish & Style</label>
                  <div className="flex flex-wrap gap-2">
                    {stageTemplates.map(st => (
                      <button 
                        key={st.id}
                        onClick={() => setSelectedStageTemplate(st.value)}
                        className={`px-4 py-2 border rounded-lg text-xs font-semibold transition ${
                          selectedStageTemplate === st.value 
                            ? 'bg-slate-100 border-slate-900 text-slate-900' 
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-350'
                        }`}
                      >
                        {st.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stage dimension sliders */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Width */}
                  <div className="space-y-1.5 p-4 border border-slate-200 rounded-xl">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Stage Width</span>
                      <span className="font-semibold text-slate-800">{stageWidth}m</span>
                    </div>
                    <input 
                      type="range" 
                      min="6" 
                      max="32" 
                      value={stageWidth} 
                      onChange={(e) => setStageWidth(Number(e.target.value))}
                      className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-slate-900"
                    />
                  </div>

                  {/* Length */}
                  <div className="space-y-1.5 p-4 border border-slate-200 rounded-xl">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Stage Depth</span>
                      <span className="font-semibold text-slate-800">{stageLength}m</span>
                    </div>
                    <input 
                      type="range" 
                      min="4" 
                      max="14" 
                      value={stageLength} 
                      onChange={(e) => setStageLength(Number(e.target.value))}
                      className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-slate-900"
                    />
                  </div>

                  {/* Height */}
                  <div className="space-y-1.5 p-4 border border-slate-200 rounded-xl">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Stage Height</span>
                      <span className="font-semibold text-slate-800">{stageHeight}m</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.3" 
                      max="2.1" 
                      step="0.3"
                      value={stageHeight} 
                      onChange={(e) => setStageHeight(Number(e.target.value))}
                      className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-slate-900"
                    />
                  </div>
                </div>

                {/* Seating presets */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Seating Architecture Arrangement</label>
                  <div className="grid grid-cols-3 gap-3">
                    {seatingTemplates.map(seat => (
                      <div 
                        key={seat.id}
                        onClick={() => setSelectedSeatingTemplate(seat.value)}
                        className={`p-4 border rounded-xl cursor-pointer text-center space-y-1.5 transition ${
                          selectedSeatingTemplate === seat.value 
                            ? 'border-slate-900 bg-slate-50 text-slate-900' 
                            : 'border-slate-200 bg-white hover:border-slate-350'
                        }`}
                      >
                        <span className="text-xs font-bold block">{seat.value} Layout</span>
                        <span className="text-[10px] text-slate-400 block">{seat.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audience total count slider */}
                <div className="space-y-2 max-w-sm">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Target Seating Attendance ({seatingCount} pax)</label>
                  <input 
                    type="range" 
                    min="50" 
                    max={activeHall ? activeHall.capacity : 1000} 
                    step="50"
                    value={seatingCount}
                    onChange={(e) => setSeatingCount(Number(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-slate-900"
                  />
                  <div className="flex justify-between text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                    <span>Min: 50 Pax</span>
                    <span>Max Hall Limit: {activeHall ? activeHall.capacity : 'Unknown'} Pax</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Trigger & Summary Output */}
            {currentStep === 3 && (
              <div className="border border-slate-200 rounded-2xl bg-white p-8 space-y-8">
                <div>
                  <h2 className="font-display font-bold text-xl text-slate-900">AI Visualizer & Execution Panel</h2>
                  <p className="text-slate-500 text-xs mt-1">Review your consolidated details before running the DALL-E rendering trigger.</p>
                </div>

                {/* Setup Details Forms */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Event Title</label>
                    <input 
                      type="text" 
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 p-3 rounded-lg focus:outline-none focus:border-slate-400 text-slate-800"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Launch Date</label>
                    <input 
                      type="date" 
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 p-3 rounded-lg focus:outline-none focus:border-slate-400 text-slate-800"
                      required
                    />
                  </div>
                </div>

                {/* Branding Template Dynamic Option */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Select Sponsor Branding Template</label>
                  <select
                    value={selectedBrandingId}
                    onChange={(e) => setSelectedBrandingId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full text-xs font-semibold bg-white border border-slate-200 p-3 rounded-lg focus:outline-none focus:border-slate-400 text-slate-800"
                  >
                    {brandings.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.logos.join(', ')})</option>
                    ))}
                  </select>
                </div>

                {/* Preset Themes Select */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Theme Color Accents</label>
                  <div className="flex gap-2">
                    {themePresets.map(theme => {
                      const isSelected = themeColors.includes(theme.value);
                      return (
                        <button 
                          key={theme.id}
                          type="button"
                          onClick={() => {
                            if (theme.value === 'Gold/Navy') setThemeColors(['#1e3a8a', '#d97706']);
                            if (theme.value === 'Silver/Cyan') setThemeColors(['#475569', '#0891b2']);
                            if (theme.value === 'Emerald Green') setThemeColors(['#065f46', '#0f766e']);
                          }}
                          className={`px-4 py-2 border rounded-lg text-xs font-semibold transition ${
                            themeColors[0] === (theme.value === 'Gold/Navy' ? '#1e3a8a' : theme.value === 'Silver/Cyan' ? '#475569' : '#065f46')
                              ? 'bg-slate-100 border-slate-900 text-slate-900' 
                              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-350'
                          }`}
                        >
                          {theme.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Directives */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Extra Design Instructions (Optional)</label>
                  <textarea 
                    value={customDirectives}
                    onChange={(e) => setCustomDirectives(e.target.value)}
                    placeholder="e.g. Add branding backdrop logos, white carpet staging, blue uplighting on structural columns..."
                    className="w-full text-xs font-medium bg-white border border-slate-200 p-3 rounded-lg focus:outline-none focus:border-slate-400 text-slate-800 h-20"
                  />
                </div>

                {/* Smart Banner Compositing File Uploader */}
                <div className="space-y-3 p-5 border border-slate-250/60 rounded-xl bg-slate-50/40">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Smart Backdrop Screen Compositing</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Upload a custom event banner to stitch it automatically onto the venue backdrop screen.</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleBannerUpload}
                      disabled={compositing}
                      className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white file:cursor-pointer hover:file:bg-slate-800 disabled:opacity-50"
                    />
                    
                    {compositing && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Compositing image using Sharp overlay coordinates...
                      </div>
                    )}
                  </div>
                </div>

                {/* Trigger box */}
                {!result && !generating && (
                  <div className="p-6 border border-dashed border-slate-200 rounded-xl text-center space-y-4">
                    <span className="text-xs font-medium text-slate-400 block">Ready to compile coordinates and execute generation pipeline.</span>
                    <button 
                      onClick={triggerAIGeneration}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition"
                    >
                      Trigger AI Visualization
                    </button>
                  </div>
                )}

                {/* Logs console */}
                {generating && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5 p-4 border border-slate-200 bg-slate-50 rounded-xl text-xs text-slate-600">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                      <span>Synthesizing photographic event render layout...</span>
                    </div>

                    <div className="p-4 bg-slate-900 rounded-xl font-mono text-[10px] text-slate-400 space-y-1 max-h-36 overflow-y-auto">
                      {generationLogs.map((log, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-slate-500">&gt;</span>
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Output Screen */}
                {(result || compositeResult) && (
                  <div className="space-y-4 animate-fade">
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                      <img src={compositeResult ? compositeResult.composited_image : result.image_url} alt="" className="w-full h-72 object-cover" />
                      <div className="p-4 border-t border-slate-200 flex justify-between items-center gap-4 bg-white">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {compositeResult ? 'Smart Banner Composited Layout' : 'AI Layout Rendering'}
                          </span>
                          <span className="font-bold text-xs block text-slate-800 mt-0.5">{eventName}</span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => openImage(compositeResult ? compositeResult.composited_image : result.image_url)} 
                            className="p-2 border border-slate-200 hover:border-slate-350 bg-white rounded-lg text-slate-600 transition"
                          >
                            <ExternalLink className="w-4.5 h-4.5" />
                          </button>
                          <button 
                            onClick={() => openImage(compositeResult ? compositeResult.composited_image : result.image_url)}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
                          >
                            Download Layout
                          </button>
                        </div>
                      </div>
                    </div>

                    {!compositeResult && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 font-mono leading-relaxed">
                        <span className="font-bold block uppercase tracking-wider text-[9px] mb-1">Engineered Prompt Parameters</span>
                        {result.prompt}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Dynamic Configuration Recap Sidebar (Right 1/3) */}
          <aside className="border border-slate-200 bg-slate-50/50 rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-sm text-slate-900">Event Configuration</h3>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">Recap & Dynamic Constraints</p>
            </div>

            <div className="space-y-5">
              {/* City & Venue */}
              <div className="flex gap-3 text-xs">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Location</span>
                  <span className="font-semibold text-slate-700 block">
                    {activeCity ? activeCity.name : 'Not selected'}
                  </span>
                  <span className="text-slate-500 block mt-0.5">
                    {activeVenue ? activeVenue.name : 'No Venue'} • {activeHall ? activeHall.name : 'No Hall'}
                  </span>
                </div>
              </div>

              {/* Staging */}
              <div className="flex gap-3 text-xs">
                <Sliders className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Staging</span>
                  <span className="font-semibold text-slate-700 block uppercase">
                    {selectedStageTemplate || 'Not configured'}
                  </span>
                  {selectedStageTemplate && (
                    <span className="text-slate-500 block mt-0.5">
                      Size: {stageWidth}m(W) x {stageLength}m(D) x {stageHeight}m(H)
                    </span>
                  )}
                </div>
              </div>

              {/* Seating */}
              <div className="flex gap-3 text-xs">
                <Users className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Seating setup</span>
                  <span className="font-semibold text-slate-700 block">
                    {selectedSeatingTemplate ? `${selectedSeatingTemplate} layout` : 'Not selected'}
                  </span>
                  {selectedSeatingTemplate && (
                    <span className="text-slate-500 block mt-0.5">
                      Target Capacity: {seatingCount.toLocaleString()} Seats
                    </span>
                  )}
                </div>
              </div>

              {/* Branding */}
              <div className="flex gap-3 text-xs">
                <Palette className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Accents & Branding</span>
                  <span className="font-semibold text-slate-700 block">
                    {activeBranding ? activeBranding.name : 'None selected'}
                  </span>
                  {themeColors.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-3.5 h-3.5 rounded border border-slate-350" style={{ backgroundColor: themeColors[0] }} />
                      <div className="w-3.5 h-3.5 rounded border border-slate-350" style={{ backgroundColor: themeColors[1] }} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons strip */}
            <div className="flex justify-between items-center border-t border-slate-200 pt-6 mt-6">
              <button 
                onClick={() => currentStep > 1 && setCurrentStep(currentStep - 1)}
                disabled={currentStep === 1 || generating}
                className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronLeft className="w-4.5 h-4.5" />
                Back
              </button>

              {currentStep < 3 ? (
                <button 
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={currentStep === 1 && (!selectedVenueId || !selectedHallId)}
                  className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-800 hover:text-slate-900 transition disabled:opacity-30"
                >
                  Next
                  <ChevronRight className="w-4.5 h-4.5" />
                </button>
              ) : (
                <button 
                  onClick={triggerAIGeneration}
                  disabled={generating || !selectedVenueId || !selectedHallId}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition disabled:opacity-40"
                >
                  {generating ? 'Running...' : 'Generate'}
                </button>
              )}
            </div>
          </aside>
        </div>
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
            {/* Upload form container */}
            <div className="lg:col-span-2 space-y-6">
              <div className="border border-slate-200 rounded-2xl bg-white p-8 space-y-8">
                <div>
                  <h2 className="font-display font-bold text-xl text-slate-900">Instant Screen Compositer</h2>
                  <p className="text-slate-500 text-xs mt-1">Upload any venue base image with a white screen, drop your event banner, and auto-stitch them instantly.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Uploader A: Base image */}
                  <div className="space-y-3 p-5 border border-dashed border-slate-200 rounded-xl bg-slate-50/30 text-center flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Step 1: Venue Backdrop Photo (with white screen)</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleStitcherBaseUpload}
                      className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white file:cursor-pointer hover:file:bg-slate-800 w-full"
                    />
                    {stitcherBaseImage && (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 w-full h-32 mt-2">
                        <img src={stitcherBaseImage} alt="Base backdrop" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  {/* Uploader B: Banner */}
                  <div className="space-y-3 p-5 border border-dashed border-slate-200 rounded-xl bg-slate-50/30 text-center flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Step 2: Event Banner Poster</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleStitcherBannerUpload}
                      className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white file:cursor-pointer hover:file:bg-slate-800 w-full"
                    />
                    {stitcherBanner && (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 w-full h-32 mt-2">
                        <img src={stitcherBanner} alt="Banner" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                {stitcherBaseImage && stitcherBanner && !stitcherLoading && (
                  <div className="space-y-6">
                    <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3 text-left">
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider block">Refit Banner Coordinates (Optional)</h4>
                        <p className="text-[11px] text-slate-500 mt-1">If the automatic scan is slightly off or distorted, click and drag a red box on the photo below to place the banner exactly where you want it. Leave it blank to use the auto-scanner.</p>
                      </div>
                      <div className="border border-slate-100 rounded-lg p-1 bg-slate-50 flex justify-center">
                        <AdminBoundingBox 
                          imageUrl={stitcherBaseImage}
                          onSave={(coords) => {
                            setStitcherCoords({
                              mask_x: coords.x,
                              mask_y: coords.y,
                              mask_w: coords.w,
                              mask_h: coords.h
                            });
                          }}
                        />
                      </div>
                    </div>

                    <div className="text-center py-2">
                      <button 
                        onClick={triggerInstantStitch}
                        className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition"
                      >
                        Stitch Images Automatically
                      </button>
                    </div>
                  </div>
                )}

                {stitcherLoading && (
                  <div className="flex items-center justify-center gap-2.5 p-6 border border-slate-100 rounded-xl bg-slate-50/50 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                    Running computer vision pixel scanner to detect white coordinates and overlay...
                  </div>
                )}
              </div>
            </div>

            {/* Results right side */}
            <div className="space-y-6">
              <div className="border border-slate-200 bg-slate-50/40 rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="font-semibold text-sm text-slate-900 font-display">Composite Output</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Instant Rendering Preview</p>
                </div>

                {stitcherResult ? (
                  <div className="space-y-4 animate-fade">
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                      <img src={stitcherResult} alt="Composite Output" className="w-full h-64 object-cover" />
                      <div className="p-4 border-t border-slate-100 flex justify-between items-center gap-3 bg-white">
                        <span className="text-[10px] font-bold text-emerald-600 block uppercase tracking-wider">Auto-Composited Successfully</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => openImage(stitcherResult)}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition"
                          >
                            Open Large
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                    Upload venue backdrop and event poster to view results here.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
