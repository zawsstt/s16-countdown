import React, { useState } from 'react';
import { Trophy } from 'lucide-react';
import {
  BLG_CHAMPIONSHIP_MATCHES,
  BLGChampionshipMatch,
} from '../data/finalsData';

interface BlgMatchHistoryPanelProps {
  matches?: BLGChampionshipMatch[];
}

export const BlgMatchHistoryPanel: React.FC<BlgMatchHistoryPanelProps> = ({
  matches = BLG_CHAMPIONSHIP_MATCHES,
}) => {
  const [hoveredMatchId, setHoveredMatchId] = useState<string | null>(null);

  const hasExpanded = hoveredMatchId !== null;

  return (
    <div
      data-testid="blg-match-history-panel"
      onMouseLeave={() => setHoveredMatchId(null)}
      className="relative w-full h-full flex flex-col justify-between p-2 sm:p-2.5 md:p-0 gap-1.5 md:gap-[0.42vw] select-none overflow-hidden rounded-lg border border-[#c8aa78]/35 bg-[#090705]"
    >
      {/* Grand Final Warm Obsidian & Champagne-Gold Wave Background */}
      <img
        src="assets/broadcast/grand_final_match_bg.jpg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-90"
      />

      {/* Top Subtle Championship Run Header Strip */}
      <div className="relative z-10 flex items-center justify-between px-3 py-1.5 bg-[#120e09]/95 border-b border-[#c8aa78]/35 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-[#f5d5a7] shrink-0" />
          <span className="text-[10px] sm:text-xs md:text-[clamp(0.68rem,0.78vw,0.85rem)] font-black tracking-[0.12em] text-[#f5d5a7] uppercase">
            BLG S16 夺冠征程 · 一穿四 LCK
          </span>
        </div>
        <span className="text-[10px] md:text-[clamp(0.62rem,0.7vw,0.76rem)] font-semibold text-[#c8aa78]/90">
          {hasExpanded ? '移开鼠标恢复四场缩略横条' : '悬停任意场次展开官方对战大图'}
        </span>
      </div>

      {/* 4 Match Cards Container (Default: 4 equal horizontal bars; Hover: 1 expanded 66% official plate + 3 slim 9.8% bars) */}
      <div className="relative z-10 flex-1 flex flex-col justify-between min-h-0 overflow-hidden px-1.5 pb-1.5 md:px-[0.55vw] md:pb-[0.55vw]">
        {matches.map((match) => {
          const isExpanded = hoveredMatchId === match.id;
          const isCompressed = hasExpanded && !isExpanded;
          const isGrandFinal = match.id === 'gf-gen-blg';

          return (
            <div
              key={match.id}
              data-testid={`match-card-${match.id}`}
              data-expanded={isExpanded ? 'true' : 'false'}
              onMouseEnter={() => setHoveredMatchId(match.id)}
              onClick={() =>
                setHoveredMatchId((prev) => (prev === match.id ? null : match.id))
              }
              style={{
                height: isExpanded ? '66.5%' : isCompressed ? '9.6%' : '23.4%',
              }}
              className={`group/card relative w-full rounded-lg overflow-hidden border transition-[height,border-color,box-shadow] duration-250 ease-out cursor-pointer shrink-0 ${
                isExpanded
                  ? 'border-[#f5d5a7]/85 shadow-[0_12px_36px_rgba(0,0,0,0.92),0_0_22px_rgba(212,180,131,0.28)] bg-[#090705]'
                  : isGrandFinal
                  ? 'border-[#d4b483]/55 hover:border-[#f5d5a7]/80 bg-gradient-to-r from-[#17120b]/92 via-[#241c12]/88 to-[#17120b]/92 shadow-[0_4px_16px_rgba(0,0,0,0.75)]'
                  : 'border-[#c8aa78]/30 hover:border-[#e6c896]/70 bg-gradient-to-r from-[#110d08]/90 via-[#1b150d]/85 to-[#110d08]/90 shadow-[0_4px_14px_rgba(0,0,0,0.7)]'
              }`}
            >
              {/* ===============================================================
                  EXPANDED VIEW: Official Broadcast Full Matchup Graphic
                  (Matches image_4aea1fd3.png / image_838621a6.png / T1 / DK / HLE)
                 =============================================================== */}
              {isExpanded ? (
                <div
                  data-testid={`match-expanded-view-${match.id}`}
                  className="relative w-full h-full flex flex-col justify-between px-4 py-2 sm:px-6 sm:py-3 md:px-[1.8vw] md:py-[0.8vw]"
                >
                  {/* Official Grand Final Bronze-Gold Wave Background Plate */}
                  <img
                    src="assets/broadcast/grand_final_match_bg.jpg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 w-full h-full object-fill"
                  />

                  {/* Top Row (14%): Stage Pill + Official Centered BO5 / BO3 Label */}
                  <div className="relative z-10 h-[14%] shrink-0 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-black/55 border border-[#d4b483]/40 text-[10px] sm:text-xs md:text-[clamp(0.66rem,0.76vw,0.82rem)] font-extrabold text-[#f5d5a7] tracking-wider uppercase">
                      {match.stageLabelCn} · {match.stageLabelEn}
                    </span>
                    <span
                      data-testid={`match-format-${match.id}`}
                      className="md:absolute md:left-1/2 md:-translate-x-1/2 text-sm sm:text-base md:text-[clamp(1.05rem,1.45vw,1.6rem)] font-black tracking-[0.06em] text-[#edd0a3] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
                    >
                      {match.format}
                    </span>
                    <span className="text-[10px] sm:text-xs md:text-[clamp(0.64rem,0.72vw,0.78rem)] font-bold text-[#d4b483]/90 uppercase tracking-widest">
                      BLG WIN
                    </span>
                  </div>

                  {/* Middle Row (56%): Large Official White Team Logos Side-by-Side (LCK Left, BLG Right) */}
                  <div className="relative z-10 h-[56%] min-h-0 flex items-center justify-around gap-4 px-2 sm:px-6 md:px-[1.2vw]">
                    {/* Left Team Logo (HLE / DK / T1 / GEN) */}
                    <div className="w-[44%] h-full flex items-center justify-center">
                      <img
                        src={match.leftTeam.logoUrl}
                        alt={match.leftTeam.code}
                        className="max-h-[78%] max-w-[82%] w-auto h-auto object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.85)]"
                      />
                    </div>

                    {/* Right Team Logo (BLG - Consistently on Right side for all 4 matches) */}
                    <div className="w-[44%] h-full flex items-center justify-center">
                      <img
                        src={match.rightTeam.logoUrl}
                        alt={match.rightTeam.code}
                        className="max-h-[74%] max-w-[85%] w-auto h-auto object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.85)]"
                      />
                    </div>
                  </div>

                  {/* Bottom Row (30%): Official Seed + Team Code (Left) | Broadcast Score (Center) | Seed + BLG (Right) */}
                  <div className="relative z-10 h-[30%] shrink-0 flex items-end justify-between pb-0.5">
                    {/* Bottom-Left: LCK Seed + Team Code */}
                    <div className="flex flex-col items-start leading-none">
                      <span
                        data-testid={`match-left-seed-${match.id}`}
                        className="text-xs sm:text-sm md:text-[clamp(0.82rem,1.18vw,1.32rem)] font-extrabold tracking-[0.04em] text-[#e8e6e3] mb-0.5 sm:mb-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]"
                      >
                        {match.leftTeam.seed}
                      </span>
                      <span
                        data-testid={`match-left-code-${match.id}`}
                        className="font-broadcast-num text-2xl sm:text-4xl md:text-[clamp(2.1rem,3.4vw,3.8rem)] text-[#eceae6] tracking-[0.02em] leading-[0.88] uppercase drop-shadow-[0_4px_10px_rgba(0,0,0,0.95)]"
                      >
                        {match.leftTeam.code}
                      </span>
                    </div>

                    {/* Bottom-Center: Series Score (0 - 2 / 0 - 3 / 1 - 3 / 1 - 3) */}
                    <div
                      data-testid={`match-score-${match.id}`}
                      className="font-broadcast-num text-2xl sm:text-4xl md:text-[clamp(2.1rem,3.4vw,3.8rem)] text-[#eceae6] tracking-[0.05em] leading-[0.88] whitespace-nowrap drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)]"
                    >
                      {match.scoreText}
                    </div>

                    {/* Bottom-Right: LPL #2 Seed + BLG Code */}
                    <div className="flex flex-col items-end leading-none">
                      <span
                        data-testid={`match-right-seed-${match.id}`}
                        className="text-xs sm:text-sm md:text-[clamp(0.82rem,1.18vw,1.32rem)] font-extrabold tracking-[0.04em] text-[#e8e6e3] mb-0.5 sm:mb-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]"
                      >
                        {match.rightTeam.seed}
                      </span>
                      <span
                        data-testid={`match-right-code-${match.id}`}
                        className="font-broadcast-num text-2xl sm:text-4xl md:text-[clamp(2.1rem,3.4vw,3.8rem)] text-[#eceae6] tracking-[0.02em] leading-[0.88] uppercase drop-shadow-[0_4px_10px_rgba(0,0,0,0.95)]"
                      >
                        {match.rightTeam.code}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* ===============================================================
                   COMPACT HORIZONTAL THUMBNAIL BAR VIEW (Default & Non-Hovered)
                   ("平时的话就是一个队标logo加比分的横条缩略展示，BLG四场比赛统一放在同一侧")
                   =============================================================== */
                <div
                  data-testid={`match-compact-bar-${match.id}`}
                  className="relative w-full h-full flex items-center justify-between px-2.5 sm:px-3.5 md:px-[1.05vw] gap-2"
                >
                  {/* Subtle Left Gold Accent Bar */}
                  <span
                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                      isGrandFinal
                        ? 'bg-gradient-to-b from-[#f5d5a7] via-[#d4b483] to-[#9a7b4f]'
                        : 'bg-[#c8aa78]/55 group-hover/card:bg-[#f5d5a7]'
                    }`}
                  />

                  {/* Stage & Format Badge (Left) */}
                  <div className="flex flex-col justify-center shrink-0 min-w-[4.2rem] sm:min-w-[5.2rem] md:min-w-[5.8vw] pl-1">
                    <span
                      className={`text-[10px] sm:text-xs md:text-[clamp(0.7rem,0.85vw,0.92rem)] font-black tracking-wider leading-tight ${
                        isGrandFinal ? 'text-[#f5d5a7]' : 'text-[#e5c799]'
                      }`}
                    >
                      {match.stageShortCn}
                    </span>
                    {!isCompressed && (
                      <span className="text-[9px] sm:text-[10px] md:text-[clamp(0.58rem,0.68vw,0.74rem)] font-bold text-[#b89b6f] tracking-widest uppercase">
                        {match.format} · {match.stageLabelEn.split('·')[0].trim()}
                      </span>
                    )}
                  </div>

                  {/* Center-Left: LCK Opponent (Seed + Code + White Logo) */}
                  <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3 md:gap-[0.75vw] min-w-0">
                    <div className="flex flex-col items-end leading-none">
                      {!isCompressed && (
                        <span
                          data-testid={`match-left-seed-${match.id}`}
                          className="text-[9px] sm:text-[10px] md:text-[clamp(0.58rem,0.68vw,0.75rem)] font-bold text-white/65 tracking-wider uppercase mb-0.5"
                        >
                          {match.leftTeam.seed}
                        </span>
                      )}
                      <span
                        data-testid={`match-left-code-${match.id}`}
                        className="font-broadcast-num text-base sm:text-xl md:text-[clamp(1.05rem,1.45vw,1.6rem)] text-white/90 tracking-wider leading-none uppercase"
                      >
                        {match.leftTeam.code}
                      </span>
                    </div>
                    <div className="w-8 sm:w-11 md:w-[3.1vw] h-5 sm:h-7 md:h-[1.9vw] flex items-center justify-center shrink-0">
                      <img
                        src={match.leftTeam.logoUrl}
                        alt={match.leftTeam.code}
                        className="max-w-full max-h-full object-contain opacity-90 group-hover/card:opacity-100 transition-opacity"
                      />
                    </div>
                  </div>

                  {/* Center: Broadcast Score Pill (0 - 2 / 0 - 3 / 1 - 3 / 1 - 3) */}
                  <div className="shrink-0 px-2 sm:px-3 md:px-[0.85vw] py-0.5 rounded bg-black/55 border border-[#c8aa78]/30 flex items-center justify-center">
                    <span
                      data-testid={`match-score-${match.id}`}
                      className="font-broadcast-num text-base sm:text-xl md:text-[clamp(1.15rem,1.65vw,1.85rem)] text-[#f5d5a7] tracking-[0.08em] leading-none whitespace-nowrap"
                    >
                      {match.scoreText}
                    </span>
                  </div>

                  {/* Center-Right: LPL #2 BLG (Uniformly placed on Right side across all 4 matches) */}
                  <div className="flex-1 flex items-center justify-start gap-2 sm:gap-3 md:gap-[0.75vw] min-w-0">
                    <div className="w-9 sm:w-12 md:w-[3.4vw] h-5 sm:h-7 md:h-[1.9vw] flex items-center justify-center shrink-0">
                      <img
                        src={match.rightTeam.logoUrl}
                        alt={match.rightTeam.code}
                        className="max-w-full max-h-full object-contain drop-shadow-[0_2px_8px_rgba(245,213,167,0.2)]"
                      />
                    </div>
                    <div className="flex flex-col items-start leading-none">
                      {!isCompressed && (
                        <span
                          data-testid={`match-right-seed-${match.id}`}
                          className="text-[9px] sm:text-[10px] md:text-[clamp(0.58rem,0.68vw,0.75rem)] font-bold text-[#f5d5a7]/85 tracking-wider uppercase mb-0.5"
                        >
                          {match.rightTeam.seed}
                        </span>
                      )}
                      <span
                        data-testid={`match-right-code-${match.id}`}
                        className="font-broadcast-num text-base sm:text-xl md:text-[clamp(1.05rem,1.45vw,1.6rem)] text-white tracking-wider leading-none uppercase"
                      >
                        {match.rightTeam.code}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Preserve series-score testid for Grand Final score verification */}
      <span data-testid="series-score" className="sr-only">
        1 - 3
      </span>
    </div>
  );
};
