import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { buildCsv, photoName, safe } from './csv';
import type { NdtResult } from './ndt';
import { photoDir } from './storage';
import { pad, type Spool } from './types';

export { safe, stamp } from './csv';

async function share(file: File, mimeType: string, uti: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this phone.');
  await Sharing.shareAsync(file.uri, { mimeType, UTI: uti, dialogTitle: file.name });
}

function exportFile(name: string) {
  const f = new File(Paths.cache, name);
  if (f.exists) f.delete();
  f.create();
  return f;
}

export async function exportCsv(list: Spool[], ndt: NdtResult, name: string) {
  if (!list.some((s) => s.items.length)) throw new Error('Nothing captured yet.');
  const f = exportFile(name);
  await f.write(buildCsv(list, ndt));
  await share(f, 'text/csv', 'public.comma-separated-values-text');
}

export async function exportZip(list: Spool[], ndt: NdtResult, name: string) {
  const jobs: [string, string][] = [];
  for (const sp of list) {
    const s = safe(sp.name);
    sp.items.forEach((it, i) => it.photo && jobs.push([photoName(sp, it, i), it.photo]));
    sp.dyePen.forEach((d, i) => d.photo && jobs.push([s + '/dye-pen/' + (d.weld != null ? 'W' + (d.weld + 1) : 'no-weld') + '_' + pad(i + 1) + '.jpg', d.photo]));
    sp.finished.forEach((f, i) => f.photo && jobs.push([s + '/finished/finished_' + pad(i + 1) + '.jpg', f.photo]));
    sp.drawings.forEach((d, i) => d.photo && jobs.push([s + '/drawings/' + safe((d.number || 'drawing') + '_' + (i + 1)) + '.jpg', d.photo]));
  }
  if (!jobs.length) throw new Error('No photos yet.');
  const zip = new JSZip();
  const dir = photoDir();
  for (const [path, photo] of jobs) {
    const src = new File(dir, photo);
    if (src.exists) zip.file(path, await src.bytes());
  }
  zip.file('heat-numbers.csv', buildCsv(list, ndt));
  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'STORE' });
  const f = exportFile(name);
  await f.write(bytes);
  await share(f, 'application/zip', 'public.zip-archive');
}
