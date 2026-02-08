export function clampPercent(value: number) {
  return Math.min(Math.max(value, 0), 100);
}

export function getPercentFromPointer(clientX: number, element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0) {
    return 0;
  }
  const next = ((clientX - rect.left) / rect.width) * 100;
  return clampPercent(next);
}
