"use client";

import React, { useState, useEffect } from 'react';
import {
  Building2, Layers, MapPin, Plus, Trash2, Loader2, Check,
  Image as ImageIcon, ChevronDown, X, Star, BookOpen, Settings,
  Map as MapIcon, Upload, Users, ShieldAlert, Key, Lock, Unlock, LogOut,
  CheckCircle, AlertCircle, Search, Filter, ShieldCheck, Sparkles
} from 'lucide-react';
import AdminBoundingBox from '@/components/AdminBoundingBox';

// ─── Existing Types ──────────────────────────────────────────────────────────
interface City    { id: number; name: string; state: string; status: string; }
interface Venue   { id: number; cityId: number; name: string; address: string; city?: City; }
interface Hall    { id: number; venueId: number; name: string; length: number; width: number; height: number; capacity: number; baseImageUrl?: string | null; floorPlanUrl?: string | null; refPhotoUrl1?: string | null; refPhotoUrl2?: string | null; centerMaskX: number; centerMaskY: number; centerMaskWidth: number; centerMaskHeight: number; leftMaskX: number; leftMaskY: number; leftMaskWidth: number; leftMaskHeight: number; rightMaskX: number; rightMaskY: number; rightMaskWidth: number; rightMaskHeight: number; venue?: Venue & { city?: City }; }
interface Logo    { id: number; logoName: string; }
interface Branding{ id: number; templateName: string; logos: Logo[]; }

type Tab = 'cities' | 'venues' | 'halls' | 'branding' | 'users' | 'roles';

interface ScreenCoords { x: number; y: number; w: number; h: number; }
interface MultiScreenCoords {
  center: ScreenCoords | null;
  left: ScreenCoords | null;
  right: ScreenCoords | null;
}

// ─── Step 1 Authentication & RBAC Types ──────────────────────────────────────
interface UserProfile {
  id: number;
  email: string;
  name: string;
  status: string;
  role: { id: number; name: string };
  permissions: string[];
}

interface UserRecord {
  id: number;
  email: string;
  name: string;
  status: string;
  createdAt: string;
  lastLogin: string | null;
  role: { id: number; name: string };
}

interface RoleRecord {
  id: number;
  name: string;
  description: string | null;
  permissionIds: number[];
}

interface PermissionRecord {
  id: number;
  name: string;
  description: string | null;
}

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const show = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };
  return { toast, show };
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('cities');
  const { toast, show } = useToast();

  const [cities,   setCities]   = useState<City[]>([]);
  const [venues,   setVenues]   = useState<Venue[]>([]);
  const [halls,    setHalls]    = useState<Hall[]>([]);
  const [brandings,setBrandings]= useState<Branding[]>([]);
  const [loading,  setLoading]  = useState(true);

  // Forms
  const [cityForm,  setCityForm]  = useState({ name: '', state: '' });
  const [venueForm, setVenueForm] = useState({ cityId: '', name: '', address: '' });
  const [hallForm,  setHallForm]  = useState({ venueId: '', name: '', length: '', width: '', height: '', capacity: '', baseImageUrl: '', floorPlanUrl: '', refPhotoUrl1: '', refPhotoUrl2: '' });

  const [hallMasks, setHallMasks] = useState<MultiScreenCoords>({ center: null, left: null, right: null });
  
  // File uploads state
  const [hallImageFile, setHallImageFile] = useState<File | null>(null);
  const [hallImagePreview, setHallImagePreview] = useState<string>('');
  
  const [floorPlanFile, setFloorPlanFile] = useState<File | null>(null);
  const [floorPlanPreview, setFloorPlanPreview] = useState<string>('');
  
  const [refPhotoFile1, setRefPhotoFile1] = useState<File | null>(null);
  const [refPhotoPreview1, setRefPhotoPreview1] = useState<string>('');
  
  const [refPhotoFile2, setRefPhotoFile2] = useState<File | null>(null);
  const [refPhotoPreview2, setRefPhotoPreview2] = useState<string>('');

  const [brandingForm, setBrandingForm] = useState({ templateName: '', logos: '' });

  // Modal Editing
  const [editingHall, setEditingHall] = useState<Hall | null>(null);
  const [editMasks,   setEditMasks]   = useState<MultiScreenCoords>({ center: null, left: null, right: null });
  const [editSaving,  setEditSaving]  = useState(false);

  // Modal Uploads
  const [editFloorPlanFile, setEditFloorPlanFile] = useState<File | null>(null);
  const [editFloorPlanPreview, setEditFloorPlanPreview] = useState<string>('');
  const [editPhotoFile1, setEditPhotoFile1] = useState<File | null>(null);
  const [editPhotoPreview1, setEditPhotoPreview1] = useState<string>('');
  const [editPhotoFile2, setEditPhotoFile2] = useState<File | null>(null);
  const [editPhotoPreview2, setEditPhotoPreview2] = useState<string>('');

  const [saving, setSaving] = useState(false);

  // ─── Step 1 Auth & RBAC State ──────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [rolesList, setRolesList] = useState<{ id: number; name: string }[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');

  // Add/Edit User Modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [addUserForm, setAddUserForm] = useState({ name: '', email: '', password: '', roleId: '' });
  const [editUserForm, setEditUserForm] = useState({ id: 0, name: '', email: '', roleId: '', status: '', password: '' });

  // Role Permissions Matrix
  const [rolesMatrix, setRolesMatrix] = useState<RoleRecord[]>([]);
  const [permissionsList, setPermissionsList] = useState<PermissionRecord[]>([]);
  const [savingMatrixId, setSavingMatrixId] = useState<number | null>(null);

  // ─── Load Current Logged-in Profile ───────────────────────────────────────
  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      setCurrentUser(data.user);
    } catch (err) {
      window.location.href = '/login';
    }
  };

  // ─── Sign Out ─────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (err) {
      window.location.href = '/login';
    }
  };

  // ─── Fetch User directory list ───────────────────────────────────────────
  const fetchUsersDirectory = async () => {
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(userSearch)}&roleId=${userRoleFilter}&status=${userStatusFilter}`);
      const data = await res.json();
      if (res.ok) {
        setUsersList(data.users || []);
        setRolesList(data.roles || []);
      } else {
        show(data.error || 'Failed to load user directory', 'error');
      }
    } catch (err) {
      show('Error loading users directory', 'error');
    }
  };

  // ─── Fetch role permissions matrix ────────────────────────────────────────
  const fetchRolesMatrix = async () => {
    try {
      const res = await fetch('/api/admin/roles');
      const data = await res.json();
      if (res.ok) {
        setRolesMatrix(data.roles || []);
        setPermissionsList(data.permissions || []);
      } else {
        show(data.error || 'Failed to load role permissions matrix', 'error');
      }
    } catch (err) {
      show('Error loading permissions matrix', 'error');
    }
  };

  // ─── Fetch All Layout Settings ────────────────────────────────────────────
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
      show('Failed to load layout data', 'error');
    }
    setLoading(false);
  };

  // ─── Initial Load Guard & Setup ────────────────────────────────────────────
  useEffect(() => {
    fetchCurrentUser();
    fetchAll();
  }, []);

  // ─── Route/Tab Effect trigger ──────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsersDirectory();
    } else if (activeTab === 'roles') {
      fetchRolesMatrix();
    }
  }, [activeTab, userSearch, userRoleFilter, userStatusFilter]);

  // ─── User Add/Edit Handlers ────────────────────────────────────────────────
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserForm.name || !addUserForm.email || !addUserForm.password || !addUserForm.roleId) {
      show('Please fill in all user details', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addUserForm)
      });
      const data = await res.json();
      if (res.ok) {
        show('User added successfully');
        setShowAddUserModal(false);
        setAddUserForm({ name: '', email: '', password: '', roleId: '' });
        fetchUsersDirectory();
      } else {
        show(data.error || 'Failed to create user account', 'error');
      }
    } catch (err) {
      show('Error creating user account', 'error');
    }
    setSaving(false);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editUserForm)
      });
      const data = await res.json();
      if (res.ok) {
        show('User profile updated successfully');
        setShowEditUserModal(false);
        fetchUsersDirectory();
        if (editUserForm.id === currentUser?.id) {
          fetchCurrentUser();
        }
      } else {
        show(data.error || 'Failed to update user', 'error');
      }
    } catch (err) {
      show('Error updating user account', 'error');
    }
    setSaving(false);
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        show('User deleted successfully');
        fetchUsersDirectory();
      } else {
        show(data.error || 'Failed to delete user', 'error');
      }
    } catch (err) {
      show('Error deleting user account', 'error');
    }
  };

  const handleToggleUserStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus })
      });
      const data = await res.json();
      if (res.ok) {
        show(nextStatus === 'suspended' ? 'User suspended successfully' : 'User activated successfully');
        fetchUsersDirectory();
      } else {
        show(data.error || 'Failed to toggle status', 'error');
      }
    } catch (err) {
      show('Error toggling status', 'error');
    }
  };

  const handleTogglePermission = async (roleId: number, permissionId: number, active: boolean) => {
    const role = rolesMatrix.find(r => r.id === roleId);
    if (!role) return;

    let nextPerms = [...role.permissionIds];
    if (active) {
      nextPerms = nextPerms.filter(id => id !== permissionId);
    } else {
      nextPerms.push(permissionId);
    }

    setSavingMatrixId(roleId);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId, permissionIds: nextPerms })
      });
      const data = await res.json();
      if (res.ok) {
        setRolesMatrix(prev => prev.map(r => r.id === roleId ? { ...r, permissionIds: nextPerms } : r));
        show('Role permissions policy saved');
      } else {
        show(data.error || 'Failed to save permissions policy', 'error');
      }
    } catch (err) {
      show('Error updating role permissions matrix', 'error');
    }
    setSavingMatrixId(null);
  };

  // ─── Existing Cities handlers ──────────────────────────────────────────────
  const addCity = async () => {
    if (!cityForm.name.trim() || !cityForm.state.trim()) return show('Fill all fields', 'error');
    setSaving(true);
    const r = await fetch('/api/admin/cities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cityForm) });
    setSaving(false);
    if (r.ok) { show('City added'); setCityForm({ name: '', state: '' }); fetchAll(); }
    else { show('Failed to add city', 'error'); }
  };

  const deleteCity = async (id: number) => {
    if (!confirm('Are you sure you want to delete this city? This will cascade delete venues and halls!')) return;
    const r = await fetch(`/api/admin/cities?id=${id}`, { method: 'DELETE' });
    if (r.ok) { show('City deleted'); fetchAll(); }
    else { show('Failed to delete city', 'error'); }
  };

  // ─── Existing Venues handlers ─────────────────────────────────────────────
  const addVenue = async () => {
    if (!venueForm.cityId || !venueForm.name.trim() || !venueForm.address.trim()) return show('Fill all fields', 'error');
    setSaving(true);
    const r = await fetch('/api/admin/venues', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...venueForm, cityId: parseInt(venueForm.cityId, 10) }) });
    setSaving(false);
    if (r.ok) { show('Venue added'); setVenueForm({ cityId: '', name: '', address: '' }); fetchAll(); }
    else { show('Failed to add venue', 'error'); }
  };

  const deleteVenue = async (id: number) => {
    if (!confirm('Are you sure you want to delete this venue? This will cascade delete all halls!')) return;
    const r = await fetch(`/api/admin/venues?id=${id}`, { method: 'DELETE' });
    if (r.ok) { show('Venue deleted'); fetchAll(); }
    else { show('Failed to delete venue', 'error'); }
  };

  // ─── Existing Halls handlers ──────────────────────────────────────────────
  const handleHallFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'base' | 'floor' | 'ref1' | 'ref2') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    if (fileType === 'base') { setHallImageFile(file); setHallImagePreview(preview); }
    if (fileType === 'floor') { setFloorPlanFile(file); setFloorPlanPreview(preview); }
    if (fileType === 'ref1') { setRefPhotoFile1(file); setRefPhotoPreview1(preview); }
    if (fileType === 'ref2') { setRefPhotoFile2(file); setRefPhotoPreview2(preview); }
  };

  const addHall = async () => {
    if (!hallForm.venueId || !hallForm.name.trim() || !hallForm.width || !hallForm.length || !hallForm.height || !hallForm.capacity) {
      return show('Please fill in all standard hall fields', 'error');
    }
    if (!hallImageFile) {
      return show('Please upload a base hall/room photo', 'error');
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('venueId',  hallForm.venueId);
      fd.append('name',     hallForm.name);
      fd.append('width',    hallForm.width);
      fd.append('length',   hallForm.length);
      fd.append('height',   hallForm.height);
      fd.append('capacity', hallForm.capacity);
      
      fd.append('baseImage', hallImageFile);
      if (floorPlanFile) fd.append('floorPlan', floorPlanFile);
      if (refPhotoFile1) fd.append('refPhoto1', refPhotoFile1);
      if (refPhotoFile2) fd.append('refPhoto2', refPhotoFile2);

      // Append bounding boxes coordinates
      fd.append('centerMaskX',      String(hallMasks.center?.x || 0));
      fd.append('centerMaskY',      String(hallMasks.center?.y || 0));
      fd.append('centerMaskWidth',  String(hallMasks.center?.w || 0));
      fd.append('centerMaskHeight', String(hallMasks.center?.h || 0));

      fd.append('leftMaskX',        String(hallMasks.left?.x || 0));
      fd.append('leftMaskY',        String(hallMasks.left?.y || 0));
      fd.append('leftMaskWidth',    String(hallMasks.left?.w || 0));
      fd.append('leftMaskHeight',   String(hallMasks.left?.h || 0));

      fd.append('rightMaskX',       String(hallMasks.right?.x || 0));
      fd.append('rightMaskY',       String(hallMasks.right?.y || 0));
      fd.append('rightMaskWidth',   String(hallMasks.right?.w || 0));
      fd.append('rightMaskHeight',  String(hallMasks.right?.h || 0));

      const res = await fetch('/api/admin/halls', {
        method: 'POST',
        body: fd
      });

      if (res.ok) {
        show('Hall added successfully');
        setHallForm({ venueId: '', name: '', length: '', width: '', height: '', capacity: '', baseImageUrl: '', floorPlanUrl: '', refPhotoUrl1: '', refPhotoUrl2: '' });
        setHallMasks({ center: null, left: null, right: null });
        setHallImageFile(null);
        setHallImagePreview('');
        setFloorPlanFile(null);
        setFloorPlanPreview('');
        setRefPhotoFile1(null);
        setRefPhotoPreview1('');
        setRefPhotoFile2(null);
        setRefPhotoPreview2('');
        fetchAll();
      } else {
        const err = await res.json();
        show(err.error || 'Failed to add hall', 'error');
      }
    } catch (e) {
      show('Error submitting hall data', 'error');
    }
    setSaving(false);
  };

  const deleteHall = async (id: number) => {
    if (!confirm('Are you sure you want to delete this hall room configuration?')) return;
    const r = await fetch(`/api/admin/halls?id=${id}`, { method: 'DELETE' });
    if (r.ok) { show('Hall deleted'); fetchAll(); }
    else { show('Failed to delete hall', 'error'); }
  };

  const startEditingMasks = (h: Hall) => {
    setEditingHall(h);
    setEditMasks({
      center: h.centerMaskWidth > 0 ? { x: h.centerMaskX, y: h.centerMaskY, w: h.centerMaskWidth, h: h.centerMaskHeight } : null,
      left: h.leftMaskWidth > 0 ? { x: h.leftMaskX, y: h.leftMaskY, w: h.leftMaskWidth, h: h.leftMaskHeight } : null,
      right: h.rightMaskWidth > 0 ? { x: h.rightMaskX, y: h.rightMaskY, w: h.rightMaskWidth, h: h.rightMaskHeight } : null,
    });
    setEditFloorPlanPreview(h.floorPlanUrl || '');
    setEditPhotoPreview1(h.refPhotoUrl1 || '');
    setEditPhotoPreview2(h.refPhotoUrl2 || '');
  };

  const saveEditMask = async () => {
    if (!editingHall) return;
    setEditSaving(true);
    try {
      const fd = new FormData();
      fd.append('id', String(editingHall.id));

      if (editFloorPlanFile) fd.append('floorPlan', editFloorPlanFile);
      if (editPhotoFile1) fd.append('refPhoto1', editPhotoFile1);
      if (editPhotoFile2) fd.append('refPhoto2', editPhotoFile2);

      fd.append('centerMaskX',      String(editMasks.center?.x || 0));
      fd.append('centerMaskY',      String(editMasks.center?.y || 0));
      fd.append('centerMaskWidth',  String(editMasks.center?.w || 0));
      fd.append('centerMaskHeight', String(editMasks.center?.h || 0));

      fd.append('leftMaskX',        String(editMasks.left?.x || 0));
      fd.append('leftMaskY',        String(editMasks.left?.y || 0));
      fd.append('leftMaskWidth',    String(editMasks.left?.w || 0));
      fd.append('leftMaskHeight',   String(editMasks.left?.h || 0));

      fd.append('rightMaskX',       String(editMasks.right?.x || 0));
      fd.append('rightMaskY',       String(editMasks.right?.y || 0));
      fd.append('rightMaskWidth',   String(editMasks.right?.w || 0));
      fd.append('rightMaskHeight',  String(editMasks.right?.h || 0));

      const res = await fetch('/api/admin/halls', {
        method: 'PUT',
        body: fd
      });

      if (res.ok) {
        show('Hall configuration updated successfully');
        setEditingHall(null);
        setEditFloorPlanFile(null);
        setEditPhotoFile1(null);
        setEditPhotoFile2(null);
        fetchAll();
      } else {
        const err = await res.json();
        show(err.error || 'Failed to update hall', 'error');
      }
    } catch (e) {
      show('Error updating hall masks', 'error');
    }
    setEditSaving(false);
  };

  // ─── Existing Brandings handlers ───────────────────────────────────────────
  const addBranding = async () => {
    if (!brandingForm.templateName.trim()) return show('Branding name is required', 'error');
    setSaving(true);
    const r = await fetch('/api/admin/brandings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(brandingForm) });
    setSaving(false);
    if (r.ok) { show('Branding template added'); setBrandingForm({ templateName: '', logos: '' }); fetchAll(); }
    else { show('Failed to add template', 'error'); }
  };

  const deleteBranding = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    const r = await fetch(`/api/admin/brandings?id=${id}`, { method: 'DELETE' });
    if (r.ok) { show('Branding template deleted'); fetchAll(); }
    else { show('Failed to delete template', 'error'); }
  };

  // RBAC Permission shortcuts
  const canCreate = currentUser?.role.name === 'Super Admin' || currentUser?.permissions.includes('Create');
  const canUpdate = currentUser?.role.name === 'Super Admin' || currentUser?.permissions.includes('Update');
  const canDelete = currentUser?.role.name === 'Super Admin' || currentUser?.permissions.includes('Delete');
  const canApprove = currentUser?.role.name === 'Super Admin' || currentUser?.permissions.includes('Approve');

  // Render Premium skeleton loading state
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <aside className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-6">
          <div className="h-8 bg-slate-800 rounded animate-pulse" />
          <div className="h-12 bg-slate-800 rounded animate-pulse" />
          <div className="space-y-3 flex-1">
            <div className="h-8 bg-slate-800 rounded animate-pulse" />
            <div className="h-8 bg-slate-800 rounded animate-pulse" />
            <div className="h-8 bg-slate-800 rounded animate-pulse" />
          </div>
        </aside>
        <main className="flex-1 p-8 space-y-6">
          <div className="h-10 bg-slate-200 rounded w-1/3 animate-pulse" />
          <div className="grid grid-cols-3 gap-6">
            <div className="h-40 bg-white border border-slate-200 rounded-2xl animate-pulse" />
            <div className="h-40 bg-white border border-slate-200 rounded-2xl animate-pulse col-span-2" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex">
      {/* Toast notifications */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-rose-600 text-white'}`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* LEFT SIDEBAR navigation */}
      <aside className="w-64 bg-slate-950 text-slate-400 border-r border-slate-800/80 flex flex-col shrink-0">
        {/* Brand logo & header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-800/30">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none tracking-wide">Eventelligence</h1>
            <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-wider">Enterprise Hub</p>
          </div>
        </div>

        {/* User profile section */}
        {currentUser && (
          <div className="p-4 border-b border-slate-800/60 bg-slate-900/20 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm select-none">
              {currentUser.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate leading-tight">{currentUser.name}</p>
              <span className="inline-block text-[9px] font-extrabold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md mt-1 border border-blue-500/10 leading-none">
                {currentUser.role.name}
              </span>
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="flex-1 py-6 px-4 space-y-7 overflow-y-auto">
          {/* Section: Layout Configurator */}
          <div className="space-y-2">
            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest px-3">Venues & screens</p>
            <nav className="space-y-1">
              {[
                { id: 'cities',   label: 'Cities & Regions',   icon: <MapPin className="w-4 h-4" /> },
                { id: 'venues',   label: 'Hotel Venues',   icon: <Building2 className="w-4 h-4" /> },
                { id: 'halls',    label: 'Conference Halls',    icon: <Layers className="w-4 h-4" /> },
                { id: 'branding', label: 'Preset Brandings', icon: <Star className="w-4 h-4" /> },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as Tab)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === t.id ? 'bg-slate-900 text-white font-extrabold border-l-2 border-blue-500 shadow-inner' : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'}`}
                >
                  {t.icon} <span>{t.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Section: User directory / RBAC Matrix */}
          <div className="space-y-2">
            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest px-3">Team & Security</p>
            <nav className="space-y-1">
              {[
                { id: 'users', label: 'User Directory', icon: <Users className="w-4 h-4" /> },
                { id: 'roles', label: 'Role Permissions', icon: <Key className="w-4 h-4" /> },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as Tab)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === t.id ? 'bg-slate-900 text-white font-extrabold border-l-2 border-blue-500 shadow-inner' : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'}`}
                >
                  {t.icon} <span>{t.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer (Logout) */}
        <div className="p-4 border-t border-slate-900">
          <a
            href="/"
            className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 hover:bg-slate-850 text-slate-350 rounded-lg text-xs font-bold transition-colors w-full mb-2 border border-slate-800"
          >
            <BookOpen className="w-4 h-4 text-slate-500" /> View Frontend
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/10 rounded-lg text-xs font-bold transition-colors w-full"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* RIGHT CONTENT AREA */}
      <main className="flex-1 overflow-y-auto min-h-screen">
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between sticky top-0 z-20 shadow-sm shadow-slate-100/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800 leading-tight">
              {activeTab === 'cities' && 'Cities & Regions'}
              {activeTab === 'venues' && 'Hotel Venues'}
              {activeTab === 'halls' && 'Conference Halls'}
              {activeTab === 'branding' && 'Preset Brandings'}
              {activeTab === 'users' && 'User Directory'}
              {activeTab === 'roles' && 'Role Permissions Matrix'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeTab === 'cities' && 'Configure regions and metropolitan areas.'}
              {activeTab === 'venues' && 'Configure hotels, resorts, and conference centers.'}
              {activeTab === 'halls' && 'Configure custom conference rooms and LED mapping matrices.'}
              {activeTab === 'branding' && 'Manage sponsor packages and template assets.'}
              {activeTab === 'users' && 'Manage team directory, status, and system privileges.'}
              {activeTab === 'roles' && 'Manage security policies and permissions matrix.'}
            </p>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-6">
          {loading && activeTab !== 'users' && activeTab !== 'roles' ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* CITIES TAB */}
              {activeTab === 'cities' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4 h-fit">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-500" /> Add City</h2>
                    <input placeholder="City name" value={cityForm.name} onChange={e => setCityForm(f => ({...f, name: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    <input placeholder="State" value={cityForm.state} onChange={e => setCityForm(f => ({...f, state: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    <button onClick={addCity} disabled={saving} className="w-full bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add City
                    </button>
                  </div>
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 font-semibold text-sm text-slate-600">All Cities ({cities.length})</div>
                    <div className="divide-y divide-slate-50">
                      {cities.map(c => (
                        <div key={c.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition">
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{c.name}</p>
                            <p className="text-xs text-slate-400">{c.state}</p>
                          </div>
                          <button onClick={() => deleteCity(c.id)} className="text-slate-400 hover:text-red-600 p-1 rounded transition"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* VENUES TAB */}
              {activeTab === 'venues' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4 h-fit">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-500" /> Add Venue</h2>
                    <select value={venueForm.cityId} onChange={e => setVenueForm(f => ({...f, cityId: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                      <option value="">Select City</option>
                      {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input placeholder="Venue name" value={venueForm.name} onChange={e => setVenueForm(f => ({...f, name: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    <input placeholder="Address" value={venueForm.address} onChange={e => setVenueForm(f => ({...f, address: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    <button onClick={addVenue} disabled={saving} className="w-full bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Venue
                    </button>
                  </div>
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 font-semibold text-sm text-slate-600">All Venues ({venues.length})</div>
                    <div className="divide-y divide-slate-50">
                      {venues.map(v => (
                        <div key={v.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition">
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{v.name}</p>
                            <p className="text-xs text-slate-400">{v.address} · {v.city?.name}</p>
                          </div>
                          <button onClick={() => deleteVenue(v.id)} className="text-slate-400 hover:text-red-600 p-1 rounded transition"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* HALLS TAB */}
              {activeTab === 'halls' && (
                <div className="space-y-6 animate-fade-in">
                  {editingHall && (
                    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
                      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-800">Edit Bounding Boxes & Tech Files: {editingHall.name}</h3>
                          <button onClick={() => setEditingHall(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
                        </div>
                        
                        {editingHall.baseImageUrl ? (
                          <AdminBoundingBox
                            imageUrl={editingHall.baseImageUrl}
                            initialCoords={editMasks}
                            onChange={c => setEditMasks(c)}
                          />
                        ) : (
                          <p className="text-amber-600 text-sm bg-amber-50 p-3 rounded-lg">Base image is missing.</p>
                        )}

                        {/* Technical Uploads in Edit Modal */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                          <div>
                            <label className="text-[11px] font-bold text-slate-500 block mb-1">Blueprint Floor Plan</label>
                            <input type="file" accept="image/*" onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) { setEditFloorPlanFile(file); setEditFloorPlanPreview(URL.createObjectURL(file)); }
                            }} className="text-xs block w-full mb-1" />
                            {editFloorPlanPreview && <img src={editFloorPlanPreview} alt="Floor plan" className="w-full h-20 object-contain bg-slate-50 rounded border" />}
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-500 block mb-1">Gallery Photo 1</label>
                            <input type="file" accept="image/*" onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) { setEditPhotoFile1(file); setEditPhotoPreview1(URL.createObjectURL(file)); }
                            }} className="text-xs block w-full mb-1" />
                            {editPhotoPreview1 && <img src={editPhotoPreview1} alt="Gallery 1" className="w-full h-20 object-cover bg-slate-50 rounded border" />}
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-500 block mb-1">Gallery Photo 2</label>
                            <input type="file" accept="image/*" onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) { setEditPhotoFile2(file); setEditPhotoPreview2(URL.createObjectURL(file)); }
                            }} className="text-xs block w-full mb-1" />
                            {editPhotoPreview2 && <img src={editPhotoPreview2} alt="Gallery 2" className="w-full h-20 object-cover bg-slate-50 rounded border" />}
                          </div>
                        </div>

                        <button onClick={saveEditMask} disabled={editSaving || !editingHall.baseImageUrl} className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                          {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Hall Configuration
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                      <h2 className="font-bold text-slate-800 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-500" /> Add Hall</h2>
                      <select value={hallForm.venueId} onChange={e => setHallForm(f => ({...f, venueId: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                        <option value="">Select Venue</option>
                        {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                      <input placeholder="Hall name" value={hallForm.name} onChange={e => setHallForm(f => ({...f, name: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" placeholder="Width (m)" value={hallForm.width} onChange={e => setHallForm(f => ({...f, width: e.target.value}))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        <input type="number" placeholder="Length (m)" value={hallForm.length} onChange={e => setHallForm(f => ({...f, length: e.target.value}))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        <input type="number" placeholder="Height (m)" value={hallForm.height} onChange={e => setHallForm(f => ({...f, height: e.target.value}))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        <input type="number" placeholder="Capacity" value={hallForm.capacity} onChange={e => setHallForm(f => ({...f, capacity: e.target.value}))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      </div>
                      
                      {/* Technical Specs Uploads */}
                      <div className="border-t border-slate-100 pt-4 space-y-3.5">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Base Photo & Blueprints</h4>
                        
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Base Stage Photo (Required)</label>
                          <input type="file" accept="image/*" onChange={e => handleHallFileChange(e, 'base')} className="text-xs block w-full" />
                          {hallImagePreview && <img src={hallImagePreview} alt="Base preview" className="w-full h-24 object-cover bg-slate-50 rounded border mt-1.5" />}
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Blueprint Floor Plan (Optional)</label>
                          <input type="file" accept="image/*" onChange={e => handleHallFileChange(e, 'floor')} className="text-xs block w-full" />
                          {floorPlanPreview && <img src={floorPlanPreview} alt="Floor plan preview" className="w-full h-16 object-contain bg-slate-50 rounded border mt-1.5" />}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Gallery Photo 1</label>
                            <input type="file" accept="image/*" onChange={e => handleHallFileChange(e, 'ref1')} className="text-xs block w-full" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Gallery Photo 2</label>
                            <input type="file" accept="image/*" onChange={e => handleHallFileChange(e, 'ref2')} className="text-xs block w-full" />
                          </div>
                        </div>
                      </div>

                      {/* Bounding box instructions warning */}
                      <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-[11px] text-blue-800 leading-normal font-semibold">
                        💡 Default coordinates will be detected automatically via AI Stage Layout Analysis on upload. You can edit them manually at any time.
                      </div>

                      <button onClick={addHall} disabled={saving} className="w-full bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create Hall Room
                      </button>
                    </div>

                    <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-100 font-semibold text-sm text-slate-600">All Halls ({halls.length})</div>
                      <div className="divide-y divide-slate-100">
                        {halls.map(h => (
                          <div key={h.id} className="p-5 hover:bg-slate-50/60 transition">
                            <div className="flex items-start gap-4">
                              {h.baseImageUrl ? (
                                <img src={h.baseImageUrl} alt={h.name} className="w-20 h-14 object-cover rounded-lg border bg-slate-50" />
                              ) : (
                                <div className="w-20 h-14 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><ImageIcon className="w-5 h-5" /></div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-800 text-sm leading-snug">{h.name}</h4>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">{h.venue?.name} · {h.venue?.city?.name}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">L:{h.length}m W:{h.width}m H:{h.height}m</span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600">Cap: {h.capacity} pax</span>
                                  {h.floorPlanUrl && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">Floorplan ✓</span>}
                                  {(h.refPhotoUrl1 || h.refPhotoUrl2) && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">Gallery ✓</span>}
                                </div>
                              </div>
                              <div className="flex flex-col gap-1.5 shrink-0">
                                <button onClick={() => startEditingMasks(h)} className="text-[11px] bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap">Edit Config</button>
                                <button onClick={() => deleteHall(h.id)} className="text-[11px] bg-red-50 text-red-500 hover:bg-red-100 px-3 py-1.5 rounded-lg font-bold transition-colors">Delete</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* BRANDING TEMPLATES TAB */}
              {activeTab === 'branding' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4 h-fit">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-500" /> Add Branding Template</h2>
                    <input placeholder="Template name" value={brandingForm.templateName} onChange={e => setBrandingForm(f => ({...f, templateName: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Logos (comma-separated names)</label>
                      <textarea placeholder="e.g. Tata Group, Reliance, NASSCOM" value={brandingForm.logos} onChange={e => setBrandingForm(f => ({...f, logos: e.target.value}))} rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none font-medium text-slate-700 bg-slate-50/20" />
                    </div>
                    <button onClick={addBranding} disabled={saving} className="w-full bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Template
                    </button>
                  </div>
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 font-semibold text-sm text-slate-600">Branding Templates ({brandings.length})</div>
                    <div className="divide-y divide-slate-50">
                      {brandings.map(b => (
                        <div key={b.id} className="flex items-start justify-between gap-4 px-6 py-4 hover:bg-slate-50 transition">
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{b.templateName}</p>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {b.logos.map(l => (
                                <span key={l.id} className="bg-slate-150 text-slate-600 text-[11px] px-2.5 py-0.5 rounded-full font-medium">{l.logoName}</span>
                              ))}
                            </div>
                          </div>
                          <button onClick={() => deleteBranding(b.id)} className="text-slate-400 hover:text-red-600 mt-1 shrink-0 p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* USER DIRECTORY TAB */}
              {activeTab === 'users' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Search and Filters Bar */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                      {/* Search box */}
                      <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search users name or email..."
                          value={userSearch}
                          onChange={e => setUserSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium text-slate-700"
                        />
                      </div>
                      
                      {/* Role Filter */}
                      <div className="relative">
                        <select
                          value={userRoleFilter}
                          onChange={e => setUserRoleFilter(e.target.value)}
                          className="pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium text-slate-700 bg-white appearance-none"
                        >
                          <option value="">All Roles</option>
                          {rolesList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      </div>

                      {/* Status Filter */}
                      <div className="relative">
                        <select
                          value={userStatusFilter}
                          onChange={e => setUserStatusFilter(e.target.value)}
                          className="pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium text-slate-700 bg-white appearance-none"
                        >
                          <option value="">All Statuses</option>
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Add User button */}
                    <button
                      onClick={() => {
                        if (!canCreate) {
                          show('Create permission required to add users.', 'error');
                          return;
                        }
                        setShowAddUserModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" /> Add User
                    </button>
                  </div>

                  {/* Users List directory card */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 font-bold text-sm text-slate-700 flex items-center justify-between">
                      <span>User Accounts Directory ({usersList.length})</span>
                    </div>

                    {usersList.length === 0 ? (
                      <div className="p-16 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
                          <Users className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-slate-700 text-sm">No users found</h4>
                        <p className="text-xs text-slate-400 max-w-xs mx-auto">Try refining your search terms or adjusting the filters.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/70 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
                              <th className="px-6 py-3.5 font-bold">User</th>
                              <th className="px-6 py-3.5 font-bold">System Role</th>
                              <th className="px-6 py-3.5 font-bold">Account Status</th>
                              <th className="px-6 py-3.5 font-bold">Activity Logs</th>
                              <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {usersList.map(u => {
                              const isSelf = u.id === currentUser.id;
                              return (
                                <tr key={u.id} className="hover:bg-slate-50/40 transition">
                                  {/* Name / email */}
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200/70 flex items-center justify-center font-bold text-slate-600 text-sm select-none shrink-0">
                                        {u.name.charAt(0)}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 leading-tight flex items-center gap-1.5">
                                          {u.name}
                                          {isSelf && (
                                            <span className="text-[9px] font-bold bg-slate-150 text-slate-500 px-1.5 py-0.5 rounded">You</span>
                                          )}
                                        </p>
                                        <p className="text-xs text-slate-400 truncate mt-0.5">{u.email}</p>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Role */}
                                  <td className="px-6 py-4">
                                    <span className="inline-block text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/40">
                                      {u.role.name}
                                    </span>
                                  </td>

                                  {/* Status */}
                                  <td className="px-6 py-4">
                                    {u.status === 'active' ? (
                                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-500">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Suspended
                                      </span>
                                    )}
                                  </td>

                                  {/* activity logs */}
                                  <td className="px-6 py-4 text-xs font-medium text-slate-400">
                                    <p>Last login: {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}</p>
                                    <p className="text-[10px] mt-0.5">Created: {new Date(u.createdAt).toLocaleDateString()}</p>
                                  </td>

                                  {/* Action buttons */}
                                  <td className="px-6 py-4 text-right">
                                    <div className="inline-flex items-center gap-2">
                                      {/* Suspend / Activate toggle */}
                                      <button
                                        onClick={() => {
                                          if (!canUpdate) return show('Update permission required.', 'error');
                                          handleToggleUserStatus(u.id, u.status);
                                        }}
                                        disabled={isSelf}
                                        title={u.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                                        className={`p-1.5 rounded-lg border transition-colors ${u.status === 'active' ? 'text-amber-500 hover:bg-amber-50 border-amber-100' : 'text-emerald-500 hover:bg-emerald-50 border-emerald-100'} disabled:opacity-40`}
                                      >
                                        {u.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                      </button>

                                      {/* Edit button */}
                                      <button
                                        onClick={() => {
                                          if (!canUpdate) return show('Update permission required.', 'error');
                                          setEditUserForm({
                                            id: u.id,
                                            name: u.name,
                                            email: u.email,
                                            roleId: String(u.role.id),
                                            status: u.status,
                                            password: ''
                                          });
                                          setShowEditUserModal(true);
                                        }}
                                        className="p-1.5 text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                                      >
                                        <Settings className="w-4 h-4" />
                                      </button>

                                      {/* Delete button */}
                                      <button
                                        onClick={() => {
                                          if (!canDelete) return show('Delete permission required.', 'error');
                                          handleDeleteUser(u.id);
                                        }}
                                        disabled={isSelf}
                                        className="p-1.5 text-rose-400 hover:bg-rose-50 border border-rose-100 rounded-lg transition-colors disabled:opacity-40"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Add User Modal Dialog */}
                  {showAddUserModal && (
                    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
                      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-in">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h3 className="font-bold text-slate-800">Add New Team Member</h3>
                          <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
                        </div>
                        
                        <form onSubmit={handleAddUser} className="space-y-4">
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Full Name</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. John Doe"
                              value={addUserForm.name}
                              onChange={e => setAddUserForm(f => ({ ...f, name: e.target.value }))}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Email Address</label>
                            <input
                              type="email"
                              required
                              placeholder="you@company.com"
                              value={addUserForm.email}
                              onChange={e => setAddUserForm(f => ({ ...f, email: e.target.value }))}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Temporary Password</label>
                            <input
                              type="password"
                              required
                              placeholder="At least 6 characters"
                              value={addUserForm.password}
                              onChange={e => setAddUserForm(f => ({ ...f, password: e.target.value }))}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">System Role</label>
                            <select
                              required
                              value={addUserForm.roleId}
                              onChange={e => setAddUserForm(f => ({ ...f, roleId: e.target.value }))}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white font-medium text-slate-700"
                            >
                              <option value="">Select Role</option>
                              {rolesList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setShowAddUserModal(false)}
                              className="w-1/2 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-bold transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={saving}
                              className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Create User
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Edit User Modal Dialog */}
                  {showEditUserModal && (
                    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
                      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-in">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h3 className="font-bold text-slate-800">Edit User Profile</h3>
                          <button onClick={() => setShowEditUserModal(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
                        </div>
                        
                        <form onSubmit={handleUpdateUser} className="space-y-4">
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Full Name</label>
                            <input
                              type="text"
                              required
                              value={editUserForm.name}
                              onChange={e => setEditUserForm(f => ({ ...f, name: e.target.value }))}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Email Address</label>
                            <input
                              type="email"
                              required
                              value={editUserForm.email}
                              onChange={e => setEditUserForm(f => ({ ...f, email: e.target.value }))}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Assigned Role</label>
                            <select
                              required
                              value={editUserForm.roleId}
                              disabled={editUserForm.id === currentUser.id}
                              onChange={e => setEditUserForm(f => ({ ...f, roleId: e.target.value }))}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white font-medium text-slate-700 disabled:opacity-60"
                            >
                              {rolesList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Account Status</label>
                            <select
                              required
                              value={editUserForm.status}
                              disabled={editUserForm.id === currentUser.id}
                              onChange={e => setEditUserForm(f => ({ ...f, status: e.target.value }))}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white font-medium text-slate-700 disabled:opacity-60"
                            >
                              <option value="active">Active</option>
                              <option value="suspended">Suspended</option>
                            </select>
                          </div>

                          <div className="border-t border-slate-100 pt-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Reset Password (Optional)</label>
                            <input
                              type="password"
                              placeholder="Enter new password to override"
                              value={editUserForm.password}
                              onChange={e => setEditUserForm(f => ({ ...f, password: e.target.value }))}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                            />
                            <span className="text-[10px] text-slate-400 font-medium mt-1.5 block leading-tight">Leave blank to keep the current password.</span>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setShowEditUserModal(false)}
                              className="w-1/2 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-bold transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={saving}
                              className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Changes
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* ROLE PERMISSIONS TAB */}
              {activeTab === 'roles' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Security info card */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-5 rounded-2xl flex gap-4">
                    <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600 h-fit">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-blue-800 text-sm">Enterprise Security Matrix</h4>
                      <p className="text-xs text-blue-700/80 leading-relaxed font-semibold">
                        Role permissions are fetched dynamically from the database. Changes saved here will immediately apply across all users belonging to that role.
                        Note: The <b>Super Admin</b> role is hardcoded to bypass security filters and retains all permissions.
                      </p>
                    </div>
                  </div>

                  {/* Matrix permissions table */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 font-bold text-sm text-slate-700">
                      System Roles & Permissions Matrix
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
                            <th className="px-6 py-4 font-bold">System Role</th>
                            {permissionsList.map(p => (
                              <th key={p.id} className="px-6 py-4 font-bold text-center" title={p.description || ''}>
                                {p.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                          {rolesMatrix.map(role => {
                            const isSuperAdmin = role.name === 'Super Admin';
                            const isSaving = savingMatrixId === role.id;
                            
                            return (
                              <tr key={role.id} className="hover:bg-slate-50/40 transition">
                                <td className="px-6 py-4.5">
                                  <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    {role.name}
                                    {isSaving && <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
                                  </p>
                                  {role.description && (
                                    <p className="text-xs text-slate-400 mt-0.5 font-medium">{role.description}</p>
                                  )}
                                </td>
                                {permissionsList.map(p => {
                                  const hasPerm = isSuperAdmin || role.permissionIds.includes(p.id);
                                  return (
                                    <td key={p.id} className="px-6 py-4.5 text-center">
                                      <input
                                        type="checkbox"
                                        checked={hasPerm}
                                        disabled={isSuperAdmin || !canUpdate || isSaving}
                                        onChange={() => handleTogglePermission(role.id, p.id, role.permissionIds.includes(p.id))}
                                        className="w-4.5 h-4.5 text-blue-600 bg-slate-50 border-slate-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
