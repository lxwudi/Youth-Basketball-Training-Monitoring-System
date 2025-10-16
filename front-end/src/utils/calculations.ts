export type Point = { x: number; y: number };

export function angle(a: Point, b: Point, c: Point): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magnitudeAb = Math.sqrt(ab.x ** 2 + ab.y ** 2);
  const magnitudeCb = Math.sqrt(cb.x ** 2 + cb.y ** 2);
  const cosTheta = dot / (magnitudeAb * magnitudeCb + Number.EPSILON);
  const clamped = Math.min(Math.max(cosTheta, -1), 1);
  return +(Math.acos(clamped) * (180 / Math.PI)).toFixed(2);
}

export function movingAverage(values: number[], window = 3): number[] {
  if (values.length <= window) return values;
  return values.map((_, index) => {
    const start = Math.max(0, index - window + 1);
    const slice = values.slice(start, index + 1);
    const sum = slice.reduce((acc, item) => acc + item, 0);
    return +(sum / slice.length).toFixed(2);
  });
}
