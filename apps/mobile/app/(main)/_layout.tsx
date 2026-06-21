import { Stack } from 'expo-router'

// (main) 群組各畫面都自帶頁內標題與返回鍵，隱藏原生 header，否則 root Stack 會替每個畫面
// 多畫一條原生 header（且標題是小寫路由名如「now」），形成雙標題。與 auth/onboarding 群組
// 的 _layout 處理一致。括號群組不影響 URL（/now、/children… 路由不變）。
export default function MainLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
