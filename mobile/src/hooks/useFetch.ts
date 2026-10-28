/**
 * Gọi 1 API không phân trang và giữ trạng thái loading / error (giống Buổi 7).
 *
 *   const { data, loading, error, reload } = useFetch(() => catalogApi.topics(), []);
 *
 * Tham số thứ 2 giống mảng deps của useEffect: giá trị trong đó đổi thì tự gọi lại.
 */
import { DependencyList, useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../api/client';

export function useFetch<T>(fetcher: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Luôn dùng hàm fetcher mới nhất mà không cần đưa nó vào deps
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetcherRef.current());
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, setData, loading, error, reload };
}
