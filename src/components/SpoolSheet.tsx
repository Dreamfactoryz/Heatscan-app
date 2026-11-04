import { useEffect, useState } from 'react';
import { FabricatorPicker, LocationPicker } from './FabricatorPicker';
import { Btn, Field, Label, Sheet } from './ui';
import { View } from 'react-native';

type F = { name: string; location: string; operator: string };

// New spool / edit spool form.
export function SpoolSheet({ visible, onClose, initial, onSave, onDelete, fabricators }: {
  visible: boolean; onClose: () => void; initial: F; onSave: (f: F) => void; onDelete?: () => void; fabricators: string[];
}) {
  const [f, setF] = useState<F>(initial);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (visible) {
      setF(initial);
      setConfirm(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  const edit = !!onDelete;
  return (
    <Sheet visible={visible} onClose={onClose} eyebrow={edit ? 'Edit spool' : 'New spool'} title={edit ? 'Spool details' : 'What are you working on?'}>
      <Field label="Spool / pipe name" value={f.name} onChangeText={(name) => setF({ ...f, name })} placeholder="e.g. Pipe 1 SP-03" autoFocus={!edit} />
      <View>
        <Label>Location</Label>
        <LocationPicker value={f.location} onChange={(location) => setF({ ...f, location })} />
      </View>
      <View>
        <Label>Fabricator</Label>
        <FabricatorPicker value={f.operator} onChange={(operator) => setF({ ...f, operator })} />
      </View>
      <Btn kind="yellow" title={edit ? 'Save changes' : 'Create spool'} onPress={() => onSave(f)} />
      {onDelete ? (
        confirm ? (
          <Btn kind="danger" icon="trash" title="Delete spool, photos and drawings" onPress={onDelete} />
        ) : (
          <Btn icon="trash" title="Delete spool" onPress={() => setConfirm(true)} />
        )
      ) : null}
    </Sheet>
  );
}
