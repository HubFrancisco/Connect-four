import { io } from "socket.io-client";

export const socket = io('http://localhost:5000', {
    transports: ['websocket'], // Garante que o WebSocket seja utilizado
});