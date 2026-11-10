import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DanmakuMessage {
  id: string;
  text: string;
  author: string;
  team: 'GEN' | 'BLG' | 'NEUTRAL';
  color: string;
  timestamp: number;
  lane: number;
  likes: number;
}

export interface CheerState {
  GEN: number;
  BLG: number;
}

const initialDanmaku: DanmakuMessage[] = [
  {
    id: 'seed-1',
    text: 'BLG 冲啊！S16 总决赛为 LPL 捧杯！Knight 卓定天下！',
    author: 'LPL铁粉_阿泽',
    team: 'BLG',
    color: '#00d2ff',
    timestamp: Date.now() - 180000,
    lane: 0,
    likes: 88,
  },
  {
    id: 'seed-2',
    text: 'GEN Golden Road! Chovy vs Knight 中路宿命对决太燃了！',
    author: 'LCK_Watcher',
    team: 'GEN',
    color: '#f5b800',
    timestamp: Date.now() - 150000,
    lane: 1,
    likes: 64,
  },
  {
    id: 'seed-3',
    text: 'High Jump 这首 BP 战歌一响，世界赛决赛的压迫感直接拉满！',
    author: '峡谷导播员',
    team: 'NEUTRAL',
    color: '#ffffff',
    timestamp: Date.now() - 120000,
    lane: 2,
    likes: 112,
  },
  {
    id: 'seed-4',
    text: 'Bin 哥信誉分拉满！上路 Kiin vs Bin 绝对是火星撞地球！',
    author: '陈泽彬唯一指定粉丝',
    team: 'BLG',
    color: '#ff4d94',
    timestamp: Date.now() - 95000,
    lane: 3,
    likes: 95,
  },
  {
    id: 'seed-5',
    text: 'Ruler 尺帝重返世界赛决赛舞台，GEN 下路双人组太稳了！',
    author: 'GenG_Tiger',
    team: 'GEN',
    color: '#f5b800',
    timestamp: Date.now() - 70000,
    lane: 4,
    likes: 57,
  },
  {
    id: 'seed-6',
    text: 'THIS IS OUR MOMENT! 坐等周日凌晨 BO5 打满五局听战歌！',
    author: 'S16见证者',
    team: 'NEUTRAL',
    color: '#38bdf8',
    timestamp: Date.now() - 45000,
    lane: 0,
    likes: 134,
  },
  {
    id: 'seed-7',
    text: '给 BLG 献上漫天弹幕！为 LPL 搏至无憾！',
    author: 'Bilibili干杯',
    team: 'BLG',
    color: '#00d2ff',
    timestamp: Date.now() - 20000,
    lane: 2,
    likes: 146,
  },
  {
    id: 'seed-8',
    text: 'Canyon 野核对决 Xun 千珏，谁能控下第一条大龙？',
    author: '战术分析师',
    team: 'NEUTRAL',
    color: '#fbbf24',
    timestamp: Date.now() - 8000,
    lane: 1,
    likes: 49,
  },
];

let danmakuHistory: DanmakuMessage[] = [...initialDanmaku];
const cheerState: CheerState = {
  GEN: 14820,
  BLG: 18650,
};

async function startServer() {
  const app = express();
  app.use(express.json());

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const broadcast = (payload: unknown) => {
    const messageStr = JSON.stringify(payload);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  };

  const getActiveViewers = () => Math.max(1, wss.clients.size);

  wss.on('connection', (ws) => {
    // Send initial authoritative state to newly connected client
    ws.send(
      JSON.stringify({
        type: 'init',
        danmaku: danmakuHistory.slice(-80),
        cheers: cheerState,
        onlineCount: getActiveViewers(),
      })
    );

    broadcast({
      type: 'presence:updated',
      onlineCount: getActiveViewers(),
    });

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());

        if (data.type === 'danmaku:create') {
          const text = String(data.text || '').trim().slice(0, 120);
          if (!text) return;
          const id = String(data.id || `dm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
          if (danmakuHistory.some((m) => m.id === id)) return;

          const team: 'GEN' | 'BLG' | 'NEUTRAL' =
            data.team === 'GEN' || data.team === 'BLG' ? data.team : 'NEUTRAL';
          const newMsg: DanmakuMessage = {
            id,
            text,
            author: String(data.author || '召唤师').trim().slice(0, 24) || '召唤师',
            team,
            color: String(data.color || (team === 'GEN' ? '#f5b800' : team === 'BLG' ? '#00d2ff' : '#ffffff')),
            timestamp: Date.now(),
            lane: typeof data.lane === 'number' ? Math.abs(data.lane) % 5 : Math.floor(Math.random() * 5),
            likes: 1,
          };

          danmakuHistory.push(newMsg);
          if (danmakuHistory.length > 150) {
            danmakuHistory = danmakuHistory.slice(-150);
          }

          if (team === 'GEN') cheerState.GEN += 1;
          if (team === 'BLG') cheerState.BLG += 1;

          broadcast({
            type: 'danmaku:created',
            message: newMsg,
            cheers: cheerState,
          });
        } else if (data.type === 'danmaku:like') {
          const target = danmakuHistory.find((m) => m.id === data.id);
          if (target) {
            target.likes += 1;
            broadcast({
              type: 'danmaku:updated',
              message: target,
            });
          }
        } else if (data.type === 'cheer:increment') {
          const team = data.team === 'GEN' ? 'GEN' : data.team === 'BLG' ? 'BLG' : null;
          const amount = typeof data.amount === 'number' ? Math.min(Math.max(1, data.amount), 10) : 1;
          if (team) {
            cheerState[team] += amount;
            broadcast({
              type: 'cheer:updated',
              cheers: cheerState,
            });
          }
        }
      } catch (err) {
        console.error('Failed to process WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      broadcast({
        type: 'presence:updated',
        onlineCount: getActiveViewers(),
      });
    });
  });

  // REST fallback endpoints
  app.get('/api/state', (_req, res) => {
    res.json({
      danmaku: danmakuHistory.slice(-80),
      cheers: cheerState,
      onlineCount: getActiveViewers(),
    });
  });

  app.post('/api/danmaku', (req, res) => {
    const text = String(req.body?.text || '').trim().slice(0, 120);
    if (!text) {
      res.status(400).json({ error: '弹幕内容不能为空' });
      return;
    }
    const id = String(req.body?.id || `dm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    const existing = danmakuHistory.find((m) => m.id === id);
    if (existing) {
      res.json({ message: existing, cheers: cheerState });
      return;
    }

    const team: 'GEN' | 'BLG' | 'NEUTRAL' =
      req.body?.team === 'GEN' || req.body?.team === 'BLG' ? req.body.team : 'NEUTRAL';
    const newMsg: DanmakuMessage = {
      id,
      text,
      author: String(req.body?.author || '召唤师').trim().slice(0, 24) || '召唤师',
      team,
      color: String(req.body?.color || (team === 'GEN' ? '#f5b800' : team === 'BLG' ? '#00d2ff' : '#ffffff')),
      timestamp: Date.now(),
      lane: typeof req.body?.lane === 'number' ? Math.abs(req.body.lane) % 5 : Math.floor(Math.random() * 5),
      likes: 1,
    };

    danmakuHistory.push(newMsg);
    if (danmakuHistory.length > 150) {
      danmakuHistory = danmakuHistory.slice(-150);
    }

    if (team === 'GEN') cheerState.GEN += 1;
    if (team === 'BLG') cheerState.BLG += 1;

    broadcast({
      type: 'danmaku:created',
      message: newMsg,
      cheers: cheerState,
    });

    res.json({ message: newMsg, cheers: cheerState });
  });

  app.post('/api/cheer', (req, res) => {
    const team = req.body?.team === 'GEN' ? 'GEN' : req.body?.team === 'BLG' ? 'BLG' : null;
    if (!team) {
      res.status(400).json({ error: '无效战队' });
      return;
    }
    cheerState[team] += 1;
    broadcast({
      type: 'cheer:updated',
      cheers: cheerState,
    });
    res.json({ cheers: cheerState });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Worlds 2026 Grand Finals Broadcast Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
