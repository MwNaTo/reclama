const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configuração do CORS
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'mural-casal-secret';

// ⚠️ SUA STRING DO MONGODB ATLAS - JÁ ESTÁ CONFIGURADA ⚠️
const MONGODB_URI = 'mongodb+srv://eda:eda66@cluster0.8st0usf.mongodb.net/mural_casal?retryWrites=true&w=majority';

// Modelos do MongoDB
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    userType: { type: String, enum: ['namorado', 'namorada'], required: true },
    profilePhoto: { type: String, default: '' },
    loveCoins: { type: Number, default: 0 },
    achievements: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});

const ComplaintSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    priority: { type: String, enum: ['Baixa', 'Média', 'Alta', 'Urgente'], default: 'Média' },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String },
    recipient: { type: String, required: true },
    status: { type: String, enum: ['pending', 'resolved'], default: 'pending' },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: String,
        text: String,
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Complaint = mongoose.model('Complaint', ComplaintSchema);

// Middleware de autenticação
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Não autorizado' });
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
        
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

// ROTAS DA API

// Teste
app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend com MongoDB funcionando! 🚀' });
});

// Cadastro
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, userType } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword, userType });
        await user.save();
        
        console.log(`✅ Usuário criado: ${name} (${email})`);
        res.status(201).json({ message: 'Usuário criado com sucesso!' });
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Email ou senha incorretos' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Email ou senha incorretos' });
        }
        
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
        
        console.log(`✅ Login: ${user.name} (${email})`);
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                userType: user.userType,
                loveCoins: user.loveCoins || 0,
                achievements: user.achievements || []
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});

// Verificar token
app.get('/api/auth/verify', authenticate, (req, res) => {
    res.json({
        user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            userType: req.user.userType,
            loveCoins: req.user.loveCoins || 0,
            achievements: req.user.achievements || []
        }
    });
});

// Criar reclamação
app.post('/api/complaints', authenticate, async (req, res) => {
    try {
        const { title, description, category, priority, recipient } = req.body;
        
        const complaint = new Complaint({
            title,
            description,
            category,
            priority,
            recipient,
            author: req.user._id,
            authorName: req.user.name
        });
        
        await complaint.save();
        res.status(201).json(complaint);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar reclamação' });
    }
});

// Listar reclamações - Mostra todas as reclamações do casal
app.get('/api/complaints', authenticate, async (req, res) => {
    try {
        // Buscar o outro usuário (namorado/namorada)
        const otherUser = await User.findOne({ 
            userType: req.user.userType === 'namorado' ? 'namorada' : 'namorado' 
        });
        
        // Mostra reclamações de AMBOS (autor e destinatário)
        const complaints = await Complaint.find({
            $or: [
                { author: req.user._id },
                { author: otherUser?._id },
                { recipient: req.user.userType === 'namorado' ? 'Namorada' : 'Namorado' }
            ]
        }).sort({ createdAt: -1 });
        
        res.json(complaints);
    } catch (error) {
        console.error('Erro ao buscar reclamações:', error);
        res.status(500).json({ error: 'Erro ao buscar reclamações' });
    }
});

// Estatísticas
app.get('/api/stats', authenticate, async (req, res) => {
    try {
        const total = await Complaint.countDocuments({
            $or: [
                { author: req.user._id },
                { recipient: req.user.userType === 'namorado' ? 'Namorada' : 'Namorado' }
            ]
        });
        
        const resolved = await Complaint.countDocuments({
            $or: [
                { author: req.user._id },
                { recipient: req.user.userType === 'namorado' ? 'Namorada' : 'Namorado' }
            ],
            status: 'resolved'
        });
        
        res.json({ total, resolved, pending: total - resolved });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// Curtir/Descurtir reclamação
app.put('/api/complaints/:id/like', authenticate, async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ error: 'Reclamação não encontrada' });

        const userId = req.user._id;
        const likeIndex = complaint.likes.indexOf(userId);

        if (likeIndex > -1) {
            complaint.likes.splice(likeIndex, 1);
        } else {
            complaint.likes.push(userId);
        }

        await complaint.save();
        res.json(complaint);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao curtir reclamação' });
    }
});

// Atualizar status
app.put('/api/complaints/:id/status', authenticate, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['pending', 'resolved'].includes(status)) {
            return res.status(400).json({ error: 'Status inválido' });
        }

        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ error: 'Reclamação não encontrada' });

        complaint.status = status;
        await complaint.save();
        res.json(complaint);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao alterar status' });
    }
});

// Excluir reclamação
app.delete('/api/complaints/:id', authenticate, async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ error: 'Reclamação não encontrada' });

        if (complaint.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Não autorizado a excluir esta reclamação' });
        }

        await Complaint.findByIdAndDelete(req.params.id);
        res.json({ message: 'Excluída com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir reclamação' });
    }
});

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Qualquer outra rota serve o index.html (para Single Page Applications)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});
// ====== SOCKET.IO CHAT E JOGOS ======
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });
const chatHistory = []; 
const activeRooms = {};

function generateRoomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

io.on('connection', (socket) => {
    // Chat
    socket.emit('chatHistory', chatHistory);
    socket.on('chatMessage', (msg) => {
        chatHistory.push(msg);
        if (chatHistory.length > 100) chatHistory.shift();
        io.emit('chatMessage', msg);
    });

    // Salas de Jogo
    socket.on('createRoom', (data) => {
        const roomCode = generateRoomCode();
        activeRooms[roomCode] = {
            players: [{ socketId: socket.id, userId: data.userId, name: data.name, score: 0, ready: false }],
            gameStarted: false,
            gameType: 'clickRace'
        };
        socket.join(roomCode);
        socket.emit('roomCreated', roomCode);
    });

    socket.on('joinRoom', (data) => {
        const room = activeRooms[data.roomCode];
        if (room) {
            if (room.players.length < 2) {
                room.players.push({ socketId: socket.id, userId: data.userId, name: data.name, score: 0, ready: false });
                socket.join(data.roomCode);
                io.to(data.roomCode).emit('roomUpdated', room);
            } else {
                socket.emit('roomError', 'Sala cheia');
            }
        } else {
            socket.emit('roomError', 'Sala não encontrada');
        }
    });

    socket.on('playerReady', (roomCode) => {
        const room = activeRooms[roomCode];
        if (room) {
            const player = room.players.find(p => p.socketId === socket.id);
            if (player) player.ready = true;
            io.to(roomCode).emit('roomUpdated', room);
            
            // Check if both ready
            if (room.players.length === 2 && room.players.every(p => p.ready)) {
                room.gameStarted = true;
                io.to(roomCode).emit('gameStarting', 3); // 3 seconds countdown
                setTimeout(() => {
                    io.to(roomCode).emit('gameStarted');
                    // Ends game after 10 seconds for Click Race
                    setTimeout(() => {
                        io.to(roomCode).emit('gameOver', room);
                    }, 10000);
                }, 3000);
            }
        }
    });

    socket.on('clickRaceClick', (roomCode) => {
        const room = activeRooms[roomCode];
        if (room && room.gameStarted) {
            const player = room.players.find(p => p.socketId === socket.id);
            if (player) {
                player.score += 1;
                io.to(roomCode).emit('scoreUpdated', room);
            }
        }
    });

    socket.on('disconnect', () => {
        // Remove from rooms
        for (const [code, room] of Object.entries(activeRooms)) {
            const pIndex = room.players.findIndex(p => p.socketId === socket.id);
            if (pIndex !== -1) {
                room.players.splice(pIndex, 1);
                if (room.players.length === 0) delete activeRooms[code];
                else io.to(code).emit('roomUpdated', room);
            }
        }
    });
});
// ====================================

// Conectar ao MongoDB e iniciar servidor
const MONGODB_URI_FINAL = process.env.MONGODB_URI || MONGODB_URI;

mongoose.connect(MONGODB_URI_FINAL)
    .then(() => {
        console.log('========================================');
        console.log('✅ Conectado ao MongoDB com sucesso!');
        console.log('📦 Banco de dados: Mural do Casal');
        console.log('========================================');
        
        // Usa a porta do ambiente (Render) ou 3000 se for local
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log(`🚀 Servidor rodando na porta ${PORT}`);
            console.log('📝 Teste: http://localhost:3000/api/test');
            console.log('========================================');
        });
    })
    .catch(err => {
        console.error('❌ Erro ao conectar ao MongoDB:', err);
        console.log('\n🔧 Verifique:');
        console.log('1. Se a string de conexão está correta');
        console.log('2. Se o usuário/senha estão corretos');
        console.log('3. Se o IP está liberado no MongoDB Atlas');
    });