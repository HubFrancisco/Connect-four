const express = require('express');
const jwt = require('jsonwebtoken');
const http = require('http');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const { v4: uuidv4 } = require('uuid');
const PORT = 5000;
const SECRET_KEY = 'secrect_key_jwt';

app.use(cors());
app.use(express.json());

let players = [];
let currentPlayers = [];
let gameRooms = [];
let members = []
let startGame = { Name: "", Members: [] }
let currentGame = {
    board: Array(6).fill(null).map(() => Array(7).fill(null)),
    currentPlayer: 'Red',
};

const HISTORY_FILE = path.join(__dirname, 'gameHistory.json');

const readHistory = () => {
    if (fs.existsSync(HISTORY_FILE)) {
        const data = fs.readFileSync(HISTORY_FILE, 'utf8');
        return JSON.parse(data);
    }
    return [];
};

const saveHistory = (history) => {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
};

const generateToken = (userId) => {
    return jwt.sign({ userId }, SECRET_KEY, { expiresIn: '1h' });
};

const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(403).send('Access denied.');

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).send('Token inválido.');
        console.log(user);
        req.user = user;
        next();
    });
};

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'The name and password are required.' });
    }
    const users = JSON.parse(fs.readFileSync('users.json', 'utf8'));
    const isExistUser = users.find(user => user.username === username);
    if (isExistUser) {
        return res.status(400).json({ error: 'User already exists' });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = { username, password: hashedPassword, id: uuidv4() };
    players.push(newUser);
    fs.writeFileSync('users.json', JSON.stringify(players, null, 2), 'utf8');
    res.status(201).json({ message: 'User created successfully' });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync('users.json', 'utf8'));
    const user = users.find(user => user.username == username);
    if (!user) return res.status(400).json({ error: 'User not found' });

    if (bcrypt.compareSync(password, user.password)) {
        const token = generateToken(user.username);
        res.json({ token });
    } else {
        res.status(400).json({ error: 'Invalid password' });
    }
});

app.post('/games', authenticateToken, (req, res) => {
    const { result } = req.body;

    if (!result) {
        return res.status(400).json({ error: 'The result is required.' });
    }
    const history = readHistory();

    history.push(result);

    saveHistory(history);

    res.status(200).json({ message: 'The game has been saved', history });
});

app.get('/games/clear', (req, res) => {
    saveHistory([]);
    console.log('Game history cleared.');
    res.status(200);
});

app.get('/rooms/clear', (req, res) => {
    members = [];
    gameRooms = [];
    res.status(200);
});

app.get('/games', (req, res) => {
    const history = readHistory();
    res.status(200).json({ history });
});

app.get('/me', authenticateToken, (req, res) => {
    const users = JSON.parse(fs.readFileSync('users.json', 'utf8'));
    const user = users.find(user => user.username == req.user.userId);
    if (!user) return res.status(400).json({ error: 'User not found' });
    res.json({ user });
});

io.on('connection', (socket) => {
    socket.on('gameMove', (data) => {
        console.log(data)
        const { board, currentPlayer, room } = data;
        currentGame.board = board;
        currentGame.currentPlayer = currentPlayer;
        io.to(room).emit("gameUpdate", { result: null, ...currentGame, room });
    });
    socket.on('chatMessage', (messageData) => {
        io.emit('chatMessage', messageData);
    });
    socket.on('game', (data) => {
        io.to(data.room).emit('game', { user: data.user });
        console.log(data)

    })
    socket.on('resetGame', (data) => {
        io.emit('resetGame', data);
    })

    socket.on('gameOver', (data) => {
        const { result, board, room } = data;
        currentGame.board = board;
        console.log(data)
        io.to(room).emit("gameUpdate", { ...currentGame, result, room });
        io.emit('gameHistory', true);
        console.log(`Game Over: ${result}`);
    });

    socket.on('fallingPiece', (data) => {
        io.to(data.room).emit('fallingPiece', data);
    })
    // Quando o jogador desconectar
    socket.on('playerConnected', (playerConnected) => {
        if (currentPlayers.length == 0) {
            currentPlayers.push(playerConnected);
            io.emit('playerConnected', currentPlayers);
        } else if (!currentPlayers.some(player => player.username == playerConnected.username)) {
            currentPlayers.push(playerConnected);
            io.emit('playerConnected', currentPlayers);
        } else {
            io.emit('playerConnected', currentPlayers);
        }
    });

    socket.on('gameRoom', (gameRoom) => {
        const existingRoom = gameRooms.find(room => room.Name === gameRoom.Name);
        let message;
             if (!existingRoom) {
            for (let element of gameRoom.Members) {
                members.push(element.split("/")[0])
                gameRooms.push({
                    Id: element.split("/")[1],
                    Name: gameRoom.Name,
                    Members: members
                })
            }
            members = [];
            message = "Room created with success click on the room to play !";
            io.emit('gameRoom', gameRooms,message);
            io.emit('gameRoomAll', gameRooms);
        } else {
            members = [];
            message = "Room already exists!";
            io.emit('gameRoomAll', gameRooms);
            io.emit('gameRoom', gameRooms,message);
        }
    });
    socket.on("roomCurrent", (data) => {
        startGame.Name = data.name;
        if (!startGame.Members.find(player => player == data.user)) {
            startGame.Members.push(data.user);
        }
        socket.join(data.name);
        io.emit("roomCurrent", { ...data, startGame });
    })

    socket.on('endGame', (data) => {
        startGame = { Name: "", Members: [] }
        socket.emit('endGame', { startGame });
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected');
    });

});
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
