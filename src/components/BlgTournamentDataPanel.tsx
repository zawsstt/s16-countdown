import React from 'react';
import {
  Trophy,
  Award,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  Crown,
  Swords,
  TrendingUp,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { BLG_CHAMPIONSHIP_MATCHES } from '../data/finalsData';

export interface BlgTournamentDataPage {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
}

/**
 * 100% 基于官方导播图例（____2 AWS战力榜、____3 BLG首发五虎、____4 三人组四强、____8 BLG vs LCK BO5）
 * 与四场官方赛果图（16强 2:0 HLE、八强 3:0 DK、四强 3:1 T1、决赛 3:1 GEN）构建的 BLG 夺冠专项数据档案
 */
export const BLG_TOURNAMENT_DATA_PAGES: BlgTournamentDataPage[] = [
  {
    id: 'golden-road-run',
    tag: 'GOLDEN ROAD · 黄金之路战绩',
    title: 'BLG S16 夺冠黄金之路 · 连克 LCK 四大种子官方赛果总览',
    subtitle:
      '十六强 2:0 HLE (LCK #2) → 八强 3:0 DK (LCK #4) → 四强 3:1 T1 (LCK #3) → 决赛 3:1 GEN (LCK #1)',
  },
  {
    id: 'starting-five-and-trios',
    tag: 'STARTING LINEUP · 首发五虎与三人组',
    title: 'BLG S16 官方首发五虎阵容 & BIN · XUN · ON 三人组里程碑',
    subtitle:
      '首发五虎 BIN / XUN / KNIGHT / VIPER / ON 全勤打满夺冠（替补上单 Flandre 本届未登场）',
  },
  {
    id: 'blg-vs-lck-bo5-history',
    tag: 'BLG VS LCK IN BO5 · 对阵LCK全纪录',
    title: '26 BLG VS LCK IN BO5 · BLG 国际赛 BO5 面对 LCK 队伍全记录',
    subtitle:
      '2023–2026 国际赛 BO5 对阵 LCK 17战 12胜 5负 (70.6%) · 2026 单赛季对阵 LCK BO5 6胜 1负 (85.7%)',
  },
  {
    id: 'aws-global-power-rankings',
    tag: 'GLOBAL POWER RANKINGS · AWS全球战力榜',
    title: 'GLOBAL POWER RANKINGS (AWS) · 2026 全球总决赛战力榜与夺冠校验',
    subtitle:
      'BLG 以 52胜13负 (1578分) 并列榜首出征淘汰赛，连斩榜上四大 LCK 强敌最终加冕总冠军 (55胜13负)',
  },
];

/**
 * Page 1 顶部 4 项经官方图例严格校验的核心战绩指标
 */
export const VERIFIED_SUMMARY_CARDS = [
  {
    label: 'S16 对阵 LCK 四大种子大场战绩',
    value: '4 胜 0 负',
    highlight: '100% 大场全胜',
    detail: '依次击败 LCK #2 HLE、#4 DK、#3 T1、#1 GEN 捧杯',
    icon: Trophy,
  },
  {
    label: 'S16 对阵 LCK 四大种子小局战绩',
    value: '11 胜 2 负',
    highlight: '84.6% 小局胜率',
    detail: '16强 2:0 (BO3) + 八强 3:0 + 四强 3:1 + 决赛 3:1 (BO5)',
    icon: Crown,
  },
  {
    label: 'AWS 全球战力排行榜 (官方图例)',
    value: '1578 PTS',
    highlight: 'POS #1 并列榜首',
    detail: '淘汰赛前 52-13 (80.0%) → 夺冠后累计 55-13 (80.9%)',
    icon: TrendingUp,
  },
  {
    label: 'BLG vs LCK 国际赛 BO5 总战绩',
    value: '12 胜 5 负',
    highlight: '2026年 6胜 1负',
    detail: '2023–2026 共 17 场对阵 LCK BO5，小局累计 41 胜 27 负',
    icon: Swords,
  },
];

/**
 * Page 1 四场晋级与夺冠战役官方记录（严格对应左侧 4 张官方对战图，无任何虚构单局数据）
 */
export const VERIFIED_GOLDEN_ROAD_SERIES = [
  {
    stageOrder: 'STAGE 01 · 瑞士轮十六强晋级赛',
    format: 'BO3',
    leftSeed: 'LCK #2',
    leftTeam: 'HLE',
    leftFullName: 'Hanwha Life Esports',
    scoreText: '0 - 2',
    rightSeed: 'LPL #2',
    rightTeam: 'BLG',
    statusBadge: '2 : 0 零封晋级八强',
    lineupNote: '出战首发：BIN / XUN / KNIGHT / VIPER / ON',
    summaryNote: '瑞士轮晋级战 BO3 干净利落 2:0 零封 LCK 二号种子 HLE，打响一穿四 LCK 第一枪。',
  },
  {
    stageOrder: 'STAGE 02 · 淘汰赛八强 (QUARTERFINALS)',
    format: 'BO5',
    leftSeed: 'LCK #4',
    leftTeam: 'DK',
    leftFullName: 'Dplus KIA',
    scoreText: '0 - 3',
    rightSeed: 'LPL #2',
    rightTeam: 'BLG',
    statusBadge: '3 : 0 横扫闯入四强',
    lineupNote: '出战首发：BIN / XUN / KNIGHT / VIPER / ON',
    summaryNote: '淘汰赛首轮面对 LCK 四号种子 DK，BLG 直落三局 3:0 零封对手，连续三年闯入全球总决赛四强。',
  },
  {
    stageOrder: 'STAGE 03 · 淘汰赛四强 (SEMIFINALS)',
    format: 'BO5',
    leftSeed: 'LCK #3',
    leftTeam: 'T1',
    leftFullName: 'T1',
    scoreText: '1 - 3',
    rightSeed: 'LPL #2',
    rightTeam: 'BLG',
    statusBadge: '3 : 1 力克 T1 晋级决赛',
    lineupNote: '出战首发：BIN / XUN / KNIGHT / VIPER / ON',
    summaryNote: '半决赛正面对决 LCK 三号种子 T1，BLG 以 3:1 强势赢下 BO5，连续两年在当年国际赛 BO5 击败 T1。',
  },
  {
    stageOrder: 'STAGE 04 · 冠亚军总决赛 (GRAND FINAL)',
    format: 'BO5',
    leftSeed: 'LCK #1',
    leftTeam: 'GEN',
    leftFullName: 'Gen.G Esports',
    scoreText: '1 - 3',
    rightSeed: 'LPL #2',
    rightTeam: 'BLG',
    statusBadge: '3 : 1 击败 GEN 勇夺总冠军',
    lineupNote: '出战首发：BIN / XUN / KNIGHT / VIPER / ON',
    summaryNote: '总决赛巅峰会师同为 AWS 战力榜 1578 分的 LCK 一号种子 GEN，BLG 以 3:1 力克对手捧起队史首座召唤师杯！',
  },
];

/**
 * Page 2 官方首发五虎（严格依据官方图例 ____3_3bfe7fff.png：BIN / XUN / KNIGHT / VIPER / ON）
 * 明确标注替补上单 Flandre 本届未登场（0场），不编造任何虚构个人 KDA 或英雄战绩
 */
export interface VerifiedStarterProfile {
  roleCode: 'TOP' | 'JUNGLE' | 'MID' | 'BOT' | 'SUPPORT';
  roleNameCn: string;
  handle: string;
  playerNameCn: string;
  attendanceBadge: string;
  milestoneTag: string;
  verifiedHistory: string;
  cropPositionPct: string;
}

export const VERIFIED_STARTING_FIVE: VerifiedStarterProfile[] = [
  {
    roleCode: 'TOP',
    roleNameCn: '首发上单 · TOP',
    handle: 'BIN',
    playerNameCn: '陈泽彬',
    attendanceBadge: '全勤首发 · 打满全部赛程',
    milestoneTag: '23四强 · 24亚军 · 26冠军',
    verifiedHistory:
      '作为 BLG 绝对主力上单全勤打满 2026 全球总决赛全部场次（替补 Flandre 未登场），与 Xun、ON 三度携手闯入世界赛四强并最终捧杯。',
    cropPositionPct: '10% 25%',
  },
  {
    roleCode: 'JUNGLE',
    roleNameCn: '首发打野 · JUNGLE',
    handle: 'XUN',
    playerNameCn: '彭立勋',
    attendanceBadge: '全勤首发 · 打满全部赛程',
    milestoneTag: '23四强 · 24亚军 · 26冠军',
    verifiedHistory:
      'BLG 冠军首发打野，2023、2024、2026 三届全球总决赛与 Bin、ON 并肩作战，在 S16 淘汰赛连克 DK、T1、GEN 圆梦总冠军。',
    cropPositionPct: '30% 25%',
  },
  {
    roleCode: 'MID',
    roleNameCn: '首发中单 · MID',
    handle: 'KNIGHT',
    playerNameCn: '卓定',
    attendanceBadge: '全勤首发 · 打满全部赛程',
    milestoneTag: '24全球总决赛亚军 · 26总冠军',
    verifiedHistory:
      'BLG 冠军首发中单，继 2024 全球总决赛夺得亚军后，于 2026 全球总决赛率队一穿四 LCK 四大种子战队，正式加冕全球总决赛冠军。',
    cropPositionPct: '50% 25%',
  },
  {
    roleCode: 'BOT',
    roleNameCn: '首发下路 · BOT',
    handle: 'VIPER',
    playerNameCn: '朴到贤',
    attendanceBadge: '全勤首发 · 打满全部赛程',
    milestoneTag: 'S16 LPL #2 冠军首发下路',
    verifiedHistory:
      '2026 赛季担任 BLG 首发下路打满全程，随队在 2026 先锋赛、MSI 与全球总决赛对阵 LCK 赢下 6 场 BO5，夺得 S16 全球总决赛冠军。',
    cropPositionPct: '70% 25%',
  },
  {
    roleCode: 'SUPPORT',
    roleNameCn: '首发辅助 · SUPPORT',
    handle: 'ON',
    playerNameCn: '骆文俊',
    attendanceBadge: '全勤首发 · 打满全部赛程',
    milestoneTag: '23四强 · 24亚军 · 26冠军',
    verifiedHistory:
      'BLG 冠军首发辅助，与 Bin、Xun 完成「2023 四强 → 2024 亚军 → 2026 冠军」的三级跳壮举，全勤出战见证队史首冠。',
    cropPositionPct: '90% 25%',
  },
];

/**
 * Page 2 下半部：官方图例 ____4 《26 TRIOS UNITED SEMIS SECURED · BLG 三人并肩 皆入四强》更新夺冠结局
 */
export const VERIFIED_TRIOS_MILESTONES = [
  {
    year: '2023',
    event: '2023 全球总决赛',
    result: '四强',
    detail: '八强赛 3:2 击败 LCK 一号种子 GEN，首次三人联手闯入全球总决赛四强',
    isChampion: false,
  },
  {
    year: '2024',
    event: '2024 全球总决赛',
    result: '亚军',
    detail: '八强赛 3:1 击败 LCK 一号种子 HLE，一路闯入伦敦冠亚军决赛夺得亚军',
    isChampion: false,
  },
  {
    year: '2026',
    event: '2026 全球总决赛',
    result: '冠军',
    detail: '16强 2:0 HLE、八强 3:0 DK、四强 3:1 T1、决赛 3:1 GEN，第三次联手终捧召唤师杯！',
    isChampion: true,
  },
];

/**
 * Page 3：100% 源自官方图例 ____8 《26 BLG VS LCK IN BO5 · BLG在BO5中面对LCK队伍》全部 17 场历史记录
 * （首行已由赛前的 "VS GEN" 更新为夺冠实绩 "3:1 GEN"）
 */
export interface VerifiedBlgVsLckBo5Row {
  order: number;
  year: '2026' | '2025' | '2024' | '2023';
  eventStage: string;
  score: string;
  opponent: 'GEN' | 'T1' | 'HLE' | 'DK' | 'BFX';
  isWin: boolean;
  isS16Worlds?: boolean;
}

export const VERIFIED_BLG_VS_LCK_BO5_LIST: VerifiedBlgVsLckBo5Row[] = [
  { order: 1, year: '2026', eventStage: '2026 全球总决赛 决赛', score: '3:1', opponent: 'GEN', isWin: true, isS16Worlds: true },
  { order: 2, year: '2026', eventStage: '2026 全球总决赛 四强赛', score: '3:1', opponent: 'T1', isWin: true, isS16Worlds: true },
  { order: 3, year: '2026', eventStage: '2026 全球总决赛 八强赛', score: '3:0', opponent: 'DK', isWin: true, isS16Worlds: true },
  { order: 4, year: '2026', eventStage: '2026 季中冠军赛 决赛', score: '2:3', opponent: 'HLE', isWin: false },
  { order: 5, year: '2026', eventStage: '2026 季中冠军赛 胜者组决赛', score: '3:1', opponent: 'HLE', isWin: true },
  { order: 6, year: '2026', eventStage: '2026 季中冠军赛 淘汰赛', score: '3:2', opponent: 'T1', isWin: true },
  { order: 7, year: '2026', eventStage: '2026 全球先锋赛 小组赛', score: '3:2', opponent: 'BFX', isWin: true },
  { order: 8, year: '2025', eventStage: '2025 季中冠军赛 淘汰赛', score: '0:3', opponent: 'T1', isWin: false },
  { order: 9, year: '2024', eventStage: '2024 全球总决赛 决赛', score: '2:3', opponent: 'T1', isWin: false },
  { order: 10, year: '2024', eventStage: '2024 全球总决赛 八强赛', score: '3:1', opponent: 'HLE', isWin: true },
  { order: 11, year: '2024', eventStage: '2024 季中冠军赛 决赛', score: '1:3', opponent: 'GEN', isWin: false },
  { order: 12, year: '2024', eventStage: '2024 季中冠军赛 败者组决赛', score: '3:2', opponent: 'T1', isWin: true },
  { order: 13, year: '2024', eventStage: '2024 季中冠军赛 胜者组决赛', score: '1:3', opponent: 'GEN', isWin: false },
  { order: 14, year: '2024', eventStage: '2024 季中冠军赛 淘汰赛', score: '3:1', opponent: 'T1', isWin: true },
  { order: 15, year: '2023', eventStage: '2023 全球总决赛 八强赛', score: '3:2', opponent: 'GEN', isWin: true },
  { order: 16, year: '2023', eventStage: '2023 季中冠军赛 败者组决赛', score: '3:1', opponent: 'T1', isWin: true },
  { order: 17, year: '2023', eventStage: '2023 季中冠军赛 淘汰赛', score: '3:0', opponent: 'GEN', isWin: true },
];

/**
 * Page 4：100% 源自官方图例 ____2 《GLOBAL POWER RANKINGS powered by AWS》前十名完整数据
 */
export interface VerifiedPowerRankingRow {
  pos: string;
  team: string;
  region: 'LPL' | 'LCK' | 'LEC' | 'LCS';
  wlBeforeFinals: string;
  points: number;
  s16Note: string;
  isBlg?: boolean;
  defeatedByBlgScore?: string;
}

export const VERIFIED_AWS_POWER_RANKINGS: VerifiedPowerRankingRow[] = [
  {
    pos: '1',
    team: 'BILIBILI GAMING',
    region: 'LPL',
    wlBeforeFinals: '52-13',
    points: 1578,
    s16Note: 'S16 全球总决赛冠军 (淘汰赛连胜后 55-13)',
    isBlg: true,
  },
  {
    pos: '-',
    team: 'GEN.G',
    region: 'LCK',
    wlBeforeFinals: '37-9',
    points: 1578,
    s16Note: '总决赛 BLG 3 : 1 击败 GEN 夺冠',
    defeatedByBlgScore: '决赛 BLG 3:1 胜',
  },
  {
    pos: '3',
    team: 'HANWHA LIFE ESPORTS',
    region: 'LCK',
    wlBeforeFinals: '30-16',
    points: 1534,
    s16Note: '瑞士轮十六强 BLG 2 : 0 零封 HLE',
    defeatedByBlgScore: '16强 BLG 2:0 胜',
  },
  {
    pos: '4',
    team: 'T1',
    region: 'LCK',
    wlBeforeFinals: '33-17',
    points: 1516,
    s16Note: '淘汰赛四强 BLG 3 : 1 击败 T1',
    defeatedByBlgScore: '四强 BLG 3:1 胜',
  },
  {
    pos: '5',
    team: 'INVICTUS GAMING',
    region: 'LPL',
    wlBeforeFinals: '22-26',
    points: 1451,
    s16Note: 'LPL 赛区四强战队',
  },
  {
    pos: '-',
    team: 'G2 ESPORTS',
    region: 'LEC',
    wlBeforeFinals: '34-18',
    points: 1451,
    s16Note: 'LEC 赛区代表战队 (与 IG 同为 1451 分)',
  },
  {
    pos: '7',
    team: 'KARMINE CORP',
    region: 'LEC',
    wlBeforeFinals: '39-16',
    points: 1427,
    s16Note: 'LEC 赛区代表战队',
  },
  {
    pos: '8',
    team: 'DPLUS KIA',
    region: 'LCK',
    wlBeforeFinals: '30-17',
    points: 1425,
    s16Note: '淘汰赛八强 BLG 3 : 0 零封 DK',
    defeatedByBlgScore: '八强 BLG 3:0 胜',
  },
  {
    pos: '9',
    team: 'LYON',
    region: 'LCS',
    wlBeforeFinals: '28-14',
    points: 1414,
    s16Note: 'LCS 赛区八强代表战队',
  },
  {
    pos: '10',
    team: "ANYONE'S LEGEND",
    region: 'LPL',
    wlBeforeFinals: '32-21',
    points: 1397,
    s16Note: 'LPL 赛区代表战队',
  },
];

interface BlgTournamentDataPanelProps {
  activePageIndex: number;
  onSelectPage: (index: number) => void;
  onClose: () => void;
}

export const BlgTournamentDataPanel: React.FC<BlgTournamentDataPanelProps> = ({
  activePageIndex,
  onSelectPage,
  onClose,
}) => {
  const safeIndex =
    ((activePageIndex % BLG_TOURNAMENT_DATA_PAGES.length) +
      BLG_TOURNAMENT_DATA_PAGES.length) %
    BLG_TOURNAMENT_DATA_PAGES.length;
  const currentPage = BLG_TOURNAMENT_DATA_PAGES[safeIndex];

  return (
    <div className="relative w-full h-full flex flex-col justify-between bg-[#090705] text-[#f7efe2] p-3 sm:p-5 md:p-[1.5vw] pb-14 md:pb-[4.3vw] overflow-y-auto md:overflow-hidden select-none">
      {/* Background Warm Obsidian & Champagne-Gold Championship Plate */}
      <img
        src="assets/broadcast/grand_final_match_bg.jpg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-35"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,213,167,0.16),transparent_65%)]"
      />

      {/* ===================================================================
          TOP HEADER BAR: PAGE INDICATOR + TABS + NAVIGATION CONTROLS
         =================================================================== */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 pb-2 md:pb-[0.65vw] border-b border-[#c8aa78]/35 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="px-2.5 py-0.5 rounded bg-gradient-to-r from-[#d4b483] to-[#f5d5a7] text-[#14100a] text-xs font-black tracking-wider uppercase shrink-0">
            {safeIndex + 1} / {BLG_TOURNAMENT_DATA_PAGES.length}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#f5d5a7] shrink-0" />
              <span
                data-testid="active-data-title"
                className="text-sm sm:text-base md:text-[clamp(0.95rem,1.22vw,1.32rem)] font-black text-[#f7efe2] tracking-wide truncate"
              >
                {currentPage.title}
              </span>
            </div>
            <p className="text-[11px] md:text-[clamp(0.68rem,0.76vw,0.82rem)] text-[#c8aa78] truncate">
              {currentPage.subtitle}
            </p>
          </div>
        </div>

        {/* Section Switch Tabs + Prev/Next/Return Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="hidden lg:flex items-center gap-1 rounded-lg bg-[#14100b]/90 p-1 border border-[#c8aa78]/30 mr-1">
            {BLG_TOURNAMENT_DATA_PAGES.map((page, idx) => {
              const active = idx === safeIndex;
              return (
                <button
                  key={page.id}
                  type="button"
                  data-testid={`blg-data-tab-${idx}`}
                  onClick={() => onSelectPage(idx)}
                  className={`px-2.5 py-1 rounded-md text-xs font-extrabold transition-all cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-[#d4b483] to-[#f5d5a7] text-[#14100a] shadow'
                      : 'text-[#c8aa78] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {page.tag.split('·')[1]?.trim() || page.tag}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            data-testid="data-preview-prev-btn"
            aria-label="上一页专项数据"
            onClick={() =>
              onSelectPage(
                (safeIndex - 1 + BLG_TOURNAMENT_DATA_PAGES.length) %
                  BLG_TOURNAMENT_DATA_PAGES.length
              )
            }
            className="p-1.5 rounded-lg bg-[#14100b]/90 hover:bg-[#2b2217] text-[#f5d5a7] border border-[#c8aa78]/40 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            data-testid="data-preview-next-btn"
            aria-label="下一页专项数据"
            onClick={() =>
              onSelectPage((safeIndex + 1) % BLG_TOURNAMENT_DATA_PAGES.length)
            }
            className="p-1.5 rounded-lg bg-[#14100b]/90 hover:bg-[#2b2217] text-[#f5d5a7] border border-[#c8aa78]/40 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            data-testid="finish-data-slot-btn"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#d4b483] to-[#f5d5a7] hover:from-[#e5c798] hover:to-[#ffe4bc] text-[#14100a] font-black text-xs shadow-lg transition-all cursor-pointer ml-1"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>返回导播主舞台</span>
          </button>
        </div>
      </div>

      {/* ===================================================================
          MAIN CONTENT AREA (4 VERIFIED OFFICIAL ARCHIVE VIEWS)
         =================================================================== */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col justify-between py-2 md:py-[0.75vw] gap-2.5 md:gap-[0.75vw]">
        {/* ===============================================================
            PAGE 1: 黄金之路战绩（四场对阵 LCK 官方赛果与汇总指标）
           =============================================================== */}
        {safeIndex === 0 && (
          <>
            {/* 4 Verified KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-[0.8vw] shrink-0">
              {VERIFIED_SUMMARY_CARDS.map((card, i) => {
                const Icon = card.icon;
                return (
                  <div
                    key={i}
                    className="rounded-xl bg-gradient-to-b from-[#1a140d]/95 to-[#100c08]/95 border border-[#c8aa78]/45 p-3 md:p-[0.85vw] shadow-[0_8px_28px_rgba(0,0,0,0.8)] flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] md:text-[clamp(0.68rem,0.78vw,0.84rem)] font-bold text-[#c8aa78]">
                        {card.label}
                      </span>
                      <Icon className="w-4 h-4 text-[#f5d5a7] shrink-0" />
                    </div>
                    <div className="my-1 flex items-baseline gap-2">
                      <span className="font-broadcast-num text-2xl sm:text-3xl md:text-[clamp(1.65rem,2.3vw,2.55rem)] text-[#fffdf9] tracking-wide leading-none">
                        {card.value}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#f5d5a7]/15 border border-[#f5d5a7]/40 text-[10px] md:text-xs font-extrabold text-[#f5d5a7]">
                        {card.highlight}
                      </span>
                    </div>
                    <p className="text-[11px] md:text-[clamp(0.64rem,0.73vw,0.78rem)] text-white/75 leading-snug">
                      {card.detail}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* 4 Official Matchup Cards (HLE 0-2 BLG / DK 0-3 BLG / T1 1-3 BLG / GEN 1-3 BLG) */}
            <div className="flex-1 min-h-0 rounded-xl bg-[#120e09]/92 border border-[#c8aa78]/40 p-3 md:p-[1vw] flex flex-col justify-between">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#f5d5a7]" />
                  <h3 className="text-xs sm:text-sm md:text-[clamp(0.82rem,1vw,1.1rem)] font-black text-[#f5d5a7] tracking-wider uppercase">
                    BLG 2026 全球总决赛「一穿四 LCK」四场官方赛果档案
                  </h3>
                </div>
                <span className="text-[11px] text-[#f5d5a7] font-bold bg-[#241c12] px-2.5 py-0.5 rounded border border-[#c8aa78]/35">
                  全程首发五虎：BIN · XUN · KNIGHT · VIPER · ON（替补 Flandre 本届未登场）
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-[0.8vw] flex-1 min-h-0">
                {VERIFIED_GOLDEN_ROAD_SERIES.map((item, idx) => {
                  const matchMeta = BLG_CHAMPIONSHIP_MATCHES[idx];
                  return (
                    <div
                      key={idx}
                      className="rounded-xl bg-[#090705]/95 border border-[#c8aa78]/35 px-3.5 py-2.5 md:px-[1.1vw] md:py-[0.75vw] flex flex-col justify-between"
                    >
                      {/* Top Row: Stage & Format + Status Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#261e14] border border-[#c8aa78]/40 text-[10px] font-black text-[#f5d5a7]">
                            {item.format}
                          </span>
                          <span className="text-xs md:text-[clamp(0.75rem,0.88vw,0.96rem)] font-extrabold text-[#c8aa78]">
                            {item.stageOrder}
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded bg-gradient-to-r from-[#d4b483] to-[#f5d5a7] text-[#14100a] text-[10px] md:text-xs font-black">
                          {item.statusBadge}
                        </span>
                      </div>

                      {/* Middle Row: Official Matchup Scoreboard (Left LCK Seed vs Right LPL #2 BLG) */}
                      <div className="my-1.5 py-2 px-3 rounded-lg bg-gradient-to-r from-[#17120c] via-[#211a11] to-[#17120c] border border-[#c8aa78]/25 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          {matchMeta && (
                            <img
                              src={matchMeta.leftTeam.logoUrl}
                              alt={item.leftTeam}
                              className="w-8 h-8 md:w-10 md:h-10 object-contain shrink-0"
                            />
                          )}
                          <div>
                            <span className="text-[10px] font-bold text-[#c8aa78] block leading-none">
                              {item.leftSeed}
                            </span>
                            <span className="font-broadcast-num text-xl md:text-2xl text-white tracking-wider leading-none">
                              {item.leftTeam}
                            </span>
                          </div>
                        </div>

                        <div className="px-3.5 py-1 rounded bg-[#090705] border border-[#c8aa78]/40 font-broadcast-num text-2xl md:text-3xl text-[#f5d5a7] tracking-widest leading-none">
                          {item.scoreText}
                        </div>

                        <div className="flex items-center gap-2.5">
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-[#f5d5a7] block leading-none">
                              {item.rightSeed}
                            </span>
                            <span className="font-broadcast-num text-xl md:text-2xl text-[#fffdf9] tracking-wider leading-none">
                              {item.rightTeam}
                            </span>
                          </div>
                          {matchMeta && (
                            <img
                              src={matchMeta.rightTeam.logoUrl}
                              alt="BLG"
                              className="w-8 h-8 md:w-10 md:h-10 object-contain shrink-0"
                            />
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Verified Lineup & Summary */}
                      <div className="flex flex-col gap-0.5 text-[11px] md:text-[clamp(0.66rem,0.75vw,0.82rem)]">
                        <span className="text-[#f5d5a7] font-bold">{item.lineupNote}</span>
                        <span className="text-white/80 leading-snug">{item.summaryNote}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ===============================================================
            PAGE 2: 官方首发五虎（BIN / XUN / KNIGHT / VIPER / ON）
                    & BIN · XUN · ON 三人并肩三次四强及以上官方里程碑（图例 ____3 & ____4）
           =============================================================== */}
        {safeIndex === 1 && (
          <div className="flex-1 min-h-0 flex flex-col justify-between gap-2 md:gap-[0.65vw]">
            {/* Top Banner noting Starting 5 vs Sub Flandre (0 games played) */}
            <div className="rounded-xl bg-[#14100b]/95 border border-[#c8aa78]/45 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#f5d5a7] shrink-0" />
                <span className="text-xs md:text-sm font-black text-[#f7efe2]">
                  WORLDS 2026 | LPL #2 BILIBILI GAMING 官方首发五虎阵容（源自官方图例 STARTING LINEUP）
                </span>
              </div>
              <span
                data-testid="flandre-sub-zero-games-note"
                className="px-2.5 py-0.5 rounded bg-[#261e14] border border-[#f5d5a7]/45 text-[11px] font-bold text-[#f5d5a7]"
              >
                替补上单 Flandre（李炫君）本届全球总决赛未登场（出场 0 小局）· 全程由首发五虎打满
              </span>
            </div>

            {/* Official Broadcast Graphic Showcase Row: Starting 5 Graphic + Trios United Graphic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-[0.75vw] h-[170px] md:h-[21vh] shrink-0">
              <div className="relative rounded-xl overflow-hidden border border-[#c8aa78]/45 bg-[#090705] flex items-center justify-center">
                <img
                  src="assets/aistudio/____3_3bfe7fff.png"
                  alt="WORLDS 2026 LPL #2 BILIBILI GAMING 官方首发五虎 BIN XUN KNIGHT VIPER ON"
                  className="w-full h-full object-contain"
                />
                <span className="
                  absolute top-2 left-2.5 px-2 py-0.5 rounded bg-[#0c0906]/90 border border-[#c8aa78]/45
                  text-[10px] font-extrabold text-[#f5d5a7]
                ">
                  官方导播图例 · S16 全勤首发五虎
                </span>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-[#c8aa78]/45 bg-[#090705] flex items-center justify-center">
                <img
                  src="assets/aistudio/____4_31155c5e.png"
                  alt="26 TRIOS UNITED SEMIS SECURED BIN XUN ON"
                  className="w-full h-full object-contain"
                />
                <span className="
                  absolute top-2 left-2.5 px-2 py-0.5 rounded bg-[#0c0906]/90 border border-[#c8aa78]/45
                  text-[10px] font-extrabold text-[#f5d5a7]
                ">
                  官方导播图例 · BIN / XUN / ON 三进四强终夺冠
                </span>
              </div>
            </div>

            {/* 5 Starting Lineup Cards (BIN, XUN, KNIGHT, VIPER, ON) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 md:gap-[0.75vw] flex-1 min-h-0">
              {VERIFIED_STARTING_FIVE.map((player) => (
                <div
                  key={player.handle}
                  data-testid={`starter-card-${player.handle.toLowerCase()}`}
                  className="rounded-xl bg-gradient-to-b from-[#1a140d]/95 to-[#0d0a07]/95 border border-[#c8aa78]/45 p-3 md:p-[0.8vw] flex flex-col justify-between shadow-[0_8px_24px_rgba(0,0,0,0.85)]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="px-2 py-0.5 rounded bg-[#261e14] border border-[#c8aa78]/40 text-[10px] font-black text-[#f5d5a7]">
                        {player.roleNameCn}
                      </span>
                      <span className="text-[10px] font-extrabold text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        全勤首发
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between border-b border-[#c8aa78]/25 pb-1 mb-1.5">
                      <h4 className="font-broadcast-num text-2xl md:text-3xl text-white tracking-wider leading-none">
                        {player.handle}
                      </h4>
                      <span className="text-xs font-bold text-[#c8aa78]">
                        {player.playerNameCn}
                      </span>
                    </div>

                    <div className="mb-1.5 px-2 py-0.5 rounded bg-gradient-to-r from-[#d4b483]/20 to-[#f5d5a7]/10 border border-[#f5d5a7]/35 text-[11px] font-extrabold text-[#f5d5a7] text-center">
                      {player.milestoneTag}
                    </div>
                  </div>

                  <p className="text-[11px] md:text-[clamp(0.66rem,0.72vw,0.78rem)] text-white/85 leading-relaxed">
                    {player.verifiedHistory}
                  </p>

                  <div className="mt-1.5 pt-1 border-t border-[#c8aa78]/20 flex items-center justify-between text-[10px] text-[#c8aa78] font-semibold">
                    <span>WORLDS 2026 · LPL #2</span>
                    <span className="text-[#f5d5a7] font-bold">S16 CHAMPION</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Official Graphic #4 Section: TRIOS UNITED SEMIS SECURED (BIN · XUN · ON) */}
            <div className="rounded-xl bg-[#120e09]/95 border border-[#c8aa78]/45 p-2.5 md:p-[0.75vw] shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-[#f5d5a7]" />
                  <span className="text-xs md:text-sm font-black text-[#f5d5a7] tracking-wider uppercase">
                    TRIOS UNITED · BLG 三人并肩（BIN · XUN · ON）三次联手征战全球总决赛战绩
                  </span>
                </div>
                <span className="text-[11px] text-[#c8aa78]">
                  源自官方导播图例《26 TRIOS UNITED SEMIS SECURED》并更新 2026 夺冠结果
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {VERIFIED_TRIOS_MILESTONES.map((m) => (
                  <div
                    key={m.year}
                    className={`rounded-lg px-3 py-1.5 border flex items-center justify-between gap-3 ${
                      m.isChampion
                        ? 'bg-gradient-to-r from-[#3b2e1e] via-[#261d12] to-[#1a140d] border-[#f5d5a7] shadow-[0_0_18px_rgba(245,213,167,0.28)]'
                        : 'bg-[#090705]/90 border-[#c8aa78]/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-broadcast-num text-lg md:text-xl text-[#f5d5a7] leading-none">
                          {m.event}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/80 mt-0.5 leading-snug">
                        {m.detail}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded font-black text-sm md:text-lg shrink-0 ${
                        m.isChampion
                          ? 'bg-gradient-to-r from-[#d4b483] to-[#f5d5a7] text-[#14100a]'
                          : 'bg-[#241c12] text-[#f7efe2] border border-[#c8aa78]/35'
                      }`}
                    >
                      {m.result}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===============================================================
            PAGE 3: 26 BLG VS LCK IN BO5（完整 17 场官方 BO5 历史交锋表 · 图例 ____8）
           =============================================================== */}
        {safeIndex === 2 && (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-[0.9vw]">
            {/* Left 5 Columns: Official Broadcast Graphic ____8 & Opponent Breakdown */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-2.5 min-h-0">
              <div className="relative rounded-xl overflow-hidden border border-[#c8aa78]/45 bg-[#090705] flex-1 min-h-[160px] flex flex-col justify-between">
                <div className="flex-1 min-h-0 flex items-center justify-center p-1.5">
                  <img
                    src="assets/aistudio/____8_blg_vs_lck_bo5.png"
                    alt="26 BLG VS LCK IN BO5 官方历史战绩图例"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="bg-[#120e09]/95 border-t border-[#c8aa78]/30 px-3 py-2 shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#f5d5a7] text-[#14100a] text-[10px] font-black uppercase">
                      OFFICIAL RECORD · 2023–2026
                    </span>
                    <span className="text-[11px] font-bold text-[#f5d5a7]">
                      2026 全球总决赛连克 HLE / DK / T1 / GEN
                    </span>
                  </div>
                  <h4 className="text-xs md:text-sm font-black text-white mt-1">
                    BLG 在 BO5 中面对 LCK 队伍：17 战 12 胜 5 负 (70.6%)
                  </h4>
                </div>
              </div>

              {/* Opponent Breakdown Cards */}
              <div className="grid grid-cols-2 gap-2 shrink-0">
                <div className="rounded-lg bg-[#14100b]/95 border border-[#c8aa78]/35 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#c8aa78]">VS T1 (BO5)</span>
                    <span className="font-broadcast-num text-lg text-[#f5d5a7]">5 胜 2 负</span>
                  </div>
                  <p className="text-[10px] text-white/75 mt-0.5">
                    23 MSI (3:1) · 24 MSI (3:1 / 3:2) · 26 MSI (3:2) · 26 S16 四强 (3:1)
                  </p>
                </div>

                <div className="rounded-lg bg-[#14100b]/95 border border-[#c8aa78]/35 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#c8aa78]">VS GEN (BO5)</span>
                    <span className="font-broadcast-num text-lg text-[#f5d5a7]">3 胜 2 负</span>
                  </div>
                  <p className="text-[10px] text-white/75 mt-0.5">
                    23 MSI (3:0) · 23 S13 八强 (3:2) · 26 S16 总决赛 (3:1 夺冠)
                  </p>
                </div>

                <div className="rounded-lg bg-[#14100b]/95 border border-[#c8aa78]/35 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#c8aa78]">VS HLE (BO5+BO3)</span>
                    <span className="font-broadcast-num text-lg text-[#f5d5a7]">BO5 2胜1负</span>
                  </div>
                  <p className="text-[10px] text-white/75 mt-0.5">
                    24 S14 八强 (3:1) · 26 MSI 胜决 (3:1) · 另有 26 S16 十六强 BO3 (2:0)
                  </p>
                </div>

                <div className="rounded-lg bg-[#14100b]/95 border border-[#c8aa78]/35 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#c8aa78]">VS DK & BFX (BO5)</span>
                    <span className="font-broadcast-num text-lg text-[#f5d5a7]">2 胜 0 负</span>
                  </div>
                  <p className="text-[10px] text-white/75 mt-0.5">
                    26 S16 八强 (3:0 零封 DK) · 26 全球先锋赛 (3:2 胜 BFX)
                  </p>
                </div>
              </div>
            </div>

            {/* Right 7 Columns: All 17 Official BO5 Matches from ____8_blg_vs_lck_bo5.png */}
            <div className="lg:col-span-7 rounded-xl bg-[#120e09]/95 border border-[#c8aa78]/45 p-3 md:p-[0.9vw] flex flex-col justify-between min-h-0">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#c8aa78]/30 shrink-0">
                <span className="text-xs md:text-sm font-black text-[#f5d5a7] tracking-wider uppercase">
                  《26 BLG VS LCK IN BO5》官方 17 场完整交手清单（含 S16 决赛 3:1 GEN）
                </span>
                <span className="text-[11px] font-bold text-emerald-300">
                  金色高亮 = BLG 获胜 (12场)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 my-1 flex-1 min-h-0 content-between">
                {VERIFIED_BLG_VS_LCK_BO5_LIST.map((row) => (
                  <div
                    key={row.order}
                    className={`flex items-center justify-between px-2.5 py-1 rounded border text-xs ${
                      row.isS16Worlds
                        ? 'bg-gradient-to-r from-[#3b2e1e] to-[#241c12] border-[#f5d5a7] text-white font-black'
                        : row.isWin
                        ? 'bg-[#18120c] border-[#c8aa78]/35 text-[#f7efe2] font-bold'
                        : 'bg-[#0b0907] border-white/10 text-white/55 font-medium'
                    }`}
                  >
                    <span className="truncate pr-2">{row.eventStage}</span>
                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      <span
                        className={
                          row.isWin ? 'text-[#f5d5a7] font-black' : 'text-white/55'
                        }
                      >
                        {row.score}
                      </span>
                      <span className="w-8 text-right font-extrabold">{row.opponent}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===============================================================
            PAGE 4: GLOBAL POWER RANKINGS powered by AWS（官方图例 ____2 完整十强表）
           =============================================================== */}
        {safeIndex === 3 && (
          <div className="flex-1 min-h-0 rounded-xl bg-[#120e09]/95 border border-[#c8aa78]/45 p-3 md:p-[1vw] flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#c8aa78]/30 shrink-0">
              <div>
                <h3 className="text-xs sm:text-sm md:text-base font-black text-[#f5d5a7] tracking-wider uppercase">
                  GLOBAL POWER RANKINGS (POWERED BY AWS) · 官方全球战力榜前十完整名录
                </h3>
                <p className="text-[11px] text-[#c8aa78]">
                  数据完全对应官方导播图例：BLG 淘汰赛前以 52-13 (1578分) 并列第一，并在 S16 连续击败榜上 4 支 LCK 战队夺冠
                </p>
              </div>
              <span className="px-3 py-1 rounded-md bg-gradient-to-r from-[#d4b483] to-[#f5d5a7] text-[#14100a] text-xs font-black">
                BLG 最终夺冠累计战绩：55 胜 13 负
              </span>
            </div>

            <div className="flex-1 min-h-0 flex flex-col justify-between divide-y divide-[#c8aa78]/15 my-1">
              {/* Table Header */}
              <div className="grid grid-cols-12 items-center px-3 py-1 text-[11px] font-extrabold text-[#c8aa78] uppercase">
                <span className="col-span-1">POS</span>
                <span className="col-span-4">TEAM (官方战队名)</span>
                <span className="col-span-1 text-center">REGION</span>
                <span className="col-span-2 text-center">W - L (赛前基准)</span>
                <span className="col-span-1 text-right">POINTS</span>
                <span className="col-span-3 text-right">S16 全球总决赛交手与最终认证</span>
              </div>

              {VERIFIED_AWS_POWER_RANKINGS.map((row, idx) => (
                <div
                  key={idx}
                  className={`grid grid-cols-12 items-center px-3 py-1.5 rounded text-xs ${
                    row.isBlg
                      ? 'bg-gradient-to-r from-[#3b2e1e] via-[#261e14] to-[#1a140d] border border-[#f5d5a7] text-white font-black'
                      : row.defeatedByBlgScore
                      ? 'bg-[#18120c]/90 text-[#f7efe2] font-bold'
                      : 'text-white/75'
                  }`}
                >
                  <span className="col-span-1 font-broadcast-num text-base md:text-lg text-[#f5d5a7]">
                    {row.pos}
                  </span>
                  <span className="col-span-4 font-extrabold tracking-wide truncate">
                    {row.team}
                  </span>
                  <span className="col-span-1 text-center font-mono text-[11px] text-[#c8aa78]">
                    {row.region}
                  </span>
                  <span className="col-span-2 text-center font-mono text-sm">
                    {row.wlBeforeFinals}
                  </span>
                  <span className="col-span-1 text-right font-broadcast-num text-base md:text-lg text-[#f5d5a7]">
                    {row.points}
                  </span>
                  <span className="col-span-3 text-right">
                    {row.isBlg ? (
                      <span className="px-2 py-0.5 rounded bg-[#f5d5a7] text-[#14100a] text-[11px] font-black">
                        🏆 {row.s16Note}
                      </span>
                    ) : row.defeatedByBlgScore ? (
                      <span className="px-2 py-0.5 rounded bg-[#261e14] border border-[#f5d5a7]/45 text-[#f5d5a7] text-[11px] font-extrabold">
                        {row.s16Note}
                      </span>
                    ) : (
                      <span className="text-[11px] text-white/60">{row.s16Note}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================
          BOTTOM PROGRESS DOTS
         =================================================================== */}
      <div className="relative z-20 flex items-center justify-between pt-1.5 border-t border-[#c8aa78]/25 text-[11px] text-[#c8aa78] shrink-0">
        <span>
          数据来源：WORLDS 2026 官方导播赛事图例（AWS 全球战力榜 · 首发阵容 · 三人组四强纪录 · BLG VS LCK IN BO5 · 四场官方比分牌）
        </span>
        <div className="flex items-center gap-1.5">
          {BLG_TOURNAMENT_DATA_PAGES.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              aria-label={`切换到 ${p.title}`}
              onClick={() => onSelectPage(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === safeIndex ? 'w-7 bg-[#f5d5a7]' : 'w-2 bg-[#c8aa78]/35'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
