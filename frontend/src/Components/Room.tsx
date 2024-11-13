import axios from "axios";
import { useEffect, useState } from "react";
import { socket } from "../Websocket";
import { Howl } from 'howler';
import { Toaster, toast } from 'react-hot-toast';
import Confetti from 'react-confetti';
import { useNavigate } from "react-router-dom";

const ROWS = 6;
const COLUMNS = 7;

type Player = 'Red' | 'Yellow' | null;
type BoardType = Player[][];

interface Direction {
    rowDir: number;
    colDir: number;
}

type GameRoom = {
    Id: string;
    Name: string;
    Members: string[],
    Draw?: string
}

const directions: Direction[] = [
    { rowDir: 1, colDir: 0 },
    { rowDir: 0, colDir: 1 },
    { rowDir: 1, colDir: 1 },
    { rowDir: 1, colDir: -1 }
];
const createEmptyBoard = (): BoardType => {
    return Array(ROWS).fill(null).map(() => Array(COLUMNS).fill(null));
};

const checkDirection = (board: BoardType, r: number, c: number, rowDir: number, colDir: number, player: Player): boolean => {
    let count = 1;
    for (let i = 1; i < 4; i++) {
        const newRow = r + rowDir * i;
        const newCol = c + colDir * i;
        if (
            newRow < 0 || newRow >= ROWS || newCol < 0 || newCol >= COLUMNS ||
            board[newRow][newCol] !== player
        ) {
            return false;
        }
        count++;
    }
    return count >= 4;
};
const checkAllDirections = (board: BoardType, r: number, c: number, player: Player): boolean => {
    for (let { rowDir, colDir } of directions) {
        if (checkDirection(board, r, c, rowDir, colDir, player)) {
            return true;
        }
    }
    return false;
};
const checkDraw = (board: BoardType): boolean => {
    return board.every(row => row.every(cell => cell !== null));
};

let newMember: string[] = [];
const checkWinner = (board: BoardType): Player => {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLUMNS; c++) {
            const player = board[r][c];
            if (player && checkAllDirections(board, r, c, player)) {
                return player;
            }
        }
    }
    return null;
};

type User = {
    username: string,
    id: string
}
export default function Room({ token }: { token: string | null }) {
    const [board, setBoard] = useState<BoardType>(createEmptyBoard());
    const [currentPlayer, setCurrentPlayer] = useState<Player>('Red');
    const [winner, setWinner] = useState<Player | 'Draw'>(null);
    const [gameHistory, setGameHistory] = useState<Player[]>([]);
    const [fallingPiece, setFallingPiece] = useState<{ row: number; col: number, room: string } | null>(null);
    const [userData, setUserData] = useState<User>({ username: '', id: '' });
    const [game, setGame] = useState<{ user: string }>({ user: '' });
    const [groupName, setGroupName] = useState<string>('');
    const [playerConnected, setPlayerConnected] = useState<User[] | null>(null);
    const [member, setMember] = useState<string>('');
    const [roomCurrent, setRoomCurrent] = useState<{ name: string, id: string }>({ name: '', id: '' });
    const [groupMembers, setGroupMembers] = useState<string[]>([]);
    const [gameRoom, setGameRoom] = useState<GameRoom[] | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [startGame, setStartGame] = useState<GameRoom>();
    const navigate = useNavigate()
    useEffect(() => {
        axios.get('http://localhost:5000/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(response => {
                console.log(response.data.user);
                setUserData(response.data.user);
                socket.emit('playerConnected', response.data.user);

            })
            .catch(err => {
                navigate('/');
                console.log(err);
            });

        axios.get('http://localhost:5000/games', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(response => {
                setGameHistory(response.data.history);
            })
            .catch(err => {
                console.log(err);
            });
        axios.get('http://localhost:5000/rooms/game')
            .then(response => {
                setGameRoom(response.data.history);
            })
            .catch(err => {
                console.log(err);
            });
        socket.on("gameRoomAll", (data) => {
            console.log(data)
            axios.get('http://localhost:5000/rooms/game')
                .then(response => {
                    setGameRoom(response.data.history);
                })
                .catch(err => {
                    console.log(err);
                });
        })

        socket.on("gameHistory", (data) => {
            console.log(data)
            axios.get('http://localhost:5000/games', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(response => {
                    setGameHistory(response.data.history);
                })
                .catch(err => {
                    console.log(err);
                });
        })
        socket.on('game', (data) => {
            setGame(data);
        })
        socket.on('resetGame', (data) => {
            setBoard(createEmptyBoard());
            setCurrentPlayer('Red');
            setWinner(null);
            setGame({ user: '' });
            setFallingPiece(null);
            setRoomCurrent({ name: '', id: '' });
            socket.emit('endGame', {
                Id: '',
                Name: '',
                Members: [],
                Draw: ''
            });
            console.log(data);
        })

        socket.on('fallingPiece', ({ row, col, room }) => {
            setFallingPiece({ row, col, room });
        })

        socket.on('playerConnected', (data) => {
            setPlayerConnected(data);
        })
        socket.on("gameUpdate", (data) => {
            console.log(data);
            setBoard(data.board);
            setCurrentPlayer(data.currentPlayer);
            if (data.result) {
                setWinner(data.result);
                setGameHistory(prevHistory => [...prevHistory, data.result] as Player[]);
            }
        })
        socket.on('roomCurrent', (data) => {
            setStartGame(data.startGame);
            setRoomCurrent({ name: data.name, id: data.id });
        });
        socket.on('endGame', (data) => {
            setStartGame(data.startGame);
        })
        socket.on('gameRoom', (data, message) => {
            setGroupMembers([])
            notifySuccess(message)
            console.log(data);
        })
        return () => {
            socket.off("roomCurrent")
            socket.off("gameRoom")
            socket.off("gameUpdate")
            socket.off("playerConnected")
            socket.off("fallingPiece")
            socket.off("game")
            socket.off("resetGame")
        }
    }, [token]);
    const sound = new Howl({
        src: ['./select-sound-121244.mp3'],
        html5: true,
    });
    const soundSystem = new Howl({
        src: ['./short-success-sound-glockenspiel-treasure-video-game-6346.mp3'],
        html5: true,
    });
    const soundCelebrate = new Howl({
        src: ['./music-for-game-fun-kid-game-163649.mp3'],
        html5: true,
    });
    const playAudio = () => {
        sound.play();
    };

    const handleClick = (col: number): void => {
        if (winner) {
            notifySuccess("The game is over!");
            soundSystem.play();
            return;
        }
        if (roomCurrent.name == '') {
            notify("Create a room first to play!");
            soundSystem.play();
            return;
        }

        if (startGame && startGame.Name.includes(roomCurrent.name) && startGame.Members.length > 1) {
        } else {
            notify("the game can't start because the room is full the players!");
            soundSystem.play();
            return;
        }

        if (game.user.includes(userData.username)) {
            notify("Not your turn to play!");
            soundSystem.play();
            return;
        } else {
            socket.emit('game', { user: userData.username, room: roomCurrent.name })
        }

        const newBoard = board.map(row => [...row]) as BoardType;
        for (let row = ROWS - 1; row >= 0; row--) {
            if (newBoard[row][col] === null) {
                let room = roomCurrent.name
                socket.emit('fallingPiece', { row, col, room });
                newBoard[row][col] = currentPlayer;
                const gameWinner = checkWinner(newBoard);
                setBoard(newBoard);
                if (gameWinner) {
                    setWinner(gameWinner);
                    axios.post('http://localhost:5000/games', { result: `${gameWinner} Wins ${userData.username}` }, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    socket.emit('gameOver', { room: roomCurrent.name, result: gameWinner, board: newBoard });
                    socket.emit('endGame', true);
                    handleCelebrate();
                    soundSystem.play();
                } else if (checkDraw(newBoard)) {
                    setWinner('Draw');
                    axios.post('http://localhost:5000/games', { result: "Draw" }, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    socket.emit('gameOver', { room: roomCurrent.name, result: "Draw", board: newBoard });
                    socket.emit('endGame', true);
                    soundSystem.play();
                } else {
                    setCurrentPlayer(currentPlayer === 'Red' ? 'Yellow' : 'Red');
                    socket.emit('gameMove', { room: roomCurrent.name, board: newBoard, currentPlayer: currentPlayer === 'Red' ? 'Yellow' : 'Red' });
                    playAudio()
                }

                return;
            }
        }
    };
    const handleCelebrate = () => {
        setShowConfetti(true);
        soundCelebrate.play();
        setTimeout(() => {
            setShowConfetti(false)
            soundCelebrate.stop();
        }, 3500);
    };
    const joinRoom = () => {
        if (member === '') {
            notify("Member can't be empty!");
            soundSystem.play();
            return;
        }
        if (groupMembers.find((m) => m === member)) {
            notify("Can't add the same member twice!");
            soundSystem.play();
            return;
        }
        newMember.push(member);
        console.log(newMember);
        setGroupMembers(newMember);
        notifySuccess("Member added with success in Room!");
        soundSystem.play();
    }
    const createRoom = () => {
        console.log(groupName)
        if (groupName === '') {
            notify("Room name can't be empty!")
            soundSystem.play();
            return;
        } else {

            if (groupMembers && groupMembers.length > 1) {

                socket.emit('gameRoom', {
                    Id: userData.id,
                    Name: groupName,
                    Members: groupMembers
                })
                newMember = [];
            } else {
                notify("At least two members are required to create a room!")
            }
            soundSystem.play();
            return;
        }
    }
    const selectGameRoom = (name: string, id: string, user: string) => {
        socket.emit('roomCurrent', { name, id, user });
        notifySuccess("The game sarted")
        soundSystem.play();
    }

    const resetGame = (): void => {
        socket.emit('resetGame', true);
        notifySuccess("The game has been reset!");
        soundSystem.play();
    };

    const notifySuccess = (message: string) => {
        toast.success(message);
    };

    const notify = (message: string) => {
        toast.error(message);
    };

    const handleHistoryClick = () => {
        axios.get('http://localhost:5000/games/clear')
        notifySuccess("The game history has been cleared!");
        soundSystem.play();
        setGameHistory([]);
    }

    const handleHistoryRoomResetClick = () => {
        notifySuccess("The form has been cleared!");
        setGroupMembers([])
        soundSystem.play();
    }

    const handleHistoryRoomClick = () => {
        axios.get('http://localhost:5000/rooms/clear')
        notifySuccess("The room history has been cleared!");
        setGameRoom([]);
        setGroupMembers([])
        soundSystem.play();
    }
    return (
        <div className="game">
            <>
                <div className="board">
                    {board.map((row, rowIndex) => (
                        <div key={rowIndex} className="row">
                            {row.map((cell, colIndex) => (
                                <div
                                    key={colIndex}
                                    className={`cell ${cell} ${fallingPiece?.col === colIndex && fallingPiece?.row === rowIndex ? 'falling' : ''}`}
                                    onClick={() => {
                                        handleClick(colIndex)
                                    }}
                                >
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                <div className="info">
                    {winner ? (
                        winner === 'Draw' ? (
                            <h2>It's a draw!</h2>
                        ) : (
                            <h2><span className={currentPlayer === 'Red' ? 'Red' : 'Yellow'}>{currentPlayer}</span> wins!</h2>
                        )
                    ) : (
                        <h2>Current Player: <span className={currentPlayer === 'Red' ? 'Red' : 'Yellow'}>{currentPlayer}</span></h2>
                    )}
                    <button className="reset-btn" onClick={resetGame}>Reset Game</button>
                </div>
                <div className="history">
                    <div className="container-clear-all">
                        <h3 className="history-title">Game Histories</h3>
                        <button onClick={handleHistoryClick} className="clear-all">Clear All</button>
                    </div>
                    {gameHistory.length > 0 && <ul className="history-log">
                        {gameHistory.map((result, index) => (
                            <>
                                <li key={index}>{result}</li>
                            </>
                        ))}
                    </ul>}

                </div>
            </>

            <div className="game-room-actions">
                <input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    type="text"
                    placeholder="Room Name"
                />
                <br />
                <select
                    value={member}
                    onChange={(e) => setMember(e.target.value)}
                >
                    <option disabled value="">
                        Members
                    </option>
                    {playerConnected && playerConnected.map((member, index) => (
                        <option key={index} value={`${member.username}/${member.id}`}>
                            {member.username}
                        </option>
                    ))}
                </select>
                <button onClick={joinRoom}>Join Room</button>
                <br />
                <button onClick={createRoom}>Create Room</button>
            </div>
            <div className="container-clear-all">
                <h3 className="rooms-title">Rooms</h3>
                <button onClick={handleHistoryRoomResetClick} className="clear-all">Clear Form</button>
                <button onClick={handleHistoryRoomClick} className="clear-all">Clear All</button>
            </div>
            {gameRoom &&
                gameRoom.filter(room => room.Id == userData.id).map((room, roomIndex) => (
                    <button className="game-room-box" key={roomIndex} onClick={() => selectGameRoom(room.Name, room.Id, userData.username)}>
                        <h3>Room: {room.Name}</h3>
                        <h4>Membership</h4>
                        {room.Members.map((member, index) => (
                            <p key={index}>{member}</p>
                        ))}
                    </button>
                ))}
            <Toaster />
            {showConfetti && <Confetti />}
        </div>

    )
}
