/**
 * ============================================================================
 * WORLDS 2026 导播台 · 背景音乐播放列表
 * ============================================================================
 * 8 首官方战歌，按数组顺序循环播放（播完最后一首回到第一首）。
 * 特殊情况：从主页进入「赛事数据前瞻」时会强制随机换一首与当前不同的曲目。
 *
 * 所有文件已用 lame VBR(~160kbps) 重新编码（原始 320kbps 共 183MB → 87MB），
 * 既保证听感又不会让首播等待太久。如需替换，保持 44.1kHz / 立体声 / mp3 即可。
 */

export interface BgmTrack {
  id: string;
  /** HUD 上显示的曲名（尽量短） */
  title: string;
  /** 完整说明，鼠标悬停可见 */
  subtitle: string;
  url: string;
}

export const BGM_PLAYLIST: BgmTrack[] = [
  {
    id: 'calling-me-bad',
    title: 'Calling Me Bad',
    subtitle: 'WORLDS 2026 · Champion Select Music',
    url: 'assets/music/Worlds_2026_Champ_Select_Music_-_Calling_Me_Bad.mp3',
  },
  {
    id: 'dragon-of-the-west',
    title: 'Dragon Of The West',
    subtitle: 'WORLDS 2026 · Champion Select Music',
    url: 'assets/music/Worlds_2026_Champ_Select_Music_-_Dragon_Of_The_West.mp3',
  },
  {
    id: 'high-jump',
    title: 'High Jump',
    subtitle: 'WORLDS 2026 · Champion Select Music',
    url: 'assets/music/Worlds_2026_Champ_Select_Music_-_High_Jump.mp3',
  },
  {
    id: 'neon-anarchy',
    title: 'Neon Anarchy',
    subtitle: 'WORLDS 2026 · Champion Select Music',
    url: 'assets/music/Worlds_2026_Champ_Select_Music_-_Neon_Anarchy.mp3',
  },
  {
    id: 'track-5',
    title: 'Track 5',
    subtitle: 'WORLDS 2026 · Champion Select Music',
    url: 'assets/music/Worlds_2026_Champ_Select_Music_-_Track_5.mp3',
  },
  {
    id: 'win-it',
    title: 'Win It',
    subtitle: 'WORLDS 2026 · Draw Show Track',
    url: 'assets/music/Worlds_2026_Draw_Show_Track_-_Win_It.mp3',
  },
  {
    id: 'i-want-the-power',
    title: 'I Want The Power',
    subtitle: 'WORLDS 2026 · Players Entry Track',
    url: 'assets/music/Worlds_2026_Players_Entry_Track_-_I_Want_The_Power.mp3',
  },
  {
    id: 'kingdom-come',
    title: 'Kingdom Come',
    subtitle: 'WORLDS 2026 · Victory Music',
    url: 'assets/music/Worlds_2026_Victory_Music_-_Kingdom_Come.mp3',
  },
  // ---- 历届 Worlds 主题曲 ----
  {
    id: 'legends-never-die',
    title: 'Legends Never Die',
    subtitle: 'WORLDS 2017 · 主题曲 ft. Against The Current',
    url: 'assets/music/Legends_Never_Die_(ft._Against_The_Current)__Worlds_2017_-_League_of_Legends.mp3',
  },
  {
    id: 'take-over',
    title: 'Take Over',
    subtitle: 'WORLDS 2020 · 主题曲 ft. Jeremy McKinnon, MAX, Henry',
    url: 'assets/music/Take_Over_(ft._Jeremy_McKinnon_(A_Day_To_Remember),_MAX,_Henry)__Worlds_2020_-_League_of_Legends.mp3',
  },
  {
    id: 'burn-it-all-down',
    title: 'Burn It All Down',
    subtitle: 'WORLDS 2021 · 主题曲 ft. PVRIS',
    url: 'assets/music/Burn_It_All_Down_(ft._PVRIS)__Worlds_2021_-_League_of_Legends.mp3',
  },
  {
    id: 'heavy-is-the-crown',
    title: 'Heavy Is The Crown',
    subtitle: 'WORLDS 2024 · 主题曲 ft. Linkin Park',
    url: 'assets/music/Heavy_Is_The_Crown_ft._Linkin_Park_(Official_Music_Video)__League_of_Legends_Worlds_2024_Anthem.mp3',
  },
  {
    id: 'know-my-name',
    title: 'Know My Name',
    subtitle: 'WORLDS 2026 · 主题曲 ft. True Damage',
    url: 'assets/music/Know_My_Name_ft._True_Damage_(Official_Music_Video)__League_of_Legends_Worlds_2026_Anthem.mp3',
  },
  {
    id: 'kda-firestarter',
    title: 'K/DA - FIRESTARTER',
    subtitle: 'K/DA · ft. MIYEON & SOYEON of (G)I-DLE, Sophie Powers, Mimi Webb',
    url: 'assets/music/KDA_-_FIRESTARTER_ft._MIYEON_and_SOYEON_of_i-dle,_Sophie_Powers,_Mimi_Webb_(Official_Music_Video).mp3',
  },
];

export const BGM_TRACK_COUNT = BGM_PLAYLIST.length;

/** 顺序取下一首（循环） */
export function getNextTrackIndex(current: number): number {
  if (BGM_TRACK_COUNT <= 0) return 0;
  return (current + 1) % BGM_TRACK_COUNT;
}

/** 随机取一首「和当前不同」的曲目（用于进入赛事数据前瞻时强制换歌） */
export function getRandomDifferentTrackIndex(current: number): number {
  if (BGM_TRACK_COUNT <= 1) return 0;
  let next = current;
  while (next === current) {
    next = Math.floor(Math.random() * BGM_TRACK_COUNT);
  }
  return next;
}
