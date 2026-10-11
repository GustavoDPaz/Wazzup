import { Server, Socket } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents } from '@englishtalks/shared';
import { roomStore } from '../services/roomStore.js';

export function setupSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    // 1. Aluno entra na sala
    socket.on('room:join', ({ roomCode, nickname }, callback) => {
      const result = roomStore.joinRoom(roomCode, socket.id, nickname);

      if ('error' in result) {
        callback({ success: false, error: result.error });
        return;
      }

      socket.leave('monitor-room');
      socket.join(result.room.code);
      callback({
        success: true,
        room: result.room,
        user: result.user,
      });

      // Notifica todos na sala da nova contagem e do participante
      io.to(result.room.code).emit('room:occupancy_updated', {
        roomCode: result.room.code,
        occupancy: result.room.occupancy,
        maxCapacity: result.room.maxCapacity,
      });

      socket.to(result.room.code).emit('room:user_joined', {
        nickname: result.user.nickname,
        occupancy: result.room.occupancy,
      });

      // Atualiza o painel dos monitores
      io.emit('monitor:rooms_overview', roomStore.getAllRooms());
    });

    // 2. Aluno sai da sala
    socket.on('room:leave', () => {
      const { roomCode, nickname, newOccupancy } = roomStore.leaveRoom(socket.id);
      if (roomCode) {
        socket.leave(roomCode);
        const room = roomStore.getRoom(roomCode);
        const maxCap = room ? room.maxCapacity : 4;

        io.to(roomCode).emit('room:occupancy_updated', {
          roomCode,
          occupancy: newOccupancy ?? 0,
          maxCapacity: maxCap,
        });

        if (nickname) {
          io.to(roomCode).emit('room:user_left', {
            nickname,
            occupancy: newOccupancy ?? 0,
          });
        }

        io.emit('monitor:rooms_overview', roomStore.getAllRooms());
      }
    });

    // 3. Envio de mensagem no chat
    socket.on('chat:send', async ({ text }) => {
      const room = roomStore.getRoomBySocket(socket.id);
      if (!room) return;

      const message = await roomStore.addMessage(room.code, socket.id, text);
      if (message) {
        // Transmite com desduplicação automática do Socket.IO entre a sala e o monitor
        io.to([room.code, 'monitor-room']).emit('chat:message_received', message);
      }
    });

    // 3.1 Monitor envia mensagem/dica direta para uma sala
    socket.on('monitor:send_message', async ({ roomCode, text }) => {
      const message = await roomStore.addMonitorMessage(roomCode, text);
      if (message) {
        io.to([roomCode.toUpperCase(), 'monitor-room']).emit('chat:message_received', message);
      }
    });

    // 4. Solicitação de Ajuda do Aluno (Chamar Monitor)
    socket.on('help:request', (callback) => {
      const result = roomStore.createHelpRequest(socket.id);
      if ('error' in result) {
        callback({ success: false, error: result.error });
        return;
      }

      callback({ success: true, requestId: result.requestId });
      // Notifica todos os monitores
      io.emit('monitor:help_alert', result);
      io.emit('monitor:help_list', roomStore.getPendingHelpRequests());
    });

    // 5. Monitor se inscreve no painel
    socket.on('monitor:subscribe', (callback) => {
      socket.join('monitor-room');
      callback({
        rooms: roomStore.getAllRooms(),
        helpRequests: roomStore.getPendingHelpRequests(),
      });
    });

    // 5.1 Monitor sai do painel
    socket.on('monitor:unsubscribe', () => {
      socket.leave('monitor-room');
    });

    // 6. Monitor aplica correção gramatical
    socket.on('monitor:correct_message', ({ messageId, correctedText, explanationRule, shortcutTag }) => {
      const monitorName = 'Monitor IFES';
      const applied = roomStore.applyCorrection(
        messageId,
        socket.id,
        monitorName,
        correctedText,
        explanationRule,
        shortcutTag
      );

      if (applied) {
        io.to([applied.roomCode, 'monitor-room']).emit('chat:correction_applied', applied.correction);
      }
    });

    // 7. Monitor atende chamado de ajuda
    socket.on('monitor:attend_help', ({ requestId }, callback) => {
      const updated = roomStore.updateHelpStatus(requestId, 'in_progress', 'Monitor IFES');
      if (updated) {
        io.emit('help:status_changed', {
          requestId: updated.requestId,
          status: 'in_progress',
          monitorName: updated.attendedByName,
        });
        io.emit('monitor:help_list', roomStore.getPendingHelpRequests());
        callback({ success: true });
      } else {
        callback({ success: false });
      }
    });

    // 8. Monitor resolve chamado
    socket.on('monitor:resolve_help', ({ requestId }, callback) => {
      const updated = roomStore.updateHelpStatus(requestId, 'resolved');
      if (updated) {
        io.emit('help:status_changed', {
          requestId: updated.requestId,
          status: 'resolved',
        });
        io.emit('monitor:help_list', roomStore.getPendingHelpRequests());
        callback({ success: true });
      } else {
        callback({ success: false });
      }
    });

    // 9. Monitor altera tópico disparador da sala
    socket.on('monitor:update_topic', ({ roomCode, newTopic }) => {
      const success = roomStore.updateTopic(roomCode, newTopic);
      if (success) {
        io.to(roomCode).emit('room:topic_changed', { roomCode, newTopic });
        io.emit('monitor:rooms_overview', roomStore.getAllRooms());
      }
    });

    // 10. Desconexão
    socket.on('disconnect', () => {
      const { roomCode, nickname, newOccupancy } = roomStore.leaveRoom(socket.id);
      if (roomCode) {
        const room = roomStore.getRoom(roomCode);
        const maxCap = room ? room.maxCapacity : 4;

        io.to(roomCode).emit('room:occupancy_updated', {
          roomCode,
          occupancy: newOccupancy ?? 0,
          maxCapacity: maxCap,
        });

        if (nickname) {
          io.to(roomCode).emit('room:user_left', {
            nickname,
            occupancy: newOccupancy ?? 0,
          });
        }

        io.emit('monitor:rooms_overview', roomStore.getAllRooms());
      }
    });
  });
}
