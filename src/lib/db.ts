import fs from 'fs';
import path from 'path';

// Define DB Types
export interface City {
  id: number;
  name: string;
  state: string;
}

export interface Venue {
  id: number;
  city_id: number;
  name: string;
  address: string;
  image_url?: string;
  mask_x?: number;
  mask_y?: number;
  mask_w?: number;
  mask_h?: number;
}

export interface Hall {
  id: number;
  venue_id: number;
  name: string;
  width: number;
  length: number;
  height: number;
  capacity: number;
}

export interface Template {
  id: number;
  name: string;
  type: 'stage' | 'seating' | 'theme';
  value: string;
}

export interface Branding {
  id: number;
  name: string;
  logos: string[]; // List of logo names grouped (e.g. ['Tata', 'Reliance', 'NASSCOM'])
}

interface DBData {
  cities: City[];
  venues: Venue[];
  halls: Hall[];
  templates: Template[];
  brandings: Branding[];
}

const DATA_FILE_PATH = path.join(process.cwd(), 'src/lib/data.json');

// Premium Pan-India seed data
const SEED_DATA: DBData = {
  cities: [
    { id: 1, name: 'Mumbai', state: 'Maharashtra' },
    { id: 2, name: 'New Delhi', state: 'Delhi' },
    { id: 3, name: 'Bengaluru', state: 'Karnataka' }
  ],
  venues: [
    { id: 1, city_id: 1, name: 'Taj Lands End', address: 'Bandra West, Mumbai', image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80', mask_x: 20, mask_y: 15, mask_w: 60, mask_h: 40 },
    { id: 2, city_id: 1, name: 'JW Marriott Sahar', address: 'IA Project Road, Andheri East, Mumbai', image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80', mask_x: 15, mask_y: 20, mask_w: 70, mask_h: 35 },
    { id: 3, city_id: 2, name: 'The Oberoi New Delhi', address: 'Dr. Zakir Hussain Marg, New Delhi', image_url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80', mask_x: 25, mask_y: 10, mask_w: 50, mask_h: 45 },
    { id: 4, city_id: 3, name: 'ITC Gardenia', address: 'Residency Road, Bengaluru', image_url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80', mask_x: 30, mask_y: 15, mask_w: 40, mask_h: 35 }
  ],
  halls: [
    { id: 1, venue_id: 1, name: 'Grand Ballroom', width: 25, length: 45, height: 7.5, capacity: 800 },
    { id: 2, venue_id: 1, name: 'Sea View Pavilion', width: 20, length: 30, height: 6.0, capacity: 400 },
    { id: 3, venue_id: 2, name: 'Grand Ballroom 1 & 2', width: 30, length: 50, height: 8.5, capacity: 1200 },
    { id: 4, venue_id: 3, name: 'Plenary Ballroom', width: 28, length: 48, height: 9.0, capacity: 1000 },
    { id: 5, venue_id: 4, name: 'Mysore Hall', width: 22, length: 38, height: 7.0, capacity: 600 }
  ],
  templates: [
    // Stage configurations
    { id: 1, name: 'Royal Staggered Wood Set', type: 'stage', value: 'Royal Wooden Stage' },
    { id: 2, name: 'Seamless Gloss Acrylic Set', type: 'stage', value: 'Glossy Acrylic Stage' },
    { id: 3, name: 'LED Digital Backdrop Truss', type: 'stage', value: 'LED Truss Stage' },
    // Seating setups
    { id: 4, name: 'Theatre Rows Layout', type: 'seating', value: 'Theatre' },
    { id: 5, name: 'Cluster Round Tables (Banquet)', type: 'seating', value: 'Cluster' },
    { id: 6, name: 'Classroom Desks Layout', type: 'seating', value: 'Classroom' },
    // Themes
    { id: 7, name: 'Classic Gold & Navy Blue', type: 'theme', value: 'Gold/Navy' },
    { id: 8, name: 'Corporate Cyber Silver & Cyan', type: 'theme', value: 'Silver/Cyan' },
    { id: 9, name: 'Botanical Eco Emerald Green', type: 'theme', value: 'Emerald Green' }
  ],
  brandings: [
    { id: 1, name: 'Corporate Tech Summit Template', logos: ['Tata', 'Reliance', 'NASSCOM', 'Tech Mahindra'] },
    { id: 2, name: 'Government Protocol template', logos: ['MP Government', 'Digital India', 'Startup India'] }
  ]
};

// Check if data file exists, if not write seed data
function checkAndInitDB() {
  const dir = path.dirname(DATA_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE_PATH)) {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(SEED_DATA, null, 2), 'utf-8');
  }
}

export function readDB(): DBData {
  checkAndInitDB();
  try {
    const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed reading Eventelligence db file, resetting to seeds:', error);
    return SEED_DATA;
  }
}

export function writeDB(data: DBData): boolean {
  checkAndInitDB();
  try {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed writing to database file:', error);
    return false;
  }
}
