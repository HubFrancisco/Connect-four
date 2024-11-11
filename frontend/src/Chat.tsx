import { useEffect, useState } from "react";
import { socket } from "./Websocket";
import { Howl } from "howler";
import { Toaster, toast } from 'react-hot-toast';
export default function Chat({ username }: { username: string }) {
    const [chatMessages, setChatMessages] = useState<{ user: string; message: string }[]>([]);
    const [newMessage, setNewMessage] = useState('')
    const notify = () => {
        toast.error("Message can't be empty!");
    };
    const sound = new Howl({
        src: ['./90s-game-ui-6-185099.mp3'], // Substitua pelo caminho do seu áudio
        html5: true, // Habilita o uso de HTML5 para melhor compatibilidade com navegadores móveis
    });
    const soundSystem = new Howl({
        src: ['./short-success-sound-glockenspiel-treasure-video-game-6346.mp3'], // Substitua pelo caminho do seu áudio
        html5: true, // Habilita o uso de HTML5 para melhor compatibilidade com navegadores móveis
    });

    useEffect(() => {
        socket.on('chatMessage', (messageData) => {
            setChatMessages((prevMessages) => [...prevMessages, messageData]);
        });
        return () => {
            socket.off("chatMessage")
        }
    })

    const playAudio = () => {
        sound.play();
    };
    function sendMessage(username: string): void {
        if (newMessage.trim() === '') {
            notify()
            soundSystem.play();
            return;
        };
        const messageData = { user: username, message: newMessage };
        socket.emit('chatMessage', messageData);
        playAudio()
        setNewMessage('');
    };
    return (
        <div className="chat">
            <h3 className="chat-title text-red-500">Chat</h3>
            <div className="chat-messages">
                {chatMessages.map((msg, index) => (
                    <p key={index}><strong>{msg.user}:</strong> {msg.message}</p>
                ))}
            </div>
            <div className="chat-input">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                />
                <button onClick={() => {
                    sendMessage(username)
                }}>Send</button>
            </div>
            <Toaster />
        </div>

    )
}