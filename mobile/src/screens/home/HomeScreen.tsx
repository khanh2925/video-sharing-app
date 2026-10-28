/**
 * Trang chủ — UC05
 * Phụ trách giao diện: Thanh
 *
 * Màn tạm: XOÁ dòng PlaceholderScreen và code giao diện thật theo
 * docs/HuongDanCode_Mobile.html (tab "Thanh").
 */
import { PlaceholderScreen } from '../../components';
import type { TabScreenProps } from '../../navigation/types';

export default function HomeScreen(_props: TabScreenProps<'Home'>) {
  return <PlaceholderScreen title="Trang chủ" owner="Thanh" useCase="UC05" showBack={false} />;
}
