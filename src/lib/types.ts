// Data model. Mirrors the Heat Scan web app so records can move between them.
// Photos are file names inside the app's photos folder (see storage.ts).

export const ITEM_TYPES = ['Flange', 'Pipe', 'Elbow', 'Tee', 'Reducer', 'Nipple', 'Valve', 'Cap', 'Coupling', 'Olet', 'Other'] as const;
export const WELD_TYPES = ['Butt Weld', 'Socket Weld', 'Fillet Weld'] as const;
export const WELD_LOCS = ['Shop Weld', 'Field Weld'] as const;

export type Confidence = 'high' | 'medium' | 'low' | 'typed';

export type Item = {
  id: string;
  heat: string;
  type: string;
  size: string;
  rating: string;
  material: string;
  comment: string;
  conf: Confidence;
  edited?: boolean;
  photo: string | null;
  at: number;
  by: string;
};

// Spool.operator / Item.by hold the fabricator's name (field names kept for saved data).
// welds[i] joins items[i] and items[i + 1].
export type Weld = { type: string; loc: string; ndt: '' | 'xray' | 'dp' };

export type Stroke = { c: string; p: [number, number][] }; // points are 0..1 of image width/height
export type Highlight = { id: string; c: string; strokes: [number, number][][]; label: string; at: number; by: string };

export type Drawing = {
  id: string;
  number: string;
  title: string;
  photo: string;
  at: number;
  by: string;
  highlights: Highlight[];
};

export type Photo = { id: string; photo: string; at: number; by: string };
export type DyePenPhoto = Photo & { weld: number | null };

export type Spool = {
  id: string;
  name: string;
  location: string;
  operator: string;
  createdAt: number;
  updatedAt: number;
  items: Item[];
  welds: Weld[];
  drawings: Drawing[];
  dyePen: DyePenPhoto[];
  finished: Photo[];
};

export type Settings = {
  xrayEvery: number; // 10 = 1 in 10 shop butt welds (10%)
  dpEvery: number; // 5 = 1 in 5 fillet welds (20%)
  priorShopButt: number;
  priorFillet: number;
  lastOperator: string;
  fabricators: string[]; // names offered in the Fabricator dropdown
  lastLocation: string;
  locations: string[]; // places offered in the Location dropdown
};

export const DEFAULT_FABRICATORS = ['Richard King'];
export const DEFAULT_LOCATIONS = ['Waiuku WWTP Interim Upgrade'];
export const DEFAULT_SETTINGS: Settings = { xrayEvery: 10, dpEvery: 5, priorShopButt: 0, priorFillet: 0, lastOperator: '', fabricators: DEFAULT_FABRICATORS, lastLocation: '', locations: DEFAULT_LOCATIONS };

export type AppData = { version: 1; spools: Record<string, Spool>; settings: Settings };

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
export function pad(n: number) {
  return n < 10 ? '0' + n : '' + n;
}
export function ord(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
export function fmt(t: number) {
  try {
    return new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}
export function descOf(it: Item) {
  return [it.type, it.size, it.rating, it.material].filter(Boolean).join(' · ');
}
