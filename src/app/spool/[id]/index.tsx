import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Icon } from '../../../components/Icon';
import { ReviewCard, type Review } from '../../../components/ReviewCard';
import { Screen } from '../../../components/Screen';
import { SpoolSheet } from '../../../components/SpoolSheet';
import { SpoolTags } from '../../../components/SpoolTags';
import { Btn, Choice, Empty, Eyebrow, Field, font, H1, IconBtn, Label, Muted, Section, Sheet, Spinner, Tag, Tile, useToast } from '../../../components/ui';
import { exportCsv, exportZip, safe, stamp } from '../../../lib/export';
import { pickPhoto } from '../../../lib/photos';
import { readMark } from '../../../lib/reader';
import { deletePhoto, photoUri, storePhoto } from '../../../lib/storage';
import { useStore } from '../../../lib/store';
import { useTheme } from '../../../lib/theme';
import { FabricatorPicker } from '../../../components/FabricatorPicker';
import { descOf, fmt, ITEM_TYPES, ord, pad, uid, WELD_LOCS, WELD_TYPES, type Item, type Spool } from '../../../lib/types';

type SheetState =
  | null
  | { kind: 'edit' }
  | { kind: 'export' }
  | { kind: 'dye'; previewUri: string; photo: string | null; weld: number | null }
  | { kind: 'dpv'; id: string }
  | { kind: 'fin'; id: string };

function weldOptions(sp: Spool) {
  const out: { label: string; value: number | null }[] = [{ label: 'Not linked to a weld', value: null }];
  for (let i = 0; i < Math.max(0, sp.items.length - 1); i++) {
    const w = sp.welds[i];
    out.push({ label: 'W' + (i + 1) + ' · ' + pad(i + 1) + '-' + pad(i + 2) + (w?.type ? ' · ' + w.type : ''), value: i });
  }
  return out;
}

export default function SpoolScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const toast = useToast();
  const { data, ndt, updateSpool, deleteSpool, saveSettings } = useStore();
  const sp = data.spools[id];

  const [review, setReview] = useState<Review | null>(null);
  const reviewRef = useRef<Review | null>(null);
  reviewRef.current = review;
  const abortRef = useRef<AbortController | null>(null);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [finUp, setFinUp] = useState(0);
  const [busy, setBusy] = useState<'' | 'csv' | 'zip'>('');

  if (!sp) {
    return (
      <Screen>
        <IconBtn round icon="back" label="Back" onPress={() => router.back()} />
        <Empty title="Spool not found">It may have been deleted.</Empty>
      </Screen>
    );
  }

  const n = sp.items.length;
  const patchReview = (p: Partial<Review>) => setReview((r) => (r ? { ...r, ...p } : r));

  // ---------- capture ----------
  const capture = async (from: 'camera' | 'library') => {
    const picked = await pickPhoto(from);
    if (!picked) return;
    abortRef.current?.abort();
    const rid = uid();
    setReview({ id: rid, status: 'preparing', previewUri: picked.uri, photo: null, heat: '', readHeat: '', alts: [], type: '', size: '', rating: '', material: '', comment: '', conf: 'typed', note: '' });
    try {
      const photo = await storePhoto(picked.uri, 1600, picked.width, picked.height);
      if (reviewRef.current?.id !== rid) return deletePhoto(photo);
      const uri = photoUri(photo);
      patchReview({ photo, previewUri: uri, status: 'reading' });
      const ctl = new AbortController();
      abortRef.current = ctl;
      try {
        const r = await readMark(uri, ctl.signal);
        if (reviewRef.current?.id !== rid) return;
        patchReview({
          status: 'read', heat: r.heat, readHeat: r.heat, alts: r.alternatives, conf: r.heat ? r.confidence : 'low', note: r.note, by: r.by,
          type: r.type || '', size: r.size || '', rating: r.rating || '', material: r.material || '',
        });
      } catch {
        if (reviewRef.current?.id !== rid || ctl.signal.aborted) return;
        patchReview({ status: 'manual', note: 'Could not read the mark. Type it from the photo.' });
      }
    } catch {
      if (reviewRef.current?.id === rid) setReview(null);
      toast('That photo could not be opened. Try another.');
    }
  };

  const typeIn = () => {
    abortRef.current?.abort();
    setReview({ id: uid(), status: 'typed', previewUri: '', photo: null, heat: '', readHeat: '', alts: [], type: '', size: '', rating: '', material: '', comment: '', conf: 'typed', note: '' });
  };

  const cancelReview = () => {
    abortRef.current?.abort();
    if (review?.photo) deletePhoto(review.photo);
    setReview(null);
  };

  const saveReview = () => {
    if (!review) return;
    const heat = review.heat.toUpperCase().trim();
    if (!heat) return toast('Enter the heat number first');
    const it: Item = {
      id: review.id, heat, type: review.type, size: review.size.trim(), rating: review.rating.trim(), material: review.material.trim(), comment: review.comment.trim(),
      conf: review.status === 'read' ? review.conf : 'typed', edited: review.status === 'read' && heat !== review.readHeat, photo: review.photo, at: Date.now(), by: sp.operator || '',
    };
    updateSpool(sp.id, (s) => {
      s.items.push(it);
      if (s.items.length > 1) s.welds.push({ type: '', loc: '', ndt: '' });
    });
    setReview(null);
    toast('Item ' + pad(n + 1) + ' saved');
  };

  const deleteItem = (idx: number) => {
    const it = sp.items[idx];
    updateSpool(sp.id, (s) => {
      const count = s.items.length;
      s.items.splice(idx, 1);
      if (count < 2) return;
      // welds[k] joins items k and k+1. Removing a middle item joins its two welds into one
      // (the earlier weld's details are kept); removing an end item drops the end weld.
      const r = Math.min(idx, count - 2);
      s.welds.splice(r, 1);
      s.dyePen.forEach((d) => {
        if (d.weld == null) return;
        if (d.weld === r) d.weld = null;
        else if (d.weld > r) d.weld -= 1;
      });
    });
    deletePhoto(it?.photo);
    setOpenItem(null);
    setConfirm(null);
    toast('Item removed');
  };

  // ---------- dye pen / finished ----------
  const firstDueDp = () => {
    for (let i = 0; i < sp.welds.length; i++) {
      const nd = ndt.map[sp.id + ':' + i];
      if (nd?.kind === 'dp' && !sp.dyePen.some((d) => d.weld === i)) return i;
    }
    return null;
  };
  const addDye = async (from: 'camera' | 'library', weld?: number) => {
    const picked = await pickPhoto(from);
    if (!picked) return;
    setSheet({ kind: 'dye', previewUri: picked.uri, photo: null, weld: weld !== undefined ? weld : firstDueDp() });
    try {
      const photo = await storePhoto(picked.uri, 2000, picked.width, picked.height);
      setSheet((s) => (s && s.kind === 'dye' ? { ...s, photo } : (deletePhoto(photo), s)));
    } catch {
      setSheet(null);
      toast('That photo could not be saved. Try again.');
    }
  };
  const addFinished = async (from: 'camera' | 'library') => {
    const picked = await pickPhoto(from);
    if (!picked) return;
    setFinUp((x) => x + 1);
    try {
      const photo = await storePhoto(picked.uri, 2000, picked.width, picked.height);
      updateSpool(sp.id, (s) => s.finished.push({ id: uid(), photo, at: Date.now(), by: s.operator || '' }));
      toast('Finished spool photo saved');
    } catch {
      toast('That photo could not be saved. Try again.');
    }
    setFinUp((x) => x - 1);
  };

  const runExport = async (kind: 'csv' | 'zip') => {
    setBusy(kind);
    try {
      if (kind === 'csv') await exportCsv([sp], ndt, safe(sp.name) + '_' + stamp() + '.csv');
      else await exportZip([sp], ndt, safe(sp.name) + '_photos_' + stamp() + '.zip');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed. Try again.');
    }
    setBusy('');
  };

  // ---------- render helpers ----------
  const counts: Record<string, number> = {};
  sp.items.forEach((i) => i.type && (counts[i.type] = (counts[i.type] || 0) + 1));
  sp.welds.forEach((w) => {
    if (w.type) counts[w.type] = (counts[w.type] || 0) + 1;
    if (w.loc) counts[w.loc] = (counts[w.loc] || 0) + 1;
  });

  const rows: React.ReactNode[] = [];
  sp.items.forEach((it, i) => {
    const open = openItem === it.id;
    const confColor = it.conf === 'high' ? t.ok : it.conf === 'medium' ? t.amber : it.conf === 'low' ? t.warn : t.muted;
    rows.push(
      <View key={it.id} style={{ borderBottomWidth: 1, borderColor: t.line }}>
        <Pressable onPress={() => setOpenItem(open ? null : it.id)} accessibilityRole="button" accessibilityLabel={'Item ' + pad(i + 1) + ', heat number ' + it.heat}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, minHeight: 76, opacity: pressed ? 0.7 : 1 })}>
          <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {it.photo ? <Image source={{ uri: photoUri(it.photo) }} style={{ width: 46, height: 46 }} /> : <Text style={{ color: t.muted, fontWeight: font.b }}>{pad(i + 1)}</Text>}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.ink, fontSize: 18, fontWeight: font.xb, letterSpacing: 0.3 }}>{(it.photo ? pad(i + 1) + ' · ' : '') + it.heat}</Text>
            <Text numberOfLines={1} style={{ color: t.muted, fontSize: 14 }}>{descOf(it) || 'Item type not set'}</Text>
            {it.comment ? <Text style={{ color: t.ink, fontSize: 13.5, marginTop: 4 }}>{it.comment}</Text> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <Icon name="clock" size={14} color={t.muted} />
              <Muted style={{ fontSize: 12.5 }}>{fmt(it.at) + (it.by ? ' · ' + it.by : '')}</Muted>
            </View>
          </View>
          <Text style={{ fontSize: 12, fontWeight: font.b, color: confColor, backgroundColor: t.surface2, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, overflow: 'hidden' }}>
            {it.conf === 'typed' ? 'Typed' : it.conf[0].toUpperCase() + it.conf.slice(1)}
          </Text>
        </Pressable>
        {open ? <ItemEditor sp={sp} it={it} idx={i} confirm={confirm === 'item:' + it.id} onAskDelete={() => setConfirm('item:' + it.id)} onDelete={() => deleteItem(i)} /> : null}
      </View>,
    );
    if (i < sp.items.length - 1) {
      const w = sp.welds[i] || { type: '', loc: '', ndt: '' };
      const nd = ndt.map[sp.id + ':' + i];
      const dpCount = sp.dyePen.filter((d) => d.weld === i).length;
      rows.push(
        <View key={'w' + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: nd ? 0 : 1, borderColor: t.line }}>
          <View style={{ width: 34, alignItems: 'center' }}><Icon name="weld" size={24} color={t.accentText} /></View>
          <Text style={{ fontSize: 11.5, fontWeight: font.xb, color: t.accentText, minWidth: 28 }}>{'W' + (i + 1)}</Text>
          <Choice compact warnIfEmpty value={w.type} placeholder="Type?" options={WELD_TYPES} title={'W' + (i + 1) + ' weld type'}
            onChange={(v) => updateSpool(sp.id, (s) => { s.welds[i] = { ...s.welds[i], type: v }; })} />
          <Choice compact warnIfEmpty value={w.loc} placeholder="Shop/Field?" options={WELD_LOCS} title={'W' + (i + 1) + ' shop or field'}
            onChange={(v) => updateSpool(sp.id, (s) => { s.welds[i] = { ...s.welds[i], loc: v }; })} />
        </View>,
      );
      if (nd) {
        rows.push(
          <View key={'n' + i} style={{ paddingLeft: 42, paddingBottom: 12, borderBottomWidth: 1, borderColor: t.line }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: nd.done ? t.okBg : t.amberBg, borderWidth: 1, borderColor: nd.done ? t.okLine : t.amberLine, borderRadius: 12, padding: 12 }}>
              <Icon name="alert" color={nd.done ? t.ok : t.amber} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: nd.done ? t.ok : t.amber, fontWeight: font.b, fontSize: 15 }}>{nd.name + (nd.done ? ' booked' : ' required')}</Text>
                <Muted style={{ fontSize: 12.5 }}>{ord(nd.n) + ' ' + nd.what + ' across all spools · 1 in ' + nd.every}</Muted>
              </View>
              <View style={{ gap: 6 }}>
                {nd.kind === 'dp' ? <SmallBtn title={dpCount ? 'Photo ✓' : 'Add photo'} onPress={() => addDye('camera', i)} /> : null}
                <SmallBtn title={nd.done ? 'Undo' : 'Mark booked'} onPress={() => updateSpool(sp.id, (s) => { s.welds[i].ndt = s.welds[i].ndt === nd.kind ? '' : nd.kind; })} />
              </View>
            </View>
          </View>,
        );
      }
    }
  });

  const dpv = sheet?.kind === 'dpv' ? sp.dyePen.find((d) => d.id === sheet.id) : undefined;
  const finIdx = sheet?.kind === 'fin' ? sp.finished.findIndex((f) => f.id === sheet.id) : -1;
  const fin = finIdx >= 0 ? sp.finished[finIdx] : undefined;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 }}>
        <IconBtn round icon="back" label="Back to spools" onPress={() => router.back()} />
        <IconBtn round icon="share" label="Export this spool" onPress={() => setSheet({ kind: 'export' })} />
      </View>
      <Eyebrow>Active spool</Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1 }}><H1>{sp.name}</H1></View>
        <IconBtn icon="pen" label="Edit spool" onPress={() => setSheet({ kind: 'edit' })} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <Icon name="layers" size={17} color={t.muted} />
        <Muted style={{ fontSize: 15 }}>{n + ' captured' + (sp.location ? ' · ' + sp.location : '')}</Muted>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {Object.entries(counts).map(([k, c]) => <Tag key={k} text={c + ' × ' + k} />)}
      </View>
      <SpoolTags sp={sp} due={ndt.due[sp.id] || 0} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 20 }}>
        <Tile icon="user" />
        <View style={{ flex: 1 }}>
          <Label>Fabricator</Label>
          <FabricatorPicker value={sp.operator} onChange={(v) => { updateSpool(sp.id, (s) => { s.operator = v; }); saveSettings({ lastOperator: v }); }} />
        </View>
      </View>

      {review ? (
        <ReviewCard rv={review} number={pad(n + 1)} dup={!!review.heat.trim() && sp.items.some((x) => x.heat === review.heat.toUpperCase().trim())}
          onChange={patchReview} onSave={saveReview} onCancel={cancelReview} onRetake={() => { cancelReview(); capture('camera'); }} />
      ) : (
        <>
          <Pressable onPress={() => capture('camera')} accessibilityRole="button" accessibilityLabel={'Capture item ' + pad(n + 1)}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 22, backgroundColor: t.accent, borderRadius: 16, padding: 16, minHeight: 96, opacity: pressed ? 0.85 : 1 })}>
            <Tile icon="cam" color={t.accentInk} style={{ backgroundColor: 'rgba(20,17,10,0.12)' }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17.5, fontWeight: font.b, color: t.accentInk }}>{'Capture item ' + pad(n + 1)}</Text>
              <Text style={{ fontSize: 14, color: t.accentInk, opacity: 0.75 }}>Take a photo and read the mark</Text>
            </View>
            <Icon name="arrowUr" color={t.accentInk} />
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <Btn style={{ flex: 1 }} icon="img" title="Choose photo" onPress={() => capture('library')} />
            <Btn style={{ flex: 1 }} icon="type" title="Type it in" onPress={typeIn} />
          </View>
        </>
      )}

      <Pressable onPress={() => router.push({ pathname: '/spool/[id]/drawings', params: { id: sp.id } })} accessibilityRole="button"
        style={({ pressed }) => ({ marginTop: 10, minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, opacity: pressed ? 0.7 : 1 })}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Icon name="draw" color={t.ink} />
          <Text style={{ color: t.ink, fontWeight: font.sb, fontSize: 15 }}>P&amp;ID drawings</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          <Muted>{sp.drawings.length ? sp.drawings.length + ' drawing' + (sp.drawings.length > 1 ? 's' : '') : 'Add'}</Muted>
          <Icon name="chev" color={t.muted} />
        </View>
      </Pressable>

      <Section title="Captured numbers" right={<Muted>In weld order</Muted>}>
        {sp.items.length ? <View>{rows}</View> : <Empty title="Nothing captured yet">Start at one end of the spool and photograph each item in the order it is welded.</Empty>}
      </Section>

      <Section title="Dye pen photos" count={sp.dyePen.length}>
        {sp.dyePen.length ? (
          <PhotoGrid photos={sp.dyePen.map((d) => ({ id: d.id, photo: d.photo, tag: d.weld != null ? 'W' + (d.weld + 1) : 'No weld' }))} onOpen={(pid) => { setConfirm(null); setSheet({ kind: 'dpv', id: pid }); }} />
        ) : (
          <Empty title="No dye pen photos yet">Photograph the developed dye pen test and link it to the weld it was done on.</Empty>
        )}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn style={{ flex: 1 }} icon="cam" title="Take photo" onPress={() => addDye('camera')} />
          <Btn style={{ flex: 1 }} icon="img" title="Choose photo" onPress={() => addDye('library')} />
        </View>
      </Section>

      <Section title="Finished spool" count={sp.finished.length}>
        {sp.finished.length || finUp ? (
          <PhotoGrid photos={sp.finished.map((f) => ({ id: f.id, photo: f.photo }))} uploading={finUp} onOpen={(pid) => { setConfirm(null); setSheet({ kind: 'fin', id: pid }); }} />
        ) : (
          <Empty title="No finished photos yet">Photograph the completed spool before it leaves the shop.</Empty>
        )}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn style={{ flex: 1 }} icon="cam" title="Take photo" onPress={() => addFinished('camera')} />
          <Btn style={{ flex: 1 }} icon="img" title="Choose photo" onPress={() => addFinished('library')} />
        </View>
      </Section>

      <View style={{ marginTop: 28, gap: 10 }}>
        {confirm === 'spool:' + sp.id ? (
          <>
            <Muted>{'This deletes ' + sp.name + ' with all its heat numbers, welds, photos and drawings. It cannot be undone.'}</Muted>
            <Btn kind="danger" icon="trash" title="Yes, delete this spool" onPress={() => { router.back(); deleteSpool(sp.id); }} />
            <Btn title="Keep it" onPress={() => setConfirm(null)} />
          </>
        ) : (
          <Btn icon="trash" title="Delete spool" onPress={() => setConfirm('spool:' + sp.id)} />
        )}
      </View>

      {/* ---------- sheets ---------- */}
      <SpoolSheet
        visible={sheet?.kind === 'edit'}
        onClose={() => setSheet(null)}
        initial={{ name: sp.name, location: sp.location, operator: sp.operator }}
        fabricators={data.settings.fabricators}
        onSave={(f) => {
          if (!f.name.trim()) return toast('Give the spool a name first');
          updateSpool(sp.id, (s) => { s.name = f.name.trim(); s.location = f.location.trim(); s.operator = f.operator.trim(); });
          setSheet(null);
        }}
        onDelete={() => { setSheet(null); router.back(); deleteSpool(sp.id); }}
      />

      <Sheet visible={sheet?.kind === 'export'} onClose={() => setSheet(null)} eyebrow="Export" title={sp.name}>
        <Btn align="left" icon="file" title="Heat numbers and welds as CSV" busy={busy === 'csv'} onPress={() => runExport('csv')} />
        <Btn align="left" icon="zip" title="All photos and drawings (ZIP)" busy={busy === 'zip'} onPress={() => runExport('zip')} />
      </Sheet>

      <Sheet visible={sheet?.kind === 'dye'} onClose={() => { if (sheet?.kind === 'dye') deletePhoto(sheet.photo); setSheet(null); }} eyebrow="Dye pen photo" title="Which weld was tested?">
        {sheet?.kind === 'dye' ? (
          <>
            <Image source={{ uri: sheet.previewUri }} style={{ width: '100%', height: 240, borderRadius: 14, backgroundColor: t.surface2 }} resizeMode="contain" />
            <WeldPicker sp={sp} value={sheet.weld} onChange={(weld) => setSheet({ ...sheet, weld })} />
            <Btn kind="yellow" title={sheet.photo ? 'Save dye pen photo' : 'Saving photo'} disabled={!sheet.photo}
              onPress={() => {
                const s0 = sheet;
                if (!s0.photo) return;
                updateSpool(sp.id, (s) => s.dyePen.push({ id: uid(), photo: s0.photo!, weld: s0.weld, at: Date.now(), by: s.operator || '' }));
                setSheet(null);
                toast('Dye pen photo saved');
              }} />
          </>
        ) : null}
      </Sheet>

      <Sheet visible={!!dpv} onClose={() => setSheet(null)} eyebrow="Dye pen photo" title={dpv?.weld != null ? 'Weld W' + (dpv.weld + 1) : 'Not linked to a weld'}>
        {dpv ? (
          <>
            <Image source={{ uri: photoUri(dpv.photo) }} style={{ width: '100%', height: 340, borderRadius: 14, backgroundColor: t.surface2 }} resizeMode="contain" />
            <Muted>{fmt(dpv.at) + (dpv.by ? ' · ' + dpv.by : '')}</Muted>
            <WeldPicker sp={sp} value={dpv.weld} onChange={(weld) => updateSpool(sp.id, (s) => { const d = s.dyePen.find((x) => x.id === dpv.id); if (d) d.weld = weld; })} />
            {confirm === 'dp:' + dpv.id ? (
              <Btn kind="danger" icon="trash" title="Delete this photo" onPress={() => { updateSpool(sp.id, (s) => { s.dyePen = s.dyePen.filter((x) => x.id !== dpv.id); }); deletePhoto(dpv.photo); setSheet(null); }} />
            ) : (
              <Btn icon="trash" title="Delete photo" onPress={() => setConfirm('dp:' + dpv.id)} />
            )}
          </>
        ) : null}
      </Sheet>

      <Sheet visible={!!fin} onClose={() => setSheet(null)} eyebrow="Finished spool" title={'Photo ' + (finIdx + 1) + ' of ' + sp.finished.length}>
        {fin ? (
          <>
            <Image source={{ uri: photoUri(fin.photo) }} style={{ width: '100%', height: 380, borderRadius: 14, backgroundColor: t.surface2 }} resizeMode="contain" />
            <Muted>{fmt(fin.at) + (fin.by ? ' · ' + fin.by : '')}</Muted>
            {confirm === 'fin:' + fin.id ? (
              <Btn kind="danger" icon="trash" title="Delete this photo" onPress={() => { updateSpool(sp.id, (s) => { s.finished = s.finished.filter((x) => x.id !== fin.id); }); deletePhoto(fin.photo); setSheet(null); }} />
            ) : (
              <Btn icon="trash" title="Delete photo" onPress={() => setConfirm('fin:' + fin.id)} />
            )}
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function SmallBtn({ title, onPress }: { title: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 10, borderRadius: 9, backgroundColor: t.surface2, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
      <Text style={{ color: t.ink, fontSize: 12.5, fontWeight: font.b }}>{title}</Text>
    </Pressable>
  );
}

function WeldPicker({ sp, value, onChange }: { sp: Spool; value: number | null; onChange: (v: number | null) => void }) {
  const opts = weldOptions(sp);
  const cur = opts.find((o) => o.value === value) || opts[0];
  return (
    <View>
      <Label>Weld</Label>
      <Choice value={cur.label} placeholder="Weld" title="Weld" options={opts.map((o) => o.label)} onChange={(label) => onChange(opts.find((o) => o.label === label)?.value ?? null)} />
    </View>
  );
}

function PhotoGrid({ photos, onOpen, uploading = 0 }: { photos: { id: string; photo: string; tag?: string }[]; onOpen: (id: string) => void; uploading?: number }) {
  const t = useTheme();
  const cell = { width: '31.5%' as const, aspectRatio: 1, borderRadius: 12, overflow: 'hidden' as const, backgroundColor: t.surface2 };
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {photos.map((p, i) => (
        <Pressable key={p.id} onPress={() => onOpen(p.id)} style={cell} accessibilityLabel={'Photo ' + (i + 1)}>
          <Image source={{ uri: photoUri(p.photo) }} style={{ width: '100%', height: '100%' }} />
          {p.tag ? <Text style={{ position: 'absolute', left: 6, bottom: 6, fontSize: 12, fontWeight: font.sb, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', backgroundColor: t.bg, color: t.ink }}>{p.tag}</Text> : null}
        </Pressable>
      ))}
      {Array.from({ length: uploading }).map((_, i) => (
        <View key={'u' + i} style={[cell, { alignItems: 'center', justifyContent: 'center' }]}><Spinner label="" /></View>
      ))}
    </View>
  );
}

function ItemEditor({ sp, it, idx, confirm, onAskDelete, onDelete }: { sp: Spool; it: Item; idx: number; confirm: boolean; onAskDelete: () => void; onDelete: () => void }) {
  const t = useTheme();
  const { updateSpool } = useStore();
  const set = (p: Partial<Item>) => updateSpool(sp.id, (s) => {
    const x = s.items[idx];
    if (!x) return;
    Object.assign(x, p);
    if (p.heat != null && x.conf !== 'typed') x.edited = true;
  });
  return (
    <View style={{ paddingBottom: 18, gap: 14 }}>
      {it.photo ? <Image source={{ uri: photoUri(it.photo) }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 14, backgroundColor: t.surface2 }} resizeMode="contain" /> : null}
      <Field label="Heat number" big value={it.heat} autoCapitalize="characters" autoCorrect={false} onChangeText={(heat) => set({ heat: heat.toUpperCase() })} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Label>Item</Label>
          <Choice value={it.type} placeholder="Item type" options={ITEM_TYPES} title="Item type" onChange={(type) => set({ type })} />
        </View>
        <Field label="Size" value={it.size} onChangeText={(size) => set({ size })} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Field label="Class / schedule" value={it.rating} onChangeText={(rating) => set({ rating })} />
        <Field label="Material" value={it.material} onChangeText={(material) => set({ material })} />
      </View>
      <Field label="Comments" multiline value={it.comment} onChangeText={(comment) => set({ comment })} />
      {confirm ? <Btn kind="danger" icon="trash" title={'Remove item ' + pad(idx + 1)} onPress={onDelete} /> : <Btn icon="trash" title="Remove item" onPress={onAskDelete} />}
    </View>
  );
}
