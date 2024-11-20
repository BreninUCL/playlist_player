import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { useNavigate } from 'react-router-dom';
import './deviceSelector.css';

const DeviceSelector = () => {
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const fetchDevices = async () => {
    const token = localStorage.getItem('access_token');
    setSelectedDeviceId(localStorage.getItem('selected_device'));

    try {
      const response = await fetch(`${API_URL}/devices/db`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleDeviceSelection = (e) => {
    e.preventDefault();
    enterFullScreen();
    if (!selectedDeviceId) {
      setError('Por favor, selecione um dispositivo.');
      return;
    }

    const selectedDevice = devices.find(device => device.id === parseInt(selectedDeviceId));

    if (!selectedDevice) {
      setError('Dispositivo não encontrado.');
      return;
    }

    navigate(`/device/${selectedDeviceId}`);
  };

  const handleDeviceChange = (value) => {
    localStorage.setItem('selected_device', value);
    setSelectedDeviceId(value);
  };

  const enterFullScreen = () => {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  };

  return (
    <div className="device-selector-container">
      <h2 className="title">Selecionar Dispositivo</h2>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>Carregando dispositivos...</p>
      ) : (
        <form onSubmit={handleDeviceSelection} className="device-selector-form">
          <label htmlFor="device-select" className="device-label">Dispositivo</label>
          <select
            id="device-select"
            value={selectedDeviceId || ''}
            onChange={(e) => handleDeviceChange(e.target.value)}
            className="device-select"
          >
            <option value="">Selecione um dispositivo</option>
            {devices.map((device) => (
              <option 
                key={device.id} 
                value={device.id} 
                disabled={!device.playlist_id && !device.cardapio_id}
              >
                {device.name} 
                {device.playlist_id && !device.cardapio_id && ' - Playlist'} 
                {device.cardapio_id && !device.playlist_id && ' - Cardápio'}
                {!device.playlist_id && !device.cardapio_id && ' (Sem conteúdos)'}
              </option>
            ))}
          </select>
          <button type="submit" className="submit-button">Confirmar Seleção</button>
        </form>
      )}
    </div>
  );
};

export default DeviceSelector;