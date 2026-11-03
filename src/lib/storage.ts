import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { DEFAULT_FABRICATORS, DEFAULT_SETTINGS, type AppData, uid } from './types';

// Everything lives in the app's private documents folder:
//   heatscan.json   all spools and settings
//   photos/<id>.jpg every photo (items, drawings, dye pen, finished)

const dataFile = () => new File(Paths.document, 'heatscan.json');
export const photoDir = () => new Directory(Paths.document, 'photos');

export function emptyData(): AppData {
  return { version: 1, spools: {}, settings: { ...DEFAULT_SETTINGS } };
}

export async function loadData(): Promise<AppData> {
  const f = dataFile();
  if (!f.exists) return emptyData();
  try {
    const d = JSON.parse(await f.text());
    const settings = { ...DEFAULT_SETTINGS, ...(d.settings || {}) };
    if (!Array.isArray(settings.fabricators) || !settings.fabricators.length) settings.fabricators = [...DEFAULT_FABRICATORS];
    return { version: 1, spools: d.spools || {}, settings };
  } catch {
    // Keep the unreadable file so nothing is lost, and start clean.
    try {
      f.copySync(new File(Paths.document, 'heatscan-unreadable-' + Date.now() + '.json'));
    } catch {}
    return emptyData();
  }
}

// Writes go one at a time, and to a temp file first, so a crash never leaves half a file.
let chain: Promise<void> = Promise.resolve();
export function saveData(data: AppData): Promise<void> {
  const body = JSON.stringify(data);
  chain = chain
    .catch(() => {})
    .then(async () => {
      const tmp = new File(Paths.document, 'heatscan.tmp.json');
      if (tmp.exists) tmp.delete();
      tmp.create();
      await tmp.write(body);
      tmp.move(dataFile(), { overwrite: true });
    });
  return chain;
}

export function photoUri(name: string | null | undefined) {
  if (!name) return '';
  return new File(photoDir(), name).uri;
}

// Shrinks a picked photo and copies it into the app's photo folder. Returns the file name.
export async function storePhoto(sourceUri: string, maxSide: number, width?: number, height?: number): Promise<string> {
  const dir = photoDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const ctx = ImageManipulator.manipulate(sourceUri);
  if (width && height && Math.max(width, height) > maxSide) {
    ctx.resize(width >= height ? { width: maxSide } : { height: maxSide });
  }
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
  const name = uid() + '.jpg';
  const src = new File(out.uri);
  src.move(new File(dir, name), { overwrite: true });
  return name;
}

export function deletePhoto(name: string | null | undefined) {
  if (!name) return;
  try {
    const f = new File(photoDir(), name);
    if (f.exists) f.delete();
  } catch {}
}
