import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: SocketIOServer;

export const initSocket = (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*", // Allow all for MVP
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join document room
    socket.on('join_doc', (docId: string) => {
      socket.join(`doc_${docId}`);
      console.log(`Socket ${socket.id} joined doc_${docId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

export const broadcastComment = (docId: string, comment: any) => {
  if (io) {
    io.to(`doc_${docId}`).emit('new_comment', comment);
  }
};
