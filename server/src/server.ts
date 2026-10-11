import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents } from '@englishtalks/shared';
import { setupSocketHandlers } from './sockets/socketManager.js';
import { roomStore } from './services/roomStore.js';
import { dictionaryService } from './services/dictionaryService.js';
import { authService } from './services/authService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Middleware de Autenticação Segura para Administrador
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso restrito ao administrador. Token ausente.' });
  }

  const token = authHeader.split(' ')[1];
  const adminUser = authService.validateToken(token);
  if (!adminUser) {
    return res.status(401).json({ error: 'Sessão administrativa inválida ou expirada.' });
  }

  (req as any).adminUser = adminUser;
  next();
}

// Rotas REST
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Wazzup (EnglishTalks) API',
  });
});

app.get('/api/rooms', (_req: Request, res: Response) => {
  res.json(roomStore.getAllRooms());
});

app.get('/api/rooms/:roomCode/messages', (req: Request, res: Response) => {
  const { roomCode } = req.params;
  const messages = roomStore.getRoomMessages(roomCode);
  res.json(messages);
});

import { translationService } from './services/translationService.js';

app.get('/api/dictionary/:word', async (req: Request, res: Response) => {
  const { word } = req.params;
  const result = await dictionaryService.lookup(word);
  if (!result) {
    return res.status(404).json({ error: 'Palavra não encontrada ou serviço indisponível.' });
  }
  return res.json(result);
});

app.post('/api/translate', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Texto não fornecido para tradução.' });
  }

  const translated = await translationService.translate(text);
  return res.json({ original: text, translated });
});

const httpServer = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
  transports: ['websocket', 'polling'], // Fallback automático para redes restritas do IFES
});

setupSocketHandlers(io);

// Rotas Administrativas com Proteção
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios.' });
  }

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const result = authService.login(username, password, clientIp);

  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }

  return res.json({ token: result.token, user: result.user });
});

app.get('/api/admin/me', requireAdmin, (req: Request, res: Response) => {
  return res.json({ user: (req as any).adminUser });
});

app.post('/api/admin/logout', requireAdmin, (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    authService.logout(token);
  }
  return res.json({ success: true, message: 'Sessão encerrada com sucesso.' });
});

// Admin - Criar Nova Sala (persistida e monitorada)
app.post('/api/admin/rooms', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { code, title, topicPrompt, maxCapacity } = req.body;
    if (!title || !topicPrompt) {
      return res.status(400).json({ error: 'Título da sala e descrição/tópico são obrigatórios.' });
    }

    const result = await roomStore.createRoom({
      code: code ? String(code).trim().toUpperCase() : undefined,
      title: String(title).trim(),
      topicPrompt: String(topicPrompt).trim(),
      maxCapacity: maxCapacity ? Number(maxCapacity) : 4,
    });

    if ('error' in result) {
      return res.status(400).json({ error: result.error });
    }

    // Notifica monitores e clientes
    io.emit('monitor:rooms_overview', roomStore.getAllRooms());
    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro interno ao criar sala.' });
  }
});

// Admin - Atualizar Sala (título, descrição/tópico, capacidade)
app.put('/api/admin/rooms/:roomCode', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { roomCode } = req.params;
    const { title, topicPrompt, maxCapacity } = req.body;

    const result = await roomStore.updateRoom(roomCode, {
      title: title ? String(title).trim() : undefined,
      topicPrompt: topicPrompt ? String(topicPrompt).trim() : undefined,
      maxCapacity: maxCapacity !== undefined ? Number(maxCapacity) : undefined,
    });

    if ('error' in result) {
      return res.status(404).json({ error: result.error });
    }

    // Notifica monitores e participantes da sala
    io.emit('monitor:rooms_overview', roomStore.getAllRooms());
    io.to(roomCode.toUpperCase()).emit('room:topic_changed', {
      roomCode: roomCode.toUpperCase(),
      newTopic: result.topicPrompt,
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro interno ao atualizar sala.' });
  }
});

// Admin - Excluir Sala e Conversas Vinculadas (Cascade no Banco)
app.delete('/api/admin/rooms/:roomCode', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { roomCode } = req.params;
    const result = await roomStore.deleteRoom(roomCode);

    if (!result.success) {
      return res.status(404).json({ error: result.error || 'Sala não encontrada.' });
    }

    // Avisa participantes conectados que a sala foi encerrada
    io.to(roomCode.toUpperCase()).emit('room:closed', {
      roomCode: roomCode.toUpperCase(),
      reason: 'Esta sala foi encerrada pelo administrador.',
    });

    // Atualiza painel dos monitores
    io.emit('monitor:rooms_overview', roomStore.getAllRooms());

    return res.json({ success: true, message: 'Sala e conversas vinculadas excluídas com sucesso.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro interno ao excluir sala.' });
  }
});

httpServer.listen(PORT, () => {
  console.log(`[Wazzup] Servidor rodando na porta ${PORT}`);
  console.log(`[Wazzup] Endpoint Socket.io pronto com fallback WebSockets/Polling`);
});
