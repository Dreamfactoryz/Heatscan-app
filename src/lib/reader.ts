import TextRecognition from '@react-native-ml-kit/text-recognition';
import { File } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { parseMarking, type Reading } from './parseMarking';
import { ITEM_TYPES } from './types';

// Reads the heat number from a photo.
// With a Claude API key saved in Settings, the photo goes to Claude (better on stamped or painted marks).
// Otherwise, or if Claude can't be reached, the phone's own text reader runs offline.

const KEY_NAME = 'claude_api_key';
const CLAUDE_MODEL = 'claude-sonnet-5-5';

export async function getApiKey() {
  try {
    return (await SecureStore.getItemAsync(KEY_NAME)) || '';
  } catch {
    return '';
  }
}
export async function setApiKey(key: string) {
  if (key) await SecureStore.setItemAsync(KEY_NAME, key.trim());
  else await SecureStore.deleteItemAsync(KEY_NAME);
}

const PROMPT =
  'This photo shows a marking stamped, stencilled or printed on a piping component (flange, pipe, elbow, tee, reducer, nipple, valve, cap, coupling, olet or similar) that is part of a pipe spool. ' +
  'Read the HEAT NUMBER (also called heat code or heat no.; it may be labelled HT, HEAT, H or HN). Also read, if visible: the component type, nominal size, schedule or pressure class, and material spec (for example A105, A106 Gr B, A234 WPB, A182 F316L). ' +
  'Reply with only JSON in this shape: {"heat":"H48572","alternatives":["H4857Z"],"type":"Flange","size":"6\\"","rating":"CL 150","material":"A105","confidence":"high","note":""}. ' +
  'Rules: heat is exactly the characters marked, uppercase, no added spaces. alternatives lists up to 3 other plausible readings where characters are ambiguous (0/O, 1/I, 5/S, 8/B, 2/Z). ' +
  'type is one of ' + ITEM_TYPES.join(', ') + ' or "". confidence is high only when every character is clearly legible, medium if any is uncertain, low if mostly guessed. ' +
  'If no heat number is legible, use heat "" and confidence "low", and say why in note (for example glare, blur, paint).';

async function readWithClaude(uri: string, key: string, signal?: AbortSignal): Promise<Reading> {
  const data = await new File(uri).base64();
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error('claude ' + res.status);
  const body = await res.json();
  const text: string = (body.content || []).filter((c: { type: string }) => c.type === 'text').map((c: { text: string }) => c.text).join('');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no json');
  const j = JSON.parse(m[0]);
  const heat = String(j.heat || '').toUpperCase().trim();
  return {
    heat,
    alternatives: (Array.isArray(j.alternatives) ? j.alternatives : []).map((a: unknown) => String(a).toUpperCase().trim()).filter((a: string) => a && a !== heat).slice(0, 3),
    type: (ITEM_TYPES as readonly string[]).includes(j.type) ? j.type : '',
    size: String(j.size || ''),
    rating: String(j.rating || ''),
    material: String(j.material || ''),
    confidence: heat && ['high', 'medium', 'low'].includes(j.confidence) ? j.confidence : 'low',
    note: String(j.note || ''),
  };
}

async function readOnDevice(uri: string): Promise<Reading> {
  const res = await TextRecognition.recognize(uri);
  return parseMarking(res.text);
}

export async function readMark(uri: string, signal?: AbortSignal): Promise<Reading & { by: 'claude' | 'phone' }> {
  const key = await getApiKey();
  if (key) {
    try {
      return { ...(await readWithClaude(uri, key, signal)), by: 'claude' };
    } catch (e) {
      if (signal?.aborted) throw e;
      // Fall through to the phone's reader (no signal, bad key, busy).
    }
  }
  return { ...(await readOnDevice(uri)), by: 'phone' };
}
