import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Icon } from '../../../components/Icon';
import { Screen } from '../../../components/Screen';
import { Btn, Empty, Eyebrow, Field, font, H1, IconBtn, Muted, Section, Sheet, Tag, Tile, useToast } from '../../../components/ui';
import { pickPhoto } from '../../../lib/photos';
import { deletePhoto, photoUri, storePhoto } from '../../../lib/storage';
import { useStore } from '../../../lib/store';
import { useTheme } from '../../../lib/theme';
import { fmt, uid } from '../../../lib/types';

type NewDwg = { previewUri: string; photo: string | null; number: string; title: string };

export default function Drawings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const toast = useToast();
  const { data, updateSpool } = useStore();
  const sp = data.spools[id];
  const [nd, setNd] = useState<NewDwg | null>(null);
  if (!sp) return <Screen><Empty title="Spool not found">It may have been deleted.</Empty></Screen>;

  const ds = [...sp.drawings].sort((a, b) => b.at - a.at);

  const add = async (from: 'camera' | 'library') => {
    const picked = await pickPhoto(from);
    if (!picked) return;
    setNd({ previewUri: picked.uri, photo: null, number: '', title: '' });
    try {
      // Drawings keep more detail so line numbers stay readable when zoomed.
      const photo = await storePhoto(picked.uri, 2400, picked.width, picked.height);
      setNd((x) => (x ? { ...x, photo } : (deletePhoto(photo), x)));
    } catch {
      setNd(null);
      toast('That photo could not be saved. Try again.');
    }
  };

  return (
    <Screen>
      <View style={{ marginBottom: 18 }}>
        <IconBtn round icon="back" label="Back to spool" onPress={() => router.back()} />
      </View>
      <Eyebrow>{sp.name}</Eyebrow>
      <H1>P&amp;ID drawings</H1>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <Icon name="draw" size={17} color={t.muted} />
        <Muted style={{ fontSize: 15 }}>{ds.length + ' drawing' + (ds.length === 1 ? '' : 's') + ' on this spool'}</Muted>
      </View>

      <Pressable onPress={() => add('camera')} accessibilityRole="button"
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 22, backgroundColor: t.accent, borderRadius: 16, padding: 16, minHeight: 96, opacity: pressed ? 0.85 : 1 })}>
        <Tile icon="cam" color={t.accentInk} style={{ backgroundColor: 'rgba(20,17,10,0.12)' }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17.5, fontWeight: font.b, color: t.accentInk }}>Photograph a drawing</Text>
          <Text style={{ fontSize: 14, color: t.accentInk, opacity: 0.75 }}>Lay it flat and fill the frame</Text>
        </View>
        <Icon name="arrowUr" color={t.accentInk} />
      </Pressable>
      <Btn style={{ marginTop: 10 }} icon="img" title="Choose photo" onPress={() => add('library')} />
      <Muted style={{ marginTop: 10, fontSize: 13 }}>Drawings stay with this spool and are included in its photo export.</Muted>

      <Section title="Drawings" right={<Muted>Newest first</Muted>}>
        {ds.length ? (
          <View>
            {ds.map((d) => (
              <Pressable key={d.id} onPress={() => router.push({ pathname: '/spool/[id]/drawing/[dwg]', params: { id: sp.id, dwg: d.id } })} accessibilityRole="button"
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderColor: t.line, opacity: pressed ? 0.7 : 1 })}>
                <Image source={{ uri: photoUri(d.photo) }} style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: t.surface2 }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: t.ink, fontSize: 17, fontWeight: font.b }}>{d.number || 'Drawing'}</Text>
                  <Text numberOfLines={1} style={{ color: t.muted, fontSize: 14 }}>{d.title || 'No title'}</Text>
                  <Muted style={{ fontSize: 12.5, marginTop: 2 }}>{fmt(d.at) + (d.by ? ' · ' + d.by : '')}</Muted>
                  {d.highlights.length ? <View style={{ flexDirection: 'row', marginTop: 6 }}><Tag kind="ex" text={d.highlights.length + ' highlight' + (d.highlights.length > 1 ? 's' : '')} /></View> : null}
                </View>
                <Icon name="chev" color={t.muted} />
              </Pressable>
            ))}
          </View>
        ) : (
          <Empty title="No drawings yet">Photograph the P&amp;ID sheet for this spool, then highlight the line you are working on.</Empty>
        )}
      </Section>

      <Sheet visible={!!nd} onClose={() => { if (nd?.photo) deletePhoto(nd.photo); setNd(null); }} eyebrow="New drawing" title="Which drawing is this?">
        {nd ? (
          <>
            <Image source={{ uri: nd.previewUri }} style={{ width: '100%', height: 220, borderRadius: 14, backgroundColor: t.surface2 }} resizeMode="contain" />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Field label="Drawing number" value={nd.number} onChangeText={(number) => setNd({ ...nd, number })} placeholder="e.g. P&ID-1042" autoCapitalize="characters" />
              <Field label="Title" value={nd.title} onChangeText={(title) => setNd({ ...nd, title })} placeholder="e.g. Cooling water" />
            </View>
            <Btn kind="yellow" title={nd.photo ? 'Save drawing' : 'Saving photo'} disabled={!nd.photo}
              onPress={() => {
                const x = nd;
                if (!x.photo) return;
                const did = uid();
                updateSpool(sp.id, (s) => s.drawings.push({ id: did, number: x.number.trim(), title: x.title.trim(), photo: x.photo!, at: Date.now(), by: s.operator || '', highlights: [] }));
                setNd(null);
                router.push({ pathname: '/spool/[id]/drawing/[dwg]', params: { id: sp.id, dwg: did } });
              }} />
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
