export interface BroadcastSlide {
  id: string;
  title: string;
  subtitle: string;
  category: 'GEN' | 'BLG' | 'EVENT';
  imageUrl: string;
  badgeText: string;
  photographerOrSource: string;
}

export interface PlayerProfile {
  role: 'TOP' | 'JUNGLE' | 'MID' | 'BOT' | 'SUPPORT';
  roleLabelCn: string;
  genPlayer: {
    id: string;
    handle: string;
    realName: string;
    kda: string;
    kp: string;
    signatureChamps: string[];
    highlightQuote: string;
    photoUrl: string;
  };
  blgPlayer: {
    id: string;
    handle: string;
    realName: string;
    kda: string;
    kp: string;
    signatureChamps: string[];
    highlightQuote: string;
    photoUrl: string;
  };
}

/**
 * 右侧导播小窗滚动画面列表
 * - 包含用户上传的轮播图（轮播1、轮播2、轮播3、轮播5）以及更新后的赛事前瞻8（26 BLG VS LCK IN BO5）
 */
export const BROADCAST_SLIDES: BroadcastSlide[] = [
  {
    id: 'carousel-upload-1-viper',
    title: 'BLG Viper 赛场与粉丝近距离签名互动',
    subtitle: 'LPL #2 · BILIBILI GAMING 下路核心 Viper 赛后签名时刻',
    category: 'BLG',
    imageUrl: 'assets/aistudio/__1_e131e88d.png',
    badgeText: 'BLG · VIPER',
    photographerOrSource: 'WORLDS 2026 OFFICIAL FEED',
  },
  {
    id: 'carousel-upload-2-flash-your-support',
    title: 'FLASH YOUR SUPPORT · 全球总决赛战队联名表情助威',
    subtitle: '官方联赛战队应援表情包 · 收益与各大赛区一队共享',
    category: 'EVENT',
    imageUrl: 'assets/aistudio/__2_effbf4c7.png',
    badgeText: 'FLASH YOUR SUPPORT',
    photographerOrSource: 'WORLDS 2026 OFFICIAL FEED',
  },
  {
    id: 'carousel-upload-8-blg-vs-lck-bo5',
    title: '26 BLG VS LCK IN BO5 · BLG在BO5中面对LCK队伍',
    subtitle: '2026 全球总决赛八强 3:0 DK · 四强 3:1 T1 · 决赛 VS GEN 待交手',
    category: 'BLG',
    imageUrl: 'assets/aistudio/____8_blg_vs_lck_bo5.png',
    badgeText: 'BLG VS LCK IN BO5',
    photographerOrSource: 'WORLDS 2026 DATA PREVIEW',
  },
  {
    id: 'carousel-upload-3-blg-signature',
    title: 'BLG 五人组 Signature Moment 晋级镜头签名',
    subtitle: 'Bin / Knight / Xun / Viper / ON 晋级时刻全员镜头签名',
    category: 'BLG',
    imageUrl: 'assets/aistudio/__3_34c1011f.png',
    badgeText: 'SIGNATURE MOMENT',
    photographerOrSource: 'WORLDS 2026 BROADCAST',
  },
  {
    id: 'carousel-upload-5-blg-xun-walkout',
    title: 'BLG Xun 登场通道与现场粉丝击掌互动',
    subtitle: 'LPL #2 · BILIBILI GAMING 打野 Xun 满怀自信迈向主舞台',
    category: 'BLG',
    imageUrl: 'assets/aistudio/__5_f3d50c6f.png',
    badgeText: 'BLG · XUN',
    photographerOrSource: 'WORLDS 2026 OFFICIAL FEED',
  },
  {
    id: 'blg-victory-pose',
    title: 'BLG Knight & Bin 晋级决赛定妆时刻',
    subtitle: 'LPL #2 · BILIBILI GAMING 双C与上单赛场自信比一',
    category: 'BLG',
    imageUrl: 'assets/frames/blg_victory_pose.jpg',
    badgeText: 'BLG · GRAND FINALS',
    photographerOrSource: 'WORLDS 2026 OFFICIAL FEED',
  },
  {
    id: 'gen-chovy-focus',
    title: 'GEN Chovy 赛前专注备战特写',
    subtitle: 'LCK #1 · GEN.G 中单核心冲击全球总决赛巅峰王座',
    category: 'GEN',
    imageUrl: 'assets/frames/gen_chovy_focus.jpg',
    badgeText: 'GEN · CHOVY',
    photographerOrSource: 'WORLDS 2026 OFFICIAL FEED',
  },
  {
    id: 'blg-stage-entrance',
    title: 'BLG 全员登场亮相世界赛舞台',
    subtitle: 'Bin / Xun / Knight / Viper / ON 五人组整装出击',
    category: 'BLG',
    imageUrl: 'assets/frames/blg_stage_entrance.jpg',
    badgeText: 'BLG · WALKOUT',
    photographerOrSource: 'WORLDS 2026 OFFICIAL FEED',
  },
  {
    id: 'gen-ruler-arena',
    title: 'GEN Ruler 凝视万人决赛场馆',
    subtitle: '传奇ADC尺帝Ruler再度站上全球总决赛聚光灯中央',
    category: 'GEN',
    imageUrl: 'assets/frames/gen_ruler_arena.jpg',
    badgeText: 'GEN · RULER',
    photographerOrSource: 'WORLDS 2026 OFFICIAL FEED',
  },
  {
    id: 'gen-signature-moment',
    title: 'GEN 五人组 Signature Moment 镜头签名',
    subtitle: 'Kiin / Canyon / Chovy / Ruler / Duro 晋级时刻全员签名',
    category: 'GEN',
    imageUrl: 'assets/frames/gen_signature_moment.jpg',
    badgeText: 'SIGNATURE MOMENT',
    photographerOrSource: 'WORLDS 2026 BROADCAST',
  },
  {
    id: 'blg-side-profile',
    title: 'BLG 赛前舞台侧影与战术沟通',
    subtitle: '全神贯注迎接下周五 BO5 终极冠军角逐',
    category: 'BLG',
    imageUrl: 'assets/frames/blg_side_profile.jpg',
    badgeText: 'BLG · FOCUS',
    photographerOrSource: 'WORLDS 2026 OFFICIAL FEED',
  },
  {
    id: 'gen-stage-walkout',
    title: 'GEN 战队主舞台入场仪式',
    subtitle: 'LCK 一号种子白金战袍踏上决赛征途',
    category: 'GEN',
    imageUrl: 'assets/frames/gen_stage_walkout.jpg',
    badgeText: 'GEN · ENTRANCE',
    photographerOrSource: 'WORLDS 2026 OFFICIAL FEED',
  },
  {
    id: 'gen-team-back',
    title: 'GEN 赛场对战席五人背影',
    subtitle: 'Canyon · Chovy · Duro · Ruler 赛前最后调试',
    category: 'GEN',
    imageUrl: 'assets/frames/gen_team_back.jpg',
    badgeText: 'GEN · STAGE BOOTH',
    photographerOrSource: 'WORLDS 2026 OFFICIAL FEED',
  },
  {
    id: 'gen-duro-booth',
    title: 'GEN Duro 对战席冷静指挥',
    subtitle: '新生代辅助Duro在世界赛舞台展现极佳大局观',
    category: 'GEN',
    imageUrl: 'assets/frames/gen_duro_booth.jpg',
    badgeText: 'GEN · DURO',
    photographerOrSource: 'WORLDS 2026 OFFICIAL FEED',
  },
  {
    id: 'promo-hyperx',
    title: 'PLAY PAST ORDINARY · 官方外设装备展示',
    subtitle: 'S16 世界赛导播轮播插画与赛事制作展示',
    category: 'EVENT',
    imageUrl: 'assets/frames/promo_hyperx.jpg',
    badgeText: 'OFFICIAL HARDWARE',
    photographerOrSource: 'WORLDS 2026 BROADCAST',
  },
];

export const FINALS_ROSTER_MATCHUPS: PlayerProfile[] = [
  {
    role: 'TOP',
    roleLabelCn: '上单对决 · TOP LANE',
    genPlayer: {
      id: 'kiin',
      handle: 'KIIN',
      realName: 'Kim Gi-in (김기인)',
      kda: '5.4',
      kp: '68.2%',
      signatureChamps: ['奎桑提', '贾克斯', '奥萝拉'],
      highlightQuote: '六边形全能战神，抗压与单带无缝切换的定海神针。',
      photoUrl: 'assets/frames/gen_signature_moment.jpg',
    },
    blgPlayer: {
      id: 'bin',
      handle: 'BIN',
      realName: 'Chen Zebin (陈泽彬)',
      kda: '5.8',
      kp: '65.9%',
      signatureChamps: ['贾克斯', '卡蜜尔', '兰博'],
      highlightQuote: '世一上进攻锋芒，操作拉满的单杀机器与团战撕裂者。',
      photoUrl: 'assets/frames/blg_victory_pose.jpg',
    },
  },
  {
    role: 'JUNGLE',
    roleLabelCn: '打野博弈 · JUNGLE',
    genPlayer: {
      id: 'canyon',
      handle: 'CANYON',
      realName: 'Kim Geon-bu (김건부)',
      kda: '6.9',
      kp: '76.4%',
      signatureChamps: ['豹女', '死歌', '猪妹'],
      highlightQuote: '前FMVP野核宗师，总决赛舞台最具统治力的节奏引擎。',
      photoUrl: 'assets/frames/gen_stage_walkout.jpg',
    },
    blgPlayer: {
      id: 'xun',
      handle: 'XUN',
      realName: 'Peng Lixun (彭立勋)',
      kda: '6.2',
      kp: '78.1%',
      signatureChamps: ['千珏', '赵信', '蝎子'],
      highlightQuote: '极具侵略性的前期节奏发动机，绝境敢打敢拼的破局利刃。',
      photoUrl: 'assets/aistudio/__5_f3d50c6f.png',
    },
  },
  {
    role: 'MID',
    roleLabelCn: '中路王权 · MID LANE',
    genPlayer: {
      id: 'chovy',
      handle: 'CHOVY',
      realName: 'Jeong Ji-hoon (정지훈)',
      kda: '8.1',
      kp: '74.5%',
      signatureChamps: ['阿萝拉', '永恩', '沙皇'],
      highlightQuote: '极致对线与发育艺术，渴望在S16完成个人大满贯加冕。',
      photoUrl: 'assets/frames/gen_chovy_focus.jpg',
    },
    blgPlayer: {
      id: 'knight',
      handle: 'KNIGHT',
      realName: 'Zhuo Ding (卓定)',
      kda: '7.9',
      kp: '75.8%',
      signatureChamps: ['塞拉斯', '阿狸', '发条'],
      highlightQuote: '黄金左手卓定乾坤，游走支援与团战收割兼备的国产中单之光。',
      photoUrl: 'assets/frames/blg_victory_pose.jpg',
    },
  },
  {
    role: 'BOT',
    roleLabelCn: '下路核心 · BOT LANE',
    genPlayer: {
      id: 'ruler',
      handle: 'RULER',
      realName: 'Park Jae-hyuk (박재혁)',
      kda: '7.4',
      kp: '72.0%',
      signatureChamps: ['霞', '艾希', '卡莎'],
      highlightQuote: '重返GEN的传奇尺帝，后期团战兜底能力拉满的冠军射手。',
      photoUrl: 'assets/frames/gen_ruler_arena.jpg',
    },
    blgPlayer: {
      id: 'viper',
      handle: 'VIPER',
      realName: 'Park Do-hyeon / BLG BOT',
      kda: '7.6',
      kp: '73.4%',
      signatureChamps: ['卡莎', '韦鲁斯', '伊泽瑞尔'],
      highlightQuote: '反应极限的顶级射手，绝境之中力挽狂澜的输出核心。',
      photoUrl: 'assets/aistudio/__1_e131e88d.png',
    },
  },
  {
    role: 'SUPPORT',
    roleLabelCn: '游走开团 · SUPPORT',
    genPlayer: {
      id: 'duro',
      handle: 'DURO',
      realName: 'Joo Min-kyu (주민규)',
      kda: '4.9',
      kp: '81.2%',
      signatureChamps: ['洛', '芮尔', '烈娜塔'],
      highlightQuote: '视野布控严丝合缝，果断闪现开团的GEN团队润滑剂。',
      photoUrl: 'assets/frames/gen_duro_booth.jpg',
    },
    blgPlayer: {
      id: 'on',
      handle: 'ON',
      realName: 'Luo Wenjun (骆文俊)',
      kda: '4.7',
      kp: '80.5%',
      signatureChamps: ['洛', '机器人', '巴德'],
      highlightQuote: '灵性拉满的节奏鬼才，天外飞仙开团往往能瞬间改写战局。',
      photoUrl: 'assets/frames/blg_side_profile.jpg',
    },
  },
];

export const QUICK_DANMAKU_PRESETS = [
  { text: 'BLG 总决赛冲啊！为LPL捧回S16召唤师杯！', team: 'BLG' as const },
  { text: 'GEN Golden Road! Chovy & Ruler 登神长阶！', team: 'GEN' as const },
  { text: 'Chovy vs Knight 中路宿命对决，打满五局听战歌！', team: 'NEUTRAL' as const },
  { text: 'Bin哥信誉分拉满！上路Kiin vs Bin火星撞地球！', team: 'BLG' as const },
  { text: 'High Jump这首BP音乐一响，鸡皮疙瘩直接起来了！', team: 'NEUTRAL' as const },
  { text: 'Ruler尺帝重返决赛舞台，Canyon野区统治力拉满！', team: 'GEN' as const },
];
