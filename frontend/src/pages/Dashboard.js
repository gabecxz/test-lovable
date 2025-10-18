import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Truck, Package, CheckCircle, Clock, TrendingUp, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_deliveries: 0,
    pending_deliveries: 0,
    in_progress_deliveries: 0,
    completed_deliveries: 0,
    total_drivers: 0,
    active_drivers: 0
  });
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, deliveriesRes] = await Promise.all([
        axios.get(`${API}/statistics`),
        axios.get(`${API}/deliveries`)
      ]);
      setStats(statsRes.data);
      setDeliveries(deliveriesRes.data.filter(d => d.status !== 'entregue' && d.status !== 'cancelada'));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const statCards = [
    { 
      title: 'Total de Entregas', 
      value: stats.total_deliveries, 
      icon: Package, 
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50'
    },
    { 
      title: 'Entregas Pendentes', 
      value: stats.pending_deliveries, 
      icon: Clock, 
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50'
    },
    { 
      title: 'Em Andamento', 
      value: stats.in_progress_deliveries, 
      icon: TrendingUp, 
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50'
    },
    { 
      title: 'Concluídas', 
      value: stats.completed_deliveries, 
      icon: CheckCircle, 
      color: 'bg-green-500',
      bgColor: 'bg-green-50'
    },
    { 
      title: 'Total de Motoristas', 
      value: stats.total_drivers, 
      icon: Truck, 
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50'
    },
    { 
      title: 'Motoristas Ativos', 
      value: stats.active_drivers, 
      icon: Truck, 
      color: 'bg-teal-500',
      bgColor: 'bg-teal-50'
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="dashboard-loading">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="dashboard">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="card-hover border-0 shadow-md" data-testid={`stat-card-${index}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900" data-testid={`stat-value-${index}`}>{stat.value}</p>
                  </div>
                  <div className={`w-14 h-14 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-7 h-7 ${stat.color.replace('bg-', 'text-')}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Map */}
      <Card className="border-0 shadow-md" data-testid="map-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Mapa de Entregas Ativas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] rounded-lg overflow-hidden" data-testid="map-container">
            <MapContainer 
              center={[-23.5505, -46.6333]} 
              zoom={12} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {deliveries.map((delivery) => (
                <Marker 
                  key={delivery.id} 
                  position={[delivery.latitude, delivery.longitude]}
                >
                  <Popup>
                    <div className="p-2">
                      <p className="font-semibold">{delivery.customer}</p>
                      <p className="text-sm text-gray-600">{delivery.address}</p>
                      <span className={`status-badge status-${delivery.status} mt-2`}>
                        {delivery.status.replace('_', ' ')}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;