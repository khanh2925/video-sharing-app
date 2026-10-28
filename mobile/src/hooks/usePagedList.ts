/**
 * Danh sách có phân trang: tải trang đầu, kéo xuống làm mới, cuộn tới cuối tải thêm
 * (giống useBooks ở Buổi 7). Dùng chung cho feed, nháp, follower, video của tôi...
 *
 *   const list = usePagedList((page, size) => videoApi.myDrafts(page, size), []);
 *   <FlatList
 *     data={list.items}
 *     refreshing={list.refreshing}
 *     onRefresh={list.refresh}
 *     onEndReached={list.loadMore}
 *     onEndReachedThreshold={0.5}
 *     ListFooterComponent={list.loadingMore ? <ActivityIndicator /> : null}
 *   />
 * Lỗi lần đầu: list.error → hiện <ErrorView message={list.error} onRetry={list.reload} />
 * Xoá 1 dòng sau khi gọi API xoá: list.setItems(prev => prev.filter(x => x.id !== id))
 */
import { DependencyList, useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../api/client';
import { PAGE_SIZE } from '../constants/config';
import type { PageResponse } from '../types/models';

export function usePagedList<T>(
  fetchPage: (page: number, size: number) => Promise<PageResponse<T>>,
  deps: DependencyList,
  size: number = PAGE_SIZE,
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);          // tải lần đầu
  const [refreshing, setRefreshing] = useState(false);   // kéo xuống làm mới
  const [loadingMore, setLoadingMore] = useState(false); // cuộn tải thêm
  const [error, setError] = useState<string | null>(null);
  const [isLast, setIsLast] = useState(false);
  const [totalElements, setTotalElements] = useState(0);

  const pageRef = useRef(0);
  const busyRef = useRef(false); // chặn gọi trùng khi onEndReached bắn nhiều lần
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;

  const loadFirstPage = useCallback(async (mode: 'initial' | 'refresh') => {
    busyRef.current = true;
    mode === 'initial' ? setLoading(true) : setRefreshing(true);
    setError(null);
    try {
      const res = await fetchRef.current(0, size);
      pageRef.current = 0;
      setItems(res.content);
      setIsLast(res.last);
      setTotalElements(res.totalElements);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
      busyRef.current = false;
    }
  }, [size]);

  const loadMore = useCallback(async () => {
    if (busyRef.current || isLast) return;
    busyRef.current = true;
    setLoadingMore(true);
    try {
      const next = pageRef.current + 1;
      const res = await fetchRef.current(next, size);
      pageRef.current = next;
      setItems((prev) => [...prev, ...res.content]);
      setIsLast(res.last);
    } catch {
      // Lỗi khi tải thêm thì bỏ qua, cuộn lần sau sẽ thử lại
    } finally {
      setLoadingMore(false);
      busyRef.current = false;
    }
  }, [isLast, size]);

  useEffect(() => {
    loadFirstPage('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    items,
    setItems,
    loading,
    refreshing,
    loadingMore,
    error,
    isLast,
    totalElements,
    reload: () => loadFirstPage('initial'),
    refresh: () => loadFirstPage('refresh'),
    loadMore,
  };
}
