import { useEffect, useState } from "react";

/** Load one API resource on mount. */
export function useApi<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    load()
      .then((value) => active && setData(value))
      .catch((reason: unknown) =>
        active && setError(reason instanceof Error ? reason.message : String(reason)),
      );
    return () => {
      active = false;
    };
  }, [load]);

  return { data, error };
}
