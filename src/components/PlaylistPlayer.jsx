import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { useNavigate } from 'react-router-dom';
import './PlaylistPlayer.css';

const CACHE_NAME = 'ArquivosPlayList';

const PlaylistPlayer = ({ playlistId }) => {
  const [playlistContent, setPlaylistContent] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = React.useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  useEffect(() => {
    const fetchPlaylist = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/playlist/${playlistId}`, {
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
        await cachePlaylistMedia(data);
        setPlaylistContent(data);
        setCurrentIndex(0);
        setIsPlaying(true);
        setIsLoading(false);

        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.error(err);
        setError(err.message || 'Erro desconhecido.');
        setIsLoading(false);
      }
    };

    fetchPlaylist();
  }, [playlistId]);

  const cachePlaylistMedia = async (playlist) => {
    const cache = await caches.open(CACHE_NAME);
    const mediaPromises = playlist.contents.map(async (item) => {
      if (item.contentType === 'file' && item.media) {
        const mediaUrl = `${playlist.base_url}/${item.media.file_url}`;
        try {
          const cachedResponse = await cache.match(mediaUrl);
          if (cachedResponse) {
            const blob = await cachedResponse.blob();
            item.media.cachedUrl = URL.createObjectURL(blob);
          } else {
            const response = await fetch(mediaUrl);
            if (!response.ok) throw new Error('Erro no download da mídia.');
            const responseClone = response.clone();
            const blob = await response.blob();
            await cache.put(mediaUrl, responseClone);
            item.media.cachedUrl = URL.createObjectURL(blob);
          }
        } catch (err) {
          console.error('Erro ao cachear mídia:', err);
          setError('Erro ao cachear mídia: ' + err.message);
        }
      } else if (item.contentType === 'html' && item.html) {
        const htmlKey = `html-${item.html.id}`;
        try {
          const cachedResponse = await cache.match(htmlKey);
          if (!cachedResponse) {
            const blob = new Blob([item.html.content], { type: 'text/html' });
            const responseClone = new Response(blob);
            await cache.put(htmlKey, responseClone);
          }
        } catch (err) {
          console.error('Erro ao cachear HTML:', err);
          setError('Erro ao cachear HTML: ' + err.message);
        }
      }
    });

    await Promise.all(mediaPromises);   //promise.all que o professor pediu.
  };

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

  const renderCurrentContent = () => {
    const currentItem = playlistContent.contents[currentIndex];
    if (!currentItem) return <p>Nenhum conteúdo disponível.</p>;

    const { base_url } = playlistContent;
    const mediaUrl = `${base_url}/${currentItem.media?.file_url}`;
    const cachedUrl = currentItem.media?.cachedUrl || mediaUrl;

    if (currentItem.contentType === 'file' && currentItem.media) {
      if (currentItem.media.file_extension === 'mp4') {
        return (
            <video
            autoPlay
            loop
            className="media-fullscreen"
            onCanPlay={(e) => e.target.play()}
          >
            <source src={cachedUrl || mediaUrl} type="video/mp4" />
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
      const htmlContent = currentItem.html.cachedContent || currentItem.html.content;
      return (
        <div className="html-content" dangerouslySetInnerHTML={{ __html: htmlContent }} />
      );
    }
  };

  const handleRetry = async () => {
    setError(null);
    setIsLoading(true);
    setIsPlaying(false);
  
    try {
      await cachePlaylistMedia(playlistContent);
  
      const allCached = playlistContent.contents.every(item => {
        if (item.contentType === 'file' && item.media) {
          return !!item.media.cachedUrl;
        }
        return true;
      });
  
      if (allCached) {
        setIsPlaying(true);
      } else {
        throw new Error('Ainda existem conteúdos não cacheados.');
      }
    } catch (err) {
      setError(err.message || 'Erro ao tentar recarregar o conteúdo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="error-modal">
        <div className="modal-content">
          <h2>Erro ao carregar o conteúdo</h2>
          <p>{error}</p>
          <div className="modal-buttons">
            <button onClick={() => navigate('/select-device')}>Voltar para Seleção de Dispositivo</button>
            <button onClick={handleRetry}>Tentar Novamente</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="playlist-player-container">
      {isLoading && <p>Carregando playlist...</p>}
      {isPlaying && playlistContent && (
        <div className="playlist-content">{renderCurrentContent()}</div>
      )}
      {!isFullScreen && (
        <button
          className="exit-button"
          onClick={() => navigate('/select-device')}
        >
          <b>Parar Reprodução</b>
        </button>
      )}
    </div>
  );
};

export default PlaylistPlayer;
