import { RoomDto, ParticipantDto, ChatMessageDto, CorrectionDto, HelpAlertDto, CreateRoomDto, UpdateRoomDto } from '@englishtalks/shared';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface InternalParticipant extends ParticipantDto {
  socketId: string;
}

export interface InternalRoom extends Omit<RoomDto, 'participants'> {
  participants: Map<string, InternalParticipant>;
  messages: ChatMessageDto[];
}

class RoomStore {
  private rooms: Map<string, InternalRoom> = new Map();
  private helpRequests: Map<string, HelpAlertDto> = new Map();
  private socketToRoom: Map<string, string> = new Map(); // socketId -> roomCode

  constructor() {
    this.seedDefaultRooms();
    this.hydrateFromDatabase();
  }

  private seedDefaultRooms() {
    const defaults: Array<{ code: string; title: string; topicPrompt: string; maxCapacity: number }> = [
      {
        code: 'ROOM-101',
        title: 'Introductions & Hobbies',
        topicPrompt: 'What is your favorite hobby and how did you get started with it?',
        maxCapacity: 4,
      },
      {
        code: 'ROOM-102',
        title: 'Travel & Dream Places',
        topicPrompt: 'If you could travel anywhere in the world right now, where would you go and why?',
        maxCapacity: 4,
      },
      {
        code: 'ROOM-103',
        title: 'Technology & Future',
        topicPrompt: 'How do you think artificial intelligence will change education and jobs in the next 5 years?',
        maxCapacity: 4,
      },
      {
        code: 'ROOM-104',
        title: 'Student Life at IFES',
        topicPrompt: 'Describe a typical day of your studies at IFES and what you enjoy the most.',
        maxCapacity: 4,
      },
    ];

    for (const r of defaults) {
      if (!this.rooms.has(r.code)) {
        this.rooms.set(r.code, {
          id: `room-${r.code.toLowerCase()}`,
          code: r.code,
          title: r.title,
          topicPrompt: r.topicPrompt,
          occupancy: 0,
          maxCapacity: r.maxCapacity,
          isActive: true,
          participants: new Map(),
          messages: [],
        });
      }
    }
  }

  // Hidrata as salas e mensagens preservadas no PostgreSQL
  private async hydrateFromDatabase() {
    try {
      const dbRooms = await prisma.room.findMany({
        where: { isActive: true },
        include: {
          messages: {
            include: {
              sender: true,
              corrections: {
                include: { monitor: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (dbRooms && dbRooms.length > 0) {
        for (const dbR of dbRooms) {
          const messages: ChatMessageDto[] = dbR.messages.map(m => ({
            id: m.id,
            roomId: dbR.id,
            roomCode: dbR.code,
            senderId: m.senderId,
            senderNickname: m.sender.nickname,
            originalText: m.originalText,
            wordCount: m.wordCount,
            createdAt: m.createdAt.toISOString(),
            correction: m.corrections[0] ? {
              id: m.corrections[0].id,
              messageId: m.id,
              monitorId: m.corrections[0].monitorId,
              monitorName: m.corrections[0].monitor.nickname || 'Monitor IFES',
              correctedText: m.corrections[0].correctedText,
              explanationRule: m.corrections[0].explanationRule,
              shortcutTag: m.corrections[0].shortcutTag || undefined,
              createdAt: m.corrections[0].createdAt.toISOString(),
            } : undefined,
          }));

          const existing = this.rooms.get(dbR.code);
          if (existing) {
            existing.title = dbR.title;
            existing.topicPrompt = dbR.topicPrompt;
            existing.maxCapacity = dbR.maxCapacity;
            existing.messages = messages;
          } else {
            this.rooms.set(dbR.code, {
              id: dbR.id,
              code: dbR.code,
              title: dbR.title,
              topicPrompt: dbR.topicPrompt,
              occupancy: 0,
              maxCapacity: dbR.maxCapacity,
              isActive: dbR.isActive,
              participants: new Map(),
              messages,
            });
          }
        }
      }
    } catch {
      // Caso o banco PostgreSQL esteja indisponível, mantém estado em memória
    }
  }

  private toRoomDto(r: InternalRoom): RoomDto {
    return {
      id: r.id,
      code: r.code,
      title: r.title,
      topicPrompt: r.topicPrompt,
      occupancy: r.participants.size,
      maxCapacity: r.maxCapacity,
      isActive: r.isActive,
      participants: Array.from(r.participants.values()).map(({ socketId: _s, ...p }) => p),
    };
  }

  public getAllRooms(): RoomDto[] {
    return Array.from(this.rooms.values()).map(r => this.toRoomDto(r));
  }

  public getRoom(roomCode: string): InternalRoom | undefined {
    return this.rooms.get(roomCode.toUpperCase());
  }

  public getRoomBySocket(socketId: string): InternalRoom | undefined {
    const code = this.socketToRoom.get(socketId);
    if (!code) return undefined;
    return this.rooms.get(code);
  }

  public async createRoom(dto: CreateRoomDto): Promise<RoomDto | { error: string }> {
    let code = (dto.code || '').trim().toUpperCase();
    if (!code) {
      code = `W${Math.floor(100 + Math.random() * 900)}`;
      while (this.rooms.has(code)) {
        code = `W${Math.floor(100 + Math.random() * 900)}`;
      }
    } else if (this.rooms.has(code)) {
      return { error: `Já existe uma sala com o código ${code}.` };
    }

    const internalRoom: InternalRoom = {
      id: `room-${code.toLowerCase()}`,
      code,
      title: dto.title.trim(),
      topicPrompt: dto.topicPrompt.trim(),
      occupancy: 0,
      maxCapacity: dto.maxCapacity || 4,
      isActive: true,
      participants: new Map(),
      messages: [],
    };

    this.rooms.set(code, internalRoom);

    // Persistência no PostgreSQL
    try {
      const created = await prisma.room.create({
        data: {
          code,
          title: internalRoom.title,
          topicPrompt: internalRoom.topicPrompt,
          maxCapacity: internalRoom.maxCapacity,
          isActive: true,
        },
      });
      internalRoom.id = created.id;
    } catch (err) {
      console.warn('[RoomStore] Aviso: Persistência DB na criação:', err);
    }

    return this.toRoomDto(internalRoom);
  }

  public async updateRoom(roomCode: string, dto: UpdateRoomDto): Promise<RoomDto | { error: string }> {
    const code = roomCode.trim().toUpperCase();
    const room = this.rooms.get(code);
    if (!room) {
      return { error: 'Sala não encontrada.' };
    }

    if (dto.title) room.title = dto.title.trim();
    if (dto.topicPrompt) room.topicPrompt = dto.topicPrompt.trim();
    if (dto.maxCapacity) room.maxCapacity = dto.maxCapacity;

    // Persistência no PostgreSQL
    try {
      await prisma.room.update({
        where: { code },
        data: {
          title: room.title,
          topicPrompt: room.topicPrompt,
          maxCapacity: room.maxCapacity,
        },
      });
    } catch (err) {
      console.warn('[RoomStore] Aviso: Persistência DB na atualização:', err);
    }

    return this.toRoomDto(room);
  }

  public async deleteRoom(roomCode: string): Promise<{ success: boolean; affectedSockets: string[]; error?: string }> {
    const code = roomCode.trim().toUpperCase();
    const room = this.rooms.get(code);
    if (!room) {
      return { success: false, error: 'Sala não encontrada.', affectedSockets: [] };
    }

    const affectedSockets = Array.from(room.participants.keys());
    for (const sId of affectedSockets) {
      this.socketToRoom.delete(sId);
    }

    // Limpa chamados de ajuda associados à sala
    for (const [reqId, alert] of this.helpRequests.entries()) {
      if (alert.roomCode === code) {
        this.helpRequests.delete(reqId);
      }
    }

    this.rooms.delete(code);

    // Persistência no PostgreSQL:
    // A deleção da sala apaga automaticamente todas as mensagens vinculadas em cascata (ON DELETE CASCADE)
    try {
      await prisma.room.delete({
        where: { code },
      });
    } catch (err) {
      console.warn('[RoomStore] Aviso: Persistência DB na exclusão (cascade):', err);
    }

    return { success: true, affectedSockets };
  }

  public joinRoom(roomCode: string, socketId: string, nickname: string): { room: RoomDto; user: ParticipantDto } | { error: string } {
    const code = roomCode.trim().toUpperCase();
    let room = this.rooms.get(code);

    if (!room) {
      room = {
        id: `room-${code.toLowerCase()}`,
        code,
        title: `Sala Temática ${code}`,
        topicPrompt: 'Introduce yourself to your partner and share what you hope to learn today!',
        occupancy: 0,
        maxCapacity: 4,
        isActive: true,
        participants: new Map(),
        messages: [],
      };
      this.rooms.set(code, room);
    }

    if (room.participants.size >= room.maxCapacity) {
      return { error: 'Esta sala já atingiu a capacidade máxima de ocupação.' };
    }

    const participant: InternalParticipant = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      nickname: nickname.trim(),
      role: 'student',
      joinedAt: new Date().toISOString(),
      socketId,
    };

    room.participants.set(socketId, participant);
    room.occupancy = room.participants.size;
    this.socketToRoom.set(socketId, code);

    // Registra participante no PostgreSQL
    prisma.user.upsert({
      where: { id: participant.id },
      update: { lastActive: new Date() },
      create: {
        id: participant.id,
        nickname: participant.nickname,
        role: 'STUDENT',
      },
    }).catch(() => {});

    return {
      room: this.toRoomDto(room),
      user: {
        id: participant.id,
        nickname: participant.nickname,
        role: participant.role,
        joinedAt: participant.joinedAt,
      },
    };
  }

  public leaveRoom(socketId: string): { roomCode?: string; nickname?: string; newOccupancy?: number } {
    const code = this.socketToRoom.get(socketId);
    if (!code) return {};

    const room = this.rooms.get(code);
    this.socketToRoom.delete(socketId);

    if (!room) return {};

    const participant = room.participants.get(socketId);
    const nickname = participant?.nickname;
    room.participants.delete(socketId);
    room.occupancy = room.participants.size;

    return {
      roomCode: code,
      nickname,
      newOccupancy: room.occupancy,
    };
  }

  public async addMessage(roomCode: string, socketId: string, text: string): Promise<ChatMessageDto | undefined> {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return undefined;

    const participant = room.participants.get(socketId);
    const senderId = participant ? participant.id : 'unknown';
    const senderNickname = participant ? participant.nickname : 'Anonymous';

    const words = text.trim().split(/\s+/).filter(w => w.length > 0);

    const message: ChatMessageDto = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      roomId: room.id,
      roomCode: room.code,
      senderId,
      senderNickname,
      originalText: text.trim(),
      wordCount: words.length,
      createdAt: new Date().toISOString(),
    };

    room.messages.push(message);

    // Preservação relacional no PostgreSQL (ligada estritamente à sala)
    try {
      await prisma.user.upsert({
        where: { id: senderId },
        update: { lastActive: new Date() },
        create: {
          id: senderId,
          nickname: senderNickname,
          role: 'STUDENT',
        },
      });

      const dbRoom = await prisma.room.findUnique({ where: { code: room.code } });
      if (dbRoom) {
        await prisma.chatMessage.create({
          data: {
            id: message.id,
            roomId: dbRoom.id,
            senderId,
            originalText: message.originalText,
            wordCount: message.wordCount,
            createdAt: new Date(message.createdAt),
          },
        });
      }
    } catch {
      // Continua em memória
    }

    return message;
  }

  public async addMonitorMessage(roomCode: string, text: string): Promise<ChatMessageDto | undefined> {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return undefined;

    const words = text.trim().split(/\s+/).filter(w => w.length > 0);

    const message: ChatMessageDto = {
      id: `msg-mon-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      roomId: room.id,
      roomCode: room.code,
      senderId: 'monitor-ifes',
      senderNickname: 'Monitor IFES',
      originalText: text.trim(),
      wordCount: words.length,
      createdAt: new Date().toISOString(),
    };

    room.messages.push(message);

    // Preservação no PostgreSQL
    try {
      await prisma.user.upsert({
        where: { id: 'monitor-ifes' },
        update: { lastActive: new Date() },
        create: {
          id: 'monitor-ifes',
          nickname: 'Monitor IFES',
          role: 'MONITOR',
        },
      });

      const dbRoom = await prisma.room.findUnique({ where: { code: room.code } });
      if (dbRoom) {
        await prisma.chatMessage.create({
          data: {
            id: message.id,
            roomId: dbRoom.id,
            senderId: 'monitor-ifes',
            originalText: message.originalText,
            wordCount: message.wordCount,
            createdAt: new Date(message.createdAt),
          },
        });
      }
    } catch {
      // Continua em memória
    }

    return message;
  }

  public getRoomMessages(roomCode: string): ChatMessageDto[] {
    const room = this.rooms.get(roomCode.toUpperCase());
    return room ? room.messages : [];
  }

  public applyCorrection(messageId: string, monitorId: string, monitorName: string, correctedText: string, explanationRule: string, shortcutTag?: string): { roomCode: string; correction: CorrectionDto } | undefined {
    for (const [roomCode, room] of this.rooms.entries()) {
      const msg = room.messages.find(m => m.id === messageId);
      if (msg) {
        const correction: CorrectionDto = {
          id: `corr-${Date.now()}`,
          messageId,
          monitorId,
          monitorName,
          correctedText,
          explanationRule,
          shortcutTag,
          createdAt: new Date().toISOString(),
        };
        msg.correction = correction;

        // Persistência da correção no PostgreSQL
        prisma.user.upsert({
          where: { id: monitorId },
          update: { lastActive: new Date() },
          create: {
            id: monitorId,
            nickname: monitorName,
            role: 'MONITOR',
          },
        }).then(() => {
          return prisma.grammarCorrection.create({
            data: {
              id: correction.id,
              messageId,
              monitorId,
              correctedText,
              explanationRule,
              shortcutTag: shortcutTag || null,
            },
          });
        }).catch(() => {});

        return { roomCode, correction };
      }
    }
    return undefined;
  }

  public createHelpRequest(socketId: string): HelpAlertDto | { error: string } {
    const code = this.socketToRoom.get(socketId);
    if (!code) return { error: 'Usuário não está em nenhuma sala ativa.' };

    const room = this.rooms.get(code);
    if (!room) return { error: 'Sala não encontrada.' };

    const student = room.participants.get(socketId);
    if (!student) return { error: 'Participante não encontrado.' };

    const requestId = `help-${Date.now()}`;
    const alert: HelpAlertDto = {
      requestId,
      roomId: room.id,
      roomCode: room.code,
      roomTitle: room.title,
      studentId: student.id,
      studentNickname: student.nickname,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.helpRequests.set(requestId, alert);
    return alert;
  }

  public getPendingHelpRequests(): HelpAlertDto[] {
    return Array.from(this.helpRequests.values()).filter(h => h.status === 'pending');
  }

  public updateHelpStatus(requestId: string, status: 'in_progress' | 'resolved', monitorName?: string): HelpAlertDto | undefined {
    const alert = this.helpRequests.get(requestId);
    if (!alert) return undefined;

    alert.status = status;
    if (monitorName) alert.attendedByName = monitorName;
    return alert;
  }

  public updateTopic(roomCode: string, newTopic: string): boolean {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return false;
    room.topicPrompt = newTopic;

    prisma.room.update({
      where: { code: room.code },
      data: { topicPrompt: newTopic },
    }).catch(() => {});

    return true;
  }
}

export const roomStore = new RoomStore();
