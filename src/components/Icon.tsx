import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Line icons from the web app, drawn with react-native-svg.
const P: Record<string, React.ReactNode> = {
  box: <><Path d="M21 8 12 3 3 8v8l9 5 9-5z" /><Path d="M3 8l9 5 9-5M12 13v8" /></>,
  chev: <Path d="m9 6 6 6-6 6" />,
  plus: <Path d="M12 5v14M5 12h14" />,
  back: <Path d="M19 12H5M11 18l-6-6 6-6" />,
  share: <><Path d="M12 15V3M7 8l5-5 5 5" /><Path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></>,
  layers: <><Path d="m12 3 9 5-9 5-9-5z" /><Path d="m3 13 9 5 9-5" /></>,
  user: <><Circle cx="12" cy="8" r="4" /><Path d="M5 21a7 7 0 0 1 14 0" /></>,
  pen: <><Path d="M4 20h4L19 9l-4-4L4 16z" /><Path d="m13.5 6.5 4 4" /></>,
  cam: <><Path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><Circle cx="12" cy="13" r="3.5" /></>,
  arrowUr: <Path d="M7 17 17 7M8 7h9v9" />,
  clock: <><Circle cx="12" cy="12" r="9" /><Path d="M12 7v5l3 2" /></>,
  x: <Path d="M6 6l12 12M18 6 6 18" />,
  img: <><Rect x="3" y="4" width="18" height="16" rx="2" /><Circle cx="9" cy="10" r="2" /><Path d="m21 16-5-5-9 9" /></>,
  type: <Path d="M5 7V5h14v2M12 5v14M9 19h6" />,
  weld: <><Path d="M12 2v6M12 16v6" /><Path d="M8 12h8" /><Path d="M9 9l6 6M15 9l-6 6" /></>,
  file: <><Path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><Path d="M14 3v5h5M9 13h6M9 17h6" /></>,
  zip: <><Rect x="3" y="4" width="18" height="16" rx="2" /><Path d="M12 4v3M12 9v2M12 13v2" /></>,
  draw: <><Rect x="3" y="4" width="18" height="16" rx="1" /><Path d="M6 9h5v6h7M11 12h3" /><Circle cx="16" cy="9" r="2" /></>,
  hl: <><Path d="m9 15 8-8 3 3-8 8H9z" /><Path d="M4 21h8" /></>,
  hand: <Path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" />,
  undo: <><Path d="M9 14 4 9l5-5" /><Path d="M4 9h11a5 5 0 0 1 0 10h-3" /></>,
  trash: <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  alert: <><Path d="M12 3 2 20h20z" /><Path d="M12 10v4M12 17.5v.01" /></>,
  gear: <><Circle cx="12" cy="12" r="3" /><Path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
  zoomIn: <><Circle cx="11" cy="11" r="7" /><Path d="M21 21l-4.3-4.3M11 8v6M8 11h6" /></>,
  zoomOut: <><Circle cx="11" cy="11" r="7" /><Path d="M21 21l-4.3-4.3M8 11h6" /></>,
};
export type IconName = keyof typeof P;

export function Icon({ name, size = 20, color }: { name: string; size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {P[name]}
    </Svg>
  );
}
