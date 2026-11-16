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

export interface BLGChampionshipMatch {
  id: string;
  stageOrder: number;
  stageShortCn: string;
  stageLabelCn: string;
  stageLabelEn: string;
  format: 'BO3' | 'BO5';
  leftTeam: {
    code: 'HLE' | 'DK' | 'T1' | 'GEN';
    fullName: string;
    seed: 'LCK #1' | 'LCK #2' | 'LCK #3' | 'LCK #4';
    logoUrl: string;
    score: number;
  };
  rightTeam: {
    code: 'BLG';
    fullName: 'Bilibili Gaming';
    seed: 'LPL #2';
    logoUrl: string;
    score: number;
  };
  scoreText: string;
}

/**
 * BLG 2026 全球总决赛一穿四 LCK 夺冠之路（统一将 LCK 对手置于左侧、LPL #2 BLG 置于右侧）：
 * 1) 十六强 (BO3): LCK #2 HLE 0 - 2 LPL #2 BLG
 * 2) 八强赛 (BO5): LCK #4 DK  0 - 3 LPL #2 BLG
 * 3) 四强赛 (BO5): LCK #3 T1  1 - 3 LPL #2 BLG
 * 4) 总决赛 (BO5): LCK #1 GEN 1 - 3 LPL #2 BLG
 */
export const BLG_CHAMPIONSHIP_MATCHES: BLGChampionshipMatch[] = [
  {
    id: 'swiss-r16-hle-blg',
    stageOrder: 1,
    stageShortCn: '十六强',
    stageLabelCn: '十六强晋级赛',
    stageLabelEn: 'SWISS STAGE · R16',
    format: 'BO3',
    leftTeam: {
      code: 'HLE',
      fullName: 'Hanwha Life Esports',
      seed: 'LCK #2',
      logoUrl: 'assets/logos/hle_logo.png',
      score: 0,
    },
    rightTeam: {
      code: 'BLG',
      fullName: 'Bilibili Gaming',
      seed: 'LPL #2',
      logoUrl: 'assets/logos/blg_logo.png',
      score: 2,
    },
    scoreText: '0 - 2',
  },
  {
    id: 'qf-dk-blg',
    stageOrder: 2,
    stageShortCn: '八强赛',
    stageLabelCn: '淘汰赛八强',
    stageLabelEn: 'QUARTERFINALS',
    format: 'BO5',
    leftTeam: {
      code: 'DK',
      fullName: 'Dplus KIA',
      seed: 'LCK #4',
      logoUrl: 'assets/logos/dk_logo.png',
      score: 0,
    },
    rightTeam: {
      code: 'BLG',
      fullName: 'Bilibili Gaming',
      seed: 'LPL #2',
      logoUrl: 'assets/logos/blg_logo.png',
      score: 3,
    },
    scoreText: '0 - 3',
  },
  {
    id: 'sf-t1-blg',
    stageOrder: 3,
    stageShortCn: '四强赛',
    stageLabelCn: '淘汰赛四强',
    stageLabelEn: 'SEMIFINALS',
    format: 'BO5',
    leftTeam: {
      code: 'T1',
      fullName: 'T1',
      seed: 'LCK #3',
      logoUrl: 'assets/logos/t1_logo.png',
      score: 1,
    },
    rightTeam: {
      code: 'BLG',
      fullName: 'Bilibili Gaming',
      seed: 'LPL #2',
      logoUrl: 'assets/logos/blg_logo.png',
      score: 3,
    },
    scoreText: '1 - 3',
  },
  {
    id: 'gf-gen-blg',
    stageOrder: 4,
    stageShortCn: '总决赛',
    stageLabelCn: '冠亚军总决赛',
    stageLabelEn: 'GRAND FINAL',
    format: 'BO5',
    leftTeam: {
      code: 'GEN',
      fullName: 'Gen.G Esports',
      seed: 'LCK #1',
      logoUrl: 'assets/logos/gen_logo.png',
      score: 1,
    },
    rightTeam: {
      code: 'BLG',
      fullName: 'Bilibili Gaming',
      seed: 'LPL #2',
      logoUrl: 'assets/logos/blg_logo.png',
      score: 3,
    },
    scoreText: '1 - 3',
  },
];

/**
 * 右侧导播小窗滚动画面列表（纪念站版：仅保留 BLG 夺冠海报与 BLG 战队/选手专属高光画面，已移除 GEN 与广告图）
 */
export const BROADCAST_SLIDES: BroadcastSlide[] = [
  {
    id: 'carousel-blg-champions-2026',
    title: '恭喜 BLG 获得 2026 英雄联盟全球总决赛冠军',
    subtitle: 'WORLDS 2026 CHAMPIONS · ON / VIPER / KNIGHT / BIN / XUN / FLANDRE 捧起召唤师杯',
    category: 'BLG',
    imageUrl: 'assets/broadcast/blg_champions_2026_hd.jpg',
    badgeText: 'WORLDS 26 CHAMPIONS',
    photographerOrSource: 'WORLDS 2026 OFFICIAL CHAMPIONS POSTER',
  },
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
    id: 'carousel-upload-3-blg-signature',
    title: 'BLG 五人组 Signature Moment 晋级镜头签名',
    subtitle: 'Bin / Knight / Xun / Viper / ON 晋级时刻全员镜头签名',
    category: 'BLG',
    imageUrl: 'assets/aistudio/__3_34c1011f.png',
    badgeText: 'BLG · SIGNATURE',
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
    badgeText: 'BLG · KNIGHT & BIN',
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
    id: 'blg-side-profile',
    title: 'BLG 赛前舞台侧影与战术沟通',
    subtitle: 'BLG 冠军成员全神贯注迎接终极对决',
    category: 'BLG',
    imageUrl: 'assets/frames/blg_side_profile.jpg',
    badgeText: 'BLG · FOCUS',
    photographerOrSource: 'WORLDS 2026 OFFICIAL FEED',
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
      kda: '6.2',
      kp: '67.4%',
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
      kda: '6.8',
      kp: '81.5%',
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
      kda: '8.4',
      kp: '78.6%',
      signatureChamps: ['塞拉斯', '阿狸', '发条'],
      highlightQuote: '黄金左手卓定乾坤，S16全球总决赛FMVP加冕！',
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
      kda: '8.9',
      kp: '76.2%',
      signatureChamps: ['卡莎', '韦鲁斯', '伊泽瑞尔'],
      highlightQuote: '反应极限的顶级冠军射手，绝境之中力挽狂澜的输出核心。',
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
      kda: '5.4',
      kp: '84.2%',
      signatureChamps: ['洛', '机器人', '巴德'],
      highlightQuote: '灵性拉满的节奏鬼才，天外飞仙开团往往能瞬间改写战局。',
      photoUrl: 'assets/frames/blg_side_profile.jpg',
    },
  },
];

export const QUICK_DANMAKU_PRESETS = [
  { text: '恭喜 BLG 夺得 2026 英雄联盟全球总决赛冠军！为信念干杯！', team: 'BLG' as const },
  { text: '一穿四 LCK 夺冠！HLE、DK、T1、GEN 全斩于马下，太有含金量了！', team: 'BLG' as const },
  { text: '黄金左手 Knight 卓定乾坤！中路游龙捧起 2026 全球总决赛召唤师奖杯！', team: 'BLG' as const },
  { text: 'Bin 哥世一上信誉分拉满！Viper + ON 下路双人组统治峡谷！', team: 'BLG' as const },
  { text: 'Bin / Xun / Knight / Viper / ON 首发五虎全勤出击，S16 登峰造极！', team: 'BLG' as const },
  { text: '风起今朝，我们是冠军！BLG S16 黄金之路永载史册！', team: 'BLG' as const },
];
