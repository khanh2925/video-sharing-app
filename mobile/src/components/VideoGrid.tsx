/**
 * Lưới video 3 cột (Hồ sơ của tôi, Hồ sơ người khác, kết quả tìm kiếm).
 *   <VideoGrid
 *     data={list.items}
 *     onPressItem={(v) => navigation.navigate('Watch', { videoId: v.id })}
 *     ListHeaderComponent={<ProfileHeader />}        // phần avatar, số liệu phía trên lưới
 *     refreshing={list.refreshing} onRefresh={list.refresh} onEndReached={list.loadMore}
 *   />
 * Ô video dùng riêng ở chỗ khác: <VideoThumb video={v} onPress={...} />
 * Chế độ chọn nhiều (vd xoá lịch sử xem): truyền selectedIds={new Set([1, 2])}, ô đã chọn có dấu tick.
 */
import { FlatList, FlatListProps, Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import type { Video } from '../types/models';
import { formatCount } from '../utils/format';
import { mediaUrl } from '../utils/media';
import { AppText } from './AppText';

const GAP = 2;
const COLUMNS = 3;

interface ThumbProps {
  video: Video;
  width: number;
  onPress?: () => void;
  /** Nhãn góc trên trái, vd "Ghim", "Nháp" */
  badge?: string;
  /** undefined = không ở chế độ chọn; true/false = hiện vòng tròn chọn */
  selected?: boolean;
}

export function VideoThumb({ video, width, onPress, badge, selected }: ThumbProps) {
  const height = Math.round(width * 1.5);
  return (
    <Pressable
      onPress={onPress}
      style={{ width, height, backgroundColor: colors.surface }}
      accessibilityLabel={video.title}
      accessibilityState={selected === undefined ? undefined : { selected }}
    >
      {video.thumbnailUrl ? (
        <Image source={{ uri: mediaUrl(video.thumbnailUrl) }} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noThumb]}>
          <Ionicons name="videocam-outline" size={28} color={colors.placeholder} />
        </View>
      )}
      {!!badge && (
        <View style={styles.badge}>
          <AppText weight="bold" size={10} color={colors.white}>{badge}</AppText>
        </View>
      )}
      {selected !== undefined && (
        <View style={[StyleSheet.absoluteFill, selected && styles.selectedShade]} pointerEvents="none">
          <Ionicons
            name={selected ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={selected ? colors.primary : colors.white}
            style={styles.check}
          />
        </View>
      )}
      <View style={styles.views}>
        <Ionicons name="play" size={12} color={colors.white} />
        <AppText weight="semibold" size={12} color={colors.white} style={styles.shadow}>
          {formatCount(video.viewCount)}
        </AppText>
      </View>
    </Pressable>
  );
}

type GridProps = Omit<FlatListProps<Video>, 'renderItem' | 'numColumns' | 'keyExtractor'> & {
  onPressItem?: (video: Video) => void;
  /** Có truyền = đang ở chế độ chọn, các id trong Set được tick */
  selectedIds?: Set<number>;
};

export function VideoGrid({ onPressItem, selectedIds, ...rest }: GridProps) {
  const { width } = useWindowDimensions();
  const cell = (width - GAP * (COLUMNS - 1)) / COLUMNS;
  return (
    <FlatList
      numColumns={COLUMNS}
      keyExtractor={(v) => String(v.id)}
      columnWrapperStyle={{ gap: GAP }}
      contentContainerStyle={{ gap: GAP }}
      onEndReachedThreshold={0.5}
      extraData={selectedIds}
      renderItem={({ item }) => (
        <VideoThumb
          video={item}
          width={cell}
          onPress={() => onPressItem?.(item)}
          selected={selectedIds ? selectedIds.has(item.id) : undefined}
        />
      )}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  noThumb: { alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', left: 6, top: 6, backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  selectedShade: { backgroundColor: colors.overlay },
  check: { position: 'absolute', right: 6, top: 6 },
  views: { position: 'absolute', left: 6, bottom: 6, flexDirection: 'row', alignItems: 'center', gap: 3 },
  shadow: { textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },
});
