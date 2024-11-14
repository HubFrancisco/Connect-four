
import { useEffect, useState } from 'react';
import './BoardGlobal.css'
import Chat from './Components/Chat';
import Room from './Components/Room';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { socket } from './Websocket';

type User = {
    username: string,
    id: string
}
const Board: React.FC = () => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [userData, setUserData] = useState<User | null>();
    const navigate = useNavigate()

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null)
        navigate('/')
    };

    useEffect(() => {
        if (!token) {
            navigate('/');
        };
        axios.get('http://localhost:5000/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(response => {
                console.log(response.data);
                setUserData(response.data.user);
                socket.emit('playerConnected', response.data.user);
            })
            .catch(err => {

                console.log(err);
            });
    }, [token]);
    return (
        <div className="game">
            <div className="header">
                <button className="logout-btn" onClick={logout}>Logout</button>
                <h2 className="username">Player: {userData?.username}</h2>
            </div>
            <div className="room-chat-container">
                <Room token={token} />
                <Chat username={userData?.username ?? ''} />
            </div>
        </div>

    );
};

export default Board;
