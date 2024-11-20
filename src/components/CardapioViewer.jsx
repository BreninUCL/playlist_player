import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';
import './CardapioViewer.css';

const CACHE_NAME = 'CacheCardapios';

const CardapioViewer = ({ cardapioId }) => {
  const [cardapio, setCardapio] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(0);

  useEffect(() => {
    const fetchAndCacheCardapio = async () => {
      try {
        setLoading(true);
        const cache = await caches.open(CACHE_NAME);

        const cachedResponse = await cache.match(`/cardapio/${cardapioId}`);
        if (cachedResponse) {
          const cachedData = await cachedResponse.json();
          setCardapio(cachedData);
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/cardapio/${cardapioId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erro ao carregar o cardápio');
        }

        const data = await response.json();

        if (data?.data?.length > 0) {
          const cardapioData = data.data[0];
          cardapioData.content = JSON.parse(cardapioData.content);
          setCardapio(cardapioData);

          const cacheResponse = new Response(JSON.stringify(cardapioData));
          await cache.put(`/cardapio/${cardapioId}`, cacheResponse);
        } else {
          throw new Error('Cardápio não encontrado');
        }
      } catch (err) {
        setError(err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndCacheCardapio();
  }, [cardapioId]);

  useEffect(() => {
    const calculateItemsPerPage = () => {
      const itemHeight = 150; // Ajuste o valor conforme o tamanho real dos itens
      const screenHeight = window.innerHeight;
      const itemsPerColumn = Math.floor(screenHeight / itemHeight);
      setItemsPerPage(itemsPerColumn);
    };

    calculateItemsPerPage();
    window.addEventListener('resize', calculateItemsPerPage);

    return () => {
      window.removeEventListener('resize', calculateItemsPerPage);
    };
  }, []);

  useEffect(() => {
    if (cardapio) {
      const interval = setInterval(() => {
        setCurrentPage((prevPage) =>
          prevPage < Math.ceil(cardapio.content.length / itemsPerPage) - 1
            ? prevPage + 1
            : 0
        );
      }, 5000); // Intervalo de 5 segundos para mudar a página automaticamente

      return () => clearInterval(interval);
    }
  }, [cardapio, itemsPerPage]);

  if (loading) {
    return <p>Carregando cardápio...</p>;
  }

  if (error) {
    return <p className="error">{error}</p>;
  }

  if (!cardapio) {
    return <p className="error">Cardápio não encontrado.</p>;
  }

  const produtos = cardapio.content.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  return (
    <div className="cardapio-container">
      <h2>{cardapio.name}</h2>
      <div className="cardapio-content">
        {produtos.map((categoria, index) => (
          <div key={index} className="categoria">
            <h3>{categoria.nome_categoria}</h3>
            <ul className="produtos-list">
              {categoria.produtos.map((produto, idx) => (
                <li key={idx} className="produto">
                  <strong>{produto.nome}</strong>
                  <p>{produto.descricao}</p>
                  <div className="produto-preco">
                    <span className="preco">R$ {(Number(produto.preco) || 0).toFixed(2)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CardapioViewer;
