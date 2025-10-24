import { useEffect, useRef, useState } from 'react';

/** 首次会话或浏览器刷新才播放折线“从头连到尾”的入场动画 */
export function useMountLineAnimation(duration = 1800) {
  const [animate, setAnimate] = useState(false);
  const once = useRef(false);
  useEffect(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const isReload = nav?.type === 'reload';
    if (!once.current && (isReload || !sessionStorage.getItem('chartFirstMount'))) {
      once.current = true;
      setAnimate(true);
      sessionStorage.setItem('chartFirstMount', '1');
      const t = setTimeout(() => setAnimate(false), duration + 50);
      return () => clearTimeout(t);
    }
  }, [duration]);
  return animate;
}

/** 把 path 做 strokeDashoffset 动画（首刷才执行） */
export function animateLinePath(animate: boolean, duration = 1800) {
  return (el: SVGPathElement | null) => {
    if (!el) return;
    if (!animate) {
      el.style.strokeDasharray = '';
      el.style.strokeDashoffset = '';
      el.style.transition = '';
      return;
    }
    const len = el.getTotalLength();
    el.style.strokeDasharray = `${len}px`;
    el.style.strokeDashoffset = `${len}px`;
    // 强制 reflow
    el.getBoundingClientRect();
    el.style.transition = `stroke-dashoffset ${duration}ms linear`;
    el.style.strokeDashoffset = '0px';
  };
}

/** 统一百分号：传入可能是“23”或“23%”，只返回 number（23），渲染时只加一次% */
export function toPercentNumber(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    const s = v.trim().replace(/%+$/, '');
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return null;
}

/** 判断数据状态 & 可选 mock（仅在开启时使用） */
export function getBarState<T extends Record<string, any>>(
  data: T[] | undefined,
  key: string,
  enableMock = false,
) {
  const hasAny = !!data && data.some((d) => toPercentNumber(d[key]) != null);
  if (hasAny || !enableMock) return { hasAnyData: hasAny, data: data ?? [] };

  // 生成轻量 mock：5~8 根，均值 40±15%，带平滑起伏
  const len = 6 + Math.floor(Math.random() * 3);
  const base = 40 + (Math.random() * 30 - 15);
  const mock = Array.from({ length: len }, (_, i) => ({
    name: `Mock ${i + 1}`,
    [key]: Math.max(4, Math.min(96, Math.round(base + Math.sin(i / 1.8) * 12 + (Math.random() * 10 - 5)))),
    __mock: true,
  }));
  return { hasAnyData: false, data: mock };
}
