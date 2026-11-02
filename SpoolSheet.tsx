import { useEffect, useState } from 'react';
import { Btn, Field, Sheet } from './ui';

type F = { name: string; location: string; operator: string };

// New spool / edit spool form.
export function SpoolSheet({ visible, onClose, initial, onSave, onDelete }: {
  visible: boolean; onClose: () => void; initial: F; onSave: (f: F) => void; onDelete?: () => void;
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
      <Field label="Job / location" value={f.location} onChangeText={(location) => setF({ ...f, location })} placeholder="e.g. Rack 3, Bay 2" />
      <Field label="Operator name" value={f.operator} onChangeText={(operator) => setF({ ...f, operator })} placeholder="Your name" autoComplete="name" />
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
