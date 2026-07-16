"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Building2, Layers, MapPin, Plus, Trash2, Loader2, Check,
  Image as ImageIcon, ChevronDown, X, Star, BookOpen, Settings,
  Map as MapIcon, Upload, Users, ShieldAlert, Key, Lock, Unlock, LogOut,
  CheckCircle, AlertCircle, Search, Filter, ShieldCheck, Sparkles,
  Calendar, Clock, User, Briefcase, PlusCircle, Layout, FileText,
  DollarSign, Activity, FileSpreadsheet, ListTodo, Clipboard, HelpCircle,
  Undo, Redo, ZoomIn, ZoomOut, Maximize, FileImage, Eye, EyeOff, CheckSquare,
  Columns, ArrowLeftRight, Copy, Share, ChevronRight, Download
} from 'lucide-react';
import AdminBoundingBox from '@/components/AdminBoundingBox';
import Link from 'next/link';

// ─── Existing Types ──────────────────────────────────────────────────────────
interface City    { id: number; name: string; state: string; status: string; }
interface Venue   { id: number; cityId: number; name: string; address: string; city?: City; }
interface Hall    { id: number; venueId: number; name: string; length: number; width: number; height: number; capacity: number; baseImageUrl?: string | null; floorPlanUrl?: string | null; refPhotoUrl1?: string | null; refPhotoUrl2?: string | null; centerMaskX: number; centerMaskY: number; centerMaskWidth: number; centerMaskHeight: number; leftMaskX: number; leftMaskY: number; leftMaskWidth: number; leftMaskHeight: number; rightMaskX: number; rightMaskY: number; rightMaskWidth: number; rightMaskHeight: number; venue?: Venue & { city?: City }; }
interface Logo    { id: number; logoName: string; }
interface Branding{ id: number; templateName: string; logos: Logo[]; }

type Tab = 'events' | 'cities' | 'venues' | 'halls' | 'branding' | 'users' | 'roles';

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
  const [activeTab, setActiveTab] = useState<Tab>('events');
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

  // ─── Module 2 Event Conceptualization State ──────────────────────────────
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [eventSearch, setEventSearch] = useState('');
  const [eventStatusFilter, setEventStatusFilter] = useState('');
  const [eventCategoryFilter, setEventCategoryFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  
  // Modals Toggles
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  // Wizards Form Data
  const initialWizardForm = {
    name: '',
    tagline: '',
    description: '',
    clientName: '',
    organizerName: '',
    department: '',
    category: 'Corporate',
    status: 'Draft',
    expectedVisitors: '500',
    budget: '50000',
    startDate: '',
    endDate: '',
    setupDate: '',
    dismantleDate: '',
    startTime: '09:00',
    endTime: '18:00',
    venueName: '',
    venueAddress: '',
    city: '',
    state: '',
    country: 'India',
    googleMapsUrl: '',
    halls: [] as any[], // Primary venue halls
    venues: [] as any[] // Additional venues
  };
  const [wizardForm, setWizardForm] = useState(initialWizardForm);

  // Temporary wizard sub-forms
  const [wizardHallTemp, setWizardHallTemp] = useState({
    name: '', purpose: '', capacity: '', floorNumber: '', area: '', specialNotes: ''
  });
  const [wizardVenueTemp, setWizardVenueTemp] = useState({
    name: '', address: '', city: '', state: '', country: 'India', googleMapsUrl: '', halls: [] as any[]
  });
  const [wizardVenueHallTemp, setWizardVenueHallTemp] = useState({
    name: '', purpose: '', capacity: '', floorNumber: '', area: '', specialNotes: ''
  });

  // ─── Module 3 AI Mockup Workspace State ──────────────────────────────────
  const [mockupsList, setMockupsList] = useState<any[]>([]);
  const [assetsList, setAssetsList] = useState<any[]>([]);
  const [templatesList, setTemplatesList] = useState<any[]>([]);
  
  // Workspace UI Toggles
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [showMockupModal, setShowMockupModal] = useState(false);
  const [activeMockup, setActiveMockup] = useState<any | null>(null);
  const [activeVersion, setActiveVersion] = useState<any | null>(null);

  // Form mockups
  const [mockupForm, setMockupForm] = useState({
    name: '', venueId: '', hallId: '', stageType: 'Main Stage', category: 'Hotel', notes: '', designer: ''
  });

  // Left Sidebar and Right panel tabs
  const [activeLeftTab, setActiveLeftTab] = useState<'layers' | 'brand_assets' | 'templates'>('layers');
  const [activeRightTab, setActiveRightTab] = useState<'props' | 'versions'>('props');

  // Canvas config
  const [editorZoom, setEditorZoom] = useState(85);
  const [editorPan, setEditorPan] = useState({ x: 0, y: 0 });
  const [editorFullscreen, setEditorFullscreen] = useState(false);
  const [safeZonesVisible, setSafeZonesVisible] = useState(true);

  // Layers visible
  const [layersVisibility, setLayersVisibility] = useState({
    backdrop: true, screens: true, text: true, logos: true
  });

  // Preview & rendering Base64
  const [renderingPreview, setRenderingPreview] = useState(false);
  const [renderedImage, setRenderedImage] = useState('');

  // Active configuration mapping (autofilled from active mockup version config)
  const [workspaceConfig, setWorkspaceConfig] = useState({
    title: '', subtitle: '', dateText: '', venueText: '', footerText: 'Powered by Eventelligence',
    theme: 'dark' as 'light' | 'dark',
    screenConfig: 'all' as 'center' | 'wings' | 'all',
    wingDisplayMode: 'mirror' as 'mirror' | 'extended',
    logos: [] as string[],
    assetUrls: [] as string[]
  });

  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);

  // Split-screen Compare states
  const [compareMode, setCompareMode] = useState(false);
  const [compareLeftVersion, setCompareLeftVersion] = useState<any | null>(null);
  const [compareRightVersion, setCompareRightVersion] = useState<any | null>(null);
  const [compareLeftImage, setCompareLeftImage] = useState('');
  const [compareRightImage, setCompareRightImage] = useState('');

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

  // ─── Fetch Event Conceptualizations ───────────────────────────────────────
  const fetchEvents = async () => {
    try {
      const res = await fetch(`/api/events?search=${encodeURIComponent(eventSearch)}&status=${eventStatusFilter}&category=${eventCategoryFilter}`);
      const data = await res.json();
      if (res.ok) {
        setEventsList(data);
      } else {
        show(data.error || 'Failed to query events', 'error');
      }
    } catch (err) {
      show('Error loading events database', 'error');
    }
  };

  const fetchSingleEvent = async (id: number) => {
    try {
      const res = await fetch(`/api/events/${id}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedEvent(data);
        setShowDetailView(true);
      } else {
        show(data.error || 'Failed to load event details', 'error');
      }
    } catch (err) {
      show('Error loading event profile', 'error');
    }
  };

  // ─── Module 3 API Operations ─────────────────────────────────────────────
  const fetchMockups = async (eventId: number) => {
    try {
      const res = await fetch(`/api/mockups?eventId=${eventId}`);
      const data = await res.json();
      if (res.ok) {
        setMockupsList(data);
      }
    } catch (err) {
      console.error('Error fetching mockups list:', err);
    }
  };

  const fetchAssets = async (eventId: number) => {
    try {
      const res = await fetch(`/api/assets?eventId=${eventId}`);
      const data = await res.json();
      if (res.ok) {
        setAssetsList(data);
      }
    } catch (err) {
      console.error('Error fetching brand assets list:', err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (res.ok) {
        setTemplatesList(data);
      }
    } catch (err) {
      console.error('Error fetching templates library:', err);
    }
  };

  const handleUploadAssetFile = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEvent) return;

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('eventId', String(selectedEvent.id));
      fd.append('type', type);
      fd.append('file', file);

      const res = await fetch('/api/assets', {
        method: 'POST',
        body: fd
      });
      if (res.ok) {
        show('Brand asset uploaded successfully!');
        fetchAssets(selectedEvent.id);
      } else {
        const err = await res.json();
        show(err.error || 'Failed to upload asset', 'error');
      }
    } catch (err) {
      show('Error uploading brand asset file', 'error');
    }
    setSaving(false);
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
    } else if (activeTab === 'events') {
      fetchEvents();
    }
  }, [activeTab, userSearch, userRoleFilter, userStatusFilter, eventSearch, eventStatusFilter, eventCategoryFilter]);

  // Hook details fetches on event selection
  useEffect(() => {
    if (selectedEvent) {
      fetchMockups(selectedEvent.id);
      fetchAssets(selectedEvent.id);
      fetchTemplates();
    }
  }, [selectedEvent]);

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

  // ─── Module 2 Wizard & CRUD Handlers ─────────────────────────────────────
  const addHallToPrimary = () => {
    if (!wizardHallTemp.name.trim()) return show('Hall name is required', 'error');
    setWizardForm(f => ({
      ...f,
      halls: [...f.halls, {
        name: wizardHallTemp.name,
        purpose: wizardHallTemp.purpose || 'General Presentation',
        capacity: wizardHallTemp.capacity ? parseInt(wizardHallTemp.capacity, 10) : 100,
        floorNumber: wizardHallTemp.floorNumber || 'G',
        area: wizardHallTemp.area ? parseFloat(wizardHallTemp.area) : 100,
        specialNotes: wizardHallTemp.specialNotes
      }]
    }));
    setWizardHallTemp({ name: '', purpose: '', capacity: '', floorNumber: '', area: '', specialNotes: '' });
    show('Hall added to planning list');
  };

  const addHallToTempVenue = () => {
    if (!wizardVenueHallTemp.name.trim()) return show('Hall name is required', 'error');
    setWizardVenueTemp(v => ({
      ...v,
      halls: [...v.halls, {
        name: wizardVenueHallTemp.name,
        purpose: wizardVenueHallTemp.purpose || 'Exhibition/Booth Space',
        capacity: wizardVenueHallTemp.capacity ? parseInt(wizardVenueHallTemp.capacity, 10) : 50,
        floorNumber: wizardVenueHallTemp.floorNumber || 'G',
        area: wizardVenueHallTemp.area ? parseFloat(wizardVenueHallTemp.area) : 80,
        specialNotes: wizardVenueHallTemp.specialNotes
      }]
    }));
    setWizardVenueHallTemp({ name: '', purpose: '', capacity: '', floorNumber: '', area: '', specialNotes: '' });
    show('Hall added to venue');
  };

  const addAdditionalVenue = () => {
    if (!wizardVenueTemp.name.trim() || !wizardVenueTemp.address.trim() || !wizardVenueTemp.city.trim()) {
      return show('Venue name, address, and city are required', 'error');
    }
    setWizardForm(f => ({
      ...f,
      venues: [...f.venues, { ...wizardVenueTemp }]
    }));
    setWizardVenueTemp({ name: '', address: '', city: '', state: '', country: 'India', googleMapsUrl: '', halls: [] });
    show('Venue added to planning workspace');
  };

  const handleCreateEventSubmit = async () => {
    // Basic validation
    if (!wizardForm.name.trim() || !wizardForm.clientName.trim() || !wizardForm.venueName.trim()) {
      return show('Name, client, and primary venue details are required', 'error');
    }
    if (!wizardForm.startDate || !wizardForm.endDate || !wizardForm.setupDate || !wizardForm.dismantleDate) {
      return show('Timeline setup dates are required', 'error');
    }

    setSaving(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wizardForm)
      });
      const data = await res.json();
      if (res.ok) {
        show('Event project workspace created successfully!');
        setShowCreateWizard(false);
        setWizardForm(initialWizardForm);
        setWizardStep(1);
        fetchEvents();
      } else {
        show(data.error || 'Failed to create event workspace', 'error');
      }
    } catch (err) {
      show('Error submitting event conceptualization', 'error');
    }
    setSaving(false);
  };

  const updateEventStatus = async (id: number, nextStatus: string) => {
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (res.ok) {
        show(`Event status updated to ${nextStatus}`);
        setSelectedEvent(data);
        fetchEvents();
      } else {
        show(data.error || 'Failed to update status', 'error');
      }
    } catch (err) {
      show('Error updating event status', 'error');
    }
  };

  const deleteEvent = async (id: number) => {
    if (!confirm('Are you sure you want to delete this event workspace? All related venues, halls, and sheets will be permanently removed!')) return;
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      if (res.ok) {
        show('Event project workspace deleted');
        setShowDetailView(false);
        setSelectedEvent(null);
        fetchEvents();
      } else {
        const data = await res.json();
        show(data.error || 'Failed to delete event', 'error');
      }
    } catch (err) {
      show('Error deleting event workspace', 'error');
    }
  };

  // ─── Module 3 Mockups Operations ─────────────────────────────────────────
  const handleCreateMockupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    setSaving(true);
    try {
      const res = await fetch('/api/mockups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...mockupForm,
          eventId: selectedEvent.id,
          venueId: parseInt(mockupForm.venueId, 10),
          hallId: parseInt(mockupForm.hallId, 10)
        })
      });
      const data = await res.json();
      if (res.ok) {
        show('Stage Mockup workspace initialized!');
        setShowMockupModal(false);
        setMockupForm({
          name: '', venueId: '', hallId: '', stageType: 'Main Stage', category: 'Hotel', notes: '', designer: currentUser?.name || 'Designer'
        });
        fetchMockups(selectedEvent.id);
      } else {
        show(data.error || 'Failed to initialize mockup', 'error');
      }
    } catch (err) {
      show('Error creating stage mockup configuration', 'error');
    }
    setSaving(false);
  };

  const handleUpdateMockupStatus = async (id: number, nextStatus: string) => {
    try {
      const res = await fetch(`/api/mockups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (res.ok) {
        show(`Mockup status updated to ${nextStatus}`);
        if (activeMockup && activeMockup.id === id) {
          setActiveMockup(data);
        }
        if (selectedEvent) {
          fetchMockups(selectedEvent.id);
        }
      }
    } catch (err) {
      show('Error updating mockup status', 'error');
    }
  };

  const handleDeleteMockup = async (id: number) => {
    if (!confirm('Are you sure you want to delete this stage mockup? All versions and histories will be permanently removed!')) return;
    try {
      const res = await fetch(`/api/mockups/${id}`, { method: 'DELETE' });
      if (res.ok) {
        show('Stage mockup deleted successfully');
        if (selectedEvent) fetchMockups(selectedEvent.id);
      } else {
        const err = await res.json();
        show(err.error || 'Failed to delete mockup', 'error');
      }
    } catch (err) {
      show('Error deleting mockup', 'error');
    }
  };

  // ─── Composite Rendering Preview ──────────────────────────────────────────
  const generateWorkspacePreview = async (configOverride?: typeof workspaceConfig) => {
    if (!activeMockup) return;
    setRenderingPreview(true);
    const activeConfig = configOverride || workspaceConfig;

    try {
      const fd = new FormData();
      fd.append('eventName', activeConfig.title);
      fd.append('eventSubtitle', activeConfig.subtitle);
      fd.append('eventDate', activeConfig.dateText);
      fd.append('eventVenue', activeConfig.venueText);
      fd.append('footerText', activeConfig.footerText);
      fd.append('screenTheme', activeConfig.theme);
      fd.append('screenConfig', activeConfig.screenConfig);
      fd.append('wingDisplayMode', activeConfig.wingDisplayMode);
      fd.append('logos', JSON.stringify(activeConfig.logos));
      fd.append('assetUrls', JSON.stringify(activeConfig.assetUrls));

      // Find standard Hall mapping if there is one matching coordinates,
      // otherwise check if mockup was created using a template backdrop.
      let standardHallId = '';
      const matchedStandardHall = halls.find(h => h.name.toLowerCase() === activeMockup.hall?.name?.toLowerCase());
      if (matchedStandardHall) {
        standardHallId = String(matchedStandardHall.id);
      }

      if (standardHallId) {
        fd.append('hallId', standardHallId);
      } else {
        // Fall back to templates table (seeded grand ballroom)
        fd.append('templateId', '1');
      }

      const res = await fetch('/api/generate-visualization', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (res.ok) {
        setRenderedImage(data.imageBase64);
      } else {
        show(data.error || 'Failed to render stage screen layout', 'error');
      }
    } catch (err) {
      console.error('Error generating mockup composite rendering:', err);
    }
    setRenderingPreview(false);
  };

  const openMockupWorkspace = async (mockup: any) => {
    setActiveMockup(mockup);
    
    // Load latest version config
    if (mockup.versions && mockup.versions.length > 0) {
      const latestVer = mockup.versions[0];
      try {
        const parsedConfig = JSON.parse(latestVer.config);
        setWorkspaceConfig(parsedConfig);
        setRenderedImage(latestVer.imageUrl || '');
        setActiveVersion(latestVer);
      } catch (e) {
        console.error('Failed to parse version config:', e);
      }
    } else {
      // Setup initial defaults
      const initialConfig = {
        title: selectedEvent?.name || 'Corporate Summit 2026',
        subtitle: selectedEvent?.tagline || 'Designing the Future',
        dateText: selectedEvent ? new Date(selectedEvent.startDate).toLocaleDateString() : '',
        venueText: selectedEvent?.venueName || '',
        footerText: 'Powered by Eventelligence',
        theme: 'dark' as 'light' | 'dark',
        screenConfig: 'all' as 'center' | 'wings' | 'all',
        wingDisplayMode: 'mirror' as 'mirror' | 'extended',
        logos: [] as string[],
        assetUrls: [] as string[]
      };
      setWorkspaceConfig(initialConfig);
      setRenderedImage('');
    }

    setUndoStack([]);
    setRedoStack([]);
    setCompareMode(false);
    setShowWorkspace(true);
  };

  // Safe configuration updating with undo/redo stack
  const updateWorkspaceConfig = (newConfig: Partial<typeof workspaceConfig>) => {
    setWorkspaceConfig(prev => {
      const next = { ...prev, ...newConfig };
      setUndoStack(u => [...u, prev]);
      setRedoStack([]);
      // Render composite preview on changes
      generateWorkspacePreview(next);
      return next;
    });
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(u => u.slice(0, -1));
    setRedoStack(r => [...r, workspaceConfig]);
    setWorkspaceConfig(prev);
    generateWorkspacePreview(prev);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(r => r.slice(0, -1));
    setUndoStack(u => [...u, workspaceConfig]);
    setWorkspaceConfig(next);
    generateWorkspacePreview(next);
  };

  const handleSaveVersion = async () => {
    if (!activeMockup) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/mockups/${activeMockup.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: JSON.stringify(workspaceConfig),
          imageUrl: renderedImage
        })
      });
      const data = await res.json();
      if (res.ok) {
        show(`Mockup saved as Version ${data.versionNumber}!`);
        // Refresh active mockup details
        const updatedRes = await fetch(`/api/mockups/${activeMockup.id}`);
        const updatedData = await updatedRes.json();
        if (updatedRes.ok) {
          setActiveMockup(updatedData);
          setActiveVersion(data);
        }
        if (selectedEvent) {
          fetchMockups(selectedEvent.id);
        }
      } else {
        show(data.error || 'Failed to save version', 'error');
      }
    } catch (err) {
      show('Error saving version history', 'error');
    }
    setSaving(false);
  };

  const handleRestoreVersion = async (verNum: number) => {
    if (!activeMockup) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/mockups/${activeMockup.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restoreFromVersion: verNum
        })
      });
      const data = await res.json();
      if (res.ok) {
        show(`Restored workspace configuration to Version ${verNum}!`);
        const parsedConfig = JSON.parse(data.config);
        setWorkspaceConfig(parsedConfig);
        generateWorkspacePreview(parsedConfig);
        setActiveVersion(data);
        
        // Refresh active mockup detail
        const updatedRes = await fetch(`/api/mockups/${activeMockup.id}`);
        const updatedData = await updatedRes.json();
        if (updatedRes.ok) {
          setActiveMockup(updatedData);
        }
      } else {
        show(data.error || 'Failed to restore version', 'error');
      }
    } catch (err) {
      show('Error restoring version history', 'error');
    }
    setSaving(false);
  };
  
  const startCompareMode = (vLeft: any, vRight: any) => {
    setCompareLeftVersion(vLeft);
    setCompareRightVersion(vRight);
    setCompareLeftImage(vLeft.imageUrl || '');
    setCompareRightImage(vRight.imageUrl || '');
    setCompareMode(true);
  };

  const handleExportPNG = () => {
    if (!renderedImage) return show('No composited stage image to export.', 'error');
    const link = document.createElement('a');
    link.href = renderedImage;
    link.download = `${activeMockup?.name || 'Stage_Mockup'}_V${activeVersion?.versionNumber || 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    show('Mockup exported successfully.');
  };

  // Helper: dynamic category gradient generator for banners
  const getBannerGradient = (category: string) => {
    switch (category) {
      case 'Government': return 'from-slate-800 via-slate-900 to-zinc-900';
      case 'Corporate': return 'from-blue-600 via-indigo-600 to-indigo-800';
      case 'Exhibition': return 'from-emerald-500 via-teal-600 to-emerald-700';
      case 'Conference': return 'from-violet-500 via-purple-600 to-indigo-700';
      case 'Wedding': return 'from-rose-450 via-pink-500 to-rose-600';
      case 'Political': return 'from-orange-500 via-amber-600 to-red-650';
      case 'Product Launch': return 'from-cyan-500 via-blue-600 to-violet-600';
      case 'Cultural': return 'from-fuchsia-500 via-pink-600 to-rose-600';
      case 'Sports': return 'from-green-500 via-emerald-600 to-teal-700';
      default: return 'from-slate-500 via-slate-600 to-zinc-700';
    }
  };

  // Helper: Status badge color mapping
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Live': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Approved': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Working': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Planning': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Completed': return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'Draft': return 'bg-slate-100 text-slate-605 border-slate-200';
      case 'Cancelled': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Review': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Sent To Client': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Final': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-zinc-50 text-zinc-650 border-zinc-200';
    }
  };

  // Helper: compute metrics cards values
  const computeDashboardMetrics = () => {
    let venuesPlanned = 0;
    let hallsPlanned = 0;
    let expectedVisitorsSum = 0;
    let budgetSum = 0;

    eventsList.forEach(e => {
      venuesPlanned += e.venueCount || 0;
      hallsPlanned += e.hallCount || 0;
      expectedVisitorsSum += e.expectedVisitors || 0;
      budgetSum += e.budget || 0;
    });

    return {
      venuesPlanned,
      hallsPlanned,
      expectedVisitorsSum,
      budgetSum
    };
  };

  const metrics = computeDashboardMetrics();

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
    <div className="min-h-screen bg-slate-50 font-sans flex relative overflow-x-hidden">
      {/* Toast notifications */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-rose-600 text-white'}`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* LEFT SIDEBAR navigation */}
      <aside className="w-64 bg-slate-955 text-slate-450 border-r border-slate-800/80 flex flex-col shrink-0">
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
          {/* Section: Planning Desk */}
          <div className="space-y-2">
            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest px-3">Planning Desk</p>
            <nav className="space-y-1">
              {[
                { id: 'events', label: 'Event Workspace', icon: <Calendar className="w-4 h-4" /> },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as Tab)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === t.id ? 'bg-slate-900 text-white font-extrabold border-l-2 border-blue-500 shadow-inner' : 'text-slate-450 hover:bg-slate-900/50 hover:text-slate-200'}`}
                >
                  {t.icon} <span>{t.label}</span>
                </button>
              ))}
            </nav>
          </div>

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
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === t.id ? 'bg-slate-900 text-white font-extrabold border-l-2 border-blue-500 shadow-inner' : 'text-slate-450 hover:bg-slate-900/50 hover:text-slate-200'}`}
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
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === t.id ? 'bg-slate-900 text-white font-extrabold border-l-2 border-blue-500 shadow-inner' : 'text-slate-450 hover:bg-slate-900/50 hover:text-slate-200'}`}
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
              {activeTab === 'events' && 'Event Workspace'}
              {activeTab === 'cities' && 'Cities & Regions'}
              {activeTab === 'venues' && 'Hotel Venues'}
              {activeTab === 'halls' && 'Conference Halls'}
              {activeTab === 'branding' && 'Preset Brandings'}
              {activeTab === 'users' && 'User Directory'}
              {activeTab === 'roles' && 'Role Permissions Matrix'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeTab === 'events' && 'Conceptualize, schedule, and plan event spaces.'}
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
          {loading && activeTab !== 'users' && activeTab !== 'roles' && activeTab !== 'events' ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* EVENTS TAB (MODULE 2) */}
              {activeTab === 'events' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Dashboard Metrics Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-650 flex items-center justify-center"><Calendar className="w-5 h-5" /></div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest leading-none">Total Events</p>
                        <h3 className="text-xl font-extrabold text-slate-800 mt-1">{eventsList.length}</h3>
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-650 flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest leading-none">Venues Booked</p>
                        <h3 className="text-xl font-extrabold text-slate-800 mt-1">{metrics.venuesPlanned}</h3>
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-650 flex items-center justify-center"><Layers className="w-5 h-5" /></div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest leading-none">Halls Configured</p>
                        <h3 className="text-xl font-extrabold text-slate-800 mt-1">{metrics.hallsPlanned}</h3>
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-650 flex items-center justify-center"><DollarSign className="w-5 h-5" /></div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest leading-none">Total Budget</p>
                        <h3 className="text-xl font-extrabold text-slate-800 mt-1">${metrics.budgetSum.toLocaleString()}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Search and Filters Bar */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                      {/* Search box */}
                      <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search events, clients..."
                          value={eventSearch}
                          onChange={e => setEventSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium text-slate-700"
                        />
                      </div>
                      
                      {/* Category Filter */}
                      <div className="relative">
                        <select
                          value={eventCategoryFilter}
                          onChange={e => setEventCategoryFilter(e.target.value)}
                          className="pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium text-slate-700 bg-white appearance-none"
                        >
                          <option value="">All Categories</option>
                          {['Government', 'Corporate', 'Exhibition', 'Conference', 'Wedding', 'Political', 'Product Launch', 'Cultural', 'Education', 'Sports', 'Other'].map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      </div>

                      {/* Status Filter */}
                      <div className="relative">
                        <select
                          value={eventStatusFilter}
                          onChange={e => setEventStatusFilter(e.target.value)}
                          className="pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium text-slate-700 bg-white appearance-none"
                        >
                          <option value="">All Statuses</option>
                          {['Draft', 'Planning', 'Approved', 'Working', 'Live', 'Completed', 'Archived', 'Cancelled'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Add Event button */}
                    <button
                      onClick={() => setShowCreateWizard(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <Plus className="w-4 h-4" /> Create New Event
                    </button>
                  </div>

                  {/* Events Grid List */}
                  {eventsList.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-slate-700 text-sm">No events conceptualized</h4>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto">Get started by building your first enterprise event conceptualization project workspace.</p>
                      <button
                        onClick={() => setShowCreateWizard(true)}
                        className="px-4 py-2 bg-blue-50 text-blue-650 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Conceptualize Event
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {eventsList.map(e => (
                        <div key={e.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:border-slate-300/80 transition-all duration-300">
                          {/* Banner background based on category */}
                          <div className={`h-2.5 bg-gradient-to-r ${getBannerGradient(e.category)}`} />
                          
                          <div className="p-6 flex-1 flex flex-col space-y-4">
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">{e.category}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusStyle(e.status)}`}>
                                  {e.status}
                                </span>
                              </div>
                              <h3 className="font-extrabold text-slate-800 text-base leading-snug line-clamp-1">{e.name}</h3>
                              <p className="text-xs text-slate-455 font-semibold line-clamp-1 mt-0.5">{e.tagline}</p>
                            </div>

                            <p className="text-xs text-slate-455 line-clamp-2 leading-relaxed flex-1">{e.description}</p>

                            <div className="border-t border-slate-100 pt-3 space-y-2">
                              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                                <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" /> {e.clientName}</span>
                                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {e.city}, {e.state}</span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-350" /> {new Date(e.startDate).toLocaleDateString()}</span>
                                <span className="bg-blue-50 text-blue-650 px-2 py-0.5 rounded font-bold">{e.venueCount} Venues / {e.hallCount} Halls</span>
                              </div>
                            </div>

                            <div className="pt-2 flex items-center justify-between gap-2">
                              <button
                                onClick={() => fetchSingleEvent(e.id)}
                                className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors flex items-center justify-center gap-1"
                              >
                                <Layout className="w-3.5 h-3.5 text-slate-400" /> Open Workspace
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Multi-step Create Event Wizard Dialog */}
                  {showCreateWizard && (
                    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
                      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 animate-scale-in max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <h3 className="font-extrabold text-slate-800 text-lg">Create Event Project Workspace</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Wizard step {wizardStep} of 4</p>
                          </div>
                          <button onClick={() => { setShowCreateWizard(false); setWizardStep(1); }} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Progress Indicators */}
                        <div className="flex items-center gap-2 pb-2">
                          {[1, 2, 3, 4].map(stepNum => (
                            <div key={stepNum} className="flex-1 flex items-center gap-2">
                              <div className={`h-2.5 rounded-full flex-1 transition-all ${wizardStep >= stepNum ? 'bg-blue-650' : 'bg-slate-100'}`} />
                            </div>
                          ))}
                        </div>

                        {/* STEP 1: Core Information */}
                        {wizardStep === 1 && (
                          <div className="space-y-4">
                            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Step 1: Core Details</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="col-span-2">
                                <label className="text-xs font-bold text-slate-500 block mb-1">Event Name</label>
                                <input type="text" placeholder="e.g. Annual Tech Symposium 2026" value={wizardForm.name} onChange={e => setWizardForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium" />
                              </div>
                              <div className="col-span-2">
                                <label className="text-xs font-bold text-slate-500 block mb-1">Event Tagline</label>
                                <input type="text" placeholder="e.g. Designing the Future of Cloud Computing" value={wizardForm.tagline} onChange={e => setWizardForm(f => ({ ...f, tagline: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium" />
                              </div>
                              <div className="col-span-2">
                                <label className="text-xs font-bold text-slate-500 block mb-1">Event Description</label>
                                <textarea rows={3} placeholder="Provide details regarding the keynote agenda and attendee profile..." value={wizardForm.description} onChange={e => setWizardForm(f => ({ ...f, description: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium resize-none" />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Client Name</label>
                                <input type="text" placeholder="e.g. Microsoft Corporation" value={wizardForm.clientName} onChange={e => setWizardForm(f => ({ ...f, clientName: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium" />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Organizer Name</label>
                                <input type="text" placeholder="e.g. Corporate Events Team" value={wizardForm.organizerName} onChange={e => setWizardForm(f => ({ ...f, organizerName: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium" />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Department (Optional)</label>
                                <input type="text" placeholder="e.g. Developer Relations" value={wizardForm.department} onChange={e => setWizardForm(f => ({ ...f, department: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium" />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Category</label>
                                <select value={wizardForm.category} onChange={e => setWizardForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white font-medium text-slate-700">
                                  {['Government', 'Corporate', 'Exhibition', 'Conference', 'Wedding', 'Political', 'Product Launch', 'Cultural', 'Education', 'Sports', 'Other'].map(c => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Expected Visitors</label>
                                <input type="number" placeholder="500" value={wizardForm.expectedVisitors} onChange={e => setWizardForm(f => ({ ...f, expectedVisitors: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium" />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Budget ($)</label>
                                <input type="number" placeholder="50000" value={wizardForm.budget} onChange={e => setWizardForm(f => ({ ...f, budget: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium" />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* STEP 2: Timeline Details */}
                        {wizardStep === 2 && (
                          <div className="space-y-4">
                            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Step 2: Event Timeline</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Setup Start Date</label>
                                <input type="date" value={wizardForm.setupDate} onChange={e => setWizardForm(f => ({ ...f, setupDate: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium" />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Dismantling Finish Date</label>
                                <input type="date" value={wizardForm.dismantleDate} onChange={e => setWizardForm(f => ({ ...f, dismantleDate: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium" />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Event Start Date</label>
                                <input type="date" value={wizardForm.startDate} onChange={e => setWizardForm(f => ({ ...f, startDate: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium" />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Event End Date</label>
                                <input type="date" value={wizardForm.endDate} onChange={e => setWizardForm(f => ({ ...f, endDate: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium" />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Daily Start Time</label>
                                <input type="time" value={wizardForm.startTime} onChange={e => setWizardForm(f => ({ ...f, startTime: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium" />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Daily End Time</label>
                                <input type="time" value={wizardForm.endTime} onChange={e => setWizardForm(f => ({ ...f, endTime: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium" />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* STEP 3: Primary Venue Location */}
                        {wizardStep === 3 && (
                          <div className="space-y-4">
                            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Step 3: Primary Venue Details</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="col-span-2">
                                <label className="text-xs font-bold text-slate-500 block mb-1">Primary Venue Name</label>
                                <input type="text" placeholder="e.g. Taj Lands End Hotel" value={wizardForm.venueName} onChange={e => setWizardForm(f => ({ ...f, venueName: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium" />
                              </div>
                              <div className="col-span-2">
                                <label className="text-xs font-bold text-slate-500 block mb-1">Venue Address</label>
                                <input type="text" placeholder="e.g. Bandstand Promenade, Bandra West" value={wizardForm.venueAddress} onChange={e => setWizardForm(f => ({ ...f, venueAddress: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium" />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">City</label>
                                <input type="text" placeholder="Mumbai" value={wizardForm.city} onChange={e => setWizardForm(f => ({ ...f, city: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium" />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">State</label>
                                <input type="text" placeholder="Maharashtra" value={wizardForm.state} onChange={e => setWizardForm(f => ({ ...f, state: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium" />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Country</label>
                                <input type="text" placeholder="India" value={wizardForm.country} onChange={e => setWizardForm(f => ({ ...f, country: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium" />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Google Maps Location Link (Optional)</label>
                                <input type="text" placeholder="https://maps.google.com/..." value={wizardForm.googleMapsUrl} onChange={e => setWizardForm(f => ({ ...f, googleMapsUrl: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium" />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* STEP 4: Hall Planning */}
                        {wizardStep === 4 && (
                          <div className="space-y-6">
                            <div className="border-b border-slate-100 pb-4">
                              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3">Step 4: Hall Planning ({wizardForm.venueName})</h4>
                              
                              {/* Hall Input Fields */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50/50 p-4 border border-slate-200/60 rounded-2xl">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Hall Name</label>
                                  <input type="text" placeholder="e.g. Ballroom A" value={wizardHallTemp.name} onChange={e => setWizardHallTemp(h => ({ ...h, name: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium bg-white" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Purpose / Agenda</label>
                                  <input type="text" placeholder="e.g. Chief Minister Keynote" value={wizardHallTemp.purpose} onChange={e => setWizardHallTemp(h => ({ ...h, purpose: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium bg-white" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Capacity</label>
                                  <input type="number" placeholder="500" value={wizardHallTemp.capacity} onChange={e => setWizardHallTemp(h => ({ ...h, capacity: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium bg-white" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Floor Number</label>
                                  <input type="text" placeholder="e.g. 2nd Floor" value={wizardHallTemp.floorNumber} onChange={e => setWizardHallTemp(h => ({ ...h, floorNumber: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium bg-white" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Area (sq.m)</label>
                                  <input type="number" placeholder="1200" value={wizardHallTemp.area} onChange={e => setWizardHallTemp(h => ({ ...h, area: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium bg-white" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Special Notes</label>
                                  <input type="text" placeholder="Needs LED backdrop" value={wizardHallTemp.specialNotes} onChange={e => setWizardHallTemp(h => ({ ...h, specialNotes: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium bg-white" />
                                </div>
                                <button
                                  type="button"
                                  onClick={addHallToPrimary}
                                  className="col-span-2 sm:col-span-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                                >
                                  <PlusCircle className="w-4 h-4" /> Add Hall to Primary Venue
                                </button>
                              </div>

                              {/* Added Halls List */}
                              {wizardForm.halls.length > 0 && (
                                <div className="mt-3 space-y-1.5">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Added Halls ({wizardForm.halls.length})</p>
                                  <div className="divide-y divide-slate-100 max-h-[120px] overflow-y-auto border border-slate-100 rounded-xl px-3 bg-slate-50/20">
                                    {wizardForm.halls.map((h, idx) => (
                                      <div key={idx} className="py-2 flex items-center justify-between text-xs font-semibold text-slate-700">
                                        <div>
                                          <span>{h.name}</span> <span className="text-slate-400 font-medium">({h.purpose})</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">Cap: {h.capacity}</span>
                                          <button type="button" onClick={() => setWizardForm(f => ({ ...f, halls: f.halls.filter((_, i) => i !== idx) }))} className="text-rose-500"><X className="w-3.5 h-3.5" /></button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Additional Venues */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Add Additional Venues (Optional)</h4>
                              
                              <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-4 border border-slate-200/60 rounded-2xl">
                                <input type="text" placeholder="Additional Venue Name" value={wizardVenueTemp.name} onChange={e => setWizardVenueTemp(v => ({ ...v, name: e.target.value }))} className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium bg-white" />
                                <input type="text" placeholder="Address" value={wizardVenueTemp.address} onChange={e => setWizardVenueTemp(v => ({ ...v, address: e.target.value }))} className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium bg-white" />
                                <input type="text" placeholder="City" value={wizardVenueTemp.city} onChange={e => setWizardVenueTemp(v => ({ ...v, city: e.target.value }))} className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium bg-white" />
                                <input type="text" placeholder="State" value={wizardVenueTemp.state} onChange={e => setWizardVenueTemp(v => ({ ...v, state: e.target.value }))} className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium bg-white" />
                                
                                {/* Inner Hall adder for additional venue */}
                                <div className="col-span-2 border-t border-slate-200/50 pt-2.5 mt-1">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Add Hall to Additional Venue</p>
                                  <div className="grid grid-cols-3 gap-2">
                                    <input type="text" placeholder="Hall Name" value={wizardVenueHallTemp.name} onChange={e => setWizardVenueHallTemp(h => ({ ...h, name: e.target.value }))} className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium bg-white" />
                                    <input type="text" placeholder="Purpose" value={wizardVenueHallTemp.purpose} onChange={e => setWizardVenueHallTemp(h => ({ ...h, purpose: e.target.value }))} className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium bg-white" />
                                    <button type="button" onClick={addHallToTempVenue} className="py-1 px-2.5 bg-slate-800 text-white rounded-lg text-[10px] font-bold hover:bg-slate-700 transition-colors">Add Hall to Venue</button>
                                  </div>
                                  
                                  {wizardVenueTemp.halls.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {wizardVenueTemp.halls.map((h: any, idx: number) => (
                                        <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">{h.name}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <button type="button" onClick={addAdditionalVenue} className="col-span-2 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 mt-2">
                                  <PlusCircle className="w-4 h-4" /> Save Venue
                                </button>
                              </div>

                              {/* Added Additional Venues List */}
                              {wizardForm.venues.length > 0 && (
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Added Venues ({wizardForm.venues.length})</p>
                                  <div className="divide-y divide-slate-100 max-h-[120px] overflow-y-auto border border-slate-100 rounded-xl px-3 bg-slate-50/20">
                                    {wizardForm.venues.map((v, idx) => (
                                      <div key={idx} className="py-2 flex items-center justify-between text-xs font-semibold text-slate-700">
                                        <div>
                                          <span>{v.name}</span> <span className="text-slate-400 font-medium">({v.city}, {v.state})</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">{v.halls.length} Halls</span>
                                          <button type="button" onClick={() => setWizardForm(f => ({ ...f, venues: f.venues.filter((_, i) => i !== idx) }))} className="text-rose-500"><X className="w-3.5 h-3.5" /></button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Footer Controls */}
                        <div className="pt-4 border-t border-slate-100 flex gap-2">
                          <button
                            type="button"
                            disabled={wizardStep === 1}
                            onClick={() => setWizardStep(s => s - 1)}
                            className="w-1/2 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                          >
                            Back
                          </button>
                          
                          {wizardStep < 4 ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (wizardStep === 1 && (!wizardForm.name.trim() || !wizardForm.clientName.trim())) {
                                  return show('Event Name and Client Name are required', 'error');
                                }
                                if (wizardStep === 2 && (!wizardForm.startDate || !wizardForm.endDate)) {
                                  return show('Timeline setup dates are required', 'error');
                                }
                                if (wizardStep === 3 && (!wizardForm.venueName.trim() || !wizardForm.venueAddress.trim())) {
                                  return show('Venue Name and Address are required', 'error');
                                }
                                setWizardStep(s => s + 1);
                              }}
                              className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
                            >
                              Next Step
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleCreateEventSubmit}
                              disabled={saving}
                              className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Finish Conceptualization
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Event Overview Detail Modal Overlay (MODULE 2) */}
                  {showDetailView && selectedEvent && (
                    <div className="fixed inset-0 bg-slate-900/60 z-40 flex justify-end">
                      <div className="bg-white w-full max-w-4xl h-full shadow-2xl overflow-y-auto flex flex-col animate-slide-in relative">
                        
                        {/* Dynamic Category Banner Header */}
                        <div className={`p-8 bg-gradient-to-r ${getBannerGradient(selectedEvent.category)} text-white relative flex flex-col justify-end min-h-[180px] shrink-0`}>
                          <button
                            onClick={() => { setShowDetailView(false); setSelectedEvent(null); }}
                            className="absolute top-5 right-5 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all"
                          >
                            <X className="w-6 h-6" />
                          </button>
                          
                          <div className="space-y-2 mt-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/80 bg-white/10 px-2 py-0.5 rounded border border-white/10">{selectedEvent.category}</span>
                              
                              {/* Status Dropdown selector */}
                              <div className="relative">
                                <select
                                  value={selectedEvent.status}
                                  onChange={e => updateEventStatus(selectedEvent.id, e.target.value)}
                                  className="bg-white/10 border border-white/20 rounded-md text-[10px] font-bold text-white px-2 py-0.5 focus:outline-none cursor-pointer pr-5 appearance-none"
                                >
                                  {['Draft', 'Planning', 'Approved', 'Working', 'Live', 'Completed', 'Archived', 'Cancelled'].map(st => (
                                    <option key={st} value={st} className="text-slate-800 font-semibold">{st}</option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/70 pointer-events-none" />
                              </div>
                            </div>
                            <h2 className="text-2xl font-extrabold tracking-tight leading-tight">{selectedEvent.name}</h2>
                            <p className="text-sm font-semibold text-white/80">{selectedEvent.tagline}</p>
                          </div>
                        </div>

                        {/* Detail Body Content */}
                        <div className="p-8 flex-1 space-y-8 overflow-y-auto">
                          
                          {/* Layout Split: Details vs Stats */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* Left Side: Text details */}
                            <div className="lg:col-span-2 space-y-6">
                              <div className="bg-slate-50/50 border border-slate-200/60 p-5 rounded-2xl space-y-3">
                                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-slate-400" /> Event Narrative</h4>
                                <p className="text-sm text-slate-650 leading-relaxed font-medium">{selectedEvent.description}</p>
                              </div>

                              {/* Timeline Milestones */}
                              <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
                                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400" /> Timeline Milestones</h4>
                                <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                                  <div className="flex items-center gap-2.5 p-3 bg-slate-50/50 rounded-xl border border-slate-200/50">
                                    <Calendar className="w-4 h-4 text-blue-500" />
                                    <div>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase">Setup Start</p>
                                      <p className="mt-0.5">{new Date(selectedEvent.setupDate).toLocaleDateString()}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2.5 p-3 bg-slate-50/50 rounded-xl border border-slate-200/50">
                                    <Calendar className="w-4 h-4 text-rose-500" />
                                    <div>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase">Dismantle Finish</p>
                                      <p className="mt-0.5">{new Date(selectedEvent.dismantleDate).toLocaleDateString()}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2.5 p-3 bg-slate-50/50 rounded-xl border border-slate-200/50">
                                    <Clock className="w-4 h-4 text-emerald-500" />
                                    <div>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase">Daily Start</p>
                                      <p className="mt-0.5">{selectedEvent.startTime}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2.5 p-3 bg-slate-50/50 rounded-xl border border-slate-200/50">
                                    <Clock className="w-4 h-4 text-amber-500" />
                                    <div>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase">Daily Finish</p>
                                      <p className="mt-0.5">{selectedEvent.endTime}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Right Side: Quick Stats Cards */}
                            <div className="space-y-4">
                              <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-4">
                                <h4 className="text-[10px] font-extrabold text-slate-550 uppercase tracking-widest">Workspace Statistics</h4>
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400">Total Venues</span>
                                    <span className="font-extrabold">{selectedEvent.venueCount}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400">Total Halls</span>
                                    <span className="font-extrabold">{selectedEvent.hallCount}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400">Expected Attendees</span>
                                    <span className="font-extrabold">{selectedEvent.expectedVisitors?.toLocaleString() || '0'}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400">Department</span>
                                    <span className="font-extrabold truncate max-w-[120px]">{selectedEvent.department || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-3">
                                    <span className="text-slate-400 font-bold">Planned Budget</span>
                                    <span className="font-extrabold text-emerald-450 text-sm">${selectedEvent.budget?.toLocaleString() || '0'}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm text-center py-6">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Days to Event Finish</p>
                                <h2 className="text-3xl font-extrabold text-slate-800 mt-2">
                                  {Math.max(0, Math.ceil((new Date(selectedEvent.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                                </h2>
                                <p className="text-[10px] text-slate-400 font-medium mt-1">Working Days Countdown</p>
                              </div>
                            </div>

                          </div>

                          {/* Venue Accordions */}
                          <div className="space-y-4">
                            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Building2 className="w-4 h-4 text-slate-400" /> Planned Venues & Halls</h4>
                            <div className="space-y-3">
                              {selectedEvent.venues && selectedEvent.venues.map((venue: any, vIdx: number) => (
                                <div key={venue.id} className="border border-slate-250/70 rounded-2xl bg-white overflow-hidden shadow-sm">
                                  <div className="bg-slate-50/50 border-b border-slate-200/50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                    <div>
                                      <p className="text-xs text-blue-650 font-bold flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Venue {vIdx + 1}</p>
                                      <h3 className="font-extrabold text-slate-800 text-sm mt-0.5">{venue.name}</h3>
                                      <p className="text-[11px] text-slate-450 font-medium mt-0.5">{venue.address} · {venue.city}, {venue.state}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200/30">{venue.halls.length} Halls</span>
                                      {venue.googleMapsUrl && (
                                        <a href={venue.googleMapsUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded hover:underline">Maps ↗</a>
                                      )}
                                    </div>
                                  </div>

                                  <div className="divide-y divide-slate-100">
                                    {venue.halls.length === 0 ? (
                                      <p className="p-4 text-xs font-medium text-slate-400 italic text-center">No halls configured for this venue.</p>
                                    ) : (
                                      venue.halls.map((h: any, hIdx: number) => (
                                        <div key={h.id} className="p-4.5 flex flex-col sm:flex-row sm:items-start gap-4 justify-between hover:bg-slate-50/20 transition">
                                          <div className="space-y-1">
                                            <p className="text-[11px] font-bold text-slate-400">Hall {vIdx + 1}.{hIdx + 1}</p>
                                            <h4 className="font-extrabold text-slate-800 text-sm">{h.name}</h4>
                                            <p className="text-xs text-slate-500 font-medium leading-relaxed"><b>Purpose:</b> {h.purpose}</p>
                                            {h.specialNotes && (
                                              <p className="text-xs text-slate-400 font-medium"><b>Notes:</b> {h.specialNotes}</p>
                                            )}
                                          </div>
                                          <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-500 items-center">
                                            <span className="bg-slate-100 px-2 py-0.5 rounded">Floor: {h.floorNumber || 'G'}</span>
                                            <span className="bg-slate-100 px-2 py-0.5 rounded">Area: {h.area} sq.m</span>
                                            <span className="bg-blue-50 text-blue-650 px-2 py-0.5 rounded">Cap: {h.capacity}</span>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* ─── MODULE 3: AI Stage Mockup Catalog List ────────────────── */}
                          <div className="space-y-4 border-t border-slate-100 pt-6">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-blue-500" /> AI Stage Mockups Workspace ({mockupsList.length})
                              </h4>
                              <button
                                onClick={() => {
                                  // Pre-fill fields
                                  const primaryVenue = selectedEvent.venues[0];
                                  const primaryHall = primaryVenue?.halls[0];
                                  setMockupForm({
                                    name: '',
                                    venueId: primaryVenue ? String(primaryVenue.id) : '',
                                    hallId: primaryHall ? String(primaryHall.id) : '',
                                    stageType: 'Main Stage',
                                    category: 'Hotel',
                                    notes: '',
                                    designer: currentUser?.name || 'Lead Designer'
                                  });
                                  setShowMockupModal(true);
                                }}
                                className="px-3 py-1.5 bg-blue-650 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold shadow-sm flex items-center gap-1 transition"
                              >
                                <Plus className="w-3.5 h-3.5" /> Initialize Mockup Workspace
                              </button>
                            </div>

                            {mockupsList.length === 0 ? (
                              <div className="bg-slate-50/50 border border-slate-200/60 p-8 rounded-2xl text-center space-y-2">
                                <p className="text-xs text-slate-400 font-semibold italic">No stage mockups created for this event conceptualization.</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {mockupsList.map(mockup => {
                                  const latestVer = mockup.versions && mockup.versions.length > 0 ? mockup.versions[0] : null;
                                  return (
                                    <div key={mockup.id} className="bg-white border border-slate-250/70 p-5 rounded-2xl shadow-sm hover:border-slate-350 hover:shadow-md transition-all flex gap-4">
                                      {/* Thumbnail rendering base64 or placeholder */}
                                      {latestVer && latestVer.imageUrl ? (
                                        <img src={latestVer.imageUrl} alt={mockup.name} className="w-24 h-16 object-cover rounded-xl border bg-slate-55 shadow-inner shrink-0" />
                                      ) : (
                                        <div className="w-24 h-16 bg-slate-100 rounded-xl border flex items-center justify-center text-slate-400 shrink-0 select-none">
                                          <FileImage className="w-6 h-6" />
                                        </div>
                                      )}
                                      <div className="min-w-0 flex-1 flex flex-col justify-between">
                                        <div>
                                          <div className="flex items-center justify-between gap-1.5 mb-1">
                                            <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400">{mockup.stageType}</span>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${getStatusStyle(mockup.status)}`}>{mockup.status}</span>
                                          </div>
                                          <h4 className="font-extrabold text-slate-800 text-sm leading-snug truncate">{mockup.name}</h4>
                                          <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{mockup.venue?.name} · {mockup.hall?.name}</p>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 border-t border-slate-50 pt-2 mt-2">
                                          <span className="text-[9px] font-bold text-slate-400">Ver: {latestVer ? latestVer.versionNumber : 1} · {mockup.designer}</span>
                                          <div className="flex gap-1.5">
                                            <button
                                              onClick={() => openMockupWorkspace(mockup)}
                                              className="px-2.5 py-1 bg-slate-900 text-white hover:bg-slate-850 rounded-lg text-[10px] font-bold transition flex items-center gap-0.5"
                                            >
                                              <Settings className="w-3 h-3" /> Edit Mockup
                                            </button>
                                            <button
                                              onClick={() => handleDeleteMockup(mockup.id)}
                                              className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Quick Action Buttons to subsequent modules */}
                          <div className="border-t border-slate-100 pt-6">
                            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4">Event Operations & visualizer</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              
                              {/* 1. Generate Mockup (brings user back to front visualizer page!) */}
                              <Link
                                href={`/?eventId=${selectedEvent.id}`}
                                className="p-4.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex flex-col items-center justify-center text-center shadow-md shadow-blue-200 transition-all cursor-pointer group"
                              >
                                <Sparkles className="w-6 h-6 text-white/90 group-hover:scale-105 transition-transform" />
                                <span className="text-xs font-bold mt-2">Generate AI Mockup</span>
                                <span className="text-[9px] text-white/70 font-semibold mt-0.5">Open Stage visualizer</span>
                              </Link>

                              {[
                                { label: 'Element Sheets', sub: 'Technical specifications', icon: <FileSpreadsheet className="w-5 h-5" /> },
                                { label: 'Ledger', sub: 'Billing & expenses', icon: <DollarSign className="w-5 h-5" /> },
                                { label: 'Tasks', sub: 'Todo checklist & statuses', icon: <ListTodo className="w-5 h-5" /> },
                                { label: 'Files', sub: 'Blueprints, images & receipts', icon: <Briefcase className="w-5 h-5" /> },
                                { label: 'Reports', sub: 'Project summary logs', icon: <Clipboard className="w-5 h-5" /> },
                              ].map(action => (
                                <button
                                  key={action.label}
                                  onClick={() => show(`${action.label} module will launch in Step 3.`)}
                                  className="p-4.5 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer"
                                >
                                  <div className="text-slate-400">{action.icon}</div>
                                  <span className="text-xs font-bold mt-2 text-slate-800">{action.label}</span>
                                  <span className="text-[9px] text-slate-400 font-medium mt-0.5">{action.sub}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Delete workspace block */}
                          <div className="pt-6 border-t border-slate-100 flex justify-end">
                            <button
                              onClick={() => deleteEvent(selectedEvent.id)}
                              className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                            >
                              <Trash2 className="w-4 h-4" /> Delete Event Workspace
                            </button>
                          </div>

                        </div>
                      </div>
                    </div>
                  )}

                  {/* Create Mockup Modal Wizard */}
                  {showMockupModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-in">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h3 className="font-extrabold text-slate-800 text-base">Initialize AI Mockup Workspace</h3>
                          <button onClick={() => setShowMockupModal(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCreateMockupSubmit} className="space-y-4">
                          <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">Mockup Project Name</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Center Backdrop Render - V1"
                              value={mockupForm.name}
                              onChange={e => setMockupForm(f => ({ ...f, name: e.target.value }))}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-semibold"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-bold text-slate-500 block mb-1">Assigned Venue</label>
                              <select
                                value={mockupForm.venueId}
                                onChange={e => {
                                  const selectedVId = e.target.value;
                                  const matchedVenue = selectedEvent.venues.find((v: any) => v.id === parseInt(selectedVId, 10));
                                  const nextHallId = matchedVenue && matchedVenue.halls.length > 0 ? String(matchedVenue.halls[0].id) : '';
                                  setMockupForm(f => ({ ...f, venueId: selectedVId, hallId: nextHallId }));
                                }}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white font-medium text-slate-700"
                              >
                                <option value="">Select Venue</option>
                                {selectedEvent.venues && selectedEvent.venues.map((v: any) => (
                                  <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-xs font-bold text-slate-500 block mb-1">Select Conference Hall</label>
                              <select
                                value={mockupForm.hallId}
                                onChange={e => setMockupForm(f => ({ ...f, hallId: e.target.value }))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white font-medium text-slate-700"
                              >
                                <option value="">Select Hall</option>
                                {selectedEvent.venues && selectedEvent.venues
                                  .find((v: any) => String(v.id) === mockupForm.venueId)
                                  ?.halls.map((h: any) => (
                                    <option key={h.id} value={h.id}>{h.name}</option>
                                  ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-xs font-bold text-slate-500 block mb-1">Stage Type</label>
                              <select
                                value={mockupForm.stageType}
                                onChange={e => setMockupForm(f => ({ ...f, stageType: e.target.value }))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white font-medium text-slate-700"
                              >
                                {['Main Stage', 'Conference', 'Exhibition', 'Product Launch', 'Award Ceremony', 'Wedding', 'Political Rally', 'Government Event', 'Press Conference', 'Indoor', 'Outdoor', 'Custom'].map(t => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-xs font-bold text-slate-500 block mb-1">Template Category</label>
                              <select
                                value={mockupForm.category}
                                onChange={e => setMockupForm(f => ({ ...f, category: e.target.value }))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white font-medium text-slate-700"
                              >
                                {['Hotel', 'Convention Center', 'Banquet', 'Auditorium', 'Outdoor Stage', 'Exhibition', 'Mall', 'Conference', 'Government Hall', 'Custom Upload'].map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">Designer</label>
                            <input
                              type="text"
                              required
                              value={mockupForm.designer}
                              onChange={e => setMockupForm(f => ({ ...f, designer: e.target.value }))}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-semibold"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">Notes / Technical specs</label>
                            <textarea
                              rows={2}
                              value={mockupForm.notes}
                              onChange={e => setMockupForm(f => ({ ...f, notes: e.target.value }))}
                              placeholder="Truss setup needs 3:1 width ratio..."
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 font-semibold resize-none"
                            />
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setShowMockupModal(false)}
                              className="w-1/2 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={saving}
                              className="w-1/2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                            >
                              {saving && <Loader2 className="w-3 h-3 animate-spin" />} Initialize Mockup
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* ─── FIGMA-STYLE AI STAGE MOCKUP WORKSPACE WORKSPACE (MODULE 3) ─── */}
                  {showWorkspace && activeMockup && (
                    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col text-slate-300 font-sans select-none animate-fade-in">
                      
                      {/* Top Header Controls Bar */}
                      <header className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => {
                              setShowWorkspace(false);
                              setActiveMockup(null);
                              setRenderedImage('');
                              setCompareMode(false);
                              if (selectedEvent) fetchMockups(selectedEvent.id);
                            }}
                            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
                          >
                            <ArrowLeftRight className="w-4.5 h-4.5 rotate-180" />
                          </button>
                          <div className="border-l border-slate-800 pl-4">
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-white text-sm tracking-tight">{activeMockup.name}</h3>
                              <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-extrabold">{activeMockup.stageType}</span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getStatusStyle(activeMockup.status)}`}>
                                {activeMockup.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Designed by: {activeMockup.designer} · Active Version: V{activeVersion ? activeVersion.versionNumber : 1}</p>
                          </div>
                        </div>

                        {/* Toolbar: Undo/Redo & Canvas scaling controls */}
                        <div className="flex items-center gap-4 bg-slate-950 px-4 py-1.5 rounded-xl border border-slate-800/80">
                          <div className="flex items-center gap-1.5 border-r border-slate-850 pr-3">
                            <button
                              onClick={handleUndo}
                              disabled={undoStack.length === 0}
                              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition disabled:opacity-30"
                              title="Undo"
                            >
                              <Undo className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleRedo}
                              disabled={redoStack.length === 0}
                              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition disabled:opacity-30"
                              title="Redo"
                            >
                              <Redo className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2 border-r border-slate-850 pr-3 text-xs font-semibold text-slate-400">
                            <button onClick={() => setEditorZoom(z => Math.max(20, z - 10))} className="p-1 hover:bg-slate-850 rounded"><ZoomOut className="w-3.5 h-3.5" /></button>
                            <span className="min-w-[34px] text-center">{editorZoom}%</span>
                            <button onClick={() => setEditorZoom(z => Math.min(300, z + 10))} className="p-1 hover:bg-slate-850 rounded"><ZoomIn className="w-3.5 h-3.5" /></button>
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-450 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={safeZonesVisible}
                                onChange={e => setSafeZonesVisible(e.target.checked)}
                                className="w-3.5 h-3.5 bg-slate-900 border-slate-700 rounded text-blue-500"
                              />
                              Show Safe Zones
                            </label>
                            <button
                              onClick={() => setEditorFullscreen(!editorFullscreen)}
                              className={`p-1 hover:bg-slate-850 rounded text-slate-400 hover:text-white ${editorFullscreen ? 'bg-blue-600/20 text-blue-400' : ''}`}
                            >
                              <Maximize className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Export Menu dropdown */}
                        <div className="flex items-center gap-2">
                          {/* Live render preview trigger */}
                          <button
                            onClick={() => generateWorkspacePreview()}
                            disabled={renderingPreview}
                            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1 disabled:opacity-40"
                          >
                            {renderingPreview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 text-blue-400" />} Render Stages
                          </button>
                          
                          <button
                            onClick={handleExportPNG}
                            className="px-4 py-1.5 bg-blue-650 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" /> Export PNG
                          </button>
                        </div>
                      </header>

                      {/* Main Split Panel Area */}
                      <div className="flex-1 flex overflow-hidden">
                        
                        {/* 1. LEFT SIDEBAR PANEL: Layers & Asset Library */}
                        <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
                          {/* Panel switcher tab */}
                          <div className="flex border-b border-slate-800 text-[10px] font-extrabold uppercase tracking-wider shrink-0 bg-slate-950/20">
                            <button
                              onClick={() => setActiveLeftTab('layers')}
                              className={`flex-1 py-3 text-center border-b-2 transition ${activeLeftTab === 'layers' ? 'border-blue-500 text-white bg-slate-900/30' : 'border-transparent text-slate-500 hover:text-slate-350'}`}
                            >
                              Layers
                            </button>
                            <button
                              onClick={() => setActiveLeftTab('brand_assets')}
                              className={`flex-1 py-3 text-center border-b-2 transition ${activeLeftTab === 'brand_assets' ? 'border-blue-500 text-white bg-slate-900/30' : 'border-transparent text-slate-500 hover:text-slate-350'}`}
                            >
                              Assets
                            </button>
                          </div>

                          <div className="flex-1 overflow-y-auto p-4 space-y-5">
                            {/* LAYERS MANAGER */}
                            {activeLeftTab === 'layers' && (
                              <div className="space-y-4">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Canvas Layers</h4>
                                <div className="space-y-1">
                                  {[
                                    { key: 'backdrop', label: 'Base Room Backdrop', icon: <FileImage className="w-4 h-4" /> },
                                    { key: 'screens',  label: 'LED Screen Overlays', icon: <Layers className="w-4 h-4" /> },
                                    { key: 'text',     label: 'Corporate Typography', icon: <FileText className="w-4 h-4" /> },
                                    { key: 'logos',    label: 'Brand Sponsors Row', icon: <Star className="w-4 h-4" /> },
                                  ].map(layer => {
                                    const visible = layersVisibility[layer.key as keyof typeof layersVisibility];
                                    return (
                                      <div
                                        key={layer.key}
                                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold ${visible ? 'bg-slate-800/40 text-slate-200' : 'text-slate-550 bg-transparent'}`}
                                      >
                                        <div className="flex items-center gap-2.5">
                                          {layer.icon}
                                          <span>{layer.label}</span>
                                        </div>
                                        <button
                                          onClick={() => setLayersVisibility(prev => ({ ...prev, [layer.key]: !visible }))}
                                          className="text-slate-500 hover:text-white p-0.5 rounded transition"
                                        >
                                          {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* BRAND ASSETS CATALOG */}
                            {activeLeftTab === 'brand_assets' && (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Brand Library</h4>
                                  <label className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded cursor-pointer hover:bg-blue-500/20 border border-blue-500/20">
                                    Upload File
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={e => handleUploadAssetFile(e, 'Sponsor Logo')}
                                      className="hidden"
                                    />
                                  </label>
                                </div>

                                {assetsList.length === 0 ? (
                                  <p className="text-[11px] text-slate-500 italic text-center py-4 bg-slate-950/20 border border-slate-800 rounded-xl">No assets uploaded.</p>
                                ) : (
                                  <div className="grid grid-cols-2 gap-2">
                                    {assetsList.map(asset => {
                                      const isSelected = workspaceConfig.assetUrls.includes(asset.url);
                                      return (
                                        <div
                                          key={asset.id}
                                          onClick={() => {
                                            const nextAssetUrls = isSelected
                                              ? workspaceConfig.assetUrls.filter(url => url !== asset.url)
                                              : [...workspaceConfig.assetUrls, asset.url];
                                            updateWorkspaceConfig({ assetUrls: nextAssetUrls });
                                          }}
                                          className={`group relative aspect-video border rounded-xl overflow-hidden cursor-pointer bg-slate-950 flex flex-col justify-end p-2 transition-all ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-slate-800 hover:border-slate-700'}`}
                                        >
                                          <img src={asset.url} alt={asset.name} className="absolute inset-0 w-full h-full object-contain p-1.5 opacity-80 group-hover:opacity-100 transition" />
                                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                            <span className="text-[9px] font-extrabold uppercase tracking-wide bg-blue-600 text-white px-2 py-0.5 rounded shadow">
                                              {isSelected ? 'Deselect' : 'Use Asset'}
                                            </span>
                                          </div>
                                          <p className="relative z-10 text-[9px] font-bold text-white truncate text-center leading-none mt-1">{asset.name}</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 2. CENTER PANEL: Zoom/Pan interactive Canvas Preview */}
                        <div className="flex-1 bg-slate-950 overflow-hidden relative flex flex-col justify-center items-center p-8">
                          
                          {/* Split screen image comparison overlay */}
                          {compareMode ? (
                            <div className="w-full h-full flex gap-4 animate-fade-in relative z-20">
                              <button
                                onClick={() => setCompareMode(false)}
                                className="absolute top-2 left-1/2 -translate-x-1/2 bg-rose-600 text-white rounded-full px-4 py-1.5 text-xs font-bold flex items-center gap-1 shadow-lg hover:bg-rose-700 transition"
                              >
                                <X className="w-4 h-4" /> Close Compare
                              </button>
                              
                              <div className="flex-1 flex flex-col border border-slate-800 bg-slate-900/40 rounded-2xl overflow-hidden shadow-inner">
                                <div className="bg-slate-950 px-4 py-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 border-b border-slate-800">Left Version: V{compareLeftVersion?.versionNumber}</div>
                                <div className="flex-1 flex items-center justify-center p-4">
                                  {compareLeftImage ? <img src={compareLeftImage} alt="Left" className="max-w-full max-h-full object-contain rounded-lg border border-slate-850" /> : <div className="text-slate-600 italic">No image rendered.</div>}
                                </div>
                              </div>
                              <div className="flex-1 flex flex-col border border-slate-800 bg-slate-900/40 rounded-2xl overflow-hidden shadow-inner">
                                <div className="bg-slate-950 px-4 py-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 border-b border-slate-800">Right Version: V{compareRightVersion?.versionNumber}</div>
                                <div className="flex-1 flex items-center justify-center p-4">
                                  {compareRightImage ? <img src={compareRightImage} alt="Right" className="max-w-full max-h-full object-contain rounded-lg border border-slate-850" /> : <div className="text-slate-600 italic">No image rendered.</div>}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="relative border border-slate-850 bg-slate-900/20 shadow-2xl rounded-2xl overflow-hidden transition-transform duration-100 flex items-center justify-center cursor-move"
                              style={{
                                transform: `scale(${editorZoom / 100}) translate(${editorPan.x}px, ${editorPan.y}px)`,
                                transformOrigin: 'center',
                                width: '100%',
                                maxWidth: '1024px',
                                aspectRatio: '3/2'
                              }}
                              onMouseDown={e => {
                                const startX = e.clientX - editorPan.x;
                                const startY = e.clientY - editorPan.y;
                                const handleMouseMove = (moveEvent: MouseEvent) => {
                                  setEditorPan({
                                    x: moveEvent.clientX - startX,
                                    y: moveEvent.clientY - startY
                                  });
                                };
                                const handleMouseUp = () => {
                                  window.removeEventListener('mousemove', handleMouseMove);
                                  window.removeEventListener('mouseup', handleMouseUp);
                                };
                                window.addEventListener('mousemove', handleMouseMove);
                                window.addEventListener('mouseup', handleMouseUp);
                              }}
                            >
                              {/* Backdrop base Room Image layer */}
                              {layersVisibility.backdrop && (
                                renderedImage ? (
                                  <img src={renderedImage} alt="Preview Canvas" className="w-full h-full object-cover select-none pointer-events-none" />
                                ) : (
                                  activeMockup.hall?.baseImageUrl ? (
                                    <img src={activeMockup.hall.baseImageUrl} alt="Base room" className="w-full h-full object-cover select-none pointer-events-none opacity-40" />
                                  ) : (
                                    <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-slate-500 space-y-2">
                                      <ImageIcon className="w-10 h-10 text-slate-700" />
                                      <p className="text-xs font-semibold">Click "Render Stages" to compile AI screens</p>
                                    </div>
                                  )
                                )
                              )}

                              {/* Interactive Safe Zones outline boxes */}
                              {safeZonesVisible && (
                                <svg className="absolute inset-0 w-full h-full pointer-events-none z-30" viewBox="0 0 1536 1024" fill="none">
                                  {/* Center safe area */}
                                  <rect x="560" y="240" width="416" height="250" stroke="rgba(56, 189, 248, 0.75)" strokeWidth="3" strokeDasharray="6 4" />
                                  <text x="768" y="230" fill="#38bdf8" fontSize="14" fontWeight="800" textAnchor="middle">CENTER LED SAFE ZONE</text>
                                  
                                  {/* Left Wing safe area */}
                                  {workspaceConfig.screenConfig !== 'center' && (
                                    <>
                                      <rect x="362" y="240" width="128" height="405" stroke="rgba(244, 63, 94, 0.75)" strokeWidth="3" strokeDasharray="6 4" />
                                      <text x="426" y="230" fill="#f43f5e" fontSize="14" fontWeight="800" textAnchor="middle">LEFT WING</text>

                                      <rect x="1073" y="240" width="128" height="405" stroke="rgba(244, 63, 94, 0.75)" strokeWidth="3" strokeDasharray="6 4" />
                                      <text x="1137" y="230" fill="#f43f5e" fontSize="14" fontWeight="800" textAnchor="middle">RIGHT WING</text>
                                    </>
                                  )}
                                </svg>
                              )}

                              {/* Vercel-style skeleton loading overlay */}
                              {renderingPreview && (
                                <div className="absolute inset-0 bg-slate-950/80 z-40 flex flex-col items-center justify-center space-y-4">
                                  <div className="relative flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                                    <Sparkles className="absolute w-5 h-5 text-blue-400" />
                                  </div>
                                  <p className="text-xs font-extrabold text-blue-400 uppercase tracking-widest animate-pulse">Compositing stage layout Safe Zones...</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Float bar info */}
                          {!compareMode && (
                            <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-500">
                              🖱️ Hold drag left-click anywhere inside the canvas to PAN
                            </div>
                          )}
                        </div>

                        {/* 3. RIGHT SIDEBAR PANEL: Properties Configuration & Versions */}
                        <div className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0">
                          {/* Panel tab switcher */}
                          <div className="flex border-b border-slate-800 text-[10px] font-extrabold uppercase tracking-wider shrink-0 bg-slate-950/20">
                            <button
                              onClick={() => setActiveRightTab('props')}
                              className={`flex-1 py-3 text-center border-b-2 transition ${activeRightTab === 'props' ? 'border-blue-500 text-white bg-slate-900/30' : 'border-transparent text-slate-500 hover:text-slate-350'}`}
                            >
                              Properties
                            </button>
                            <button
                              onClick={() => setActiveRightTab('versions')}
                              className={`flex-1 py-3 text-center border-b-2 transition ${activeRightTab === 'versions' ? 'border-blue-500 text-white bg-slate-900/30' : 'border-transparent text-slate-500 hover:text-slate-350'}`}
                            >
                              Versions ({activeMockup.versions?.length || 1})
                            </button>
                          </div>

                          <div className="flex-1 overflow-y-auto p-5 space-y-6">
                            
                            {/* PROPERTIES PANEL */}
                            {activeRightTab === 'props' && (
                              <div className="space-y-4">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Layout Properties</h4>
                                
                                <div className="space-y-3.5">
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Event Title</label>
                                    <input
                                      type="text"
                                      value={workspaceConfig.title}
                                      onChange={e => updateWorkspaceConfig({ title: e.target.value })}
                                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Event Subtitle</label>
                                    <input
                                      type="text"
                                      value={workspaceConfig.subtitle}
                                      onChange={e => updateWorkspaceConfig({ subtitle: e.target.value })}
                                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Timing details</label>
                                      <input
                                        type="text"
                                        value={workspaceConfig.dateText}
                                        onChange={e => updateWorkspaceConfig({ dateText: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Venue Hall name</label>
                                      <input
                                        type="text"
                                        value={workspaceConfig.venueText}
                                        onChange={e => updateWorkspaceConfig({ venueText: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Sponsor Logos (badges)</label>
                                    <input
                                      type="text"
                                      placeholder="Comma separated: Microsoft, Stripe"
                                      value={workspaceConfig.logos.join(', ')}
                                      onChange={e => {
                                        const values = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                        updateWorkspaceConfig({ logos: values });
                                      }}
                                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                                    />
                                  </div>

                                  <div className="border-t border-slate-800 pt-3 space-y-3">
                                    <div>
                                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Screen Configurations</label>
                                      <select
                                        value={workspaceConfig.screenConfig}
                                        onChange={e => updateWorkspaceConfig({ screenConfig: e.target.value as any })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                                      >
                                        <option value="center">Center LED Screen Only</option>
                                        <option value="wings">Left/Right LED Wings Only</option>
                                        <option value="all">Full Stage LED Matrix (All screens)</option>
                                      </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Theme</label>
                                        <select
                                          value={workspaceConfig.theme}
                                          onChange={e => updateWorkspaceConfig({ theme: e.target.value as any })}
                                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                                        >
                                          <option value="dark">Dark Slate</option>
                                          <option value="light">Warm Ivory</option>
                                        </select>
                                      </div>

                                      <div>
                                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Wing Mode</label>
                                        <select
                                          value={workspaceConfig.wingDisplayMode}
                                          onChange={e => updateWorkspaceConfig({ wingDisplayMode: e.target.value as any })}
                                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                                        >
                                          <option value="mirror">Mirror Content</option>
                                          <option value="extended">Extended Content</option>
                                        </select>
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    onClick={handleSaveVersion}
                                    disabled={saving}
                                    className="w-full bg-blue-650 hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 mt-4"
                                  >
                                    {saving ? <Loader2 className="w-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save New Version
                                  </button>

                                </div>
                              </div>
                            )}

                            {/* VERSION CONTROL HISTORY */}
                            {activeRightTab === 'versions' && (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Version History</h4>
                                  {activeMockup.versions && activeMockup.versions.length > 1 && (
                                    <button
                                      onClick={() => startCompareMode(activeMockup.versions[1], activeMockup.versions[0])}
                                      className="text-[9px] font-extrabold uppercase bg-slate-800 hover:bg-slate-750 text-blue-400 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-0.5"
                                    >
                                      <Columns className="w-3 h-3" /> Compare V1/V2
                                    </button>
                                  )}
                                </div>

                                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                                  {activeMockup.versions && activeMockup.versions.map((ver: any, idx: number) => {
                                    const isActive = activeVersion && activeVersion.id === ver.id;
                                    return (
                                      <div
                                        key={ver.id}
                                        className={`p-3 rounded-xl border flex flex-col gap-2 transition ${isActive ? 'bg-slate-800/40 border-blue-500/40 text-white' : 'bg-transparent border-slate-800 text-slate-400 hover:border-slate-750'}`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-bold flex items-center gap-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-blue-500' : 'bg-slate-600'}`} />
                                            Version {ver.versionNumber}
                                          </span>
                                          <span className="text-[9px] font-semibold text-slate-500">{new Date(ver.createdAt).toLocaleTimeString()}</span>
                                        </div>

                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => handleRestoreVersion(ver.versionNumber)}
                                            className="flex-1 py-1.5 bg-slate-950 text-white hover:bg-slate-900 border border-slate-800/60 rounded text-[9px] font-bold transition flex items-center justify-center gap-0.5"
                                          >
                                            <Undo className="w-2.5 h-2.5" /> Restore Config
                                          </button>
                                          
                                          {/* Compare link helper */}
                                          {idx > 0 && (
                                            <button
                                              onClick={() => startCompareMode(ver, activeMockup.versions[0])}
                                              className="p-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800/60 rounded text-[9px] font-bold transition text-slate-400 hover:text-white"
                                              title="Compare with latest"
                                            >
                                              <ArrowLeftRight className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                </div>
              )}

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
                          <button onClick={() => deleteVenue(v.id)} className="text-slate-400 hover:text-red-650 p-1 rounded transition"><Trash2 className="w-4 h-4" /></button>
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
                          <p className="text-amber-605 text-sm bg-amber-50 p-3 rounded-lg">Base image is missing.</p>
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
                        <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-widest">Base Photo & Blueprints</h4>
                        
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
                                <p className="text-xs text-slate-450 font-medium mt-0.5">{h.venue?.name} · {h.venue?.city?.name}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">L:{h.length}m W:{h.width}m H:{h.height}m</span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-650">Cap: {h.capacity} pax</span>
                                  {h.floorPlanUrl && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">Floorplan ✓</span>}
                                  {(h.refPhotoUrl1 || h.refPhotoUrl2) && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">Gallery ✓</span>}
                                </div>
                              </div>
                              <div className="flex flex-col gap-1.5 shrink-0">
                                <button onClick={() => startEditingMasks(h)} className="text-[11px] bg-blue-50 text-blue-655 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap">Edit Config</button>
                                <button onClick={() => deleteHall(h.id)} className="text-[11px] bg-red-50 text-red-550 hover:bg-red-100 px-3 py-1.5 rounded-lg font-bold transition-colors">Delete</button>
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
                          <button onClick={() => deleteBranding(b.id)} className="text-slate-400 hover:text-red-650 mt-1 shrink-0 p-1"><Trash2 className="w-4 h-4" /></button>
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
                                    <span className="inline-block text-[11px] font-semibold text-slate-650 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/40">
                                      {u.role.name}
                                    </span>
                                  </td>

                                  {/* Status */}
                                  <td className="px-6 py-4">
                                    {u.status === 'active' ? (
                                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-650 font-semibold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-500 font-semibold">
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
                                        className={`p-1.5 rounded-lg border transition-colors ${u.status === 'active' ? 'text-amber-500 hover:bg-amber-50 border-amber-100' : 'text-emerald-555 hover:bg-emerald-50 border-emerald-100'} disabled:opacity-40`}
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
                                        className="p-1.5 text-rose-455 hover:bg-rose-50 border border-rose-100 rounded-lg transition-colors disabled:opacity-40"
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
                              className="w-1/2 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-605 rounded-xl text-sm font-bold transition-colors"
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
                              className="w-1/2 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-605 rounded-xl text-sm font-bold transition-colors"
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
                    <div className="p-2.5 bg-blue-100 rounded-xl text-blue-650 h-fit">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-blue-800 text-sm">Enterprise Security Matrix</h4>
                      <p className="text-xs text-blue-755 leading-relaxed font-semibold">
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
                          <tr className="bg-slate-50 text-slate-450 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
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
                                        className="w-4.5 h-4.5 text-blue-600 bg-slate-50 border-slate-350 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
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
