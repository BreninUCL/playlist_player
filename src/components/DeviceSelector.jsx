import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';
import './deviceSelector.css';

const CACHE_NAME = 'ArquivosPlayList';

const DeviceSelector = () => {
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [playlistContent, setPlaylistContent] = useState(null);
  const [cardapioContent, setCardapioContent] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isDeviceChangeAllowed, setIsDeviceChangeAllowed] = useState(true);
  const intervalRef = React.useRef();

  const fetchDevices = async () => {
    const token = localStorage.getItem('access_token');
    setSelectedDeviceId(localStorage.getItem('selected_device'));

    try {
      const response = await fetch(`${API_URL}/devices/db`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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
      console.error('Erro ao buscar dispositivos:', err);
    }
  };

const cacheCardapio = async (cardapio) => {
  const cache = await caches.open(CACHE_NAME);

  try {
    // Itera sobre o conteúdo do cardápio para identificar mídias a serem cacheadas
    const mediaPromises = cardapio.content.map(async (categoria) => {
      if (categoria.produtos && Array.isArray(categoria.produtos)) {
        for (const produto of categoria.produtos) {
          if (produto.media && produto.media.file_url) {
            const mediaUrl = `${cardapio.base_url}/${produto.media.file_url}`;
            try {
              const cachedResponse = await cache.match(mediaUrl);

              if (!cachedResponse) {
                const response = await fetch(mediaUrl);
                if (!response.ok) {
                  throw new Error('Erro no download da mídia ' + mediaUrl);
                }
                await cache.put(mediaUrl, response.clone());
              }
            } catch (err) {
              console.error('Erro ao cachear mídia do cardápio:', err);
              produto.media.error = 'Falha ao cachear a mídia';
            }
          }
        }
      }
    });

    await Promise.all(mediaPromises);
  } catch (err) {
    console.error('Erro ao cachear mídias do cardápio:', err);
    throw new Error('Falha ao cachear todas as mídias do cardápio.');
  }
};

// Modifique a função fetchCardapio para incluir o cacheamento após buscar o cardápio com sucesso
const fetchCardapio = async (cardapioId) => {
  try {
    console.log('Buscando cardápio com ID:', cardapioId);
    const response = await fetch(`${API_URL}/cardapio/${cardapioId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erro ao buscar cardápio');
    }

    const data = await response.json();
    console.log('Cardápio recebido:', data);

    if (data?.data?.length > 0) {
      const cardapio = data.data[0];
      if (cardapio?.content) {
        try {
          cardapio.content = JSON.parse(cardapio.content);
          console.log('Conteúdo do cardápio convertido:', cardapio.content);

          // Adiciona cacheamento aqui
          await cacheCardapio(cardapio);
        } catch (err) {
          console.error('Erro ao parsear conteúdo do cardápio:', err);
          setError('Erro ao processar o conteúdo do cardápio');
          return;
        }
      }
      setCardapioContent(cardapio);
    } else {
      setError('O cardápio está vazio.');
      console.warn('O cardápio retornou vazio:', data);
    }
  } catch (err) {
    setError(err.message);
    console.error('Erro ao buscar cardápio:', err);
  }
};


  const handleDeviceSelection = async (e) => {
    e.preventDefault();

    if (!selectedDeviceId) {
      setError('Por favor, selecione um dispositivo.');
      return;
    }

    const selectedDevice = devices.find(
      (device) => device.id === parseInt(selectedDeviceId)
    );

    if (!selectedDevice.playlist_id && !selectedDevice.cardapio_id) {
      setError('Este dispositivo não tem playlist ou cardápio associado.');
      return;
    }

    setIsLoading(true);
    enterFullScreen();
    setIsDeviceChangeAllowed(false);

    try {
      if (selectedDevice.playlist_id) {
        const playlistResponse = await fetch(
          `${API_URL}/playlist/${selectedDevice.playlist_id}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            },
          }
        );

        if (!playlistResponse.ok) {
          const errorData = await playlistResponse.json();
          throw new Error(errorData.message || 'Erro ao buscar playlist');
        }

        const playlistData = await playlistResponse.json();
        await cachePlaylistMedia(playlistData);

        setPlaylistContent(playlistData);
        setCurrentIndex(0);
        setIsPlaying(true);
      }

      if (selectedDevice.cardapio_id) {
        await fetchCardapio(selectedDevice.cardapio_id);
      }

      if (selectedDevice.playlist_id || selectedDevice.cardapio_id) {
        setIsPlaying(true);
      }

      setIsLoading(false);
    } catch (err) {
      setError(err.message);
      console.error('Erro na seleção do dispositivo:', err);
      setIsLoading(false);
    }
  };

  const handleDeviceChange = () => {
    setIsDeviceChangeAllowed(true);
    setIsPlaying(false);
    setPlaylistContent(null);
    setCardapioContent(null);
    clearInterval(intervalRef.current);
  };

  const cachePlaylistMedia = async (playlist) => {
    const cache = await caches.open(CACHE_NAME);

    try {
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

              if (!response.ok) {
                throw new Error('Erro no Download do Arquivo ' + mediaUrl);
              }

              const responseClone = response.clone();
              const blob = await response.blob();

              await cache.put(mediaUrl, responseClone);

              item.media.cachedUrl = URL.createObjectURL(blob);
            }
          } catch (err) {
            console.error('Erro ao baixar mídia:', err);
            item.media.error = 'Falha ao baixar a mídia';
            throw err;
          }
        }
      });

      await Promise.all(mediaPromises);
    } catch (err) {
      console.error('Erro ao cachear todas as mídias:', err);
      throw new Error(
        'Falha ao cachear todas as mídias, o carregamento foi interrompido.'
      );
    }
  };

  useEffect(() => {
    fetchDevices();

    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
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
    const element = document.querySelector('.device-selector'); // Coloca o contêiner no modo tela cheia
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) { /* Safari */
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) { /* IE11 */
      element.msRequestFullscreen();
    }
  };

  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);

  useEffect(() => {
    if (cardapioContent?.content?.length > 2) {
      const interval = setInterval(() => {
        setCurrentCategoryIndex((prevIndex) => 
          (prevIndex + 2) % cardapioContent.content.length
        );
      }, 5000); // Troca a cada 5 segundos, ajuste conforme necessário
  
      return () => clearInterval(interval); // Limpa o intervalo ao desmontar
    }
  }, [cardapioContent]);
  
  const renderCardapio = () => {
    if (!cardapioContent || !cardapioContent.content) {
      return <p>O cardápio está vazio.</p>;
    }
  
    // Filtra apenas duas categorias por vez
    const categoriasExibidas = cardapioContent.content.slice(
      currentCategoryIndex, 
      currentCategoryIndex + 2
    );
  
    return (
      <div className={`cardapio ${isFullScreen ? 'fullscreen' : ''}`}>
        <h3 className="cardapio-title">{cardapioContent.name}</h3>
        <p className="cardapio-description">{cardapioContent.description}</p>
        <div className="cardapio-categorias">
          {categoriasExibidas.map((categoria, index) => (
            <div key={index} className="categoria">
              <h4 className="categoria-title">{categoria.nome_categoria}</h4>
              <ul className="categoria-list">
                {categoria.produtos.map((produto, idx) => (
                  <li key={idx} className="produto-item">
                    <div className="produto-name">
                      <strong>{produto.nome}</strong>: R$ {produto.preco}
                    </div>
                    {produto.descricao && (
                      <p className="produto-description">{produto.descricao}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  

  const renderCurrentContent = () => {
    if (cardapioContent) {
      return renderCardapio();
    }

    if (!playlistContent || !playlistContent.contents.length) {
      return <p>Nenhum conteúdo disponível.</p>;
    }

    const currentItem = playlistContent.contents[currentIndex];
    const { base_url } = playlistContent;
    const mediaUrl = `${base_url}/${currentItem.media?.file_url}`;
    const cachedUrl = currentItem.media?.cachedUrl || mediaUrl;

    if (currentItem.contentType === 'file' && currentItem.media) {
      if (currentItem.media.file_extension === 'mp4') {
        return (
          <video autoPlay loop className="media-fullscreen">
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
        <div
          className="html-content"
          dangerouslySetInnerHTML={{ __html: currentItem.html.content }}
        />
      );
    }
  };

  return (
    <div className={`device-selector ${isFullScreen ? 'fullscreen-mode' : ''}`}>
      {error && <p className="error">{error}</p>}
      {isDeviceChangeAllowed ? (
        <form onSubmit={handleDeviceSelection}>
          <label htmlFor="device-select">Selecione um dispositivo:</label>
          <select
            id="device-select"
            value={selectedDeviceId || ''}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
          >
            <option value="">-- Selecione um dispositivo --</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Carregando...' : 'Selecionar'}
          </button>
        </form>
      ) : (
        <div>
          {!isFullScreen && (
            <button onClick={handleDeviceChange}>Alterar dispositivo</button>
          )}
          {renderCurrentContent()}
        </div>
      )}
    </div>
  );
};

export default DeviceSelector;
