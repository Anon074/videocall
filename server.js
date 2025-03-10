const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let currentOffer = null; // Almacena la oferta actual

io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);

    // Enviar la oferta actual al nuevo usuario (si existe)
    if (currentOffer) {
        socket.emit('offer', currentOffer);
    }

    socket.on('disconnect', () => {
        console.log('user disconnected:', socket.id);
        socket.broadcast.emit('user-disconnected', socket.id);
    });

    // Reenvía la oferta a todos los demás usuarios y almacénala
    socket.on('offer', (data) => {
        currentOffer = data; // Almacena la oferta actual
        socket.broadcast.emit('offer', data);
    });

    // Reenvía la respuesta al usuario que hizo la oferta
    socket.on('answer', (data) => {
        socket.broadcast.emit('answer', data);
    });

    // Reenvía los candidatos ICE a todos los demás usuarios
    socket.on('candidate', (data) => {
        socket.broadcast.emit('candidate', data);
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});