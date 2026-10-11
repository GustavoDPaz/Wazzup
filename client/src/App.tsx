import React, { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { SocketProvider, useSocket } from './contexts/SocketContext';
import { Header } from './components/ui/Header';
import { LobbyPage } from './pages/LobbyPage';
import { RoomPage } from './pages/RoomPage';
import { MonitorPage } from './pages/MonitorPage';
import { RoomDto } from '@englishtalks/shared';

import { AdminLoginModal } from './components/admin/AdminLoginModal';

type ViewMode = 'lobby' | 'room' | 'monitor';

const MainApp: React.FC = () => {
  const { socket } = useSocket();
  const [view, setView] = useState<ViewMode>('lobby');
  const [currentRoom, setCurrentRoom] = useState<RoomDto | null>(null);
  const [nickname, setNickname] = useState<string>('');
  const [joinError, setJoinError] = useState<string | null>(null);

  // Autenticação de Administrador obrigatória para entrar no Monitor
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return sessionStorage.getItem('wazzup_admin_token');
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleJoinRoom = (roomCode: string, enteredNickname: string) => {
    if (!socket) {
      alert('Conectando ao servidor... Por favor tente novamente em alguns segundos.');
      return;
    }

    setNickname(enteredNickname);

    socket.emit('room:join', { roomCode, nickname: enteredNickname }, (res) => {
      if (res.success && res.room) {
        setCurrentRoom(res.room);
        setView('room');
        setJoinError(null);
      } else {
        alert(res.error || 'Não foi possível entrar na sala.');
      }
    });
  };

  const handleLeaveRoom = () => {
    if (socket && currentRoom) {
      socket.emit('room:leave');
    }
    setCurrentRoom(null);
    setView('lobby');
  };

  // Clique no botão Painel Monitor ou Visão Aluno
  const handleToggleMonitor = () => {
    if (view === 'monitor') {
      // Já está no monitor -> alterna de volta para a visão do aluno / lobby
      setView('lobby');
    } else {
      // Quer entrar no painel de monitoramento -> exige autenticação de administrador
      const savedToken = sessionStorage.getItem('wazzup_admin_token');
      if (savedToken) {
        setAdminToken(savedToken);
        if (currentRoom) handleLeaveRoom();
        setView('monitor');
      } else {
        setIsLoginModalOpen(true);
      }
    }
  };

  const handleLoginSuccess = (token: string) => {
    setAdminToken(token);
    setIsLoginModalOpen(false);
    if (currentRoom) handleLeaveRoom();
    setView('monitor');
  };

  const handleLogoutMonitor = () => {
    sessionStorage.removeItem('wazzup_admin_token');
    setAdminToken(null);
    setView('lobby');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100%' }}>
      <Header
        roomCode={currentRoom?.code}
        nickname={view === 'room' ? nickname : undefined}
        onLeaveRoom={view === 'room' ? handleLeaveRoom : undefined}
        onOpenMonitor={handleToggleMonitor}
        isMonitorView={view === 'monitor'}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {view === 'lobby' && (
          <LobbyPage
            onJoinRoom={handleJoinRoom}
            onOpenMonitor={handleToggleMonitor}
          />
        )}

        {view === 'room' && currentRoom && (
          <RoomPage
            room={currentRoom}
            userNickname={nickname}
            onLeaveRoom={handleLeaveRoom}
          />
        )}

        {view === 'monitor' && (
          <MonitorPage
            adminToken={adminToken}
            onExitToLobby={() => setView('lobby')}
            onLogout={handleLogoutMonitor}
          />
        )}
      </main>

      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <SocketProvider>
        <MainApp />
      </SocketProvider>
    </ThemeProvider>
  );
};

export default App;
