import type { LiveMessage } from '../types/models';

/** REST lịch sử có thể về sau socket: giữ cả tin mới, loại trùng, sắp theo thứ tự gửi. */
export function mergeLiveMessages(current: LiveMessage[], incoming: LiveMessage[]): LiveMessage[] {
  const messages = new Map(current.map((message) => [message.id, message]));
  incoming.forEach((message) => messages.set(message.id, message));
  return [...messages.values()].sort((a, b) => a.id - b.id);
}
