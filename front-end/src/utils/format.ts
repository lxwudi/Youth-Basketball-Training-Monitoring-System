export function formatPercent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatMinutes(duration: number): string {
  if (duration < 60) return `${duration}分钟`;
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  return `${hours}小时${minutes}分钟`;
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()} ${date
    .getHours()
    .toString()
    .padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

export function formatTrendLabel(value: string): string {
  return value.replace('周', '周 ');
}
