export interface ParticipantDto {
  id: string;
  nickname: string;
  role: 'student' | 'monitor' | 'admin';
  joinedAt: string;
}

export interface RoomDto {
  id: string;
  code: string;
  title: string;
  topicPrompt: string;
  occupancy: number;
  maxCapacity: number;
  isActive: boolean;
  participants: ParticipantDto[];
}

export interface JoinRoomResult {
  success: boolean;
  error?: string;
  room?: RoomDto;
  user?: ParticipantDto;
}

export interface CreateRoomDto {
  code?: string;
  title: string;
  topicPrompt: string;
  maxCapacity?: number;
}

export interface UpdateRoomDto {
  title?: string;
  topicPrompt?: string;
  maxCapacity?: number;
}
