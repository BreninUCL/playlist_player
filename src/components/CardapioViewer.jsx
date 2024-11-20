import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';
import './CardapioViewer.css';

const CACHE_NAME = 'CacheCardapios';

const CardapioViewer = ({ cardapioId }) => {
  const [cardapio, setCardapio] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentCategory, setCurrentCategory] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  const itemsPerPage = 4; // Exibir 4 produtos por vez

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
    if (cardapio) {
      const interval = setInterval(() => {
        setCurrentPage((prevPage) => {
          const totalPages = Math.ceil(
            cardapio.content[currentCategory].produtos.length / itemsPerPage
          );

          if (prevPage < totalPages - 1) {
            return prevPage + 1;
          } else {
            setCurrentCategory((prevCategory) =>
              prevCategory < cardapio.content.length - 1 ? prevCategory + 1 : 0
            );
            return 0;
          }
        });
      }, 5000); // Alterna a cada 5 segundos

      return () => clearInterval(interval);
    }
  }, [cardapio, currentCategory]);

  if (loading) {
    return <p>Carregando cardápio...</p>;
  }

  if (error) {
    return <p className="error">{error}</p>;
  }

  if (!cardapio) {
    return <p className="error">Cardápio não encontrado.</p>;
  }

  const categoria = cardapio.content[currentCategory];
  const startIndex = currentPage * itemsPerPage;
  const produtos = categoria.produtos.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return (
    <div className="cardapio-container">
      <div className="categoria">
        <h3 className="categoria-nome">{categoria.nome_categoria}</h3>
        <ul className="produtos-list">
          {produtos.map((produto, idx) => (
            <li key={idx} className="produto">
              <div className="produto-info">
                <strong className="produto-nome">{produto.nome}</strong>
                <p className="produto-descricao">{produto.descricao}</p>
              </div>
              <div className="produto-preco">
                <span>R$ {(Number(produto.preco) || 0).toFixed(2)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CardapioViewer;
