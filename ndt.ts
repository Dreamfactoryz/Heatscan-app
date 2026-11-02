import type { Settings, Spool } from './types';

// NDT sampling, counted across every spool in creation order, then welds in order.
// X-ray: every Nth shop butt weld. Dye pen: every Nth fillet weld (shop and field).
export type NdtNeed = { kind: 'xray' | 'dp'; n: number; name: string; what: string; every: number; done: boolean };
export type NdtResult = { map: Record<string, NdtNeed>; due: Record<string, number> };

export function sortedSpools(spools: Record<string, Spool>) {
  return Object.values(spools).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

export function computeNdt(spools: Record<string, Spool>, st: Settings): NdtResult {
  let sb = +st.priorShopButt || 0;
  let fw = +st.priorFillet || 0;
  const xe = Math.max(1, +st.xrayEvery || 10);
  const de = Math.max(1, +st.dpEvery || 5);
  const map: Record<string, NdtNeed> = {};
  const due: Record<string, number> = {};
  for (const sp of sortedSpools(spools)) {
    due[sp.id] = 0;
    (sp.welds || []).forEach((w, i) => {
      let need: Omit<NdtNeed, 'done'> | null = null;
      if (w.type === 'Butt Weld' && w.loc === 'Shop Weld') {
        sb++;
        if (sb % xe === 0) need = { kind: 'xray', n: sb, name: 'X-ray', what: 'shop butt weld', every: xe };
      }
      if (w.type === 'Fillet Weld') {
        fw++;
        if (fw % de === 0) need = { kind: 'dp', n: fw, name: 'Dye pen test', what: 'fillet weld', every: de };
      }
      if (need) {
        const full = { ...need, done: w.ndt === need.kind };
        map[sp.id + ':' + i] = full;
        if (!full.done) due[sp.id]++;
      }
    });
  }
  return { map, due };
}
