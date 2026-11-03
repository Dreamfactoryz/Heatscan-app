import { useState } from 'react';
import { View } from 'react-native';
import { fabricatorOptions } from '../lib/fabricators';
import { useStore } from '../lib/store';
import { Btn, Choice, Field } from './ui';

const OTHER = 'Other (type a name)';

// Fabricator dropdown with an "Other" choice for typing a name that isn't on the list.
// A typed name is added to the list so it can be picked next time.
export function FabricatorPicker({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const { data, saveSettings } = useStore();
  const list = data.settings.fabricators;
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');

  const save = () => {
    const name = draft.trim().replace(/\s+/g, ' ');
    if (!name) return;
    const existing = list.find((x) => x.toLowerCase() === name.toLowerCase());
    if (!existing) saveSettings({ fabricators: [...list, name] });
    onChange(existing || name);
    setTyping(false);
    setDraft('');
  };

  if (typing) {
    return (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Field value={draft} onChangeText={setDraft} placeholder="Fabricator name" autoFocus autoCapitalize="words" onSubmitEditing={save} returnKeyType="done" />
        <Btn kind="yellow" title="OK" style={{ paddingHorizontal: 16 }} disabled={!draft.trim()} onPress={save} />
        <Btn title="Cancel" style={{ paddingHorizontal: 12 }} onPress={() => setTyping(false)} />
      </View>
    );
  }
  return (
    <Choice value={value} placeholder="Choose fabricator" warnIfEmpty title="Fabricator" options={[...fabricatorOptions(list, value), OTHER]}
      onChange={(v) => (v === OTHER ? setTyping(true) : onChange(v))} />
  );
}
