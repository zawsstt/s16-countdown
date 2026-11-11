/**
 * ============================================================================
 * WORLDS 2026 FINALS — BROADCAST MEDIA & TRANSITION CONFIGURATION
 * ============================================================================
 */

export interface TransitionStingerSlotConfig {
  stingerVideoUrl: string;
  stingerKeyframes: string[];
  durationMs: number;
}

export interface PromoVideoSlotItem {
  id: string;
  title: string;
  subtitle: string;
  videoUrl: string;
  /** 首帧海报图：视频尚未缓冲完成时先占位，避免出现黑屏 */
  posterUrl?: string;
  startSec?: number;
  endSec?: number;
  /**
   * 播完是否「直接切下一段」（不插 1.8 秒黑屏）。
   * 同一支宣传片被拆成多段时，段与段之间为 true；
   * 不同宣传片之间为 false，会插入 1.8 秒黑屏过渡。
   */
  seamlessNext?: boolean;
  /**
   * 所属宣传片分组 id。一支宣传片可能被拆成多个 <25MiB 的片段，
   * 它们共用同一个 groupId，HUD 上按「第几支」显示而不是「第几段」。
   */
  groupId: string;
  /**
   * 强制静音（该片段的音轨已损坏/录错，直接不带声音播放）
   * 对应音频已在转码时整轨移除，此处再兜底一次，防止任何浏览器意外出声
   */
  muteAudio?: boolean;
}

export interface MatchDataPreviewSlotItem {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  /** 1920x1080 官方原版赛事数据前瞻图例路径 */
  graphicImageUrl: string;
}

/**
 * 两个正片宣传片之间的黑屏间隔时长（毫秒）：1800ms（1.8秒纯黑屏过渡）
 */
export const PROMO_INTER_VIDEO_BLACK_SCREEN_MS = 1800;

/**
 * 赛事数据前瞻每张图例展示时长（秒）：20秒平滑轮播切换下一张
 */
export const DATA_PREVIEW_SLIDE_DURATION_SEC = 20;

/**
 * 统一页面转场动画（取用户上传转场视频第 4~5 秒的召唤师徽章瞬间，无任何多余特效）
 */
export const TRANSITION_STINGER_SLOT: TransitionStingerSlotConfig = {
  stingerVideoUrl: 'assets/broadcast/worlds_stinger_transition.mp4',
  stingerKeyframes: [],
  durationMs: 1250,
};

/**
 * 宣传片倒计时播报列表（每 45 分钟自动触发一次）
 *
 * 播放顺序：片头 → 正片1（4段）→ 1.8s 黑屏 → 正片2（3段）→ 1.8s 黑屏 → 正片3（4段）→ 1.8s 黑屏 → 正片4（开幕式预告片，排在最后）
 */

interface PromoGroupConfig {
  id: string;
  title: string;
  subtitle: string;
  /** 按顺序的片段文件名（位于 assets/aistudio/），拼起来就是完整原片 */
  parts: string[];
  /**
   * 整片文件名（由片段在构建时无损拼接而成）。
   * 只在 VITE_SINGLE_PROMO_FILE=true 时使用 —— GitHub Pages 单文件上限 100MB，
   * 不需要分段，用整片播放就没有任何接缝。
   */
  whole?: string;
  /** 每段对应的首帧海报文件名（位于 /assets/broadcast/） */
  posters: string[];
  muteAudio?: boolean;
  /** 片头引导短片：播完直接接下一组，不插黑屏 */
  seamlessIntoNextGroup?: boolean;
}

const PROMO_GROUPS: PromoGroupConfig[] = [
  {
    id: 'intro',
    title: 'WORLDS 2026 · 全球总决赛宣传片片头',
    subtitle: 'RIOT GAMES × LOL ESPORTS OFFICIAL OPENING',
    parts: [],
    posters: [],
    // 该片段原音轨录制失误（严重削波失真），已整轨移除，这里再强制静音兜底
    muteAudio: true,
    seamlessIntoNextGroup: true,
  },
  {
    id: 'promo-1',
    title: 'WORLDS 2026 · 传奇征途与新老传承',
    subtitle: 'GEN Ruler / IG Rookie & Meiko & JiaQi',
    parts: ['promo1_p1.mp4', 'promo1_p2.mp4', 'promo1_p3.mp4', 'promo1_p4.mp4'],
    whole: 'promo1_full.mp4',
    posters: [
      'poster_promo1_p1.jpg',
      'poster_promo1_p2.jpg',
      'poster_promo1_p3.jpg',
      'poster_promo1_p4.jpg',
    ],
  },
  {
    id: 'promo-2',
    title: 'WORLDS 2026 · 破障登峰与宿命对决',
    subtitle: 'BLG Knight & Bin vs T1 Faker & Oner',
    parts: ['promo2_p1.mp4', 'promo2_p2.mp4', 'promo2_p3.mp4'],
    whole: 'promo2_full.mp4',
    posters: ['poster_promo2_p1.jpg', 'poster_promo2_p2.jpg', 'poster_promo2_p3.jpg'],
  },
  {
    id: 'promo-3',
    title: 'WORLDS 2026 · 八强之争 · 淘汰赛阶段总前导片',
    subtitle: 'KNOCKOUT STAGE · OFFICIAL OPENING FILM',
    parts: ['promo3_p1.mp4', 'promo3_p2.mp4', 'promo3_p3.mp4', 'promo3_p4.mp4'],
    whole: 'promo3_full.mp4',
    posters: [
      'poster_promo3_p1.jpg',
      'poster_promo3_p2.jpg',
      'poster_promo3_p3.jpg',
      'poster_promo3_p4.jpg',
    ],
  },
  {
    id: 'promo-4',
    title: 'WORLDS 2026 · 冠亚军决赛开幕式宣传片',
    subtitle: 'FINAL OPENING CEREMONY TRAILER · PRESENTED BY MASTERCARD',
    parts: ['promo4_p1.mp4'],
    whole: 'promo4_full.mp4',
    posters: ['poster_promo4_p1.jpg'],
  },
];

/** 片头是单独一段文件，不属于任何正片分组 */
const INTRO_BUMPER_URL = 'assets/broadcast/promo_opening_from_2s.mp4';
const INTRO_BUMPER_POSTER = 'assets/broadcast/poster_promo_opening.jpg';

function buildPromoSlot(): PromoVideoSlotItem[] {
  const list: PromoVideoSlotItem[] = [];

  // 1. 片头
  list.push({
    id: 'worlds-2026-promo-intro-bumper',
    title: PROMO_GROUPS[0].title,
    subtitle: PROMO_GROUPS[0].subtitle,
    videoUrl: INTRO_BUMPER_URL,
    posterUrl: INTRO_BUMPER_POSTER,
    groupId: PROMO_GROUPS[0].id,
    seamlessNext: true,
    muteAudio: true,
  });

  // 2. 四支正片
  const useSingleFile = import.meta.env.VITE_SINGLE_PROMO_FILE === 'true';

  PROMO_GROUPS.slice(1).forEach((group) => {
    const files = useSingleFile && group.whole ? [group.whole] : group.parts;
    files.forEach((part, pi) => {
      const isLastPart = pi === files.length - 1;
      list.push({
        id: `${group.id}-p${pi + 1}`,
        title: group.title,
        subtitle: group.subtitle,
        videoUrl: `assets/aistudio/${part}`,
        posterUrl: `assets/broadcast/${group.posters[pi] ?? group.posters[0]}`,
        groupId: group.id,
        // 组内：直接续播；组末：插入 1.8s 黑屏再进下一支
        seamlessNext: !isLastPart,
        muteAudio: group.muteAudio,
      });
    });
  });

  return list;
}

export const PROMO_VIDEO_SLOT: PromoVideoSlotItem[] = buildPromoSlot();

/** 逻辑上的宣传片支数（不含分段），用于 HUD 显示「第几支 / 共几支」 */
export const PROMO_GROUP_IDS: string[] = Array.from(
  new Set(PROMO_VIDEO_SLOT.map((item) => item.groupId))
);

/**
 * 赛事数据前瞻倒计时播报列表（每 15 分钟 :00 / :15 / :30 / :45 自动触发）
 * 填充用户上传并更新后的 8 张官方 1080p 赛事数据图例（____1 ~ ____8）
 */
export const MATCH_DATA_PREVIEW_SLOT: MatchDataPreviewSlotItem[] = [
  {
    id: 'data-preview-1-gen-roster',
    title: 'GEN.G 全球总决赛首发阵容 · LCK #1',
    subtitle: 'KIIN / CANYON / CHOVY / RULER / DURO',
    tag: 'STARTING LINEUP · GEN.G',
    graphicImageUrl: 'assets/aistudio/____1_3d9aa379.png',
  },
  {
    id: 'data-preview-2-power-rankings',
    title: 'GLOBAL POWER RANKINGS · AWS 全球战力排行榜',
    subtitle: 'BILIBILI GAMING (1578) 与 GEN.G (1578) 并列榜首会师决赛',
    tag: 'GLOBAL POWER RANKINGS',
    graphicImageUrl: 'assets/aistudio/____2_46e1b571.png',
  },
  {
    id: 'data-preview-3-blg-roster',
    title: 'BILIBILI GAMING 全球总决赛首发阵容 · LPL #2',
    subtitle: 'BIN / XUN / KNIGHT / VIPER / ON',
    tag: 'STARTING LINEUP · BLG',
    graphicImageUrl: 'assets/aistudio/____3_3bfe7fff.png',
  },
  {
    id: 'data-preview-4-blg-trios',
    title: 'TRIOS UNITED SEMIS SECURED · BLG 三人并肩皆入四强',
    subtitle: 'BIN · XUN · ON 已第三次联手闯入全球总决赛四强及以上',
    tag: 'BLG MILESTONE',
    graphicImageUrl: 'assets/aistudio/____4_31155c5e.png',
  },
  {
    id: 'data-preview-5-chovy-cs-machine',
    title: 'CS MACHINE · GEN.CHOVY 无情补刀机器',
    subtitle: '2020–2026 近七届全球总决赛中单位分均补刀与对位补刀差纪录',
    tag: 'PLAYER DATA · CHOVY',
    graphicImageUrl: 'assets/aistudio/____5_1f64c1ef.png',
  },
  {
    id: 'data-preview-6-mvp-records',
    title: 'MVP RECORDS · 全球总决赛 MVP 次数榜',
    subtitle: 'CANYON (20次) 与 FAKER 持平并列第一 · CHOVY (17次) 并列第三',
    tag: 'WORLDS MVP RECORDS',
    graphicImageUrl: 'assets/aistudio/____6_65f712e8.png',
  },
  {
    id: 'data-preview-7-8th-participation',
    title: '8TH CONSECUTIVE PARTICIPATION · 连续八年征战全球总决赛',
    subtitle: 'CHOVY & CANYON 2019–2026 连续八届全球总决赛战绩一览',
    tag: 'CAREER MILESTONE',
    graphicImageUrl: 'assets/aistudio/____7_af56e80b.png',
  },
  {
    id: 'data-preview-8-blg-vs-lck-bo5',
    title: '26 BLG VS LCK IN BO5 · BLG在BO5中面对LCK队伍',
    subtitle: '2026 全球总决赛八强 3:0 DK · 四强 3:1 T1 · 决赛 VS GEN 待交手',
    tag: 'BLG VS LCK IN BO5',
    graphicImageUrl: 'assets/aistudio/____8_blg_vs_lck_bo5.png',
  },
];
