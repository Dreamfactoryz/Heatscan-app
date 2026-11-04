import { useState } from 'react';
import { View } from 'react-native';
import { fabricatorOptions } from '../lib/fabricators';
import { useStore } from '../lib/store';
import { Btn, Choice, Field } from './ui';

const OTHER = 'Other (type a name)';

// Dropdown from a saved list in Settings, with an "Other" choice for typing a new entry.
// A typed entry is added to the list so it can be picked next time.
export function ListPicker({ value, onChange, listKey, title, placeholder, typePlaceholder }: {
  value: string; onChange: (v: string) => void; listKey: 'fabricators' | 'locations'; title: string; placeholder: string; typePlaceholder: string;
}) {
  const { data, saveSettings } = useStore();
  const list = data.settings[listKey];
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');

  const save = () => {
    const name = draft.trim().replace(/\s+/g, ' ');
    if (!name) return;
    const existing = list.find((x) => x.toLowerCase() === name.toLowerCase());
    if (!existing) saveSettings({ [listKey]: [...list, name] });
    onChange(existing || name);
    setTyping(false);
    setDraft('');
  };

  if (typing) {
    return (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Field value={draft} onChangeText={setDraft} placeholder={typePlaceholder} autoFocus autoCapitalize="words" onSubmitEditing={save} returnKeyType="done" />
        <Btn kind="yellow" title="OK" style={{ paddingHorizontal: 16 }} disabled={!draft.trim()} onPress={save} />
        <Btn title="Cancel" style={{ paddingHorizontal: 12 }} onPress={() => setTyping(false)} />
      </View>
    );
  }
  return (
    <Choice value={value} placeholder={placeholder} warnIfEmpty title={title} options={[...fabricatorOptions(list, value), OTHER]}
      onChange={(v) => (v === OTHER ? setTyping(true) : onChange(v))} />
  );
}

export function FabricatorPicker({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  return <ListPicker value={value} onChange={onChange} listKey="fabricators" title="Fabricator" placeholder="Choose fabricator" typePlaceholder="Fabricator name" />;
}

export function LocationPicker({ value, onChange }: { value: string; onChange: (place: string) => void }) {
  return <ListPicker value={value} onChange={onChange} listKey="locations" title="Location" placeholder="Choose location" typePlaceholder="Location name" />;
}
