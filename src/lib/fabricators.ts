// Dropdown options: the saved list, plus the current name if it was typed in before the list existed.
export function fabricatorOptions(list: string[], current?: string) {
  const out = [...list];
  if (current && !out.includes(current)) out.push(current);
  return out;
}
