const socket = io("http://localhost:3000");

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startCallButton = document.getElementById("startCall");
const userList = document.getElementById("userList");
const usernameInput = document.getElementById("usernameInput");
const changeUsernameButton = document.getElementById("changeUsername");
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const sendMessageButton = document.getElementById("sendMessage");
const imageInput = document.getElementById("imageInput");
const sendImageButton = document.getElementById("sendImage");
const notifications = document.getElementById("notifications");


const screenVideo = document.getElementById("screenVideo");

const shareScreenButton = document.getElementById("shareScreen");
const stopScreenButton = document.getElementById("stopScreen");

const peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
});

const screenPeerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
});

let screenStream = null;




// Obtener acceso a la cámara y micrófono
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        localVideo.srcObject = stream;
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
    });

peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
};

peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        socket.emit("candidate", event.candidate);
    }
};

// Botón para iniciar la llamada
startCallButton.addEventListener("click", async () => {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", offer);
});

socket.on("offer", async (offer) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", answer);
});

socket.on("answer", (answer) => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("candidate", (candidate) => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});



// Cambiar el nombre de usuario
changeUsernameButton.addEventListener("click", () => {
    const newUsername = usernameInput.value.trim();
    if (newUsername) {
        socket.emit("changeUsername", newUsername);
    }
});

// Confirmación del cambio de nombre
socket.on("usernameChanged", (newUsername) => {
    alert(`Tu nombre ha sido cambiado a: ${newUsername}`);
});

// Actualizar lista de usuarios conectados en tiempo real
socket.on("updateUsers", (users) => {
    userList.innerHTML = "";
    Object.entries(users).forEach(([id, user]) => {
        const listItem = document.createElement("li");
        listItem.innerHTML = `👤 ${user}`;
        userList.appendChild(listItem);
    });
});

// Escuchar y mostrar notificaciones del servidor
socket.on("notification", (message) => {
    const notificationElement = document.createElement("p");
    notificationElement.textContent = message;
    notifications.appendChild(notificationElement);

    // Auto-scroll para ver la última notificación
    notifications.scrollTop = notifications.scrollHeight;

    // Eliminar notificación después de 5 segundos
    setTimeout(() => {
        notificationElement.remove();
    }, 5000);
});

// Enviar mensaje de chat
sendMessageButton.addEventListener("click", () => {
    const message = chatInput.value.trim();
    if (message) {
        socket.emit("chatMessage", message);
        chatInput.value = "";
    }
});

// Mostrar mensajes en el chat
socket.on("chatMessage", (data) => {
    const messageElement = document.createElement("p");
    messageElement.innerHTML = `<strong>${data.user}:</strong> ${data.message}`;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
});

// Enviar imagen al servidor
sendImageButton.addEventListener("click", () => {
    const file = imageInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            socket.emit("chatImage", reader.result);
        };
        reader.readAsDataURL(file);
    }
});

// Recibir y mostrar imágenes en el chat
socket.on("chatImage", (data) => {
    const messageElement = document.createElement("p");
    messageElement.innerHTML = `<strong>${data.user}:</strong><br><img src="${data.imageData}" width="150">`;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
});


// Función para compartir pantalla
shareScreenButton.addEventListener("click", async () => {
    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenVideo.srcObject = screenStream;

        screenStream.getTracks().forEach(track => screenPeerConnection.addTrack(track, screenStream));

        const offer = await screenPeerConnection.createOffer();
        await screenPeerConnection.setLocalDescription(offer);
        socket.emit("screenShareOffer", offer);
    } catch (error) {
        console.error("Error al compartir pantalla:", error);
    }
});


// Función para recibir y mostrar la pantalla compartida
screenPeerConnection.ontrack = (event) => {
    screenVideo.srcObject = event.streams[0];
};


// Manejo de ICE candidates
screenPeerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        socket.emit("screenShareCandidate", event.candidate);
    }
};

socket.on("screenShareOffer", async (offer) => {
    await screenPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await screenPeerConnection.createAnswer();
    await screenPeerConnection.setLocalDescription(answer);
    socket.emit("screenShareAnswer", answer);
});

socket.on("screenShareAnswer", (answer) => {
    screenPeerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("screenShareCandidate", (candidate) => {
    screenPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

// Función para detener la compartición de pantalla
stopScreenButton.addEventListener("click", () => {
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        screenVideo.srcObject = null;
        socket.emit("stopScreenShare");
    }
});

socket.on("stopScreenShare", () => {
    screenVideo.srcObject = null;
});