"use client";

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Layers, 
  Plus, 
  MapPin, 
  Sparkles, 
  Trash2,
  Check, 
  ChevronRight, 
  Loader2,
  Sliders,
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function AdminDashboard() {
  // Navigation & Data state
  const [activeTab, setActiveTab] = useState<'venues' | 'halls' | 'cities'>('venues');
  const [cities, setCities] = useState<City[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms states
  const [newCity, setNewCity] = useState({ name: '', state: '' });
  const [newVenue, setNewVenue] = useState({ 
    city_id: '', 
    name: '', 
    address: '', 
    image_url: '',
    mask_x: 0,
    mask_y: 0,
    mask_w: 0,
    mask_h: 0
  });
  const [newHall, setNewHall] = useState({ venue_id: '', name: '', width: '', length: '', height: '', capacity: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch initial data dynamically on mount
  const fetchData = async () => {
    setLoading(true);
    try {
      const [citiesRes, venuesRes, hallsRes] = await Promise.all([
        fetch(`${API_BASE}/api/cities`),
        fetch(`${API_BASE}/api/venues`),
        fetch(`${API_BASE}/api/halls`)
      ]);

      const [citiesData, venuesData, hallsData] = await Promise.all([
        citiesRes.json(),
        venuesRes.json(),
        hallsRes.json()
      ]);

      setCities(citiesData);
      setVenues(venuesData);
      setHalls(hallsData);

      // Pre-select first IDs for dropdown selectors
      if (citiesData.length > 0) {
        setNewVenue(prev => ({ ...prev, city_id: String(citiesData[0].id) }));
      }
      if (venuesData.length > 0) {
        setNewHall(prev => ({ ...prev, venue_id: String(venuesData[0].id) }));
      }
    } catch (err) {
      showToast('Error loading data from API', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Form Submissions
  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCity.name || !newCity.state) return;

    try {
      const res = await fetch(`${API_BASE}/api/cities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCity),
      });

      if (!res.ok) throw new Error('API request failed');
      const data = await res.json();
      
      setCities(prev => [...prev, data]);
      showToast(`City "${data.name}" added successfully.`);
      setNewCity({ name: '', state: '' });
      
      // Update venue select input
      if (!newVenue.city_id) {
        setNewVenue(prev => ({ ...prev, city_id: String(data.id) }));
      }
    } catch (err) {
      showToast('Failed to save city', 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewVenue(prev => ({
        ...prev,
        image_url: reader.result as string
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVenue.name || !newVenue.city_id) return;

    try {
      const formData = new FormData();
      formData.append('city_id', String(newVenue.city_id));
      formData.append('name', newVenue.name);
      formData.append('address', newVenue.address);

      // Coordinate Fallbacks (Fallback to 20, 15, 60, 40 if not set, or 0)
      const finalX = newVenue.mask_x || 20;
      const finalY = newVenue.mask_y || 15;
      const finalW = newVenue.mask_w || 60;
      const finalH = newVenue.mask_h || 40;

      formData.append('mask_x', String(finalX));
      formData.append('mask_y', String(finalY));
      formData.append('mask_w', String(finalW));
      formData.append('mask_h', String(finalH));

      if (imageFile) {
        formData.append('image_file', imageFile);
      } else {
        formData.append('image_url', newVenue.image_url);
      }

      const res = await fetch(`${API_BASE}/api/venues`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('API request failed');
      const data = await res.json();

      setVenues(prev => [...prev, data]);
      showToast(`Venue "${data.name}" added successfully.`);
      
      setImageFile(null);
      setNewVenue(prev => ({ 
        ...prev, 
        name: '', 
        address: '', 
        image_url: '',
        mask_x: 0,
        mask_y: 0,
        mask_w: 0,
        mask_h: 0
      }));

      // Update hall select input
      if (!newHall.venue_id) {
        setNewHall(prev => ({ ...prev, venue_id: String(data.id) }));
      }
    } catch (err) {
      showToast('Failed to save venue', 'error');
    }
  };

  const handleAddHall = async (e: React.FormEvent) => {
    e.preventDefault();
    const { venue_id, name, width, length, height, capacity } = newHall;
    if (!venue_id || !name || !width || !length || !height || !capacity) return;

    try {
      const res = await fetch(`${API_BASE}/api/halls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_id: Number(venue_id),
          name,
          width: Number(width),
          length: Number(length),
          height: Number(height),
          capacity: Number(capacity)
        }),
      });

      if (!res.ok) throw new Error('API request failed');
      const data = await res.json();

      setHalls(prev => [...prev, data]);
      showToast(`Hall "${data.name}" added successfully.`);
      setNewHall(prev => ({ ...prev, name: '', width: '', length: '', height: '', capacity: '' }));
    } catch (err) {
      showToast('Failed to save hall', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans antialiased">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white border border-slate-850 px-5 py-3 rounded-xl flex items-center gap-3 shadow-sm animate-fade">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between pb-8 mb-12 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-widest font-bold text-slate-400">Master Administration</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
            <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Eventelligence Admin</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <a 
              href="/" 
              className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition flex items-center gap-1"
            >
              Open Configurator Form
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </header>

        {loading ? (
          <div className="py-24 text-center space-y-4">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto" />
            <p className="text-sm text-slate-500">Querying active database pipelines...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
            
            {/* Input Forms Panel (Left 1/3) */}
            <aside className="space-y-8">
              {/* Tab Selector */}
              <nav className="flex border border-slate-200 rounded-xl overflow-hidden text-xs font-bold uppercase tracking-wider" aria-label="Tab navigation">
                <button
                  onClick={() => setActiveTab('venues')}
                  className={`flex-1 py-3 text-center transition ${activeTab === 'venues' ? 'bg-slate-100 text-slate-900 border-r border-slate-200' : 'text-slate-400 hover:text-slate-600 bg-white border-r border-slate-200'}`}
                >
                  Venues
                </button>
                <button
                  onClick={() => setActiveTab('halls')}
                  className={`flex-1 py-3 text-center transition ${activeTab === 'halls' ? 'bg-slate-100 text-slate-900 border-r border-slate-200' : 'text-slate-400 hover:text-slate-600 bg-white border-r border-slate-200'}`}
                >
                  Halls
                </button>
                <button
                  onClick={() => setActiveTab('cities')}
                  className={`flex-1 py-3 text-center transition ${activeTab === 'cities' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600 bg-white'}`}
                >
                  Cities
                </button>
              </nav>

              {/* Form 1: Add City */}
              {activeTab === 'cities' && (
                <div className="p-6 border border-slate-200 rounded-2xl bg-white space-y-6">
                  <div>
                    <h3 className="font-semibold text-base text-slate-900">Add City</h3>
                    <p className="text-xs text-slate-500 mt-1">Specify new regional nodes for Pan-India location matching.</p>
                  </div>
                  <form onSubmit={handleAddCity} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">City Name</label>
                      <input 
                        type="text" 
                        value={newCity.name}
                        onChange={(e) => setNewCity({ ...newCity, name: e.target.value })}
                        placeholder="e.g. Hyderabad"
                        className="w-full text-sm bg-white border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-slate-400 text-slate-800"
                        required 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">State</label>
                      <input 
                        type="text" 
                        value={newCity.state}
                        onChange={(e) => setNewCity({ ...newCity, state: e.target.value })}
                        placeholder="e.g. Telangana"
                        className="w-full text-sm bg-white border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-slate-400 text-slate-800"
                        required 
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition"
                    >
                      Save City
                    </button>
                  </form>
                </div>
              )}

              {/* Form 2: Add Venue */}
              {activeTab === 'venues' && (
                <div className="p-6 border border-slate-200 rounded-2xl bg-white space-y-6">
                  <div>
                    <h3 className="font-semibold text-base text-slate-900">Add Venue</h3>
                    <p className="text-xs text-slate-500 mt-1">Add premium hotels or conventions under active cities.</p>
                  </div>
                  <form onSubmit={handleAddVenue} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">City Location</label>
                      <select 
                        value={newVenue.city_id}
                        onChange={(e) => setNewVenue({ ...newVenue, city_id: e.target.value })}
                        className="w-full text-sm bg-white border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-slate-400 text-slate-800"
                        required
                      >
                        <option value="">Select City</option>
                        {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Venue Name</label>
                      <input 
                        type="text" 
                        value={newVenue.name}
                        onChange={(e) => setNewVenue({ ...newVenue, name: e.target.value })}
                        placeholder="e.g. The Leela Palace"
                        className="w-full text-sm bg-white border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-slate-400 text-slate-800"
                        required 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Address</label>
                      <input 
                        type="text" 
                        value={newVenue.address}
                        onChange={(e) => setNewVenue({ ...newVenue, address: e.target.value })}
                        placeholder="e.g. Chanakyapuri, New Delhi"
                        className="w-full text-sm bg-white border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-slate-400 text-slate-800"
                      />
                    </div>
                    <div className="space-y-4 p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-2">Venue Backdrop Photo</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Option A: Upload Image File</label>
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={handleFileChange}
                              className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white file:cursor-pointer hover:file:bg-slate-800"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Option B: Photo URL string</label>
                            <input 
                              type="url" 
                              value={imageFile ? '' : newVenue.image_url}
                              disabled={!!imageFile}
                              onChange={(e) => setNewVenue({ ...newVenue, image_url: e.target.value })}
                              placeholder="https://images.unsplash.com/..."
                              className="w-full text-xs bg-white border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-slate-400 text-slate-800 disabled:opacity-50 disabled:bg-slate-100"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    {newVenue.image_url && (
                      <AdminBoundingBox 
                        imageUrl={newVenue.image_url} 
                        onSave={(coords) => setNewVenue(prev => ({
                          ...prev,
                          mask_x: coords.x,
                          mask_y: coords.y,
                          mask_w: coords.w,
                          mask_h: coords.h
                        }))}
                      />
                    )}
                    <button 
                      type="submit" 
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition"
                    >
                      Save Venue
                    </button>
                  </form>
                </div>
              )}

              {/* Form 3: Add Hall */}
              {activeTab === 'halls' && (
                <div className="p-6 border border-slate-200 rounded-2xl bg-white space-y-6">
                  <div>
                    <h3 className="font-semibold text-base text-slate-900">Add Hall</h3>
                    <p className="text-xs text-slate-500 mt-1">Specify room dimension thresholds for structural scaling.</p>
                  </div>
                  <form onSubmit={handleAddHall} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Select Venue</label>
                      <select 
                        value={newHall.venue_id}
                        onChange={(e) => setNewHall({ ...newHall, venue_id: e.target.value })}
                        className="w-full text-sm bg-white border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-slate-400 text-slate-800"
                        required
                      >
                        <option value="">Select Venue</option>
                        {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Hall Name</label>
                      <input 
                        type="text" 
                        value={newHall.name}
                        onChange={(e) => setNewHall({ ...newHall, name: e.target.value })}
                        placeholder="e.g. Royal Plenary Hall"
                        className="w-full text-sm bg-white border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-slate-400 text-slate-800"
                        required 
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Width (m)</label>
                        <input 
                          type="number" 
                          value={newHall.width}
                          onChange={(e) => setNewHall({ ...newHall, width: e.target.value })}
                          className="w-full text-sm bg-white border border-slate-200 p-2.5 rounded-xl focus:outline-none text-slate-800"
                          placeholder="24"
                          required 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Length (m)</label>
                        <input 
                          type="number" 
                          value={newHall.length}
                          onChange={(e) => setNewHall({ ...newHall, length: e.target.value })}
                          className="w-full text-sm bg-white border border-slate-200 p-2.5 rounded-xl focus:outline-none text-slate-800"
                          placeholder="40"
                          required 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Height (m)</label>
                        <input 
                          type="number" 
                          value={newHall.height}
                          onChange={(e) => setNewHall({ ...newHall, height: e.target.value })}
                          className="w-full text-sm bg-white border border-slate-200 p-2.5 rounded-xl focus:outline-none text-slate-800"
                          placeholder="8.5"
                          required 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Max capacity (Pax)</label>
                      <input 
                        type="number" 
                        value={newHall.capacity}
                        onChange={(e) => setNewHall({ ...newHall, capacity: e.target.value })}
                        className="w-full text-sm bg-white border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-slate-400 text-slate-800"
                        placeholder="e.g. 500"
                        required 
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition"
                    >
                      Save Hall
                    </button>
                  </form>
                </div>
              )}
            </aside>

            {/* Display database state (Right 2/3) */}
            <section className="lg:col-span-2 space-y-12">
              {/* Cities Section */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-widest font-bold text-slate-400 border-b border-slate-200 pb-2">Cities Indexed</h3>
                {cities.length === 0 ? (
                  <p className="text-xs italic text-slate-400">No cities registered.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {cities.map(c => (
                      <div key={c.id} className="p-4 border border-slate-200 rounded-xl bg-white flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-sm text-slate-800 block">{c.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{c.state}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 bg-slate-100 rounded-full border border-slate-200/50">
                          {venues.filter(v => v.city_id === c.id).length} Venues
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Venues & Halls Nested layout */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-widest font-bold text-slate-400 border-b border-slate-200 pb-2 flex items-center justify-between">
                  <span>Registered Venues & Halls</span>
                  <span className="text-[10px] lowercase font-normal">{venues.length} locations active</span>
                </h3>

                {venues.length === 0 ? (
                  <p className="text-xs italic text-slate-400">No venues configured yet.</p>
                ) : (
                  <div className="space-y-6">
                    {venues.map(v => {
                      const city = cities.find(c => c.id === v.city_id);
                      const venueHalls = halls.filter(h => h.venue_id === v.id);

                      return (
                        <div key={v.id} className="border border-slate-200 rounded-2xl bg-white overflow-hidden">
                          {/* Venue info strip */}
                          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
                            <div>
                              <h4 className="font-semibold text-sm text-slate-900">{v.name}</h4>
                              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {v.address || 'Address not listed'} • {city ? city.name : 'Unknown City'}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-0.5 bg-white text-slate-600 rounded-full border border-slate-200 uppercase tracking-wide">
                              ID: V-{v.id}
                            </span>
                          </div>

                          {/* Nested halls listing */}
                          <div className="p-6">
                            {venueHalls.length === 0 ? (
                              <p className="text-xs italic text-slate-400">No rooms or ballrooms registered under this venue. Go to the "Halls" tab to add one.</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {venueHalls.map(h => (
                                  <div key={h.id} className="p-4 border border-slate-200 rounded-xl bg-white flex justify-between items-center">
                                    <div className="space-y-1">
                                      <span className="font-semibold text-xs text-slate-800 block">{h.name}</span>
                                      <div className="flex gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                        <span>Area: {h.width}x{h.length}m</span>
                                        <span>Height: {h.height}m</span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Capacity</span>
                                      <span className="text-xs font-bold text-slate-700">{h.capacity.toLocaleString()} Pax</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
