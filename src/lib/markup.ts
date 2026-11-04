import { ImageFormat, PaintStyle, Skia, StrokeCap, StrokeJoin } from '@shopify/react-native-skia';
import type { Highlight } from './types';

// Draws the saved highlights onto a copy of a drawing photo and returns it as JPEG bytes.
// Uses the same look as the screen (55% opacity, line width 2.2% of the image width).
// Returns null when the photo can't be decoded, so callers can fall back to the plain photo.
export function drawHighlights(raw: Uint8Array, highlights: Highlight[]): Uint8Array | null {
  if (!highlights.length) return raw;
  try {
    return render(raw, highlights);
  } catch {
    return null;
  }
}

function render(raw: Uint8Array, highlights: Highlight[]): Uint8Array | null {
  const img = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(raw));
  if (!img) return null;
  const W = img.width();
  const H = img.height();
  const surface = Skia.Surface.Make(W, H);
  if (!surface) return null;
  const canvas = surface.getCanvas();
  canvas.drawImage(img, 0, 0);
  for (const h of highlights) {
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(Math.max(6, W * 0.022));
    paint.setStrokeCap(StrokeCap.Round);
    paint.setStrokeJoin(StrokeJoin.Round);
    paint.setColor(Skia.Color('rgba(' + h.c + ',0.55)'));
    const path = Skia.PathBuilder.Make();
    for (const s of h.strokes) {
      if (!s.length) continue;
      const pts = s.length === 1 ? [s[0], [s[0][0] + 0.0005, s[0][1]] as [number, number]] : s;
      path.moveTo(pts[0][0] * W, pts[0][1] * H);
      for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0] * W, pts[i][1] * H);
    }
    canvas.drawPath(path.detach(), paint);
  }
  surface.flush();
  return surface.makeImageSnapshot().encodeToBytes(ImageFormat.JPEG, 90);
}
