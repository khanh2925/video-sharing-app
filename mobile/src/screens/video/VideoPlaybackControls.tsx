import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useEvent } from 'expo';
import type { VideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components';
import { colors, spacing } from '../../constants/theme';
import { formatDuration } from '../../utils/format';

/** Thanh tua có thời lượng, chạm/kéo để chọn giây; không làm đổi trạng thái phát/dừng. */
export function VideoPlaybackControls({ player }: { player: VideoPlayer }) {
  const time = useEvent(player, 'timeUpdate');
  const source = useEvent(player, 'sourceLoad');
  const rawDuration = source?.duration ?? player.duration;
  const duration = Number.isFinite(rawDuration) ? Math.max(0, rawDuration) : 0;
  const [preview, setPreview] = useState<number | null>(null);
  const width = useRef(0);
  const target = useRef<number | null>(null);
  const resumeAfterSeek = useRef(false);
  const position = Math.max(0, Math.min(duration, preview ?? time?.currentTime ?? player.currentTime));
  const progress = duration > 0 ? position / duration : 0;

  const seekTo = (seconds: number) => {
    if (duration <= 0) return;
    player.seekBy(Math.max(0, Math.min(duration, seconds)) - player.currentTime);
  };
  const updatePreview = (x: number) => {
    if (width.current <= 0 || duration <= 0) return;
    target.current = Math.max(0, Math.min(1, x / width.current)) * duration;
    setPreview(target.current);
  };
  const finishSeek = (commit: boolean) => {
    if (commit && target.current != null) seekTo(target.current);
    target.current = null;
    setPreview(null);
    if (resumeAfterSeek.current) player.play();
    resumeAfterSeek.current = false;
  };

  return (
    <View>
      <View style={styles.row}>
        <Pressable
          style={styles.skip}
          accessibilityRole="button"
          accessibilityLabel="Tua lùi 5 giây"
          disabled={duration <= 0}
          onPress={() => seekTo(player.currentTime - 5)}
        >
          <Ionicons name="play-back" size={16} color={colors.white} />
          <AppText size={12} color={colors.white}>5s</AppText>
        </Pressable>
        <AppText size={12} color={colors.white} accessibilityLabel="Thời gian video">
          {formatDuration(position)} / {formatDuration(duration)}
        </AppText>
        <Pressable
          style={styles.skip}
          accessibilityRole="button"
          accessibilityLabel="Tua tới 5 giây"
          disabled={duration <= 0}
          onPress={() => seekTo(player.currentTime + 5)}
        >
          <AppText size={12} color={colors.white}>5s</AppText>
          <Ionicons name="play-forward" size={16} color={colors.white} />
        </Pressable>
      </View>
      <View
        style={styles.seekArea}
        accessibilityRole="adjustable"
        accessibilityLabel="Tua video"
        accessibilityValue={{ min: 0, max: duration, now: position, text: `${formatDuration(position)} / ${formatDuration(duration)}` }}
        accessibilityActions={[{ name: 'increment', label: 'Tua tới 5 giây' }, { name: 'decrement', label: 'Tua lùi 5 giây' }]}
        onAccessibilityAction={({ nativeEvent }) => seekTo(player.currentTime + (nativeEvent.actionName === 'increment' ? 5 : -5))}
        onLayout={({ nativeEvent }) => { width.current = nativeEvent.layout.width; }}
        onStartShouldSetResponder={() => duration > 0}
        onResponderGrant={({ nativeEvent }) => {
          resumeAfterSeek.current = player.playing;
          player.pause();
          updatePreview(nativeEvent.locationX);
        }}
        onResponderMove={({ nativeEvent }) => updatePreview(nativeEvent.locationX)}
        onResponderRelease={({ nativeEvent }) => {
          updatePreview(nativeEvent.locationX);
          finishSeek(true);
        }}
        onResponderTerminationRequest={() => false}
        onResponderTerminate={() => finishSeek(false)}
      >
        <View pointerEvents="none" style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        <View pointerEvents="none" style={[styles.thumb, { left: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skip: { minWidth: 48, minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  seekArea: { height: 32, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.whiteTrack, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.white },
  thumb: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: colors.white, marginLeft: -6 },
});
