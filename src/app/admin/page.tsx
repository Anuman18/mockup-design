"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Building2, Layers, MapPin, Plus, Trash2, Loader2, Check,
  Users, Image as ImageIcon, ChevronDown, X, Star, BookOpen, Settings
} from 'lucide-react';
import AdminBoundingBox from '@/components/AdminBoundingBox';

// ─── Types ────────────────────────────────────────────────────────────────────
interface City    { id: number; name: string; state: string; status: string; }
interface Venue   { id: number; cityId: number; name: string; address: string; city?: City; }
interface Hall    { id: number; venueId: number; name: string; length: number; width: number; height: number; capacity: number; baseImageUrl?: string | null; maskX: number; maskY: number; maskWidth: number; maskHeight: number; venue?: Venue & { city?: City }; }
interface Logo    { id: number; logoName: string; }
interface Branding{ id: number; templateName: string; logos: Logo[]; }

type Tab = 'cities' | 'venues' | 'halls' | 'branding';

// ─── Toast ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const show = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };
  return { toast, show };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('cities');
  const { toast, show } = useToast();

  // Data
  const [cities,   setCities]   = useState<City[]>([]);
  const [venues,   setVenues]   = useState<Venue[]>([]);
  const [halls,    setHalls]    = useState<Hall[]>([]);
  const [brandings,setBrandings]= useState<Branding[]>([]);
  const [loading,  setLoading]  = useState(true);

  // City form
  const [cityForm,  setCityForm]  = useState({ name: '', state: '' });
  // Venue form
  const [venueForm, setVenueForm] = useState({ cityId: '', name: '', address: '' });
  // Hall form
  const [hallForm,  setHallForm]  = useState({ venueId: '', name: '', length: '', width: '', height: '', capacity: '', baseImageUrl: '' });
  const [hallMask,  setHallMask]  = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [hallImageFile, setHallImageFile] = useState<File | null>(null);
  const [hallImagePreview, setHallImagePreview] = useState<string>('');
  // Branding form
  const [brandingForm, setBrandingForm] = useState({ templateName: '', logos: '' });

  // Editing hall bounding box
  const [editingHall, setEditingHall] = useState<Hall | null>(null);
  const [editMask,    setEditMask]    = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [editSaving,  setEditSaving]  = useState(false);

  const [saving, setSaving] = useState(false);

  // ── Fetch all data ─────────────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [c, v, h, b] = await Promise.all([
        fetch('/api/admin/cities').then(r => r.json()),
        fetch('/api/admin/venues').then(r => r.json()),
        fetch('/api/admin/halls').then(r => r.json()),
        fetch('/api/admin/brandings').then(r => r.json()),
      ]);
      setCities(Array.isArray(c) ? c : []);
      setVenues(Array.isArray(v) ? v : []);
      setHalls(Array.isArray(h) ? h : []);
      setBrandings(Array.isArray(b) ? b : []);
    } catch (e) {
      show('Failed to load data', 'error');
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ── City handlers ──────────────────────────────────────────────────────────
  const addCity = async () => {
    if (!cityForm.name.trim() || !cityForm.state.trim()) return show('Fill all fields', 'error');
    setSaving(true);
    const r = await fetch('/api/admin/cities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cityForm) });
    setSaving(false);
    if (r.ok) { show('City added'); setCityForm({ name: '', state: '' }); fetchAll(); }
    else show('Failed to add city', 'error');
  };

  const deleteCity = async (id: number) => {
    if (!confirm('Delete this city and all its venues/halls?')) return;
    const r = await fetch(`/api/admin/cities?id=${id}`, { method: 'DELETE' });
    if (r.ok) { show('City deleted'); fetchAll(); }
    else show('Failed to delete', 'error');
  };

  // ── Venue handlers ─────────────────────────────────────────────────────────
  const addVenue = async () => {
    if (!venueForm.cityId || !venueForm.name.trim() || !venueForm.address.trim()) return show('Fill all fields', 'error');
    setSaving(true);
    const r = await fetch('/api/admin/venues', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...venueForm, cityId: parseInt(venueForm.cityId) }) });
    setSaving(false);
    if (r.ok) { show('Venue added'); setVenueForm({ cityId: '', name: '', address: '' }); fetchAll(); }
    else show('Failed to add venue', 'error');
  };

  const deleteVenue = async (id: number) => {
    if (!confirm('Delete this venue and all its halls?')) return;
    const r = await fetch(`/api/admin/venues?id=${id}`, { method: 'DELETE' });
    if (r.ok) { show('Venue deleted'); fetchAll(); }
    else show('Failed to delete', 'error');
  };

  // ── Hall handlers ──────────────────────────────────────────────────────────
  const handleHallImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHallImageFile(file);
    setHallImagePreview(URL.createObjectURL(file));
  };

  const addHall = async () => {
    if (!hallForm.venueId || !hallForm.name.trim()) return show('venueId and name are required', 'error');
    setSaving(true);
    const fd = new FormData();
    fd.append('venueId', hallForm.venueId);
    fd.append('name', hallForm.name);
    fd.append('length', hallForm.length);
    fd.append('width', hallForm.width);
    fd.append('height', hallForm.height);
    fd.append('capacity', hallForm.capacity);
    fd.append('maskX', String(hallMask.x));
    fd.append('maskY', String(hallMask.y));
    fd.append('maskWidth', String(hallMask.w));
    fd.append('maskHeight', String(hallMask.h));
    if (hallImageFile) fd.append('baseImage', hallImageFile);
    else if (hallForm.baseImageUrl) fd.append('baseImageUrl', hallForm.baseImageUrl);
    const r = await fetch('/api/admin/halls', { method: 'POST', body: fd });
    setSaving(false);
    if (r.ok) {
      show('Hall added');
      setHallForm({ venueId: '', name: '', length: '', width: '', height: '', capacity: '', baseImageUrl: '' });
      setHallMask({ x: 0, y: 0, w: 0, h: 0 });
      setHallImageFile(null);
      setHallImagePreview('');
      fetchAll();
    } else {
      const err = await r.json().catch(() => ({}));
      show(err.error || 'Failed to add hall', 'error');
    }
  };

  const deleteHall = async (id: number) => {
    if (!confirm('Delete this hall?')) return;
    const r = await fetch(`/api/admin/halls?id=${id}`, { method: 'DELETE' });
    if (r.ok) { show('Hall deleted'); fetchAll(); }
    else show('Failed to delete', 'error');
  };

  const saveEditMask = async () => {
    if (!editingHall) return;
    setEditSaving(true);
    const fd = new FormData();
    fd.append('id', String(editingHall.id));
    fd.append('maskX', String(editMask.x));
    fd.append('maskY', String(editMask.y));
    fd.append('maskWidth', String(editMask.w));
    fd.append('maskHeight', String(editMask.h));
    const r = await fetch('/api/admin/halls', { method: 'PUT', body: fd });
    setEditSaving(false);
    if (r.ok) { show('Bounding box saved'); setEditingHall(null); fetchAll(); }
    else show('Failed to save bounding box', 'error');
  };

  // ── Branding handlers ──────────────────────────────────────────────────────
  const addBranding = async () => {
    if (!brandingForm.templateName.trim()) return show('Template name required', 'error');
    setSaving(true);
    const logos = brandingForm.logos.split(',').map(l => l.trim()).filter(Boolean);
    const r = await fetch('/api/admin/brandings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateName: brandingForm.templateName, logos }) });
    setSaving(false);
    if (r.ok) { show('Branding added'); setBrandingForm({ templateName: '', logos: '' }); fetchAll(); }
    else show('Failed to add branding', 'error');
  };

  const deleteBranding = async (id: number) => {
    if (!confirm('Delete this branding template?')) return;
    const r = await fetch(`/api/admin/brandings?id=${id}`, { method: 'DELETE' });
    if (r.ok) { show('Branding deleted'); fetchAll(); }
    else show('Failed to delete', 'error');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'cities',   label: 'Cities',   icon: <MapPin className="w-4 h-4" /> },
    { id: 'venues',   label: 'Venues',   icon: <Building2 className="w-4 h-4" /> },
    { id: 'halls',    label: 'Halls',    icon: <Layers className="w-4 h-4" /> },
    { id: 'branding', label: 'Branding', icon: <Star className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-none">Eventelligence</h1>
              <p className="text-xs text-slate-500">Admin Dashboard</p>
            </div>
          </div>
          <a href="/" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" /> View Frontend
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Tab Bar */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
        ) : (
          <>
            {/* ─── CITIES ─────────────────────────────────────────────────── */}
            {activeTab === 'cities' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Add form */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-500" /> Add City</h2>
                  <input placeholder="City name (e.g. Bhopal)" value={cityForm.name} onChange={e => setCityForm(f => ({...f, name: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <input placeholder="State (e.g. Madhya Pradesh)" value={cityForm.state} onChange={e => setCityForm(f => ({...f, state: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <button onClick={addCity} disabled={saving} className="w-full bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add City
                  </button>
                </div>

                {/* List */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 font-semibold text-sm text-slate-600">All Cities ({cities.length})</div>
                  {cities.length === 0 ? (
                    <p className="text-center text-slate-400 py-12 text-sm">No cities yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {cities.map(c => (
                        <div key={c.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition">
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{c.name}</p>
                            <p className="text-xs text-slate-400">{c.state}</p>
                          </div>
                          <button onClick={() => deleteCity(c.id)} className="text-red-400 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── VENUES ─────────────────────────────────────────────────── */}
            {activeTab === 'venues' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-500" /> Add Venue</h2>
                  <select value={venueForm.cityId} onChange={e => setVenueForm(f => ({...f, cityId: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                    <option value="">Select City</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}, {c.state}</option>)}
                  </select>
                  <input placeholder="Venue name" value={venueForm.name} onChange={e => setVenueForm(f => ({...f, name: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <input placeholder="Address" value={venueForm.address} onChange={e => setVenueForm(f => ({...f, address: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <button onClick={addVenue} disabled={saving} className="w-full bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Venue
                  </button>
                </div>
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 font-semibold text-sm text-slate-600">All Venues ({venues.length})</div>
                  {venues.length === 0 ? (
                    <p className="text-center text-slate-400 py-12 text-sm">No venues yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {venues.map(v => (
                        <div key={v.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition">
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{v.name}</p>
                            <p className="text-xs text-slate-400">{v.address} · {(v as any).city?.name}</p>
                          </div>
                          <button onClick={() => deleteVenue(v.id)} className="text-red-400 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── HALLS ──────────────────────────────────────────────────── */}
            {activeTab === 'halls' && (
              <div className="space-y-6">
                {/* Edit bounding box modal */}
                {editingHall && (
                  <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800">Edit Bounding Box: {editingHall.name}</h3>
                        <button onClick={() => setEditingHall(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
                      </div>
                      {editingHall.baseImageUrl ? (
                        <AdminBoundingBox
                          imageUrl={editingHall.baseImageUrl}
                          initialCoords={{ x: editingHall.maskX, y: editingHall.maskY, w: editingHall.maskWidth, h: editingHall.maskHeight }}
                          onSave={c => setEditMask({ x: c.x, y: c.y, w: c.w, h: c.h })}
                        />
                      ) : (
                        <p className="text-amber-600 text-sm bg-amber-50 p-3 rounded-lg">This hall has no base image. Please add one first.</p>
                      )}
                      <button onClick={saveEditMask} disabled={editSaving || !editingHall.baseImageUrl} className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                        {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Bounding Box
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Add form */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-500" /> Add Hall</h2>
                    <select value={hallForm.venueId} onChange={e => setHallForm(f => ({...f, venueId: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                      <option value="">Select Venue</option>
                      {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <input placeholder="Hall name (e.g. Grand Ballroom)" value={hallForm.name} onChange={e => setHallForm(f => ({...f, name: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Length (m)" type="number" value={hallForm.length} onChange={e => setHallForm(f => ({...f, length: e.target.value}))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      <input placeholder="Width (m)" type="number" value={hallForm.width} onChange={e => setHallForm(f => ({...f, width: e.target.value}))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      <input placeholder="Height (m)" type="number" value={hallForm.height} onChange={e => setHallForm(f => ({...f, height: e.target.value}))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      <input placeholder="Capacity" type="number" value={hallForm.capacity} onChange={e => setHallForm(f => ({...f, capacity: e.target.value}))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>

                    {/* Base Image */}
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Base Image</p>
                      <input placeholder="Or paste image URL" value={hallForm.baseImageUrl} onChange={e => setHallForm(f => ({...f, baseImageUrl: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2" />
                      <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-3 cursor-pointer hover:border-blue-400 transition text-xs text-slate-500">
                        <ImageIcon className="w-4 h-4" /> Upload image file
                        <input type="file" accept="image/*" onChange={handleHallImageChange} className="hidden" />
                      </label>
                      {hallImagePreview && (
                        <img src={hallImagePreview} alt="preview" className="mt-2 rounded-lg w-full h-28 object-cover" />
                      )}
                    </div>

                    {/* Bounding box */}
                    {(hallImagePreview || hallForm.baseImageUrl) && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Define Screen Zone</p>
                        <AdminBoundingBox
                          imageUrl={hallImagePreview || hallForm.baseImageUrl}
                          onSave={c => setHallMask({ x: c.x, y: c.y, w: c.w, h: c.h })}
                        />
                      </div>
                    )}

                    <button onClick={addHall} disabled={saving} className="w-full bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Hall
                    </button>
                  </div>

                  {/* Hall list */}
                  <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 font-semibold text-sm text-slate-600">All Halls ({halls.length})</div>
                    {halls.length === 0 ? (
                      <p className="text-center text-slate-400 py-12 text-sm">No halls yet.</p>
                    ) : (
                      <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
                        {halls.map(h => (
                          <div key={h.id} className="px-6 py-4 hover:bg-slate-50 transition">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex gap-3 items-start flex-1 min-w-0">
                                {h.baseImageUrl ? (
                                  <img src={h.baseImageUrl} alt={h.name} className="w-16 h-12 object-cover rounded-lg border border-slate-200 shrink-0" />
                                ) : (
                                  <div className="w-16 h-12 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center shrink-0"><ImageIcon className="w-5 h-5 text-slate-300" /></div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-800 text-sm truncate">{h.name}</p>
                                  <p className="text-xs text-slate-400 truncate">{(h as any).venue?.name} · {(h as any).venue?.city?.name}</p>
                                  <p className="text-xs text-slate-400">{h.length}m × {h.width}m · {h.capacity} pax</p>
                                  <div className={`mt-1 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${h.maskWidth > 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {h.maskWidth > 0 ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                    {h.maskWidth > 0 ? `Mask: ${h.maskWidth}×${h.maskHeight}px` : 'No mask defined'}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1.5 shrink-0">
                                <button onClick={() => { setEditingHall(h); setEditMask({ x: h.maskX, y: h.maskY, w: h.maskWidth, h: h.maskHeight }); }} className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap">Edit Mask</button>
                                <button onClick={() => deleteHall(h.id)} className="text-xs bg-red-50 text-red-500 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium">Delete</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─── BRANDING ────────────────────────────────────────────────── */}
            {activeTab === 'branding' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-500" /> Add Branding Template</h2>
                  <input placeholder="Template name (e.g. Corporate Tech Summit)" value={brandingForm.templateName} onChange={e => setBrandingForm(f => ({...f, templateName: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Logos (comma-separated names)</label>
                    <textarea placeholder="e.g. Tata Group, Reliance, NASSCOM" value={brandingForm.logos} onChange={e => setBrandingForm(f => ({...f, logos: e.target.value}))} rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                  </div>
                  <button onClick={addBranding} disabled={saving} className="w-full bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Template
                  </button>
                </div>
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 font-semibold text-sm text-slate-600">Branding Templates ({brandings.length})</div>
                  {brandings.length === 0 ? (
                    <p className="text-center text-slate-400 py-12 text-sm">No templates yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {brandings.map(b => (
                        <div key={b.id} className="flex items-start justify-between gap-4 px-6 py-4 hover:bg-slate-50 transition">
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{b.templateName}</p>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {b.logos.map(l => (
                                <span key={l.id} className="bg-slate-100 text-slate-600 text-[11px] px-2 py-0.5 rounded-full">{l.logoName}</span>
                              ))}
                            </div>
                          </div>
                          <button onClick={() => deleteBranding(b.id)} className="text-red-400 hover:text-red-600 mt-1 shrink-0"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
