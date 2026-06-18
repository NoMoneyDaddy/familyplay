import Svg, { Circle, Ellipse, Path } from 'react-native-svg'

/**
 * FamilyPlay 吉祥物小熊「波波」（與 web apps/web/app/components/mascot.tsx 同一隻）。
 * 純向量、可縮放，奶油色配橘色徽章底最跳。取代 emoji，全平台一致。
 */
export function Mascot({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx={18} cy={17} r={9} fill="#FFF1E6" />
      <Circle cx={46} cy={17} r={9} fill="#FFF1E6" />
      <Circle cx={18} cy={17} r={4.4} fill="#FFC6A0" />
      <Circle cx={46} cy={17} r={4.4} fill="#FFC6A0" />
      <Ellipse cx={32} cy={35} rx={22} ry={20} fill="#FFF1E6" />
      <Ellipse cx={19.5} cy={40} rx={4.2} ry={3} fill="#FFB38A" opacity={0.75} />
      <Ellipse cx={44.5} cy={40} rx={4.2} ry={3} fill="#FFB38A" opacity={0.75} />
      <Ellipse cx={32} cy={40} rx={10.5} ry={8} fill="#FFE4D2" />
      <Circle cx={24.5} cy={33} r={2.9} fill="#3A2A20" />
      <Circle cx={39.5} cy={33} r={2.9} fill="#3A2A20" />
      <Circle cx={25.4} cy={32.1} r={0.9} fill="#FFFFFF" />
      <Circle cx={40.4} cy={32.1} r={0.9} fill="#FFFFFF" />
      <Ellipse cx={32} cy={37.5} rx={3.1} ry={2.3} fill="#3A2A20" />
      <Path
        d="M32 39.6v2.1c0 2 1.7 3.4 3.7 3"
        stroke="#3A2A20"
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M32 41.7c0 2-1.7 3.4-3.7 3"
        stroke="#3A2A20"
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  )
}
