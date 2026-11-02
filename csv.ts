import type { NdtResult } from './ndt';
import { fmt, pad, type Item, type Spool } from './types';

function csvCell(v: unknown) {
  const s = String(v == null ? '' : v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
export function safe(s: string) {
  return String(s || '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'spool';
}
export function photoName(sp: Spool, it: Item, i: number) {
  return safe(sp.name) + '/' + pad(i + 1) + '_' + safe(it.heat) + '.jpg';
}
export function stamp() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

// Same columns as the web app's CSV.
export function buildCsv(list: Spool[], ndt: NdtResult) {
  const rows: unknown[][] = [
    ['Spool', 'Location', 'Row', 'No.', 'Heat number', 'Item', 'Size', 'Class / schedule', 'Material', 'Read confidence', 'Weld type', 'Shop / field', 'Joins', 'NDT', 'Comments', 'Captured', 'Operator', 'Photo file'],
  ];
  for (const sp of list) {
    sp.items.forEach((it, i) => {
      rows.push([sp.name, sp.location, 'Item', pad(i + 1), it.heat, it.type, it.size, it.rating, it.material, it.conf + (it.edited ? ' (corrected)' : ''), '', '', '', '', it.comment || '', fmt(it.at), it.by, it.photo ? photoName(sp, it, i) : '']);
      if (i < sp.items.length - 1) {
        const w = sp.welds[i] || { type: '', loc: '', ndt: '' };
        const n = ndt.map[sp.id + ':' + i];
        const dpCount = sp.dyePen.filter((d) => d.weld === i).length;
        let ndtText = n ? n.name + (n.done ? ' booked' : ' required') : '';
        if (dpCount) ndtText += (ndtText ? ' · ' : '') + dpCount + ' dye pen photo' + (dpCount > 1 ? 's' : '');
        rows.push([sp.name, sp.location, 'Weld', 'W' + (i + 1), '', '', '', '', '', '', w.type || 'Not set', w.loc || 'Not set', pad(i + 1) + '-' + pad(i + 2), ndtText, '', '', '', '']);
      }
    });
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
