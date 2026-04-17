const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Konfigurasi API Chatbot kamu
const CHAT_API_URL = 'http://127.0.0.1:8000/chat';

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join room / conversation
  socket.on('join', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);

    // Untuk sementara kita tidak ambil history (karena kamu belum kasih endpoint history)
    // Nanti bisa ditambah jika API kamu support GET history
    socket.emit('history', []);
  });

  // Saat user mengirim pesan
  socket.on('sendMessage', async (data) => {
    const { room, username, message, user_id, session_id } = data;

    if (!message || !user_id) {
      socket.emit('error', { message: 'Message dan user_id wajib diisi' });
      return;
    }

    try {
      console.log(`Mengirim ke API: ${message}`);

      // Kirim ke API Chatbot kamu
      const apiResponse = await axios.post(CHAT_API_URL, {
        message: message,
        user_id: user_id,
        session_id: session_id || "",
        new_conversation: false
      });

      // Ambil response dari chatbot (biasanya ada reply AI)
      const botReply = apiResponse.data;

      // Format pesan user (yang dikirim)
      const userMessage = {
        type: 'user',
        username: username || 'You',
        message: message,
        timestamp: new Date().toISOString()
      };

      // Format pesan bot (jawaban dari API)
      const botMessage = {
        type: 'bot',
        username: 'Bot',
        message: botReply.response || botReply.message || botReply.reply || JSON.stringify(botReply),
        timestamp: new Date().toISOString(),
        session_id: botReply.session_id || null   // ← Tambahkan ini
      };

      // Broadcast ke semua orang di room yang sama
      io.to(room).emit('receiveMessage', userMessage);
      io.to(room).emit('receiveMessage', botMessage);

    } catch (error) {
      console.error('Error calling Chat API:', error.response?.data || error.message);

      socket.emit('error', {
        message: 'Gagal terhubung ke chatbot. Coba lagi nanti. ' + error.message
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`✅ Socket.IO Server running on http://localhost:${PORT}`);
  console.log(`Terhubung ke Chatbot API: ${CHAT_API_URL}`);
});
