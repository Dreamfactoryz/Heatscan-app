import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCsv } from '../csv';
import { computeNdt } from '../ndt';
import { parseMarking } from '../parseMarking';
import { DEFAULT_SETTINGS, type Spool, type Weld } from '../types';

function spool(id: string, createdAt: number, welds: Weld[]): Spool {
  const items = Array.from({ length: welds.length + 1 }, (_, i) => ({
    id: id + i, heat: 'H' + i, type: 'Pipe', size: '', rating: '', material: '', comment: '', conf: 'typed' as const, photo: null, at: 0, by: '',
  }));
  return { id, name: id, location: '', operator: '', createdAt, updatedAt: createdAt, items, welds, drawings: [], dyePen: [], finished: [] };
}
const w = (type: string, loc: string): Weld => ({ type, loc, ndt: '' });

test('X-ray every 10th shop butt weld, counted across spools in creation order', () => {
  const a = spool('a', 1, Array.from({ length: 6 }, () => w('Butt Weld', 'Shop Weld')));
  const b = spool('b', 2, [w('Butt Weld', 'Field Weld'), ...Array.from({ length: 4 }, () => w('Butt Weld', 'Shop Weld'))]);
  const r = computeNdt({ b, a }, DEFAULT_SETTINGS);
  assert.deepEqual(Object.keys(r.map), ['b:4']); // field weld skipped, so the 10th shop butt is b's 5th weld
  assert.equal(r.map['b:4'].kind, 'xray');
  assert.equal(r.due.b, 1);
});

test('Dye pen every 5th fillet weld (20%), shop and field both count', () => {
  const a = spool('a', 1, [w('Fillet Weld', 'Shop Weld'), w('Fillet Weld', 'Field Weld'), w('Fillet Weld', 'Shop Weld'), w('Socket Weld', 'Shop Weld'), w('Fillet Weld', 'Field Weld'), w('Fillet Weld', 'Shop Weld')]);
  const r = computeNdt({ a }, DEFAULT_SETTINGS);
  assert.deepEqual(Object.keys(r.map), ['a:5']);
  assert.equal(r.map['a:5'].kind, 'dp');
});

test('Prior counts carry on and booked tests are not due', () => {
  const a = spool('a', 1, [w('Butt Weld', 'Shop Weld')]);
  a.welds[0].ndt = 'xray';
  const r = computeNdt({ a }, { ...DEFAULT_SETTINGS, priorShopButt: 9 });
  assert.equal(r.map['a:0'].done, true);
  assert.equal(r.due.a, 0);
});

test('CSV has items, welds with NDT and comments', () => {
  const a = spool('a', 1, [w('Butt Weld', 'Shop Weld')]);
  a.items[0].comment = 'Painted, "checked"';
  const csv = buildCsv([a], computeNdt({ a }, { ...DEFAULT_SETTINGS, priorShopButt: 9 }));
  const lines = csv.trim().split('\r\n');
  assert.equal(lines.length, 4);
  assert.match(lines[2], /Weld,W1,.*Butt Weld,Shop Weld,01-02,X-ray required/);
  assert.match(lines[1], /"Painted, ""checked"""/);
});

test('Reads a labelled heat number and other fields from phone OCR text', () => {
  const r = parseMarking('ASME B16.5\n6" CL150 WN RF\nA105N\nHT H48572\nCHINA');
  assert.equal(r.heat, 'H48572');
  assert.equal(r.type, 'Flange');
  assert.equal(r.rating, 'CL 150');
  assert.equal(r.material, 'A105N');
  assert.equal(r.confidence, 'high');
});

test('Unlabelled heat numbers are a low-confidence guess; look-alikes are offered', () => {
  assert.equal(parseMarking('2" 3000# SW TEE A105 B16.11 4K7731').heat, '4K7731');
  assert.equal(parseMarking('2" 3000# SW TEE A105 B16.11 4K7731').confidence, 'low');
  const r = parseMarking('HN: E2O118');
  assert.ok(r.alternatives.includes('E20118'));
  assert.equal(parseMarking('blurry').heat, '');
});
