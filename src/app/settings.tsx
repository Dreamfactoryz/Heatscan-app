import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Btn, Eyebrow, Field, font, H1, IconBtn, Muted, Section, useToast } from '../components/ui';
import { getApiKey, setApiKey } from '../lib/reader';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';

const num = (s: string, min: number) => Math.max(min, parseInt(s, 10) || 0);

export default function Settings() {
  const t = useTheme();
  const toast = useToast();
  const { data, saveSettings } = useStore();
  const st = data.settings;
  const [f, setF] = useState({ xe: String(st.xrayEvery), de: String(st.dpEvery), psb: String(st.priorShopButt), pf: String(st.priorFillet) });
  const [key, setKey] = useState('');
  const [newFab, setNewFab] = useState('');
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    getApiKey().then((k) => setHasKey(!!k));
  }, []);

  const xe = num(f.xe, 1);
  const de = num(f.de, 1);

  return (
    <Screen>
      <View style={{ marginBottom: 18 }}>
        <IconBtn round icon="back" label="Back" onPress={() => router.back()} />
      </View>
      <Eyebrow>Settings</Eyebrow>
      <H1>Heat Scan</H1>

      <Section title="Fabricators" count={st.fabricators.length}>
        <View>
          {st.fabricators.map((name) => (
            <View key={name} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, borderBottomWidth: 1, borderColor: t.line }}>
              <Text style={{ flex: 1, color: t.ink, fontSize: 16, fontWeight: font.sb }}>{name}</Text>
              {st.fabricators.length > 1 ? (
                <IconBtn icon="trash" label={'Remove ' + name} onPress={() => saveSettings({ fabricators: st.fabricators.filter((x) => x !== name) })} />
              ) : null}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Field value={newFab} onChangeText={setNewFab} placeholder="Add a fabricator" autoCapitalize="words" />
          <Btn kind="yellow" title="Add" style={{ paddingHorizontal: 18 }} disabled={!newFab.trim()} onPress={() => {
            const n = newFab.trim().replace(/\s+/g, ' ');
            if (st.fabricators.some((x) => x.toLowerCase() === n.toLowerCase())) return toast(n + ' is already on the list');
            saveSettings({ fabricators: [...st.fabricators, n] });
            setNewFab('');
          }} />
        </View>
        <Muted>These names appear in the Fabricator dropdown on each spool.</Muted>
      </Section>

      <Section title="Inspection sampling">
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Field label="X-ray every Nth" keyboardType="number-pad" value={f.xe} onChangeText={(xe) => setF({ ...f, xe })} />
          <Field label="Dye pen every Nth" keyboardType="number-pad" value={f.de} onChangeText={(de) => setF({ ...f, de })} />
        </View>
        <Muted>
          {'X-ray: 1 in ' + xe + ' shop butt welds (' + Math.round(100 / xe) + '%). Dye pen: 1 in ' + de + ' fillet welds, shop and field (' + Math.round(100 / de) + '%). Counts run across every spool on this phone.'}
        </Muted>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Field label="Shop butt welds before" keyboardType="number-pad" value={f.psb} onChangeText={(psb) => setF({ ...f, psb })} />
          <Field label="Fillet welds before" keyboardType="number-pad" value={f.pf} onChangeText={(pf) => setF({ ...f, pf })} />
        </View>
        <Muted>Welds done before you started using the app (or on another phone), so the count carries on from the right number.</Muted>
        <Btn kind="yellow" title="Save sampling" onPress={() => {
          saveSettings({ xrayEvery: xe, dpEvery: de, priorShopButt: num(f.psb, 0), priorFillet: num(f.pf, 0) });
          toast('Sampling saved');
        }} />
      </Section>

      <Section title="Reading heat numbers">
        <Muted>
          {hasKey
            ? 'Photos are read by Claude when there is signal, and by the phone itself when there is not.'
            : 'Photos are read by the phone itself, offline. Add a Claude API key to read stamped, painted or worn marks more accurately. Each photo read is billed to your Anthropic account (a small amount per photo).'}
        </Muted>
        <Field label={hasKey ? 'Replace Claude API key' : 'Claude API key'} value={key} onChangeText={setKey} placeholder="sk-ant-..." autoCapitalize="none" autoCorrect={false} secureTextEntry />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn kind="yellow" style={{ flex: 1 }} title="Save key" disabled={!key.trim()} onPress={async () => {
            await setApiKey(key.trim());
            setKey('');
            setHasKey(true);
            toast('Key saved on this phone');
          }} />
          {hasKey ? <Btn kind="danger" title="Remove key" onPress={async () => { await setApiKey(''); setHasKey(false); toast('Key removed'); }} /> : null}
        </View>
        <Text style={{ color: t.accentText, fontWeight: font.sb }} onPress={() => Linking.openURL('https://console.anthropic.com/settings/keys')}>Get a key from the Anthropic Console</Text>
      </Section>

      <Section title="Your data">
        <Muted>Spools and photos are stored only on this phone. Export CSV and photo ZIPs from the home screen to back them up or send them to the office. Deleting the app deletes its data.</Muted>
        <Muted style={{ fontSize: 12 }}>{'Version ' + (Constants.expoConfig?.version || '')}</Muted>
      </Section>
    </Screen>
  );
}
