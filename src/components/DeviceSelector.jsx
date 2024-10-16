import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';
import './deviceSelector.css';

const DeviceSelector = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [error, setError] = useState('');
  const [playlistContent, setPlaylistContent] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cache, setCache] = useState({});
  const intervalRef = React.useRef();

  const fetchDevices = async () => {
    const token = localStorage.getItem('access_token');

    try {
      const response = await fetch(`${API_URL}/devices/db`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao buscar dispositivos');
      }

      const data = await response.json();
      setDevices(data.data);
    } catch (err) {
      setError(err.message);
      console.error(err);
    }
  };

  const handleDeviceSelection = async (e) => {
    e.preventDefault();

    if (!selectedDeviceId) {
      setError('Por favor, selecione um dispositivo.');
      return;
    }

    const selectedDevice = devices.find(device => device.id === parseInt(selectedDeviceId));
    
    if (!selectedDevice.playlist_id) {
      setError('Este dispositivo não tem uma playlist associada.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/playlist/${selectedDevice.playlist_id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao buscar playlist');
      }

      const data = await response.json();
      setPlaylistContent(data);
      cachePlaylistMedia(data);
      setCurrentIndex(0);
      setIsPlaying(true);
      alert('Playlist carregada com sucesso!');
      enterFullScreen();
    } catch (err) {
      setError(err.message);
      console.error(err);
    }
  };

  const cachePlaylistMedia = (playlist) => {
    const cachedData = { ...cache };

    playlist.contents.forEach(async (item) => {
      if (item.contentType === 'file' && item.media) {
        const mediaUrl = `${playlist.base_url}/${item.media.file_url}`;

        if (!cachedData[mediaUrl]) {
          try {
            const response = await fetch(mediaUrl);
            const blob = await response.blob();
            cachedData[mediaUrl] = URL.createObjectURL(blob);
          } catch (err) {
            console.error('Erro ao baixar mídia:', err);
          }
        }
      }
    });

    setCache(cachedData);
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (isPlaying && playlistContent) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const totalItems = playlistContent.contents.length;
          return (prevIndex + 1) % totalItems;
        });
      }, playlistContent.contents[currentIndex]?.duration * 1000 || 10000);

      return () => clearInterval(intervalRef.current);
    }
  }, [isPlaying, playlistContent, currentIndex]);

  const enterFullScreen = () => {
    const element = document.documentElement; // ou pode ser um elemento específico, como a div da playlist
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.mozRequestFullScreen) { // Firefox
      element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) { // Chrome, Safari e Opera
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) { // IE/Edge
      element.msRequestFullscreen();
    }
  };

  const renderCurrentContent = () => {
    const currentItem = playlistContent.contents[currentIndex];
  
    if (!currentItem) {
      return <p>Nenhum conteúdo disponível.</p>;
    }

    const { base_url } = playlistContent;
    const mediaUrl = `${base_url}/${currentItem.media?.file_url}`;
    const cachedUrl = cache[mediaUrl] || mediaUrl;

    if (currentItem.contentType === 'file' && currentItem.media) {
      if (currentItem.media.file_extension === 'mp4') {
        return (
          <video
            autoPlay
            loop
            className="media-fullscreen"
          >
            <source src={cachedUrl} type="video/mp4" />
            Seu navegador não suporta a tag de vídeo.
          </video>
        );
      } else {
        return (
          <img
            src={cachedUrl}
            alt={currentItem.media.file_name}
            className="media-fullscreen"
          />
        );
      }
    } else if (currentItem.contentType === 'html' && currentItem.html) {
      return (
        <div className="html-content" dangerouslySetInnerHTML={{ __html: currentItem.html.content }} />
      );
    }
  };

  return (
    <div className="device-selector-container">
      <h2 className="title">Selecionar Dispositivo</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleDeviceSelection} className="device-selector-form">
        <select
          value={selectedDeviceId || ''}
          onChange={(e) => setSelectedDeviceId(e.target.value)}
          className="device-select"
        >
          <option value="">Selecione um dispositivo</option>
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name}
            </option>
          ))}
        </select>
        <button type="submit" className="submit-button">Carregar Playlist</button>
      </form>

      {isPlaying && playlistContent && (
        <div className="playlist-content">
          {renderCurrentContent()}
        </div>
      )}
    </div>
  );
};

export default DeviceSelector;
