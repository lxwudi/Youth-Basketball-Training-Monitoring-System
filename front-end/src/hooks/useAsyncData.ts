import * as React from 'react';

export function useAsyncData<T>(factory: () => Promise<T>, deps: unknown[] = []) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factory, ...deps]);

  return { data, loading, error } as const;
}
