// utils/pool.ts  – 20 lignes pour éviter une dép.
export async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (i: T) => Promise<R>
): Promise<R[]> {
  const ret: R[] = [];
  let idx = 0;

  return new Promise((resolve, reject) => {
    const launch = () => {
      if (idx >= items.length) {
        if (!limit) resolve(ret);
        return;
      }
      const i = idx++;
      limit--;
      fn(items[i])
        .then((r) => {
          ret[i] = r;
        })
        .catch(reject)
        .finally(() => {
          limit++;
          launch();
        });
    };
    for (let n = 0; n < Math.min(limit, items.length); n++) launch();
  });
}
