import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  AlertCircle,
  Sparkles,
  Send,
  RefreshCw,
  MessageSquare,
  CheckSquare,
  X,
  Shield,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Lock,
  LogOut,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  ArrowDown,
} from 'lucide-react';
import { RoomDto, HelpAlertDto, ChatMessageDto, CorrectionDto } from '@englishtalks/shared';
import { useSocket } from '../contexts/SocketContext';

interface MonitorPageProps {
  adminToken?: string | null;
  onExitToLobby?: () => void;
  onLogout?: () => void;
}

export const MonitorPage: React.FC<MonitorPageProps> = ({
  adminToken: propAdminToken,
  onExitToLobby: _onExitToLobby,
  onLogout,
}) => {
  const { socket } = useSocket();
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpAlertDto[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomDto | null>(null);

  // Mensagens em tempo real da sala selecionada
  const [liveMessages, setLiveMessages] = useState<ChatMessageDto[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessageDto | null>(null);

  // Formulário de intervenção
  const [correctionMsgId, setCorrectionMsgId] = useState('');
  const [correctedText, setCorrectedText] = useState('');
  const [ruleExplanation, setRuleExplanation] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  // Tópico novo
  const [newTopicText, setNewTopicText] = useState('');

  // Mensagem direta do monitor no chat
  const [monitorChatInput, setMonitorChatInput] = useState('');

  // Autenticação Segura de Administrador
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return propAdminToken || sessionStorage.getItem('wazzup_admin_token');
  });
  const [adminUser, setAdminUser] = useState<{ id: string; username: string; role: string } | null>(null);

  useEffect(() => {
    if (propAdminToken) {
      setAdminToken(propAdminToken);
    }
  }, [propAdminToken]);

  // Modais Administrativos
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createCode, setCreateCode] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [createTopic, setCreateTopic] = useState('');
  const [createCapacity, setCreateCapacity] = useState(4);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [editCapacity, setEditCapacity] = useState(4);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Controle de Visualização e Expansão de Espaço para a Conversa
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [showPedagogicalControls, setShowPedagogicalControls] = useState(true);

  const liveMessagesEndRef = useRef<HTMLDivElement>(null);
  const chatSectionRef = useRef<HTMLDivElement>(null);
  const feedScrollRef = useRef<HTMLDivElement>(null);

  const formatMessageTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Atalhos Rápidos Pedagógicos do IFES (One-click shortcuts)
  const shortcuts = [
    {
      label: "3ª Pessoa (-s)",
      rule: "Remember to add '-s' to verbs in the 3rd person singular (he/she/it). Ex: 'He works', not 'He work'.",
      tag: "THIRD_PERSON_S",
    },
    {
      label: "Passado Regular (-ed)",
      rule: "Regular verbs in the past tense end in '-ed' (e.g., 'I walked', 'She lived').",
      tag: "PAST_ED",
    },
    {
      label: "Ordem dos Adjetivos",
      rule: "Adjectives come before the noun in English (e.g., 'a red car', not 'a car red').",
      tag: "ADJECTIVE_ORDER",
    },
    {
      label: "Artigo A vs AN",
      rule: "Use 'a' before consonant sounds and 'an' before vowel sounds (e.g., 'an apple', 'a university').",
      tag: "ARTICLE_A_AN",
    },
  ];

  // 1. Inscrição do Monitor e carregamento inicial
  useEffect(() => {
    if (!socket) return;

    socket.emit('monitor:subscribe', (res) => {
      setRooms(res.rooms);
      setHelpRequests(res.helpRequests);
      if (res.rooms.length > 0) {
        setSelectedRoom(res.rooms[0]);
      }
    });

    const handleRoomsUpdate = (updatedRooms: RoomDto[]) => {
      setRooms(updatedRooms);
      setSelectedRoom(prev => (prev ? updatedRooms.find(r => r.code === prev.code) || updatedRooms[0] : updatedRooms[0]));
    };

    const handleHelpAlert = (alert: HelpAlertDto) => {
      setHelpRequests(prev => [alert, ...prev.filter(h => h.requestId !== alert.requestId)]);
    };

    const handleHelpList = (list: HelpAlertDto[]) => {
      setHelpRequests(list);
    };

    socket.on('monitor:rooms_overview', handleRoomsUpdate);
    socket.on('monitor:help_alert', handleHelpAlert);
    socket.on('monitor:help_list', handleHelpList);

    return () => {
      socket.emit('monitor:unsubscribe');
      socket.off('monitor:rooms_overview', handleRoomsUpdate);
      socket.off('monitor:help_alert', handleHelpAlert);
      socket.off('monitor:help_list', handleHelpList);
    };
  }, [socket]);

  // 2. Carrega histórico de mensagens da sala selecionada
  useEffect(() => {
    if (!selectedRoom) return;

    fetch(`/api/rooms/${selectedRoom.code}/messages`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLiveMessages(data);
        }
      })
      .catch(() => {});

    setSelectedMessage(null);
    setCorrectionMsgId('');
    setCorrectedText('');
    setRuleExplanation('');
  }, [selectedRoom?.code]);

  // 3. Escuta novas mensagens e correções em tempo real para o feed do monitor
  useEffect(() => {
    if (!socket) return;

    const handleLiveMessage = (msg: ChatMessageDto) => {
      if (!selectedRoom) return;
      const isForThisRoom =
        msg.roomId === selectedRoom.id ||
        msg.roomId === `room-${selectedRoom.code.toLowerCase()}` ||
        msg.roomId === selectedRoom.code ||
        msg.roomCode === selectedRoom.code;

      if (isForThisRoom) {
        setLiveMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    const handleLiveCorrection = (corr: CorrectionDto) => {
      setLiveMessages(prev =>
        prev.map(m => (m.id === corr.messageId ? { ...m, correction: corr } : m))
      );
    };

    socket.on('chat:message_received', handleLiveMessage);
    socket.on('chat:correction_applied', handleLiveCorrection);

    return () => {
      socket.off('chat:message_received', handleLiveMessage);
      socket.off('chat:correction_applied', handleLiveCorrection);
    };
  }, [socket, selectedRoom?.id, selectedRoom?.code]);

  // Rola o feed interno de mensagens suavemente sem deslocar a página inteira
  useEffect(() => {
    if (feedScrollRef.current) {
      feedScrollRef.current.scrollTop = feedScrollRef.current.scrollHeight;
    }
  }, [liveMessages]);

  const handleAttendHelp = (requestId: string) => {
    if (!socket) return;
    socket.emit('monitor:attend_help', { requestId }, () => {});
  };

  const handleResolveHelp = (requestId: string) => {
    if (!socket) return;
    socket.emit('monitor:resolve_help', { requestId }, () => {});
  };

  // 4. Marcação de mensagem do chat em tempo real
  const handleMarkMessage = (msg: ChatMessageDto) => {
    if (selectedMessage?.id === msg.id) {
      // Se clicou na mesma, desmarca
      setSelectedMessage(null);
      setCorrectionMsgId('');
      setCorrectedText('');
      return;
    }

    setSelectedMessage(msg);
    setCorrectionMsgId(msg.id);
    setCorrectedText(msg.originalText);
  };

  const handleApplyShortcut = (sc: typeof shortcuts[0]) => {
    setRuleExplanation(sc.rule);
  };

  // 5. Envio de correção da mensagem marcada
  const handleSendCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !correctionMsgId || !correctedText || !ruleExplanation) return;

    socket.emit('monitor:correct_message', {
      messageId: correctionMsgId,
      correctedText,
      explanationRule: ruleExplanation,
    });

    setFeedbackSuccess('Intervenção pedagógica transmitida com sucesso para o aluno!');
    setCorrectionMsgId('');
    setCorrectedText('');
    setRuleExplanation('');
    setSelectedMessage(null);
    setTimeout(() => setFeedbackSuccess(null), 3500);
  };

  // 6. Atualização do tópico disparador
  const handleUpdateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !selectedRoom || !newTopicText.trim()) return;

    socket.emit('monitor:update_topic', {
      roomCode: selectedRoom.code,
      newTopic: newTopicText.trim(),
    });

    setNewTopicText('');
  };

  // 7. Envio de mensagem direta do monitor na sala
  const handleSendMonitorChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !selectedRoom || !monitorChatInput.trim()) return;

    socket.emit('monitor:send_message', {
      roomCode: selectedRoom.code,
      text: monitorChatInput.trim(),
    });

    setMonitorChatInput('');
  };

  // 8. Efeito de validação da sessão administrativa
  useEffect(() => {
    if (adminToken) {
      fetch('/api/admin/me', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Sessão expirada');
        })
        .then((data) => setAdminUser(data.user))
        .catch(() => {
          sessionStorage.removeItem('wazzup_admin_token');
          setAdminToken(null);
          setAdminUser(null);
        });
    }
  }, [adminToken]);

  // 9. Autenticação Segura de Administrador
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Credenciais de administrador inválidas.');
        return;
      }
      sessionStorage.setItem('wazzup_admin_token', data.token);
      setAdminToken(data.token);
      setAdminUser(data.user);
      setLoginPassword('');
      setShowLoginModal(false);
    } catch {
      setLoginError('Falha ao conectar ao servidor de autenticação.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    if (adminToken) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      } catch {}
    }
    sessionStorage.removeItem('wazzup_admin_token');
    setAdminToken(null);
    setAdminUser(null);
  };

  // 10. CRUD de Salas pelo Administrador
  const handleOpenCreateModal = () => {
    setCreateCode('');
    setCreateTitle('');
    setCreateTopic('');
    setCreateCapacity(4);
    setCreateError(null);
    setShowCreateModal(true);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setCreateError(null);
    setCreateLoading(true);
    try {
      const res = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          code: createCode.trim() || undefined,
          title: createTitle.trim(),
          topicPrompt: createTopic.trim(),
          maxCapacity: Number(createCapacity),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || 'Erro ao criar sala.');
        return;
      }
      setShowCreateModal(false);
      setSelectedRoom(data);
    } catch {
      setCreateError('Falha na conexão com o servidor.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenEditModal = () => {
    if (!selectedRoom) return;
    setEditTitle(selectedRoom.title);
    setEditTopic(selectedRoom.topicPrompt);
    setEditCapacity(selectedRoom.maxCapacity);
    setEditError(null);
    setShowEditModal(true);
  };

  const handleEditRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !selectedRoom) return;
    setEditError(null);
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/rooms/${selectedRoom.code}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          topicPrompt: editTopic.trim(),
          maxCapacity: Number(editCapacity),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'Erro ao atualizar sala.');
        return;
      }
      setShowEditModal(false);
      setSelectedRoom(data);
    } catch {
      setEditError('Falha na conexão com o servidor.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenDeleteModal = () => {
    if (!selectedRoom) return;
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const handleDeleteRoom = async () => {
    if (!adminToken || !selectedRoom) return;
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/rooms/${selectedRoom.code}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || 'Erro ao excluir sala.');
        return;
      }
      setShowDeleteModal(false);
      setSelectedRoom(null);
    } catch {
      setDeleteError('Falha na conexão com o servidor.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100dvh - 60px)',
      backgroundColor: 'var(--bg-secondary)',
      overflowY: 'auto',
      padding: '1.25rem 1.25rem 6rem 1.25rem',
      gap: '1.25rem',
      scrollBehavior: 'smooth',
    }}>
      {/* 0. Barra de Gestão Administrativa */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.875rem 1.25rem',
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '4px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Painel de Controle e Monitoramento
            </h2>
            {adminUser && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.6875rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '2px',
                backgroundColor: 'rgba(0, 150, 57, 0.1)',
                color: 'var(--color-primary)',
                border: '1px solid rgba(0, 150, 57, 0.25)',
              }}>
                <ShieldCheck size={13} />
                ADMINISTRADOR ATIVO
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Supervisão pedagógica ao vivo e gestão estrutural de salas com persistência em banco relacional.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleOpenCreateModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '4px',
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={15} />
            <span>Nova Sala</span>
          </button>

          <button
            onClick={handleOpenEditModal}
            disabled={!selectedRoom}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-secondary)',
              color: selectedRoom ? 'var(--text-primary)' : 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: selectedRoom ? 'pointer' : 'not-allowed',
              opacity: selectedRoom ? 1 : 0.6,
            }}
          >
            <Edit2 size={15} />
            <span>Editar Sala</span>
          </button>

          <button
            onClick={handleOpenDeleteModal}
            disabled={!selectedRoom}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '4px',
              backgroundColor: 'transparent',
              color: selectedRoom ? 'var(--color-accent-alert)' : 'var(--text-muted)',
              border: selectedRoom ? '1px solid var(--color-accent-alert)' : '1px solid var(--border-color)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: selectedRoom ? 'pointer' : 'not-allowed',
              opacity: selectedRoom ? 1 : 0.6,
            }}
          >
            <Trash2 size={15} />
            <span>Excluir Sala</span>
          </button>

          <button
            onClick={onLogout || handleAdminLogout}
            title="Encerrar Sessão de Administrador e voltar ao início"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '7px 12px',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <LogOut size={14} />
            <span>Sair do Admin</span>
          </button>
        </div>
      </div>

      {/* 1. Alertas de Chamados Pendentes */}
      {helpRequests.length > 0 && (
        <div style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '4px',
          padding: '1rem 1.25rem',
          borderLeft: '4px solid var(--color-accent-alert)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
            <AlertCircle size={20} color="var(--color-accent-alert)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-accent-alert)' }}>
              Fila de Suporte: Alunos Solicitando Monitor ({helpRequests.length})
            </h3>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {helpRequests.map((req) => (
              <div
                key={req.requestId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.875rem' }}>{req.studentNickname}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                    na Sala {req.roomCode}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => handleAttendHelp(req.requestId)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '2px',
                      backgroundColor: 'var(--color-primary)',
                      color: '#FFFFFF',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    Atender
                  </button>
                  <button
                    onClick={() => handleResolveHelp(req.requestId)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '2px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    Concluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Grid de Salas e Ocupação em Tempo Real */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {rooms.map((r) => {
          const isSelected = selectedRoom?.code === r.code;
          return (
            <div
              key={r.code}
              onClick={() => setSelectedRoom(r)}
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '4px',
                padding: '1rem',
                border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '2px',
                  backgroundColor: 'rgba(0, 150, 57, 0.1)',
                  color: 'var(--color-primary)',
                }}>
                  {r.code}
                </span>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: r.occupancy >= r.maxCapacity ? 'var(--color-accent-alert)' : 'var(--color-primary)',
                }}>
                  <Users size={15} />
                  <span>{r.occupancy}/{r.maxCapacity}</span>
                </div>
              </div>

              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{r.title}</h4>
              <p style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {r.topicPrompt}
              </p>

              {r.participants.length > 0 && (
                <div style={{ marginTop: '0.25rem', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {r.participants.map((p) => (
                    <span
                      key={p.id}
                      style={{
                        fontSize: '0.6875rem',
                        padding: '2px 6px',
                        borderRadius: '2px',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      {p.nickname}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Painel de Controle Pedagógico da Sala Selecionada (Meio) */}
      {selectedRoom && (
        showPedagogicalControls ? (
          <div style={{
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '4px',
            padding: '1.25rem',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.625rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="var(--color-primary)" />
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Intervenção Pedagógica & Tópico Disparador ({selectedRoom.code})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowPedagogicalControls(false)}
                title="Recolher painéis para maximizar o espaço da conversa"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '3px 8px',
                  borderRadius: '2px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <ChevronUp size={14} />
                <span>Recolher para Liberar Espaço</span>
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.5rem',
            }}>
              {/* Coluna A: Tópico Disparador */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={18} color="var(--color-primary)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                Tópico Disparador — {selectedRoom.code}
              </h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Altere a pergunta disparadora para destravar a conversa dos alunos em tempo real:
            </p>
            <form onSubmit={handleUpdateTopic} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <textarea
                rows={3}
                placeholder="Ex: Share your favorite movie and why it inspires you..."
                value={newTopicText}
                onChange={(e) => setNewTopicText(e.target.value)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  resize: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!newTopicText.trim()}
                style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                }}
              >
                <span>Atualizar Pergunta da Sala</span>
              </button>
            </form>
          </div>

          {/* Coluna B: Módulo de Intervenção Rápida */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={18} color="var(--color-primary)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                  Intervenção Gramatical com 1 Clique
                </h3>
              </div>
              {selectedMessage && (
                <span style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '2px',
                  backgroundColor: 'rgba(0, 150, 57, 0.1)',
                  color: 'var(--color-primary)',
                }}>
                  Mensagem Vinculada
                </span>
              )}
            </div>

            {feedbackSuccess && (
              <div style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '2px',
                backgroundColor: 'rgba(0, 150, 57, 0.1)',
                color: 'var(--color-primary)',
                fontSize: '0.8125rem',
                fontWeight: 600,
              }}>
                {feedbackSuccess}
              </div>
            )}

            {/* Citação da Mensagem Marcada */}
            {selectedMessage && (
              <div style={{
                padding: '0.625rem 0.75rem',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-secondary)',
                borderLeft: '4px solid var(--color-primary)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '8px',
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                    Respondendo à mensagem de {selectedMessage.senderNickname}:
                  </div>
                  <p style={{ fontSize: '0.8125rem', marginTop: '2px', fontStyle: 'italic', color: 'var(--text-primary)' }}>
                    "{selectedMessage.originalText}"
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedMessage(null);
                    setCorrectionMsgId('');
                    setCorrectedText('');
                  }}
                  title="Desmarcar mensagem"
                  style={{
                    color: 'var(--text-muted)',
                    padding: '2px',
                    borderRadius: '2px',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Atalhos Rápidos */}
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Atalhos Rápidos de Regra:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                {shortcuts.map((sc) => (
                  <button
                    key={sc.tag}
                    type="button"
                    onClick={() => handleApplyShortcut(sc)}
                    style={{
                      fontSize: '0.75rem',
                      padding: '4px 8px',
                      borderRadius: '2px',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--color-primary)',
                      border: '1px solid var(--border-color)',
                      fontWeight: 600,
                    }}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Formulário de Correção */}
            <form onSubmit={handleSendCorrection} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder={selectedMessage ? `ID: ${selectedMessage.id}` : "Selecione uma mensagem abaixo no chat para marcar"}
                value={correctionMsgId}
                onChange={(e) => setCorrectionMsgId(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem',
                }}
              />
              <input
                type="text"
                placeholder="Frase Corrigida ou Dica em Inglês"
                value={correctedText}
                onChange={(e) => setCorrectedText(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem',
                }}
              />
              <textarea
                rows={2}
                placeholder="Explicação pedagógica da regra para o aluno..."
                value={ruleExplanation}
                onChange={(e) => setRuleExplanation(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem',
                  resize: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!correctionMsgId || !correctedText || !ruleExplanation}
                style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                }}
              >
                <span>{selectedMessage ? 'Enviar Correção Marcando Mensagem' : 'Enviar Correção Pedagógica'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    ) : (
          <div style={{
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '4px',
            padding: '0.75rem 1.25rem',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="var(--color-primary)" />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Painéis pedagógicos recolhidos — espaço da tela priorizado para leitura do chat.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPedagogicalControls(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--color-primary)',
                border: '1px solid var(--border-color)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ChevronDown size={14} />
              <span>Exibir Painéis Pedagógicos</span>
            </button>
          </div>
        )
      )}

      {/* 4. Conversa em Tempo Real da Sala Selecionada (Abaixo de todas as abas) */}
      {selectedRoom && (
        <div
          ref={chatSectionRef}
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            height: isChatExpanded ? 'calc(100dvh - 80px)' : 'calc(100dvh - 140px)',
            minHeight: '620px',
            overflow: 'hidden',
          }}
        >
          {/* Cabeçalho do Chat em Tempo Real */}
          <div style={{
            flexShrink: 0,
            padding: '0.875rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            backgroundColor: 'var(--bg-primary)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={20} color="var(--color-primary)" />
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Conversa em Tempo Real — {selectedRoom.code} ({selectedRoom.title})
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {liveMessages.length} mensagem(ns) salvas • Histórico preservado no banco
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600, marginRight: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--color-primary)', display: 'inline-block' }} />
                <span>Transmissão Ativa</span>
              </div>

              {/* Botão Rolar para o Fim da Conversa (rola o feed interno) */}
              <button
                type="button"
                onClick={() => {
                  if (feedScrollRef.current) {
                    feedScrollRef.current.scrollTo({ top: feedScrollRef.current.scrollHeight, behavior: 'smooth' });
                  }
                }}
                title="Rolar direto para a mensagem mais recente"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <ArrowDown size={13} />
                <span>Ir para Recentes</span>
              </button>

              {/* Botão Expandir / Modo Foco com Mais Espaço */}
              <button
                type="button"
                onClick={() => {
                  const nextState = !isChatExpanded;
                  setIsChatExpanded(nextState);
                  setShowPedagogicalControls(!nextState);
                  if (nextState) {
                    setTimeout(() => chatSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 12px',
                  borderRadius: '4px',
                  backgroundColor: isChatExpanded ? 'var(--color-primary)' : 'var(--bg-secondary)',
                  color: isChatExpanded ? '#FFFFFF' : 'var(--color-primary)',
                  border: isChatExpanded ? 'none' : '1px solid var(--color-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isChatExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                <span>{isChatExpanded ? 'Modo Normal' : 'Modo Foco (Expandir Chat)'}</span>
              </button>
            </div>
          </div>

          {/* Feed de Mensagens ao Vivo */}
          <div
            ref={feedScrollRef}
            style={{
              flex: 1,
              minHeight: '380px',
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            {liveMessages.length === 0 ? (
              <div style={{
                margin: 'auto',
                textAlign: 'center',
                color: 'var(--text-muted)',
                padding: '2rem',
              }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  Nenhuma mensagem enviada nesta sala ainda.
                </p>
                <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                  Assim que os participantes conversarem, as mensagens aparecerão aqui em tempo real.
                </p>
              </div>
            ) : (
              liveMessages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                const isMonitorMsg = msg.senderId === 'monitor-ifes' || msg.senderNickname === 'Monitor IFES';

                return (
                  <div
                    key={msg.id}
                    onClick={() => handleMarkMessage(msg)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '4px',
                      backgroundColor: isSelected ? 'rgba(0, 150, 57, 0.08)' : 'var(--bg-primary)',
                      border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-sm)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Linha de Autor e Ações */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '0.8125rem', color: isMonitorMsg ? 'var(--color-primary)' : 'var(--text-primary)' }}>
                          {msg.senderNickname}
                        </strong>
                        {isMonitorMsg && (
                          <span style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '2px',
                            backgroundColor: 'rgba(0, 150, 57, 0.15)',
                            color: 'var(--color-primary)',
                          }}>
                            Monitor
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatMessageTime(msg.createdAt)}
                        </span>
                      </div>

                      {/* Botão de Marcar / Desmarcar */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkMessage(msg);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '2px',
                          backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--bg-secondary)',
                          color: isSelected ? '#FFFFFF' : 'var(--color-primary)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        <CheckSquare size={13} />
                        <span>{isSelected ? 'Marcada' : 'Marcar para Corrigir'}</span>
                      </button>
                    </div>

                    {/* Texto da Mensagem */}
                    <p style={{ fontSize: '0.875rem', margin: '2px 0', wordBreak: 'break-word', color: 'var(--text-primary)' }}>
                      {msg.originalText}
                    </p>

                    {/* Exibição da Correção já aplicada */}
                    {msg.correction && (
                      <div style={{
                        marginTop: '4px',
                        padding: '6px 8px',
                        borderRadius: '2px',
                        backgroundColor: 'rgba(0, 150, 57, 0.1)',
                        borderLeft: '3px solid var(--color-primary)',
                        fontSize: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                          Dica do Monitor: "{msg.correction.correctedText}"
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          {msg.correction.explanationRule}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={liveMessagesEndRef} />
          </div>

          {/* Barra inferior: Enviar recado/dica do monitor diretamente para a sala */}
          <div style={{
            flexShrink: 0,
            padding: '0.75rem 1rem',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-primary)',
          }}>
            <form onSubmit={handleSendMonitorChat} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder={`Enviar mensagem ou orientação do monitor para a sala ${selectedRoom.code}...`}
                value={monitorChatInput}
                onChange={(e) => setMonitorChatInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem',
                }}
              />
              <button
                type="submit"
                disabled={!monitorChatInput.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '4px',
                  backgroundColor: monitorChatInput.trim() ? 'var(--color-primary)' : 'var(--bg-secondary)',
                  color: monitorChatInput.trim() ? '#FFFFFF' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                }}
              >
                <Send size={15} />
                <span>Enviar como Monitor</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Login de Administrador com Alta Segurança */}
      {showLoginModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem',
          backdropFilter: 'blur(3px)',
        }}>
          <div style={{
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            width: '100%',
            maxWidth: '420px',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={22} color="var(--color-primary)" />
                <div>
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Acesso de Administrador
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Autenticação com proteção contra força bruta e canal seguro.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {loginError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.625rem 0.875rem',
                borderRadius: '4px',
                backgroundColor: 'rgba(200, 16, 46, 0.08)',
                border: '1px solid var(--color-accent-alert)',
                color: 'var(--color-accent-alert)',
                fontSize: '0.8125rem',
              }}>
                <AlertCircle size={16} />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Usuário Administrador
                </label>
                <input
                  type="text"
                  required
                  placeholder="admin"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  style={{
                    padding: '0.625rem 0.75rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Chave Secreta / Senha
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.625rem 2.5rem 0.625rem 0.75rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                  Validação com algoritmo criptográfico e dados sensíveis mascarados.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loginLoading}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-primary)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: loginLoading ? 'wait' : 'pointer',
                  }}
                >
                  {loginLoading ? 'Autenticando...' : 'Entrar no Modo Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Criar Nova Sala */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem',
          backdropFilter: 'blur(3px)',
        }}>
          <div style={{
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            width: '100%',
            maxWidth: '480px',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={22} color="var(--color-primary)" />
                <div>
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Criar Nova Sala de Conversação
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    As mensagens desta sala serão salvas e vinculadas no banco de dados.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.625rem 0.875rem',
                borderRadius: '4px',
                backgroundColor: 'rgba(200, 16, 46, 0.08)',
                border: '1px solid var(--color-accent-alert)',
                color: 'var(--color-accent-alert)',
                fontSize: '0.8125rem',
              }}>
                <AlertCircle size={16} />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Código da Sala (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: W301 (deixe vazio para gerar automaticamente)"
                  value={createCode}
                  onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  style={{
                    padding: '0.625rem 0.75rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Título / Nome da Sala *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Prática de Conversação Intermediária"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  style={{
                    padding: '0.625rem 0.75rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Descrição / Pergunta Disparadora do Tópico *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ex: Discuss your career goals and how technology affects your daily life."
                  value={createTopic}
                  onChange={(e) => setCreateTopic(e.target.value)}
                  style={{
                    padding: '0.625rem 0.75rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Capacidade Máxima de Alunos
                </label>
                <input
                  type="number"
                  min={2}
                  max={12}
                  value={createCapacity}
                  onChange={(e) => setCreateCapacity(Number(e.target.value))}
                  style={{
                    padding: '0.625rem 0.75rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    width: '120px',
                  }}
                />
              </div>

              <div style={{
                padding: '0.625rem 0.75rem',
                borderRadius: '4px',
                backgroundColor: 'rgba(0, 150, 57, 0.08)',
                borderLeft: '3px solid var(--color-primary)',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
              }}>
                Persistência Ativa: Todas as mensagens trocadas nesta sala serão preservadas no banco. Se a sala for excluída pelo administrador, as conversas vinculadas serão apagadas em cascata.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-primary)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: createLoading ? 'wait' : 'pointer',
                  }}
                >
                  {createLoading ? 'Criando Sala...' : 'Criar Sala'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Sala Selecionada */}
      {showEditModal && selectedRoom && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem',
          backdropFilter: 'blur(3px)',
        }}>
          <div style={{
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            width: '100%',
            maxWidth: '480px',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={22} color="var(--color-primary)" />
                <div>
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Modificar Sala {selectedRoom.code}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Altere o nome, descrição/tópico e capacidade da sala.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {editError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.625rem 0.875rem',
                borderRadius: '4px',
                backgroundColor: 'rgba(200, 16, 46, 0.08)',
                border: '1px solid var(--color-accent-alert)',
                color: 'var(--color-accent-alert)',
                fontSize: '0.8125rem',
              }}>
                <AlertCircle size={16} />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditRoom} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Título / Nome da Sala *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{
                    padding: '0.625rem 0.75rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Descrição / Tópico Disparador *
                </label>
                <textarea
                  required
                  rows={3}
                  value={editTopic}
                  onChange={(e) => setEditTopic(e.target.value)}
                  style={{
                    padding: '0.625rem 0.75rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Capacidade Máxima de Alunos
                </label>
                <input
                  type="number"
                  min={2}
                  max={12}
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(Number(e.target.value))}
                  style={{
                    padding: '0.625rem 0.75rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    width: '120px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-primary)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: editLoading ? 'wait' : 'pointer',
                  }}
                >
                  {editLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Excluir Sala e Conversas Vinculadas (Cascade) */}
      {showDeleteModal && selectedRoom && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem',
          backdropFilter: 'blur(3px)',
        }}>
          <div style={{
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            width: '100%',
            maxWidth: '460px',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={22} color="var(--color-accent-alert)" />
                <div>
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--color-accent-alert)' }}>
                    Excluir Sala {selectedRoom.code}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Ação irreversível com remoção de conversas em cascata.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {deleteError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.625rem 0.875rem',
                borderRadius: '4px',
                backgroundColor: 'rgba(200, 16, 46, 0.08)',
                border: '1px solid var(--color-accent-alert)',
                color: 'var(--color-accent-alert)',
                fontSize: '0.8125rem',
              }}>
                <AlertCircle size={16} />
                <span>{deleteError}</span>
              </div>
            )}

            <div style={{
              padding: '0.875rem',
              borderRadius: '4px',
              backgroundColor: 'rgba(200, 16, 46, 0.06)',
              borderLeft: '4px solid var(--color-accent-alert)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                Tem certeza que deseja apagar a sala <strong>{selectedRoom.title}</strong>?
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Todas as conversas e mensagens vinculadas a esta sala serão excluídas permanentemente do banco de dados relacional. Participantes conectados serão desconectados imediatamente.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteRoom}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--color-accent-alert)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: deleteLoading ? 'wait' : 'pointer',
                }}
              >
                {deleteLoading ? 'Excluindo Sala...' : 'Excluir Definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
