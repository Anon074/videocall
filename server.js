// server.js - Servidor con WebSockets y Express
const fs = require("fs");
const express = require('express');
const http = require('http');
const https = require("https");
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
(
    {
        key: fs.readFileSync("clave-privada.pem"),
        cert: fs.readFileSync("certificado.pem"),
    },
    app
);

const io = new Server(server, {
    cors: { origin: "*" },
});

app.use(express.static("public"));

server.listen(443, () => {
    console.log("Servidor corriendo en HTTPS");
});

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(__dirname + '/public'));

let connectedUsers = {};

io.on('connection', (socket) => {
    console.log('Nuevo usuario conectado', socket.id);
    connectedUsers[socket.id] = `Usuario ${Object.keys(connectedUsers).length + 1}`;
    io.emit('updateUsers', connectedUsers);
    io.emit('notification', `🔔 ${connectedUsers[socket.id]} se ha conectado.`);
    
    socket.on('offer', (data) => {
        socket.broadcast.emit('offer', data);
    });
    
    socket.on('answer', (data) => {
        socket.broadcast.emit('answer', data);
    });
    
    socket.on('candidate', (data) => {
        socket.broadcast.emit('candidate', data);
    });
    
    // Manejo de cambio de nombre de usuario
    socket.on('changeUsername', (newUsername) => {
        const oldUsername = connectedUsers[socket.id];
        connectedUsers[socket.id] = newUsername;
        io.emit('updateUsers', connectedUsers);
        io.emit('notification', `🔔 ${oldUsername} ahora es ${newUsername}.`);
    });
    
    // Manejo de compartir pantalla
    socket.on('screenShareOffer', (data) => {
        socket.broadcast.emit('screenShareOffer', data);
    });
    
    socket.on('screenShareAnswer', (data) => {
        socket.broadcast.emit('screenShareAnswer', data);
    });
    
    socket.on('screenShareCandidate', (data) => {
        socket.broadcast.emit('screenShareCandidate', data);
    });
    
    socket.on('stopScreenShare', () => {
        socket.broadcast.emit('stopScreenShare');
    });
    
    // Manejo de mensajes de chat
    socket.on('chatMessage', (message) => {
        io.emit('chatMessage', { user: connectedUsers[socket.id], message });
    });
    
    // Manejo de imágenes en el chat
    socket.on('chatImage', (imageData) => {
        io.emit('chatImage', { user: connectedUsers[socket.id], imageData });
    });
    
    socket.on('disconnect', () => {
        const username = connectedUsers[socket.id];
        delete connectedUsers[socket.id];
        io.emit('updateUsers', connectedUsers);
        io.emit('notification', `🔔 ${username} se ha desconectado.`);
        console.log('Usuario desconectado', socket.id);
    });
});

server.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});
