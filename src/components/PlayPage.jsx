import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../config';
import PlaylistPlayer from './PlaylistPlayer';
import CardapioViewer from './CardapioViewer';

const PlayPage = () => {
  const { deviceId } = useParams();
  const [device, setDevice] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDevice = async () => {
      try {
        const response = await fetch(`${API_URL}/device/${deviceId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erro ao carregar o dispositivo');
        }

        const data = await response.json();
        setDevice(data.data);
      } catch (err) {
        setError(err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDevice();
  }, [deviceId]);

  if (loading) {
    return <p>Carregando...</p>;
  }

  if (error) {
    return <p className="error">{error}</p>;
  }

  if (!device) {
    return <p className="error">Dispositivo não encontrado.</p>;
  }

  if (device.playlist_id) {
    return <PlaylistPlayer playlistId={device.playlist_id} />;
  }

  if (device.cardapio_id) {
    return <CardapioViewer cardapioId={device.cardapio_id} />;
  }

  return <p className="error">Dispositivo não possui conteúdo associado.</p>;
};

export default PlayPage;
