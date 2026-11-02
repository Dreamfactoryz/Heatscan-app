import { ITEM_TYPES } from './types';

// Pulls the heat number and other fields out of raw text from the phone's text reader.
// Kept free of native imports so it can be unit tested.

export type Reading = {
  heat: string;
  alternatives: string[];
  type: string;
  size: string;
  rating: string;
  material: string;
  confidence: 'high' | 'medium' | 'low';
  note: string;
};

const MATERIAL = /\b(?:SA|A)[-\s]?(?:105N?|106|53|234|182|350|333|312|403|694|860|516|516-70|420|707|790|815)(?:\s*(?:GR\.?|GRADE)\s*[A-Z0-9]+|\s*(?:WP[A-Z0-9]+|F\d+[A-Z]*|LF\d|B|C))?\b/i;
const MATERIAL_TOKEN = /^(?:SA|A)-?\d{2,3}[A-Z]?$|^WP[A-Z0-9]+$|^F\d{2,3}[LH]?$|^(?:304|316)L?$|^GR\.?$/i;
const RATING = /\b(?:CL(?:ASS)?\.?\s*(150|300|600|900|1500|2500|3000|6000|9000)\b|(150|300|600|900|1500|2500|3000|6000)\s*(?:#|LBS?\b)|SCH(?:EDULE)?\.?\s*(XXS|XS|STD|\d{1,3}S?)\b|\b(XXS|XS|STD)\b)/i;
const SIZE = /(?<![\w.])(\d{1,2}(?:[./]\d{1,2})?|\d\s\d\/\d)\s*(?:"|''|”|IN\b|INCH)|\bNPS\s*(\d{1,2}(?:[./]\d)?)\b|\bDN\s*(\d{2,4})\b/i;
const HEAT_LABEL = /\b(?:HEAT\s*(?:NO\.?|NUMBER|CODE|#)?|HT\.?\s*(?:NO\.?|#)?|H\/N|HN|H\.N\.?|HEAT:)\s*[:#.\-]?\s*([A-Z0-9][A-Z0-9\-\/]{2,15})/i;
const NOISE = new Set(['ASME', 'ANSI', 'ASTM', 'B16', 'B169', 'B165', 'B1611', 'MSS', 'SP', 'NACE', 'MR0175', 'MR0103', 'PMI', 'RF', 'RTJ', 'FF', 'WN', 'SO', 'SW', 'BW', 'BL', 'LJ', 'SMLS', 'ERW', 'CHINA', 'USA', 'MADE', 'IN', 'SCH', 'STD', 'XS', 'XXS', 'CL', 'CLASS', 'HEAT', 'HT', 'NO', 'WPB', 'WPL6']);

function clean(s: string) {
  return s.toUpperCase().replace(/[^A-Z0-9\-\/]/g, '').replace(/^[-\/]+|[-\/]+$/g, '');
}

// Characters that phone text readers mix up on stamped steel.
const SWAPS: Record<string, string> = { O: '0', '0': 'O', I: '1', '1': 'I', S: '5', '5': 'S', B: '8', '8': 'B', Z: '2', '2': 'Z' };
function lookAlikes(h: string) {
  const out: string[] = [];
  for (let i = 0; i < h.length && out.length < 3; i++) {
    const sw = SWAPS[h[i]];
    if (!sw) continue;
    // Only swap where the neighbours suggest the other class (letter among digits, or digit among letters).
    const isDigit = /\d/.test(h[i]);
    const neighbours = (h[i - 1] || '') + (h[i + 1] || '');
    const otherClass = isDigit ? /[A-Z]{2}/.test(neighbours) : /\d{2}/.test(neighbours) || /\d/.test(neighbours);
    if (otherClass) out.push(h.slice(0, i) + sw + h.slice(i + 1));
  }
  return out;
}

export function parseMarking(raw: string): Reading {
  const text = (raw || '').replace(/\r/g, '').toUpperCase();
  const flat = text.replace(/\n+/g, ' ');
  const r: Reading = { heat: '', alternatives: [], type: '', size: '', rating: '', material: '', confidence: 'low', note: '' };

  const mat = flat.match(MATERIAL);
  if (mat) r.material = mat[0].replace(/\s+/g, ' ').trim();
  const rat = flat.match(RATING);
  if (rat) r.rating = rat[1] ? 'CL ' + rat[1] : rat[2] ? rat[2] + '#' : 'SCH ' + (rat[3] || rat[4]);
  const sz = flat.match(SIZE);
  if (sz) r.size = sz[1] ? sz[1] + '"' : sz[2] ? sz[2] + '"' : 'DN' + sz[3];
  for (const t of ITEM_TYPES) {
    if (new RegExp('\\b' + t.toUpperCase() + 'S?\\b').test(flat)) {
      r.type = t;
      break;
    }
  }
  if (!r.type && /\b(?:WN|SO|BL|LJ)\b.*\bRF\b|\bRF\b/.test(flat)) r.type = 'Flange';
  if (!r.type && /\b90\s*(?:DEG|°|LR|SR)|\b45\s*(?:DEG|°)/.test(flat)) r.type = 'Elbow';

  // 1. A labelled heat number wins.
  const lab = flat.match(HEAT_LABEL);
  let heat = lab ? clean(lab[1]) : '';
  let labelled = !!heat;

  // 2. Otherwise the most heat-like token: mixed letters and digits, or long digit runs,
  //    that is not a spec, size, class or standard.
  const candidates: { t: string; score: number }[] = [];
  const tokens = flat.split(/[\s,;]+/).map(clean).filter(Boolean);
  for (const t of tokens) {
    if (t.length < 4 || t.length > 14) continue;
    if (NOISE.has(t) || MATERIAL_TOKEN.test(t)) continue;
    if (r.material && r.material.replace(/\s/g, '').includes(t)) continue;
    if (/^(?:CL|CLASS)?(?:150|300|600|900|1500|2500|3000|6000|9000)(?:#|LBS?)?$/.test(t)) continue;
    if (/^SCH\d/.test(t) || /^B16\d*/.test(t) || /^DN\d+$/.test(t) || /^NPS\d/.test(t)) continue;
    if (/^(?:19|20)\d{2}$/.test(t)) continue; // a year
    const digits = (t.match(/\d/g) || []).length;
    if (!digits) continue;
    let score = digits;
    if (/[A-Z]/.test(t)) score += 3;
    if (t.length >= 5 && t.length <= 10) score += 2;
    candidates.push({ t, score });
  }
  candidates.sort((a, b) => b.score - a.score);
  if (!heat && candidates.length) heat = candidates[0].t;

  r.heat = heat;
  const others = candidates.map((c) => c.t).filter((t) => t !== heat);
  r.alternatives = [...lookAlikes(heat), ...others].filter((v, i, a) => v && v !== heat && a.indexOf(v) === i).slice(0, 3);

  if (!heat) {
    r.confidence = 'low';
    r.note = 'No heat number found in the photo. Try closer, without glare, or type it in.';
  } else if (labelled && !lookAlikes(heat).length) {
    r.confidence = 'high';
  } else {
    r.confidence = labelled ? 'medium' : 'low';
    if (!labelled) r.note = 'No "HEAT" or "HT" label found, so this is a best guess. Check it against the item.';
  }
  return r;
}
