import { ChatMessageDto, CorrectionDto, HelpAlertDto } from './chat.js';
import { JoinRoomResult, RoomDto } from './room.js';

export interface ServerToClientEvents {
  // Salas & Ocupação
  'room:occupancy_updated': (data: { roomCode: string; occupancy: number; maxCapacity: number }) => void;
  'room:topic_changed': (data: { roomCode: string; newTopic: string }) => void;
  'room:user_joined': (data: { nickname: string; occupancy: number }) => void;
  'room:user_left': (data: { nickname: string; occupancy: number }) => void;
  'room:closed': (data: { roomCode: string; reason: string }) => void;

  // Mensagens
  'chat:message_received': (message: ChatMessageDto) => void;
  'chat:correction_applied': (correction: CorrectionDto) => void;

  // Suporte e Ajuda
  'help:status_changed': (data: { requestId: string; status: 'pending' | 'in_progress' | 'resolved' | 'cancelled'; monitorName?: string }) => void;
  
  // Painel de Monitoria
  'monitor:rooms_overview': (rooms: RoomDto[]) => void;
  'monitor:help_alert': (alert: HelpAlertDto) => void;
  'monitor:help_list': (requests: HelpAlertDto[]) => void;
}

export interface ClientToServerEvents {
  // Aluno
  'room:join': (payload: { roomCode: string; nickname: string }, callback: (response: JoinRoomResult) => void) => void;
  'room:leave': () => void;
  'chat:send': (payload: { text: string }) => void;
  'help:request': (callback: (response: { success: boolean; requestId?: string; error?: string }) => void) => void;

  // Monitor
  'monitor:subscribe': (callback: (response: { rooms: RoomDto[]; helpRequests: HelpAlertDto[] }) => void) => void;
  'monitor:unsubscribe': () => void;
  'monitor:correct_message': (payload: { messageId: string; correctedText: string; explanationRule: string; shortcutTag?: string }) => void;
  'monitor:attend_help': (payload: { requestId: string }, callback: (response: { success: boolean }) => void) => void;
  'monitor:resolve_help': (payload: { requestId: string }, callback: (response: { success: boolean }) => void) => void;
  'monitor:update_topic': (payload: { roomCode: string; newTopic: string }) => void;
  'monitor:send_message': (payload: { roomCode: string; text: string }) => void;
}
