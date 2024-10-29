import React, { useEffect, useState } from 'react';
import { WS_URL } from '../config';
import io from 'socket.io-client';

// URL do seu servidor WebSocket
const socket = io(WS_URL);

function WebSocketReceiver() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Conecta e ouve mensagens do servidor
    socket.on('connect', () => {
      console.log('Conectado ao WebSocket');
    });

    socket.on('message', (msg) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    // Limpa o evento e desconecta ao desmontar o componente
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div>
      <h3>Mensagens Recebidas do WebSocket</h3>
      <div>
        {messages.map((msg, index) => (
          <p key={index}>{msg}</p>
        ))}
      </div>
    </div>
  );
}

export default WebSocketReceiver;
