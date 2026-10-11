export interface CorrectionDto {
  id: string;
  messageId: string;
  monitorId: string;
  monitorName: string;
  correctedText: string;
  explanationRule: string;
  shortcutTag?: string;
  createdAt: string;
}

export interface ChatMessageDto {
  id: string;
  roomId: string;
  roomCode?: string;
  senderId: string;
  senderNickname: string;
  originalText: string;
  wordCount: number;
  hasSpellingIssue?: boolean;
  createdAt: string;
  correction?: CorrectionDto;
}

export interface HelpAlertDto {
  requestId: string;
  roomId: string;
  roomCode: string;
  roomTitle: string;
  studentId: string;
  studentNickname: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'cancelled';
  createdAt: string;
  attendedByName?: string;
}

export interface DictionaryDefinition {
  partOfSpeech: string;
  definition: string;
  example?: string;
  synonyms: string[];
}

export interface DictionaryResultDto {
  word: string;
  phonetic?: string;
  definitions: DictionaryDefinition[];
  allSynonyms: string[];
  translatedPortuguese?: string;
}
