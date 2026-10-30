/**
 * Phát nhạc nền của video / story (UC09), lặp lại liên tục.
 *
 * Dùng trong màn hình:
 *   const hasMusic = useBackgroundMusic(video.audio?.fileUrl, isFocused && !paused);
 *   <VideoView ... />  và đặt player.muted = hasMusic  → có nhạc thì tắt tiếng gốc của video
 *
 * - url: đường dẫn backend trả về ("/files/audios/audio01.mp3"), null = không có nhạc.
 * - playing: true thì phát, false thì dừng (vd rời màn, bấm tạm dừng video).
 * Trả về true nếu có nhạc để phát.
 */
import { useEffect } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { mediaUrl } from '../utils/media';

// Bật 1 lần cho cả app: iPhone gạt sang chế độ im lặng vẫn nghe được nhạc
setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});

export function useBackgroundMusic(url: string | null | undefined, playing: boolean, loop = true) {
  const uri = mediaUrl(url);
  // useAudioPlayer tự giải phóng khi rời màn hình
  const player = useAudioPlayer(uri ? { uri } : null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- Đây là thuộc tính native mutable theo API expo-audio.
    player.loop = loop;
  }, [player, loop]);

  useEffect(() => {
    if (!uri) return;
    if (playing) {
      player.play();
    } else {
      player.pause();
    }
  }, [player, uri, playing]);

  return !!uri;
}
