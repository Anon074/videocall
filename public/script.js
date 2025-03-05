const localVideo = document.getElementById('local-video');
const remoteVideos = document.getElementById('remote-videos');
const userCountElement = document.getElementById('user-count');

const socket = io();
const peerConnections = {};

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then((stream) => {
    localVideo.srcObject = stream;

    socket.on('user-connected', (userId) => {
      console.log('Usuario conectado:', userId);
      createPeerConnection(userId, stream);
    });

    socket.on('user-disconnected', (userId) => {
      console.log('Usuario desconectado:', userId);
      if (peerConnections[userId]) {
        peerConnections[userId].close();
        delete peerConnections[userId];
        document.getElementById(userId).remove();
      }
    });

    socket.on('user-count', (count) => {
      userCountElement.textContent = `Usuarios conectados: ${count}`;
    });

    socket.on('offer', async (data) => {
      const { senderId, offer } = data;
      const peerConnection = createPeerConnection(senderId, stream);
      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('answer', { targetUserId: senderId, answer });
    });

    socket.on('answer', async (data) => {
      const { senderId, answer } = data;
      await peerConnections[senderId].setRemoteDescription(answer);
    });

    socket.on('ice-candidate', async (data) => {
      const { senderId, candidate } = data;
      await peerConnections[senderId].addIceCandidate(new RTCIceCandidate(candidate));
    });
  })
  .catch((error) => console.error('Error al acceder a la cámara:', error));

function createPeerConnection(userId, stream) {
  const peerConnection = new RTCPeerConnection();
  peerConnections[userId] = peerConnection;

  stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', { targetUserId: userId, candidate: event.candidate });
    }
  };

  peerConnection.ontrack = (event) => {
    const remoteVideo = document.createElement('video');
    remoteVideo.id = userId;
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;
    remoteVideo.srcObject = event.streams[0];
    remoteVideos.appendChild(remoteVideo);
  };

  if (userId !== socket.id) {
    peerConnection.createOffer()
      .then((offer) => peerConnection.setLocalDescription(offer))
      .then(() => {
        socket.emit('offer', { targetUserId: userId, offer: peerConnection.localDescription });
      });
  }

  return peerConnection;
}