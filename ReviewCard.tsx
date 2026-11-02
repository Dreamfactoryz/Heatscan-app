import { Image, Pressable, Text, View } from 'react-native';
import { useTheme } from '../lib/theme';
import { ITEM_TYPES } from '../lib/types';
import { Btn, Choice, Eyebrow, Field, font, IconBtn, Muted, Spinner } from './ui';

export type Review = {
  id: string;
  status: 'preparing' | 'reading' | 'read' | 'manual' | 'typed';
  previewUri: string;
  photo: string | null;
  heat: string;
  readHeat: string;
  alts: string[];
  type: string;
  size: string;
  rating: string;
  material: string;
  comment: string;
  conf: 'high' | 'medium' | 'low' | 'typed';
  note: string;
  by?: 'claude' | 'phone';
};

const confLabel = { high: 'High', medium: 'Medium', low: 'Low', typed: 'Typed' };

export function ReviewCard({ rv, number, dup, onChange, onSave, onCancel, onRetake }: {
  rv: Review; number: string; dup: boolean; onChange: (p: Partial<Review>) => void; onSave: () => void; onCancel: () => void; onRetake: () => void;
}) {
  const t = useTheme();
  const confColor = rv.conf === 'high' ? t.ok : rv.conf === 'medium' ? t.amber : t.warn;
  const busy = rv.status === 'reading' || rv.status === 'preparing';
  return (
    <View style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 16, padding: 18, gap: 16, marginTop: 22 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Eyebrow>{'Item ' + number}</Eyebrow>
          <Text style={{ fontSize: 19, fontWeight: font.b, color: t.ink, marginTop: 4 }}>{rv.status === 'typed' ? 'Type the heat number' : 'Check the heat number'}</Text>
        </View>
        <IconBtn icon="x" label="Discard" onPress={onCancel} />
      </View>

      {rv.status !== 'typed' ? (
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
          <View style={{ width: 96, height: 96, borderRadius: 12, backgroundColor: t.surface2, overflow: 'hidden' }}>
            {rv.previewUri ? <Image source={{ uri: rv.previewUri }} style={{ width: 96, height: 96 }} accessibilityLabel={'Photo of item ' + number} /> : null}
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            {rv.status === 'preparing' ? <Spinner label="Preparing photo" /> : null}
            {rv.status === 'reading' ? <Spinner label="Reading the mark" /> : null}
            {rv.status === 'read' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 12, fontWeight: font.b, color: confColor, backgroundColor: t.surface2, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, overflow: 'hidden' }}>
                  {confLabel[rv.conf] + ' confidence'}
                </Text>
                {rv.conf !== 'high' ? <Muted>Check every character</Muted> : null}
              </View>
            ) : null}
            {rv.status === 'read' && rv.by ? <Muted style={{ fontSize: 12 }}>{rv.by === 'claude' ? 'Read by Claude' : 'Read by the phone'}</Muted> : null}
            {(rv.status === 'read' || rv.status === 'manual') && rv.note ? <Muted style={{ fontSize: 13 }}>{rv.note}</Muted> : null}
          </View>
        </View>
      ) : null}

      <Field label="Heat number" big value={rv.heat} editable={!busy} autoCapitalize="characters" autoCorrect={false} spellCheck={false}
        placeholder="e.g. H48572" onChangeText={(heat) => onChange({ heat: heat.toUpperCase() })} autoFocus={rv.status === 'typed'} />

      {rv.alts.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <Muted>Could also be</Muted>
          {rv.alts.map((a) => (
            <Pressable key={a} onPress={() => onChange({ heat: a })} style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 8, backgroundColor: t.surface2, justifyContent: 'center' }}>
              <Text style={{ color: t.ink, fontWeight: font.b, letterSpacing: 0.5 }}>{a}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {dup ? (
        <Text style={{ backgroundColor: t.warnBg, color: t.warn, borderRadius: 12, overflow: 'hidden', padding: 12, fontWeight: font.m }}>
          {rv.heat.trim() + ' is already on this spool. Check it is a different item.'}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: font.b, letterSpacing: 1.6, color: t.muted, marginBottom: 6 }}>ITEM</Text>
          <Choice value={rv.type} placeholder="Item type" options={ITEM_TYPES} title="Item type" onChange={(type) => onChange({ type })} />
        </View>
        <Field label="Size" value={rv.size} onChangeText={(size) => onChange({ size })} placeholder={'e.g. 6"'} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Field label="Class / schedule" value={rv.rating} onChangeText={(rating) => onChange({ rating })} placeholder="e.g. SCH 40" />
        <Field label="Material" value={rv.material} onChangeText={(material) => onChange({ material })} placeholder="e.g. A106 Gr B" />
      </View>
      <Field label="Comments" multiline value={rv.comment} onChangeText={(comment) => onChange({ comment })} placeholder="e.g. Heat number partly painted over, checked against mill cert" />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Btn kind="yellow" style={{ flex: 1 }} title={'Save item ' + number} disabled={busy} onPress={onSave} />
        {rv.status !== 'typed' ? <Btn icon="cam" title="Retake" onPress={onRetake} /> : null}
      </View>
    </View>
  );
}
