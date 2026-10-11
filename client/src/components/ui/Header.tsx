import React from 'react';
import { Sun, Moon, LogOut, ShieldAlert } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface HeaderProps {
  roomCode?: string;
  nickname?: string;
  onLeaveRoom?: () => void;
  onOpenMonitor?: () => void;
  isMonitorView?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  roomCode,
  nickname,
  onLeaveRoom,
  onOpenMonitor,
  isMonitorView = false,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.75rem 1.25rem',
      backgroundColor: 'var(--bg-primary)',
      borderBottom: '1px solid var(--border-color)',
      minHeight: '60px',
    }}>
      {/* Logotipo e Identidade IF */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontWeight: 700,
          fontSize: '1.25rem',
          letterSpacing: '-0.02em',
        }}>
          <span style={{ color: 'var(--color-primary)' }}>Wazz</span>
          <span style={{ color: 'var(--text-primary)' }}>up</span>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '2px',
            backgroundColor: 'var(--color-accent-alert)', // Ponto vermelho característico do logo IF
            marginTop: '-8px',
          }} />
        </div>

        <span style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: '2px',
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-muted)',
          border: '1px solid var(--border-color)',
        }}>
          IFES
        </span>

        {roomCode && (
          <span style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(0, 150, 57, 0.1)',
            color: 'var(--color-primary)',
            marginLeft: '0.5rem',
          }}>
            Sala: {roomCode}
          </span>
        )}
      </div>

      {/* Ações da Direita */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {nickname && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
          }}>
            <span>Aluno:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{nickname}</strong>
          </div>
        )}

        {/* Botão de Tema Claro/Escuro */}
        <button
          onClick={toggleTheme}
          title={theme === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
          }}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Botão para alternar para visão de monitor quando no lobby */}
        {onOpenMonitor && (
          <button
            onClick={onOpenMonitor}
            title="Painel do Monitor"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
              backgroundColor: isMonitorView ? 'var(--color-primary)' : 'var(--bg-secondary)',
              color: isMonitorView ? '#FFFFFF' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <ShieldAlert size={16} />
            <span>{isMonitorView ? 'Visão Aluno' : 'Painel Monitor'}</span>
          </button>
        )}

        {/* Botão de Sair da Sala */}
        {onLeaveRoom && (
          <button
            onClick={onLeaveRoom}
            title="Sair da sala"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--color-accent-alert)',
              border: '1px solid var(--border-color)',
            }}
          >
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        )}
      </div>
    </header>
  );
};
