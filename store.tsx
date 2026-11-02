import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { computeNdt, type NdtResult } from './ndt';
import { deletePhoto, emptyData, loadData, saveData } from './storage';
import type { AppData, Settings, Spool } from './types';
import { uid } from './types';

type Store = {
  loaded: boolean;
  data: AppData;
  ndt: NdtResult;
  createSpool: (fields: Pick<Spool, 'name' | 'location' | 'operator'>) => string;
  updateSpool: (id: string, change: (sp: Spool) => void) => void;
  deleteSpool: (id: string) => void;
  saveSettings: (s: Partial<Settings>) => void;
  saveError: string | null;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const ref = useRef(data);
  ref.current = data;

  useEffect(() => {
    loadData()
      .then(setData)
      .catch(() => setSaveError('Could not open saved spools on this phone.'))
      .finally(() => setLoaded(true));
  }, []);

  const commit = useCallback((next: AppData) => {
    ref.current = next;
    setData(next);
    saveData(next).then(
      () => setSaveError(null),
      () => setSaveError('Could not save to the phone. Check free storage space.'),
    );
  }, []);

  const createSpool = useCallback<Store['createSpool']>(
    (f) => {
      const id = uid();
      const now = Date.now();
      const sp: Spool = { id, ...f, createdAt: now, updatedAt: now, items: [], welds: [], drawings: [], dyePen: [], finished: [] };
      const cur = ref.current;
      commit({ ...cur, spools: { ...cur.spools, [id]: sp }, settings: { ...cur.settings, lastOperator: f.operator || cur.settings.lastOperator } });
      return id;
    },
    [commit],
  );

  const updateSpool = useCallback<Store['updateSpool']>(
    (id, change) => {
      const cur = ref.current;
      if (!cur.spools[id]) return;
      const copy: Spool = JSON.parse(JSON.stringify(cur.spools[id]));
      change(copy);
      copy.updatedAt = Date.now();
      commit({ ...cur, spools: { ...cur.spools, [id]: copy } });
    },
    [commit],
  );

  const deleteSpool = useCallback<Store['deleteSpool']>(
    (id) => {
      const cur = ref.current;
      const sp = cur.spools[id];
      if (!sp) return;
      const rest = { ...cur.spools };
      delete rest[id];
      commit({ ...cur, spools: rest });
      sp.items.forEach((i) => deletePhoto(i.photo));
      sp.drawings.forEach((d) => deletePhoto(d.photo));
      sp.dyePen.forEach((d) => deletePhoto(d.photo));
      sp.finished.forEach((f) => deletePhoto(f.photo));
    },
    [commit],
  );

  const saveSettings = useCallback<Store['saveSettings']>(
    (s) => {
      const cur = ref.current;
      commit({ ...cur, settings: { ...cur.settings, ...s } });
    },
    [commit],
  );

  const ndt = useMemo(() => computeNdt(data.spools, data.settings), [data]);

  const value = useMemo(
    () => ({ loaded, data, ndt, createSpool, updateSpool, deleteSpool, saveSettings, saveError }),
    [loaded, data, ndt, createSpool, updateSpool, deleteSpool, saveSettings, saveError],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
}
