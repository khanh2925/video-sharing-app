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
  useEffect(() => { fetcherRef.current = fetcher; });

  // Mỗi lần gọi có 1 số thứ tự; kết quả về muộn của lần gọi cũ (deps đã đổi) thì bỏ qua
  const requestIdRef = useRef(0);

  const reload = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (requestId === requestIdRef.current) setData(result);
    } catch (e) {
      if (requestId === requestIdRef.current) setError(getErrorMessage(e));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Đồng bộ trạng thái chờ với yêu cầu REST mới.
    reload();
    return () => { requestIdRef.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, setData, loading, error, reload };
}
