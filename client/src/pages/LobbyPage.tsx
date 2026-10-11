import React, { useState, useEffect } from 'react';
import { ArrowRight, Users, MessageSquareText, ShieldAlert } from 'lucide-react';
import { RoomDto } from '@englishtalks/shared';
import { WhatsAppBanner } from '../components/ui/WhatsAppBanner';

interface LobbyPageProps {
  onJoinRoom: (roomCode: string, nickname: string, onError?: (err: string) => void) => void;
  onOpenMonitor: () => void;
}

export const LobbyPage: React.FC<LobbyPageProps> = ({ onJoinRoom, onOpenMonitor }) => {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [availableRooms, setAvailableRooms] = useState<RoomDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/rooms')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAvailableRooms(data);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nickname.trim()) {
      setError('Por favor, informe seu nickname para participar.');
      return;
    }

    if (!roomCode.trim()) {
      setError('Por favor, informe ou selecione o código da sala.');
      return;
    }

    onJoinRoom(roomCode.trim().toUpperCase(), nickname.trim(), (err) => {
      setError(err);
    });
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-secondary)',
      overflowY: 'auto',
    }}>
      <WhatsAppBanner />
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}>
        {/* Cabeçalho do Card */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '1.75rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
          }}>
            <span style={{ color: 'var(--color-primary)' }}>Wazz</span>
            <span style={{ color: 'var(--text-primary)' }}>up</span>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '2px',
              backgroundColor: 'var(--color-accent-alert)',
              marginTop: '-12px',
            }} />
          </div>
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
            marginTop: '0.25rem',
          }}>
            Laboratório Interativo de Prática de Língua Inglesa — SpeakUp
          </p>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(200, 16, 46, 0.1)',
            color: 'var(--color-accent-alert)',
            fontSize: '0.875rem',
            textAlign: 'center',
            fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        {/* Formulário de Acesso Rápido */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '0.375rem',
            }}>
              Seu Nickname
            </label>
            <input
              type="text"
              placeholder="Ex: Gabriel ou Ana"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={30}
              required
              style={{
                width: '100%',
                padding: '0.75rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.9375rem',
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '0.375rem',
            }}>
              Código da Sala
            </label>
            <input
              type="text"
              placeholder="Ex: ROOM-101"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={15}
              required
              style={{
                width: '100%',
                padding: '0.75rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.9375rem',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              padding: '0.875rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '0.9375rem',
              marginTop: '0.5rem',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
          >
            <span>Iniciar Prática</span>
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Salas Sugeridas com Ocupação em Tempo Real */}
        {availableRooms.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Ou escolha uma sala aberta:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {availableRooms.map((r) => {
                const isFull = r.occupancy >= r.maxCapacity;
                return (
                  <div
                    key={r.code}
                    onClick={() => {
                      if (!isFull) setRoomCode(r.code);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.625rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      cursor: isFull ? 'not-allowed' : 'pointer',
                      opacity: isFull ? 0.6 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MessageSquareText size={16} color="var(--color-primary)" />
                      <div>
                        <strong style={{ fontSize: '0.8125rem' }}>{r.code}</strong>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.title}</p>
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: isFull ? 'var(--color-accent-alert)' : 'var(--color-primary)',
                    }}>
                      <Users size={14} />
                      <span>{r.occupancy}/{r.maxCapacity}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Atalho para Monitores */}
        <div style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1rem',
          textAlign: 'center',
        }}>
          <button
            onClick={onOpenMonitor}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
            }}
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <ShieldAlert size={16} />
            <span>Acessar como Monitor / Gestão</span>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};
