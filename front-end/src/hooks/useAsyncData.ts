import * as React from 'react';

export function useAsyncData<T>(factory: () => Promise<T>, deps: React.DependencyList = []) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    factory()
      .then((result) => {
        if (!mounted) return;
        setData(result);
        setError(null);
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setError(err);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, deps);

  return { data, loading, error } as const;
}
