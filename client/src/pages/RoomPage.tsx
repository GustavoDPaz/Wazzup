import React, { useState, useEffect, useRef } from 'react';
import { Send, BookOpen, AlertCircle, HelpCircle, Users, Sparkles, CheckCircle2, Languages, Copy, Check, Volume2 } from 'lucide-react';
import { ChatMessageDto, CorrectionDto, RoomDto } from '@englishtalks/shared';
import { useSocket } from '../contexts/SocketContext';
import { DictionaryModal } from '../components/pedagogy/DictionaryModal';

interface RoomPageProps {
  room: RoomDto;
  userNickname: string;
  onLeaveRoom: () => void;
}

export const RoomPage: React.FC<RoomPageProps> = ({ room, userNickname, onLeaveRoom }) => {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [inputText, setInputText] = useState('');
  const [occupancy, setOccupancy] = useState(room.occupancy);
  const [topicPrompt, setTopicPrompt] = useState(room.topicPrompt);
  const [helpSent, setHelpSent] = useState(false);
  const [helpCount, setHelpCount] = useState(0);
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
  const [helpStatusText, setHelpStatusText] = useState<string | null>(null);

  // Tradução de mensagens inteiras
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<Record<string, boolean>>({});

  // Menu de Contexto (botão direito)
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    message: ChatMessageDto | null;
  }>({ visible: false, x: 0, y: 0, message: null });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal de Dicionário
  const [dictOpen, setDictOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');

  // Modal de Explicação da Correção
  const [activeCorrection, setActiveCorrection] = useState<CorrectionDto | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    // Escuta novas mensagens (com desduplicação por id)
    const handleMessage = (msg: ChatMessageDto) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) {
          return prev;
        }
        return [...prev, msg];
      });
    };

    // Escuta correções aplicadas pelo monitor
    const handleCorrection = (correction: CorrectionDto) => {
      setMessages(prev =>
        prev.map(m => (m.id === correction.messageId ? { ...m, correction } : m))
      );
    };

    // Escuta atualização de ocupação
    const handleOccupancy = (data: { roomCode: string; occupancy: number }) => {
      if (data.roomCode === room.code) {
        setOccupancy(data.occupancy);
      }
    };

    // Escuta alteração de tópico disparador
    const handleTopic = (data: { roomCode: string; newTopic: string }) => {
      if (data.roomCode === room.code) {
        setTopicPrompt(data.newTopic);
      }
    };

    // Escuta status de ajuda
    const handleHelpStatus = (data: { requestId: string; status: string; monitorName?: string }) => {
      if (data.status === 'in_progress') {
        setHelpStatusText(`O monitor ${data.monitorName || 'do SpeakUp'} está a caminho desta sala!`);
        setHelpSent(false);
      } else if (data.status === 'resolved') {
        setHelpStatusText('Atendimento concluído. Você pode solicitar apoio novamente se precisar.');
        setHelpSent(false);
        setTimeout(() => setHelpStatusText(null), 5000);
      }
    };

    // Carrega mensagens preservadas do banco/memória (com desduplicação)
    fetch(`/api/rooms/${room.code}/messages`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(prev => {
            const map = new Map<string, ChatMessageDto>();
            data.forEach((m: ChatMessageDto) => map.set(m.id, m));
            prev.forEach(m => map.set(m.id, m));
            return Array.from(map.values());
          });
        }
      })
      .catch(err => console.error('Erro ao carregar histórico de mensagens:', err));

    // Escuta encerramento/exclusão de sala pelo administrador
    const handleRoomClosed = (data: { roomCode: string; reason: string }) => {
      if (data.roomCode === room.code) {
        alert(data.reason || 'Esta sala foi encerrada pelo administrador.');
        onLeaveRoom();
      }
    };

    socket.on('chat:message_received', handleMessage);
    socket.on('chat:correction_applied', handleCorrection);
    socket.on('room:occupancy_updated', handleOccupancy);
    socket.on('room:topic_changed', handleTopic);
    socket.on('help:status_changed', handleHelpStatus);
    socket.on('room:closed', handleRoomClosed);

    return () => {
      socket.off('chat:message_received', handleMessage);
      socket.off('chat:correction_applied', handleCorrection);
      socket.off('room:occupancy_updated', handleOccupancy);
      socket.off('room:topic_changed', handleTopic);
      socket.off('help:status_changed', handleHelpStatus);
      socket.off('room:closed', handleRoomClosed);
    };
  }, [socket, room.code, onLeaveRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fecha o menu de contexto ao clicar em qualquer outro lugar
  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu({ visible: false, x: 0, y: 0, message: null });
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !socket) return;

    socket.emit('chat:send', { text: inputText.trim() });
    setInputText('');
  };

  const handleRequestHelp = () => {
    if (!socket || helpSent) return;

    socket.emit('help:request', (res) => {
      if (res.success) {
        setHelpSent(true);
        setHelpCount(prev => prev + 1);
        setHelpStatusText('Chamado enviado aos monitores. Aguarde um momento!');
      }
    });
  };

  // Pronúncia via Web Speech API nativa (en-US)
  const handleSpeakMessage = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*_#`]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleWordDoubleClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    const selection = window.getSelection()?.toString().trim();
    if (selection && selection.length > 1 && /^[a-zA-Z-]+$/.test(selection)) {
      setSelectedWord(selection);
      setDictOpen(true);
    }
  };

  // Aciona menu de contexto com botão direito na mensagem
  const handleMessageContextMenu = (e: React.MouseEvent, msg: ChatMessageDto) => {
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - 230);
    const y = Math.min(e.clientY, window.innerHeight - 130);
    setContextMenu({ visible: true, x, y, message: msg });
  };

  // Tradução da mensagem inteira
  const handleTranslateMessage = async (msg: ChatMessageDto) => {
    if (translations[msg.id]) {
      // Toggle para ocultar se já tiver sido traduzida
      setTranslations(prev => {
        const next = { ...prev };
        delete next[msg.id];
        return next;
      });
      return;
    }

    setTranslating(prev => ({ ...prev, [msg.id]: true }));
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg.originalText }),
      });

      if (response.ok) {
        const data = await response.json();
        setTranslations(prev => ({ ...prev, [msg.id]: data.translated }));
      }
    } catch (err) {
      console.error('Erro ao traduzir mensagem:', err);
    } finally {
      setTranslating(prev => ({ ...prev, [msg.id]: false }));
    }
  };

  const handleCopyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100dvh - 60px)',
      backgroundColor: 'var(--bg-secondary)',
      position: 'relative',
    }}>
      {/* 1. Barra Superior da Sala: Tópico e Ações */}
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.75rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{room.title}</h2>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: '2px',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--color-primary)',
              border: '1px solid var(--border-color)',
            }}>
              <Users size={14} />
              <span>{occupancy}/{room.maxCapacity} participantes</span>
            </div>
          </div>

          {/* Botão de Chamar Monitor com Tooltip Explicativo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
            <div
              style={{ position: 'relative' }}
              onMouseEnter={() => setShowHelpTooltip(true)}
              onMouseLeave={() => setShowHelpTooltip(false)}
            >
              <button
                onClick={handleRequestHelp}
                disabled={helpSent}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: helpSent ? 'var(--bg-secondary)' : 'var(--color-accent-alert)',
                  color: helpSent ? 'var(--text-muted)' : '#FFFFFF',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  border: '1px solid var(--border-color)',
                  cursor: helpSent ? 'default' : 'pointer',
                }}
                aria-label="Solicitar apoio pedagógico ou técnico do monitor"
              >
                <HelpCircle size={16} />
                <span>{helpSent ? 'Monitor Chamado' : helpCount > 0 ? 'Chamar Novamente' : 'Chamar Monitor'}</span>
              </button>

              {showHelpTooltip && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    zIndex: 100,
                    width: '260px',
                    padding: '8px 10px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-md)',
                    fontSize: '0.75rem',
                    color: 'var(--text-primary)',
                    lineHeight: 1.4,
                    pointerEvents: 'none',
                  }}
                >
                  <strong style={{ display: 'block', color: 'var(--color-accent-alert)', marginBottom: '2px' }}>
                    Apoio Pedagógico e Técnico
                  </strong>
                  Precisa de auxílio pedagógico ou técnico? Clique para chamar um monitor do SpeakUp até esta sala.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tópico Disparador (Prompt Pedagógico) */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          padding: '0.625rem 0.875rem',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(0, 150, 57, 0.08)',
          borderLeft: '4px solid var(--color-primary)',
          fontSize: '0.875rem',
        }}>
          <Sparkles size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: 'var(--color-primary)', marginRight: '6px' }}>Tópico da Conversa:</strong>
            <span style={{ color: 'var(--text-primary)' }}>{topicPrompt}</span>
          </div>
        </div>

        {helpStatusText && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8125rem',
            color: 'var(--color-accent-alert)',
            fontWeight: 500,
          }}>
            <AlertCircle size={15} />
            <span>{helpStatusText}</span>
          </div>
        )}
      </div>

      {/* 2. Área de Mensagens (Feed em Tempo Real) */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.875rem',
      }}>
        {messages.length === 0 && (
          <div style={{
            margin: 'auto',
            textAlign: 'center',
            color: 'var(--text-muted)',
            maxWidth: '360px',
            padding: '2rem 1rem',
          }}>
            <p style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
              Nenhuma mensagem enviada ainda.
            </p>
            <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
              Dê as boas-vindas ao seu parceiro em inglês e comece a conversa!
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isSelf = msg.senderNickname === userNickname;
          const isMonitorMsg = Boolean(
            (msg.senderId && msg.senderId.toLowerCase().includes('monitor')) || 
            (msg.senderNickname && msg.senderNickname.toLowerCase().includes('monitor'))
          );
          const isTranslated = !!translations[msg.id];
          const isLoadingTranslation = !!translating[msg.id];

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isSelf ? 'flex-end' : 'flex-start',
                width: '100%',
              }}
            >
              {/* Autor e Hora */}
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginBottom: '2px',
                padding: '0 4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                {isMonitorMsg && (
                  <span style={{
                    backgroundColor: 'var(--color-primary)',
                    color: '#FFFFFF',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: '2px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}>
                    [MONITOR]
                  </span>
                )}
                <strong style={{ color: isMonitorMsg ? 'var(--color-primary)' : undefined }}>
                  {isSelf ? 'Você' : msg.senderNickname}
                </strong>
                <span>•</span>
                <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              {/* Bolha de Mensagem (Borda máx 4px) */}
              <div
                onContextMenu={(e) => handleMessageContextMenu(e, msg)}
                style={{
                  maxWidth: '75%',
                  padding: '0.75rem 1rem',
                  borderRadius: '4px',
                  backgroundColor: isSelf
                    ? 'var(--chat-bubble-self-bg)'
                    : isMonitorMsg
                      ? 'rgba(0, 150, 57, 0.08)'
                      : 'var(--chat-bubble-other-bg)',
                  color: isSelf ? 'var(--chat-bubble-self-text)' : 'var(--chat-bubble-other-text)',
                  boxShadow: 'var(--shadow-sm)',
                  fontSize: '0.9375rem',
                  position: 'relative',
                  border: msg.correction
                    ? '2px solid var(--color-primary)'
                    : isMonitorMsg
                      ? '1px solid rgba(0, 150, 57, 0.35)'
                      : '1px solid var(--border-color)',
                  borderLeft: isMonitorMsg ? '4px solid var(--color-primary)' : undefined,
                  userSelect: 'text',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                }}
              >
                {/* Texto original em inglês com botão de áudio */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <p
                    onDoubleClick={handleWordDoubleClick}
                    title="Clique com botão direito para traduzir ou duplo clique numa palavra para abrir o dicionário"
                    style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', margin: 0, flex: 1, lineHeight: 1.45 }}
                  >
                    {msg.originalText}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSpeakMessage(msg.originalText);
                    }}
                    title="Ouvir pronúncia em inglês (Web Speech)"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isSelf ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '2px',
                      borderRadius: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    onMouseOver={(e) => e.currentTarget.style.color = isSelf ? '#FFFFFF' : 'var(--color-primary)'}
                    onMouseOut={(e) => e.currentTarget.style.color = isSelf ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-muted)'}
                  >
                    <Volume2 size={15} />
                  </button>
                </div>

                {/* Exibição da Tradução Completa (caso solicitada) */}
                {isLoadingTranslation && (
                  <div style={{
                    marginTop: '6px',
                    padding: '4px 6px',
                    borderRadius: '2px',
                    backgroundColor: isSelf ? 'rgba(0,0,0,0.15)' : 'var(--bg-primary)',
                    fontSize: '0.75rem',
                    fontStyle: 'italic',
                    color: isSelf ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)',
                  }}>
                    Traduzindo mensagem...
                  </div>
                )}

                {isTranslated && (
                  <div style={{
                    marginTop: '8px',
                    padding: '6px 8px',
                    borderRadius: '2px',
                    backgroundColor: isSelf ? 'rgba(0, 0, 0, 0.25)' : 'var(--bg-primary)',
                    borderLeft: '3px solid var(--color-primary)',
                    fontSize: '0.8125rem',
                    color: isSelf ? '#FFFFFF' : 'var(--text-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color: isSelf ? 'rgba(255, 255, 255, 0.75)' : 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}>
                      <span>Tradução (PT-BR)</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTranslateMessage(msg);
                        }}
                        style={{
                          fontSize: '0.6875rem',
                          color: isSelf ? '#FFFFFF' : 'var(--color-primary)',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                        }}
                      >
                        Ocultar
                      </button>
                    </div>
                    <p style={{ margin: 0, lineHeight: 1.4, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      {translations[msg.id]}
                    </p>
                  </div>
                )}

                {/* Badge Sutil de Correção do Monitor (com quebra responsiva sem deformar) */}
                {msg.correction && (
                  <div
                    onClick={() => setActiveCorrection(msg.correction!)}
                    style={{
                      marginTop: '0.5rem',
                      padding: '6px 8px',
                      borderRadius: '2px',
                      backgroundColor: isSelf ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 150, 57, 0.1)',
                      color: isSelf ? '#FFFFFF' : 'var(--color-primary)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '6px',
                      cursor: 'pointer',
                      maxWidth: '100%',
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                      height: 'auto',
                    }}
                    title="Clique para ver a regra gramatical explicada pelo monitor"
                  >
                    <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', height: 'auto' }}>
                      Dica pedagógica: {msg.correction.correctedText}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Menu de Contexto (Botão Direito na Mensagem) */}
      {contextMenu.visible && contextMenu.message && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 2000,
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            boxShadow: 'var(--shadow-md)',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            minWidth: '200px',
          }}
        >
          {/* Ação 1: Ouvir Pronúncia (Web Speech API) */}
          <button
            onClick={() => {
              if (contextMenu.message) handleSpeakMessage(contextMenu.message.originalText);
              setContextMenu({ visible: false, x: 0, y: 0, message: null });
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              borderRadius: '2px',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'var(--text-primary)',
              width: '100%',
              textAlign: 'left',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Volume2 size={15} color="var(--color-primary)" />
            <span>Ouvir Pronúncia (EN)</span>
          </button>

          {/* Ação 2: Traduzir Mensagem Toda */}
          <button
            onClick={() => {
              if (contextMenu.message) handleTranslateMessage(contextMenu.message);
              setContextMenu({ visible: false, x: 0, y: 0, message: null });
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              borderRadius: '2px',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'var(--text-primary)',
              width: '100%',
              textAlign: 'left',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Languages size={15} color="var(--color-primary)" />
            <span>{translations[contextMenu.message.id] ? 'Ocultar Tradução' : 'Traduzir Mensagem (PT)'}</span>
          </button>

          {/* Ação 3: Copiar Mensagem */}
          <button
            onClick={() => {
              if (contextMenu.message) handleCopyMessage(contextMenu.message.originalText, contextMenu.message.id);
              setContextMenu({ visible: false, x: 0, y: 0, message: null });
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              borderRadius: '2px',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'var(--text-primary)',
              width: '100%',
              textAlign: 'left',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {copiedId === contextMenu.message.id ? <Check size={15} color="var(--color-primary)" /> : <Copy size={15} color="var(--text-muted)" />}
            <span>{copiedId === contextMenu.message.id ? 'Copiado!' : 'Copiar Texto'}</span>
          </button>

          {/* Ação 4: Dicionário em Contexto */}
          <button
            onClick={() => {
              if (contextMenu.message) {
                const firstWord = contextMenu.message.originalText.trim().split(/\s+/)[0];
                setSelectedWord(firstWord);
                setDictOpen(true);
              }
              setContextMenu({ visible: false, x: 0, y: 0, message: null });
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              borderRadius: '2px',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'var(--text-primary)',
              width: '100%',
              textAlign: 'left',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <BookOpen size={15} color="var(--text-muted)" />
            <span>Consultar Dicionário</span>
          </button>
        </div>
      )}

      {/* 3. Barra de Digitação */}
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        borderTop: '1px solid var(--border-color)',
        padding: '0.75rem 1.25rem',
      }}>
        <form
          onSubmit={handleSendMessage}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {/* Botão de Dicionário */}
          <button
            type="button"
            onClick={() => setDictOpen(true)}
            title="Abrir dicionário e sinônimos (ou clique com botão direito em mensagens)"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--color-primary)',
              border: '1px solid var(--border-color)',
              flexShrink: 0,
            }}
          >
            <BookOpen size={20} />
          </button>

          {/* Campo de Entrada com suporte a corretor em inglês */}
          <input
            type="text"
            lang="en"
            spellCheck={true}
            autoCorrect="on"
            placeholder="Type your message in English... (Enter para enviar | Botão direito para traduzir)"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.9375rem',
            }}
            autoFocus
          />

          {/* Botão de Envio */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: inputText.trim() ? 'var(--color-primary)' : 'var(--bg-secondary)',
              color: inputText.trim() ? '#FFFFFF' : 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              flexShrink: 0,
            }}
            onMouseOver={(e) => {
              if (inputText.trim()) e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)';
            }}
            onMouseOut={(e) => {
              if (inputText.trim()) e.currentTarget.style.backgroundColor = 'var(--color-primary)';
            }}
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      {/* Modal de Dicionário em Contexto */}
      <DictionaryModal
        isOpen={dictOpen}
        onClose={() => setDictOpen(false)}
        initialWord={selectedWord}
      />

      {/* Modal / Popover da Explicação da Correção */}
      {activeCorrection && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            maxWidth: '440px',
            width: '100%',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="var(--color-primary)" />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Feedback Pedagógico do Monitor</h3>
            </div>

            <div>
              <strong style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Sugestão de Frase:</strong>
              <p style={{
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: 'var(--color-primary)',
                backgroundColor: 'rgba(0, 150, 57, 0.08)',
                padding: '0.5rem 0.75rem',
                borderRadius: '2px',
                marginTop: '4px',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                height: 'auto',
              }}>
                {activeCorrection.correctedText}
              </p>
            </div>

            <div>
              <strong style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Regra Aplicada:</strong>
              <p style={{
                fontSize: '0.875rem',
                marginTop: '4px',
                lineHeight: 1.5,
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                height: 'auto',
                maxHeight: '260px',
                overflowY: 'auto',
              }}>
                {activeCorrection.explanationRule}
              </p>
            </div>

            <button
              onClick={() => setActiveCorrection(null)}
              style={{
                alignSelf: 'flex-end',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
