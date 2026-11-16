import React from 'react';

interface SummonersCupLoaderSvgProps {
  /** 0 到 100 的加载进度百分比 */
  progress: number;
  className?: string;
}

/**
 * 1:1 复刻英雄联盟全球总决赛官方「召唤师奖杯 (Summoner's Cup)」高精度矢量 SVG
 * 严格对齐官方奖杯造型：
 * 1. 顶部同心圆法球 + 双新月金角 + 左右高耸内倾尖刃杯角
 * 2. 左右多段式立体召唤师浮雕双翼握把（含中段镂空负空间与下缘菱形晶石）
 * 3. 杯身三道斜向金纹镶嵌 + 正中兜帽召唤师双臂环抱六边形水晶浮雕
 * 4. 束腰雕花颈环 + 中段三枚浮雕圆章 + 下方外扩四棱竖纹底座与八角阶梯基座
 *
 * 加载动效：
 * - 底层为纯灰底色（#52525b ~ #a1a1aa）
 * - 顶层随 progress (0% -> 100%) 自底座向杯顶平滑填充为冠军金色（#fffbeb ~ #facc15 ~ #d97706）
 */
export const SummonersCupLoaderSvg: React.FC<SummonersCupLoaderSvgProps> = ({
  progress,
  className = 'w-20 h-24',
}) => {
  const clamped = Math.min(100, Math.max(0, progress));
  const trophyTopY = 8;
  const trophyBottomY = 272;
  const trophyHeight = trophyBottomY - trophyTopY;
  const fillHeight = (clamped / 100) * trophyHeight;
  const clipTopY = trophyBottomY - fillHeight;
  const isComplete = clamped >= 100;

  const renderOfficialCupGeometry = (mode: 'gray' | 'gold') => {
    const c =
      mode === 'gray'
        ? {
            bodyMain: 'url(#sc-gray-main)',
            bodyBright: 'url(#sc-gray-bright)',
            bodyDark: 'url(#sc-gray-dark)',
            bodyDeep: '#27272a',
            inlayAccent: '#71717a',
            specular: '#d4d4d8',
            gemOuter: '#52525b',
            gemCore: '#71717a',
            gemFacet: '#a1a1aa',
            orbGlow: '#a1a1aa',
            orbCenter: '#e4e4e7',
          }
        : {
            bodyMain: 'url(#sc-gold-main)',
            bodyBright: 'url(#sc-gold-bright)',
            bodyDark: 'url(#sc-gold-dark)',
            bodyDeep: '#78350f',
            inlayAccent: '#f59e0b',
            specular: '#fffbeb',
            gemOuter: '#d97706',
            gemCore: '#fbbf24',
            gemFacet: '#fef9c3',
            orbGlow: '#fde047',
            orbCenter: '#ffffff',
          };

    return (
      <g>
        {/* ===============================================================
            1. 左右立体多段式雕花双翼握把 (Official Sculpted Dual Wing Handles)
           =============================================================== */}
        {/* 左握把外廓与多段浮雕结构 */}
        <path
          d="M 58 26 L 34 18 L 16 32 L 14 54 L 24 68 L 18 82 L 22 110 L 30 132 L 44 146 L 76 148 L 72 136 L 52 128 L 46 104 L 54 90 L 44 72 L 54 54 Z"
          fill={c.bodyMain}
        />
        {/* 左握把亮面装甲棱块 */}
        <path
          d="M 34 18 L 48 34 L 40 54 L 24 66 L 16 32 Z M 22 82 L 42 78 L 46 106 L 30 128 L 22 108 Z"
          fill={c.bodyBright}
        />
        {/* 左握把暗部立体折面与镂空负空间 */}
        <path
          d="M 48 34 L 58 26 L 54 54 L 40 54 Z M 42 78 L 54 90 L 46 106 Z M 32 124 L 44 118 L 48 136 L 36 140 Z"
          fill={c.bodyDark}
        />
        {/* 左握把下缘标志性菱形晶石 */}
        <polygon points="38,124 46,132 38,142 30,132" fill={c.gemCore} />
        <polygon points="38,124 46,132 38,132" fill={c.specular} />

        {/* 右握把外廓与多段浮雕结构（严格镜像对称） */}
        <path
          d="M 182 26 L 206 18 L 224 32 L 226 54 L 216 68 L 222 82 L 218 110 L 210 132 L 196 146 L 164 148 L 168 136 L 188 128 L 194 104 L 186 90 L 196 72 L 186 54 Z"
          fill={c.bodyMain}
        />
        {/* 右握把亮面装甲棱块 */}
        <path
          d="M 206 18 L 192 34 L 200 54 L 216 66 L 224 32 Z M 218 82 L 198 78 L 194 106 L 210 128 L 218 108 Z"
          fill={c.bodyBright}
        />
        {/* 右握把暗部立体折面 */}
        <path
          d="M 192 34 L 182 26 L 186 54 L 200 54 Z M 198 78 L 186 90 L 194 106 Z M 208 124 L 196 118 L 192 136 L 204 140 Z"
          fill={c.bodyDark}
        />
        {/* 右握把下缘标志性菱形晶石 */}
        <polygon points="202,124 210,132 202,142 194,132" fill={c.gemCore} />
        <polygon points="202,124 194,132 202,132" fill={c.specular} />

        {/* ===============================================================
            2. 杯口顶部拱冠、同心圆核心法球与双新月金角 (Top Arch, Nexus Orb & Crescent Horns)
           =============================================================== */}
        {/* 杯口后沿 */}
        <path
          d="M 62 28 Q 120 14 178 28 L 172 44 Q 120 34 68 44 Z"
          fill={c.bodyDark}
        />
        {/* 顶部中心拱冠护圈 */}
        <path
          d="M 94 34 C 98 14 142 14 146 34 L 138 42 C 134 24 106 24 102 42 Z"
          fill={c.bodyBright}
        />
        {/* 顶部同心圆法球 */}
        <circle cx="120" cy="36" r="15" fill={c.bodyMain} />
        <circle cx="120" cy="36" r="11" fill={c.orbGlow} />
        <circle cx="120" cy="36" r="6.5" fill={c.orbCenter} />

        {/* ===============================================================
            3. 主杯身与左右高耸尖刃杯角 (Main Chalice Bowl & Tall Blade Horns)
           =============================================================== */}
        {/* 主杯体（自左右高耸尖刃杯角向下收束至 V 型杯底） */}
        <path
          d="M 62 10 L 82 28 L 88 52 C 94 68 106 74 120 74 C 134 74 146 68 152 52 L 158 28 L 178 10 C 184 54 172 112 146 148 L 120 168 L 94 148 C 68 112 56 54 62 10 Z"
          fill={c.bodyMain}
        />
        {/* 左右高耸尖刃内侧高光切面 */}
        <path
          d="M 62 10 L 76 28 L 72 86 L 60 58 Z M 178 10 L 164 28 L 168 86 L 180 58 Z"
          fill={c.specular}
          opacity="0.88"
        />
        {/* 法球下方标志性的双新月金角纹饰 (\ O /) */}
        <path
          d="M 92 42 C 94 62 106 72 116 74 L 112 58 C 104 54 98 48 96 38 Z"
          fill={c.inlayAccent}
        />
        <path
          d="M 148 42 C 146 62 134 72 124 74 L 128 58 C 136 54 142 48 144 38 Z"
          fill={c.inlayAccent}
        />

        {/* 杯身内部深色负空间护盾底衬（突出正中召唤师浮雕） */}
        <path
          d="M 78 58 L 96 76 L 120 68 L 144 76 L 162 58 C 158 96 144 126 120 152 C 96 126 82 96 78 58 Z"
          fill={c.bodyDeep}
        />

        {/* 杯身左右三道标志性斜向金纹镶嵌 (3 Diagonal Gold Chevron Stripes) */}
        <path
          d="M 64 56 L 88 78 L 86 85 L 62 64 Z M 68 82 L 94 104 L 92 111 L 66 90 Z M 76 108 L 102 128 L 99 134 L 74 115 Z"
          fill={c.inlayAccent}
        />
        <path
          d="M 176 56 L 152 78 L 154 85 L 178 64 Z M 172 82 L 146 104 L 148 111 L 174 90 Z M 164 108 L 138 128 L 141 134 L 166 115 Z"
          fill={c.inlayAccent}
        />

        {/* ===============================================================
            4. 杯身正中：官方召唤师浮雕与六边形核心水晶 (Official Hooded Summoner & Hex Gem)
           =============================================================== */}
        {/* 召唤师尖顶兜帽与披风肩甲 */}
        <path
          d="M 120 52 L 104 72 L 108 88 L 92 98 L 84 118 L 94 126 L 108 108 L 120 102 L 132 108 L 146 126 L 156 118 L 148 98 L 132 88 L 136 72 Z"
          fill={c.specular}
        />
        {/* 召唤师右半身立体光影切面 */}
        <path
          d="M 120 52 L 136 72 L 132 88 L 148 98 L 156 118 L 146 126 L 132 108 L 120 102 Z"
          fill={c.bodyMain}
        />
        {/* 兜帽内暗影与召唤师面具 */}
        <polygon points="120,61 111,74 114,85 126,85 129,74" fill={c.bodyDeep} />
        <polygon points="115,72 125,72 123,81 117,81" fill={c.specular} />

        {/* 正中心六边形召唤师水晶外框与内切面 */}
        <polygon
          points="120,98 136,108 136,126 120,136 104,126 104,108"
          fill={c.specular}
        />
        <polygon
          points="120,103 131,110 131,124 120,131 109,124 109,110"
          fill={c.gemOuter}
        />
        <polygon
          points="120,103 131,110 120,117 109,110"
          fill={c.gemFacet}
        />
        <polygon
          points="109,110 120,117 120,131 109,124"
          fill={c.gemCore}
        />
        {/* 水晶下方护盾尖底与双弧金边 */}
        <path
          d="M 96 128 C 102 140 112 146 120 156 C 128 146 138 140 144 128 L 138 124 C 133 134 126 138 120 144 C 114 138 107 134 102 124 Z"
          fill={c.inlayAccent}
        />

        {/* ===============================================================
            5. 奖杯雕花束腰颈环、中段浮雕圆章与外扩竖纹底座 (Ornate Stem & Fluted Pedestal)
           =============================================================== */}
        {/* 上部雕花颈环 (y=166..182) */}
        <path
          d="M 88 166 L 152 166 L 146 180 L 94 180 Z"
          fill={c.bodyBright}
        />
        {/* 颈环下方垂饰与镂空结构 (y=180..208) */}
        <path
          d="M 94 180 L 146 180 L 140 208 L 100 208 Z"
          fill={c.bodyMain}
        />
        <polygon points="104,182 114,182 109,200" fill={c.bodyDeep} />
        <polygon points="126,182 136,182 131,200" fill={c.bodyDeep} />
        <polygon points="116,184 124,184 120,204" fill={c.specular} />

        {/* 中段束腰环 (y=206..215) */}
        <rect x="94" y="206" width="52" height="8" rx="4" fill={c.specular} />

        {/* 下部外扩四棱竖纹锥形杯座 (y=214..256) */}
        <path
          d="M 96 214 L 144 214 L 166 254 L 74 254 Z"
          fill={c.bodyMain}
        />
        {/* 杯座正中亮面棱柱 */}
        <path
          d="M 110 214 L 130 214 L 138 254 L 102 254 Z"
          fill={c.bodyBright}
        />
        {/* 杯座中段标志性三枚浮雕圆章 (Medallions at y=224) */}
        <ellipse cx="96" cy="225" rx="5" ry="7" fill={c.inlayAccent} />
        <ellipse cx="120" cy="226" rx="6.5" ry="8" fill={c.inlayAccent} />
        <ellipse cx="120" cy="226" rx="3.5" ry="4.5" fill={c.specular} />
        <ellipse cx="144" cy="225" rx="5" ry="7" fill={c.inlayAccent} />

        {/* 杯座四道竖向凹槽棱线 */}
        <path
          d="M 102 232 L 90 252 M 113 235 L 108 252 M 127 235 L 132 252 M 138 232 L 150 252"
          stroke={c.bodyDark}
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* 底部双层八角阶梯基座 (y=252..270) */}
        <path
          d="M 68 252 L 172 252 L 178 261 L 62 261 Z"
          fill={c.bodyDark}
        />
        <rect x="56" y="260" width="128" height="8" rx="4" fill={c.bodyBright} />
      </g>
    );
  };

  return (
    <svg
      viewBox="0 0 240 276"
      role="img"
      aria-label={`召唤师奖杯加载进度 ${clamped}%`}
      data-testid="summoners-cup-loader-svg"
      data-progress={clamped}
      className={`select-none overflow-visible transition-transform duration-500 ${
        isComplete ? 'scale-105' : 'scale-100'
      } ${className}`}
    >
      <defs>
        {/* ==================== 纯灰底色渐变 (0% 初始未加载态) ==================== */}
        <linearGradient id="sc-gray-main" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#52525b" />
          <stop offset="30%" stopColor="#9ca3af" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="70%" stopColor="#71717a" />
          <stop offset="100%" stopColor="#3f3f46" />
        </linearGradient>
        <linearGradient id="sc-gray-bright" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="55%" stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#52525b" />
        </linearGradient>
        <linearGradient id="sc-gray-dark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#52525b" />
          <stop offset="100%" stopColor="#27272a" />
        </linearGradient>

        {/* ==================== 冠军金色渐变 (随加载进度自下而上点亮) ==================== */}
        <linearGradient id="sc-gold-main" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="25%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#fef08a" />
          <stop offset="75%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        <linearGradient id="sc-gold-bright" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="45%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="sc-gold-dark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>

        {/* 动态自下而上裁剪遮罩 */}
        <clipPath id="summoners-cup-gold-clip">
          <rect x="0" y={clipTopY} width="240" height={fillHeight + 24} />
        </clipPath>

        {/* 冠军金芒滤镜 */}
        <filter id="championship-gold-glow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#facc15" floodOpacity="0.7" />
        </filter>
      </defs>

      {/* 1. 底层：纯灰底色召唤师奖杯 */}
      <g data-testid="summoners-cup-gray-layer" opacity="0.9">
        {renderOfficialCupGeometry('gray')}
      </g>

      {/* 2. 顶层：冠军金色召唤师奖杯（随加载进度自底座向上点亮） */}
      <g
        data-testid="summoners-cup-gold-layer"
        clipPath="url(#summoners-cup-gold-clip)"
        filter="url(#championship-gold-glow)"
      >
        {renderOfficialCupGeometry('gold')}

        {/* 充能液面上升处的金色高光能量线 */}
        {clamped > 0 && clamped < 100 && (
          <line
            x1="24"
            y1={clipTopY + 1.5}
            x2="216"
            y2={clipTopY + 1.5}
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}
      </g>
    </svg>
  );
};
