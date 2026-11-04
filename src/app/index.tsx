import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { SpoolSheet } from '../components/SpoolSheet';
import { SpoolTags } from '../components/SpoolTags';
import { Btn, Empty, Eyebrow, font, H1, IconBtn, Section, Spinner, Tile, useToast } from '../components/ui';
import { exportCsv, exportZip, stamp } from '../lib/export';
import { sortedSpools } from '../lib/ndt';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';

export default function Home() {
  const t = useTheme();
  const toast = useToast();
  const { loaded, data, ndt, createSpool, saveError } = useStore();
  const [newOpen, setNewOpen] = useState(false);
  const [busy, setBusy] = useState<'' | 'csv' | 'zip'>('');
  const list = sortedSpools(data.spools).reverse();

  const run = async (kind: 'csv' | 'zip') => {
    setBusy(kind);
    try {
      const all = sortedSpools(data.spools);
      if (kind === 'csv') await exportCsv(all, ndt, 'heat-numbers_' + stamp() + '.csv');
      else await exportZip(all, ndt, 'heat-scan-photos_' + stamp() + '.zip');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed. Try again.');
    }
    setBusy('');
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Eyebrow>Field capture</Eyebrow>
          <H1>Heat Scan</H1>
        </View>
        <IconBtn round icon="gear" label="Settings" onPress={() => router.push('/settings')} />
      </View>
      {saveError ? <Text style={{ color: t.warn, marginTop: 12 }}>{saveError}</Text> : null}

      <Section title="Your spools" count={list.length}>
        {!loaded ? (
          <Spinner label="Loading your spools" />
        ) : list.length ? (
          <View>
            {list.map((sp) => {
              const n = sp.items.length;
              return (
                <Pressable key={sp.id} onPress={() => router.push({ pathname: '/spool/[id]', params: { id: sp.id } })} accessibilityRole="button"
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, minHeight: 76, borderBottomWidth: 1, borderColor: t.line, opacity: pressed ? 0.7 : 1 })}>
                  <Tile icon="box" teal />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: t.ink, fontSize: 17, fontWeight: font.b }}>{sp.name}</Text>
                    <Text numberOfLines={1} style={{ color: t.muted, fontSize: 14 }}>
                      {(n ? n + ' heat number' + (n > 1 ? 's' : '') + ' captured' : 'Ready for first capture') + (sp.location ? ' · ' + sp.location : '')}
                    </Text>
                    <SpoolTags sp={sp} due={ndt.due[sp.id] || 0} />
                  </View>
                  <Icon name="chev" color={t.muted} />
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Empty title="No spools yet">Start one, then photograph each flange, pipe and fitting in weld order.</Empty>
        )}
        <Btn kind="yellow" icon="plus" title="New spool" onPress={() => setNewOpen(true)} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn style={{ flex: 1 }} icon="file" title="All as CSV" busy={busy === 'csv'} onPress={() => run('csv')} />
          <Btn style={{ flex: 1 }} icon="zip" title="All photos" busy={busy === 'zip'} onPress={() => run('zip')} />
        </View>
      </Section>

      <SpoolSheet
        visible={newOpen}
        onClose={() => setNewOpen(false)}
        initial={{ name: '', location: data.settings.locations.includes(data.settings.lastLocation) ? data.settings.lastLocation : data.settings.locations[0] || '', operator: data.settings.fabricators.includes(data.settings.lastOperator) ? data.settings.lastOperator : data.settings.fabricators[0] || '' }}
        fabricators={data.settings.fabricators}
        onSave={(f) => {
          if (!f.name.trim()) {
            toast('Give the spool a name first');
            return;
          }
          const id = createSpool({ name: f.name.trim(), location: f.location.trim(), operator: f.operator.trim() });
          setNewOpen(false);
          router.push({ pathname: '/spool/[id]', params: { id } });
        }}
      />
    </Screen>
  );
}
