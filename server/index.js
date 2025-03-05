const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const users = {};

io.on('connection', (socket) => {
  console.log('Un usuario se ha conectado:', socket.id);
  users[socket.id] = socket;

  io.emit('user-count', Object.keys(users).length);

  socket.on('offer', (data) => {
    const { targetUserId, offer } = data;
    if (users[targetUserId]) {
      users[targetUserId].emit('offer', { senderId: socket.id, offer });
    }
  });

  socket.on('answer', (data) => {
    const { targetUserId, answer } = data;
    if (users[targetUserId]) {
      users[targetUserId].emit('answer', { senderId: socket.id, answer });
    }
  });

  socket.on('ice-candidate', (data) => {
    const { targetUserId, candidate } = data;
    if (users[targetUserId]) {
      users[targetUserId].emit('ice-candidate', { senderId: socket.id, candidate });
    }
  });

  socket.on('disconnect', () => {
    console.log('Un usuario se ha desconectado:', socket.id);
    delete users[socket.id];
    io.emit('user-disconnected', socket.id);
    io.emit('user-count', Object.keys(users).length);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});