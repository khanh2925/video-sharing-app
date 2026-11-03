/**
 * Kéo xuống để tải lại trên bản WEB (trình duyệt).
 *
 * RefreshControl của React Native chỉ chạy trên điện thoại, trên web nó không làm gì.
 * Hook này nghe thẳng sự kiện của thẻ cuộn trong trình duyệt:
 *   - Điện thoại / màn cảm ứng: đang ở đầu danh sách mà kéo ngón tay xuống đủ xa → tải lại.
 *   - Máy tính: đang ở đầu danh sách mà lăn chuột / vuốt touchpad lên thêm → tải lại.
 *     Phải đứng ở đầu một lúc mới tính, để vừa lướt về video đầu không bị tải lại ngay.
 *   (Không bắt kéo bằng chuột: nhả chuột bị tính là bấm vào video → video tạm dừng.)
 *
 * Dùng:  const pull = useWebPullToRefresh(() => listRef.current?.getScrollableNode(), onRefresh, enabled, key);
 *        pull = khoảng đã kéo (px), để vẽ vòng tròn chỉ báo.
 */
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

/** Kéo quá chừng này (px) thì thả ra là tải lại */
export const PULL_THRESHOLD = 80;
const PULL_MAX = 120;
/** Lăn chuột lên tổng cộng chừng này khi đã ở đầu danh sách thì tải lại */
const WHEEL_THRESHOLD = 240;
/** Phải đứng ở đầu danh sách ít nhất chừng này (ms) thì lăn chuột mới tính */
const TOP_SETTLE_MS = 400;

export function useWebPullToRefresh(
  getNode: () => unknown,
  onRefresh: () => void,
  enabled: boolean,
  key: string,
) {
  const [pull, setPull] = useState(0);
  const refreshRef = useRef(onRefresh);
  const getNodeRef = useRef(getNode);
  useEffect(() => {
    refreshRef.current = onRefresh;
    getNodeRef.current = getNode;
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;
    const node = getNodeRef.current() as HTMLElement | null;
    if (!node || typeof node.addEventListener !== 'function') return;

    const atTop = () => node.scrollTop <= 0;
    let topSince: number | null = atTop() ? Date.now() : null;
    let startY: number | null = null;
    let dist = 0;
    let wheel = 0;
    let wheelTimer: ReturnType<typeof setTimeout> | undefined;

    const begin = (y: number) => {
      startY = atTop() ? y : null;
      dist = 0;
    };
    const move = (y: number) => {
      if (startY === null) return;
      dist = Math.max(0, y - startY);
      setPull(Math.min(dist, PULL_MAX));
    };
    const end = () => {
      if (startY !== null && dist >= PULL_THRESHOLD) refreshRef.current();
      startY = null;
      dist = 0;
      setPull(0);
    };

    const onScroll = () => {
      if (atTop()) topSince = topSince ?? Date.now();
      else topSince = null;
    };
    const onTouchStart = (e: TouchEvent) => begin(e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => move(e.touches[0].clientY);
    const onWheel = (e: WheelEvent) => {
      const settled = topSince !== null && Date.now() - topSince >= TOP_SETTLE_MS;
      if (!settled || e.deltaY >= 0) {
        wheel = 0;
        return;
      }
      wheel += -e.deltaY;
      clearTimeout(wheelTimer);
      if (wheel >= WHEEL_THRESHOLD) {
        wheel = 0;
        setPull(0);
        refreshRef.current();
        return;
      }
      setPull(Math.min((wheel / WHEEL_THRESHOLD) * PULL_THRESHOLD, PULL_MAX));
      // Dừng lăn giữa chừng thì bỏ
      wheelTimer = setTimeout(() => {
        wheel = 0;
        setPull(0);
      }, 300);
    };

    node.addEventListener('scroll', onScroll, { passive: true });
    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchmove', onTouchMove, { passive: true });
    node.addEventListener('touchend', end);
    node.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      clearTimeout(wheelTimer);
      node.removeEventListener('scroll', onScroll);
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', end);
      node.removeEventListener('wheel', onWheel);
    };
  }, [enabled, key]);

  return pull;
}
