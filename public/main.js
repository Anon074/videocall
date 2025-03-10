const socket = io();

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startScreenShareButton = document.getElementById('startScreenShare');

let localStream;
let peerConnection = null; // Inicializa peerConnection como null

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' } // Servidor STUN para NAT traversal
    ]
};

// Función para iniciar la compartición de pantalla (solo para el emisor)
startScreenShareButton.onclick = async () => {
    try {
        // Captura la pantalla del usuario
        localStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        localVideo.srcObject = localStream;

        // Crea la conexión peer-to-peer
        createPeerConnection();

        // Añade las pistas de la pantalla compartida a la conexión
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        // Crea una oferta y la envía a los demás usuarios
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer); // Establece la oferta local
        socket.emit('offer', { offer });
    } catch (error) {
        console.error('Error accessing screen:', error);
    }
};

// Función para crear una conexión peer-to-peer
function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);

    // Cuando se recibe una pista remota, la mostramos en el elemento de video
    peerConnection.ontrack = (event) => {
        if (!remoteVideo.srcObject) {
            remoteVideo.srcObject = event.streams[0];
        }
    };

    // Cuando se genera un candidato ICE, lo enviamos al otro usuario
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('candidate', { candidate: event.candidate });
        }
    };
}

// Lógica para manejar la oferta, respuesta y candidatos ICE
socket.on('offer', async (data) => {
    if (!peerConnection) {
        createPeerConnection(); // Asegúrate de que peerConnection esté creado
    }

    try {
        // Establece la descripción remota (la oferta del emisor)
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

        // Crea una respuesta y la envía al emisor
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer); // Establece la respuesta local
        socket.emit('answer', { answer });
    } catch (error) {
        console.error('Error handling offer:', error);
    }
});

socket.on('answer', async (data) => {
    try {
        // Verifica que la conexión esté creada y en el estado correcto
        if (peerConnection && peerConnection.signalingState === 'have-local-offer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        } else {
            console.error('Cannot set remote answer in current state:', peerConnection ? peerConnection.signalingState : 'peerConnection is null');
        }
    } catch (error) {
        console.error('Error handling answer:', error);
    }
});

socket.on('candidate', async (data) => {
    try {
        // Añade el candidato ICE a la conexión
        if (peerConnection) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    } catch (error) {
        console.error('Error handling ICE candidate:', error);
    }
});

socket.on('user-disconnected', (userId) => {
    // Cierra la conexión si el usuario se desconecta
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
});