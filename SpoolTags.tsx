import { View } from 'react-native';
import type { Spool } from '../lib/types';
import { Tag } from './ui';

export function SpoolTags({ sp, due }: { sp: Spool; due: number }) {
  const unset = sp.welds.filter((w) => !w.type || !w.loc).length;
  const tags: React.ReactNode[] = [];
  if (sp.finished.length) tags.push(<Tag key="f" kind="ex" text="Finished photo" />);
  if (due) tags.push(<Tag key="d" kind="ndt" text={due + ' test' + (due > 1 ? 's' : '') + ' due'} />);
  if (unset) tags.push(<Tag key="u" kind="warn" text={unset + ' weld' + (unset > 1 ? 's' : '') + ' not set'} />);
  return tags.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>{tags}</View> : null;
}
