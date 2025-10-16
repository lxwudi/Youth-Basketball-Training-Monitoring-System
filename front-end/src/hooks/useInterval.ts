import * as React from 'react';

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = React.useRef(callback);

  React.useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  React.useEffect(() => {
    if (delay === null) return;
    const tick = () => savedCallback.current();
    const id = window.setInterval(tick, delay);
    return () => window.clearInterval(id);
  }, [delay]);
}
