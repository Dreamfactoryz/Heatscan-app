import { router, useLocalSearchParams, useNavigation, usePreventRemove } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, PanResponder, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { Icon } from '../../../../components/Icon';
import { Screen } from '../../../../components/Screen';
import { Btn, Empty, Eyebrow, Field, font, H1, IconBtn, Muted, Section, useToast } from '../../../../components/ui';
import { exportDrawing } from '../../../../lib/export';
import { deletePhoto, photoUri } from '../../../../lib/storage';
import { useStore } from '../../../../lib/store';
import { HIGHLIGHT_COLORS, useTheme } from '../../../../lib/theme';
import { fmt, uid, type Stroke } from '../../../../lib/types';

// Finger highlighting on a P&ID photo. Strokes are stored as 0..1 fractions of the image size,
// so they line up at any zoom and on any screen. Highlights are an overlay; the photo is untouched.

export default function DrawingScreen() {
  const { id, dwg } = useLocalSearchParams<{ id: string; dwg: string }>();
  const t = useTheme();
  const nav = useNavigation();
  const { width: winW, height: winH } = useWindowDimensions();
  const { data, updateSpool } = useStore();
  const sp = data.spools[id];
  const d = sp?.drawings.find((x) => x.id === dwg);

  const [aspect, setAspect] = useState(1.4); // height / width
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState<'draw' | 'move'>('draw');
  const [color, setColor] = useState(HIGHLIGHT_COLORS[0][0]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [cur, setCur] = useState<Stroke | null>(null);
  const [label, setLabel] = useState('');
  const [touching, setTouching] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [sharing, setSharing] = useState(false);
  const toast = useToast();

  const uri = d ? photoUri(d.photo) : '';
  useEffect(() => {
    if (uri) Image.getSize(uri, (w, h) => w && setAspect(h / w), () => {});
  }, [uri]);

  // Ask before leaving with unsaved strokes.
  const [leaving, setLeaving] = useState(false);
  usePreventRemove(strokes.length > 0 && !leaving, ({ data: ev }) => {
    Alert.alert('Discard unsaved highlight?', 'You have strokes that are not saved yet.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => nav.dispatch(ev.action) },
    ]);
  });

  const boxW = Math.min(winW, 600) - 32;
  const W = boxW * zoom;
  const H = W * aspect;
  const lineW = Math.max(6, W * 0.022);

  const stateRef = useRef({ mode, color, W, H });
  stateRef.current = { mode, color, W, H };
  const curRef = useRef<Stroke | null>(null);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => stateRef.current.mode === 'draw',
        onMoveShouldSetPanResponder: () => stateRef.current.mode === 'draw',
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const { W: w, H: h, color: c } = stateRef.current;
          const p: [number, number] = [+(e.nativeEvent.locationX / w).toFixed(4), +(e.nativeEvent.locationY / h).toFixed(4)];
          curRef.current = { c, p: [p] };
          setCur(curRef.current);
          setTouching(true);
        },
        onPanResponderMove: (e) => {
          const s = curRef.current;
          if (!s) return;
          const { W: w, H: h } = stateRef.current;
          const q: [number, number] = [+(e.nativeEvent.locationX / w).toFixed(4), +(e.nativeEvent.locationY / h).toFixed(4)];
          const l = s.p[s.p.length - 1];
          if (Math.abs(q[0] - l[0]) + Math.abs(q[1] - l[1]) < 0.002) return;
          curRef.current = { ...s, p: [...s.p, q] };
          setCur(curRef.current);
        },
        onPanResponderRelease: () => finish(),
        onPanResponderTerminate: () => finish(),
      }),
    [],
  );
  function finish() {
    const s = curRef.current;
    curRef.current = null;
    setCur(null);
    setTouching(false);
    if (s) setStrokes((x) => [...x, s]);
  }

  if (!sp || !d) return <Screen><Empty title="Drawing not found">It may have been deleted.</Empty></Screen>;

  const pts = (p: [number, number][]) => (p.length === 1 ? [p[0], [p[0][0] + 0.0005, p[0][1]]] : p).map((q) => q[0] * W + ',' + q[1] * H).join(' ');

  const save = () => {
    if (!strokes.length) return;
    const byColor: Record<string, [number, number][][]> = {};
    strokes.forEach((s) => (byColor[s.c] = byColor[s.c] || []).push(s.p));
    updateSpool(sp.id, (s) => {
      const dd = s.drawings.find((x) => x.id === d.id);
      if (!dd) return;
      Object.keys(byColor).forEach((c) => dd.highlights.push({ id: uid(), c, strokes: byColor[c], label: label.trim(), at: Date.now(), by: s.operator || '' }));
    });
    setStrokes([]);
    setLabel('');
  };

  const Tool = ({ on, icon, title, onPress, disabled }: { on?: boolean; icon: string; title?: string; onPress: () => void; disabled?: boolean }) => (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={title || icon}
      style={{ minHeight: 46, minWidth: 46, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: on ? t.accent : t.line, backgroundColor: on ? t.accent : t.surface,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: disabled ? 0.45 : 1 }}>
      <Icon name={icon} color={on ? t.accentInk : t.ink} />
      {title ? <Text style={{ color: on ? t.accentInk : t.ink, fontWeight: font.sb, fontSize: 14 }}>{title}</Text> : null}
    </Pressable>
  );

  return (
    <Screen scrollEnabled={!touching}>
      <View style={{ marginBottom: 18, flexDirection: 'row', justifyContent: 'space-between' }}>
        <IconBtn round icon="back" label="Back to drawings" onPress={() => router.back()} />
        <IconBtn round icon="share" label="Share drawing with highlights" disabled={sharing} onPress={async () => {
          if (strokes.length) return toast('Save the highlight first');
          setSharing(true);
          try { await exportDrawing(sp, d); } catch (e) { toast(e instanceof Error ? e.message : 'Could not share'); } finally { setSharing(false); }
        }} />
      </View>
      <Eyebrow>{[d.number || 'Drawing', d.title].filter(Boolean).join(' · ')}</Eyebrow>
      <H1 small>Highlight a line</H1>
      <Muted style={{ marginTop: 6 }}>{mode === 'draw' ? 'Drag a finger along the pipe. Switch to Move to scroll a zoomed drawing.' : 'Scroll to the part you need, then switch back to Highlight.'}</Muted>

      <View style={{ marginTop: 14, borderRadius: 14, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface2, overflow: 'hidden', height: Math.min(H, winH * 0.62) }}>
        <ScrollView nestedScrollEnabled scrollEnabled={mode === 'move'} bounces={false}>
          <ScrollView horizontal nestedScrollEnabled scrollEnabled={mode === 'move'} bounces={false}>
            <View style={{ width: W, height: H }}>
              <Image source={{ uri }} style={{ width: W, height: H }} accessibilityLabel="P&ID drawing" />
              <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
                {d.highlights.flatMap((h) => h.strokes.map((p, i) => (
                  <Polyline key={h.id + i} points={pts(p)} fill="none" stroke={'rgb(' + h.c + ')'} strokeOpacity={0.55} strokeWidth={lineW} strokeLinecap="round" strokeLinejoin="round" />
                )))}
                {[...strokes, ...(cur ? [cur] : [])].map((s, i) => (
                  <Polyline key={'n' + i} points={pts(s.p)} fill="none" stroke={'rgb(' + s.c + ')'} strokeOpacity={0.7} strokeWidth={lineW} strokeLinecap="round" strokeLinejoin="round" />
                ))}
              </Svg>
              {mode === 'draw' ? <View style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} {...pan.panHandlers} /> : null}
            </View>
          </ScrollView>
        </ScrollView>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <Tool on={mode === 'draw'} icon="hl" title="Highlight" onPress={() => setMode('draw')} />
        <Tool on={mode === 'move'} icon="hand" title="Move" onPress={() => setMode('move')} />
        <View style={{ flex: 1 }} />
        <Tool icon="zoomOut" onPress={() => setZoom((z) => Math.max(1, z - 1))} disabled={zoom <= 1} />
        <Tool icon="zoomIn" onPress={() => { setZoom((z) => Math.min(4, z + 1)); setMode('move'); }} disabled={zoom >= 4} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
        {HIGHLIGHT_COLORS.map(([c, name]) => (
          <Pressable key={c} onPress={() => setColor(c)} accessibilityLabel={name}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgb(' + c + ')', borderWidth: 3, borderColor: c === color ? t.ink : 'transparent' }} />
        ))}
        <View style={{ flex: 1 }} />
        <Tool icon="undo" onPress={() => setStrokes((x) => x.slice(0, -1))} disabled={!strokes.length} />
        <Tool icon="trash" onPress={() => setStrokes([])} disabled={!strokes.length} />
      </View>

      <View style={{ marginTop: 12 }}>
        <Field label="Label" value={label} onChangeText={setLabel} placeholder={'e.g. 6"-CW-1042 run for ' + sp.name} />
      </View>
      <Btn kind="yellow" style={{ marginTop: 12 }} title="Save highlight" disabled={!strokes.length} onPress={save} />

      <Section title="Saved highlights" count={d.highlights.length}>
        {d.highlights.length ? (
          <View>
            {d.highlights.map((h) => (
              <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: t.line }}>
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgb(' + h.c + ')' }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.ink, fontWeight: font.b }}>{h.label || 'Highlight'}</Text>
                  <Muted style={{ fontSize: 12.5 }}>{fmt(h.at) + (h.by ? ' · ' + h.by : '')}</Muted>
                </View>
                <IconBtn icon="trash" label="Delete highlight" onPress={() => updateSpool(sp.id, (s) => {
                  const dd = s.drawings.find((x) => x.id === d.id);
                  if (dd) dd.highlights = dd.highlights.filter((x) => x.id !== h.id);
                })} />
              </View>
            ))}
          </View>
        ) : (
          <Empty>Saved highlights show on the drawing whenever it is opened.</Empty>
        )}
        {confirmDel ? (
          <Btn kind="danger" icon="trash" title="Delete this drawing and its highlights" onPress={() => {
            setLeaving(true);
            updateSpool(sp.id, (s) => { s.drawings = s.drawings.filter((x) => x.id !== d.id); });
            deletePhoto(d.photo);
            setTimeout(() => router.back(), 0);
          }} />
        ) : (
          <Btn icon="trash" title="Delete drawing" onPress={() => setConfirmDel(true)} />
        )}
      </Section>
    </Screen>
  );
}
