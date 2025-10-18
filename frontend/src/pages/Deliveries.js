import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, MapPin, User, Clock, Route, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
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

const Deliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [optimizeModalOpen, setOptimizeModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState(null);
  const [selectedDeliveries, setSelectedDeliveries] = useState([]);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [assigningDelivery, setAssigningDelivery] = useState(null);
  const [formData, setFormData] = useState({
    address: '',
    customer: '',
    scheduled_time: '',
    latitude: -23.5505,
    longitude: -46.6333,
    status: 'pendente'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [deliveriesRes, driversRes] = await Promise.all([
        axios.get(`${API}/deliveries`),
        axios.get(`${API}/drivers`)
      ]);
      setDeliveries(deliveriesRes.data);
      setDrivers(driversRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDelivery) {
        await axios.put(`${API}/deliveries/${editingDelivery.id}`, formData);
        toast.success('Entrega atualizada com sucesso!');
      } else {
        await axios.post(`${API}/deliveries`, formData);
        toast.success('Entrega criada com sucesso!');
      }
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving delivery:', error);
      toast.error('Erro ao salvar entrega');
    }
  };

  const handleEdit = (delivery) => {
    setEditingDelivery(delivery);
    setFormData({
      address: delivery.address,
      customer: delivery.customer,
      scheduled_time: delivery.scheduled_time || '',
      latitude: delivery.latitude,
      longitude: delivery.longitude,
      status: delivery.status
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta entrega?')) {
      try {
        await axios.delete(`${API}/deliveries/${id}`);
        toast.success('Entrega excluída com sucesso!');
        fetchData();
      } catch (error) {
        console.error('Error deleting delivery:', error);
        toast.error('Erro ao excluir entrega');
      }
    }
  };

  const handleOptimizeRoute = async () => {
    if (selectedDeliveries.length === 0) {
      toast.error('Selecione pelo menos uma entrega');
      return;
    }

    try {
      const response = await axios.post(`${API}/optimize-route`, {
        delivery_ids: selectedDeliveries,
        start_latitude: -23.5505,
        start_longitude: -46.6333,
        average_speed_kmh: 40
      });
      setOptimizedRoute(response.data);
      setOptimizeModalOpen(true);
      toast.success('Rota otimizada com sucesso!');
    } catch (error) {
      console.error('Error optimizing route:', error);
      toast.error('Erro ao otimizar rota');
    }
  };

  const handleAssignDelivery = async (driverId) => {
    try {
      await axios.post(`${API}/deliveries/${assigningDelivery.id}/assign/${driverId}`);
      toast.success('Entrega atribuída com sucesso!');
      setAssignModalOpen(false);
      setAssigningDelivery(null);
      fetchData();
    } catch (error) {
      console.error('Error assigning delivery:', error);
      toast.error('Erro ao atribuir entrega');
    }
  };

  const toggleDeliverySelection = (id) => {
    setSelectedDeliveries(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const resetForm = () => {
    setFormData({
      address: '',
      customer: '',
      scheduled_time: '',
      latitude: -23.5505,
      longitude: -46.6333,
      status: 'pendente'
    });
    setEditingDelivery(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const activeDeliveries = deliveries.filter(d => d.status !== 'entregue' && d.status !== 'cancelada');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="deliveries-loading">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando entregas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="deliveries-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Entregas</h1>
          <p className="text-gray-600 mt-1">Gerencie suas entregas e rotas</p>
        </div>
        <div className="flex gap-3">
          {selectedDeliveries.length > 0 && (
            <Button 
              onClick={handleOptimizeRoute} 
              className="bg-green-600 hover:bg-green-700"
              data-testid="optimize-route-btn"
            >
              <Route className="w-4 h-4 mr-2" />
              Otimizar Rota ({selectedDeliveries.length})
            </Button>
          )}
          <Button onClick={handleOpenModal} className="bg-blue-600 hover:bg-blue-700" data-testid="add-delivery-btn">
            <Plus className="w-4 h-4 mr-2" />
            Nova Entrega
          </Button>
        </div>
      </div>

      {/* Deliveries Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activeDeliveries.map((delivery) => {
          const driver = drivers.find(d => d.id === delivery.driver_id);
          return (
            <Card key={delivery.id} className="card-hover border-0 shadow-md" data-testid={`delivery-card-${delivery.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={selectedDeliveries.includes(delivery.id)}
                    onCheckedChange={() => toggleDeliverySelection(delivery.id)}
                    className="mt-1"
                    data-testid={`delivery-checkbox-${delivery.id}`}
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1" data-testid={`delivery-customer-${delivery.id}`}>{delivery.customer}</h3>
                        <span className={`status-badge status-${delivery.status}`} data-testid={`delivery-status-${delivery.id}`}>
                          {delivery.status === 'pendente' ? 'Pendente' : 
                           delivery.status === 'em_andamento' ? 'Em Andamento' :
                           delivery.status === 'entregue' ? 'Entregue' : 'Cancelada'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(delivery)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          data-testid={`edit-delivery-${delivery.id}`}
                        >
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(delivery.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          data-testid={`delete-delivery-${delivery.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                        <span className="text-gray-700" data-testid={`delivery-address-${delivery.id}`}>{delivery.address}</span>
                      </div>
                      {delivery.scheduled_time && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700" data-testid={`delivery-time-${delivery.id}`}>{delivery.scheduled_time}</span>
                        </div>
                      )}
                      {driver && (
                        <div className="flex items-center gap-2 text-sm">
                          <Truck className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700" data-testid={`delivery-driver-${delivery.id}`}>{driver.name}</span>
                        </div>
                      )}
                      {!driver && delivery.status === 'pendente' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            setAssigningDelivery(delivery);
                            setAssignModalOpen(true);
                          }}
                          className="mt-2"
                          data-testid={`assign-driver-${delivery.id}`}
                        >
                          <User className="w-3 h-3 mr-1" />
                          Atribuir Motorista
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {activeDeliveries.length === 0 && (
        <Card className="border-0 shadow-md" data-testid="no-deliveries">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma entrega ativa</h3>
            <p className="text-gray-600 mb-4">Comece adicionando sua primeira entrega</p>
            <Button onClick={handleOpenModal} className="bg-blue-600 hover:bg-blue-700" data-testid="add-first-delivery-btn">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Entrega
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl" data-testid="delivery-modal">
          <DialogHeader>
            <DialogTitle>{editingDelivery ? 'Editar Entrega' : 'Nova Entrega'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer">Cliente</Label>
                  <Input
                    id="customer"
                    value={formData.customer}
                    onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                    required
                    data-testid="delivery-customer-input"
                  />
                </div>
                <div>
                  <Label htmlFor="scheduled_time">Horário</Label>
                  <Input
                    id="scheduled_time"
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                    data-testid="delivery-time-input"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  data-testid="delivery-address-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                    required
                    data-testid="delivery-lat-input"
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                    required
                    data-testid="delivery-lng-input"
                  />
                </div>
              </div>
              {editingDelivery && (
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger data-testid="delivery-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="entregue">Entregue</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} data-testid="cancel-delivery-btn">
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" data-testid="save-delivery-btn">
                {editingDelivery ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Optimize Route Modal */}
      <Dialog open={optimizeModalOpen} onOpenChange={setOptimizeModalOpen}>
        <DialogContent className="max-w-4xl" data-testid="optimize-modal">
          <DialogHeader>
            <DialogTitle>Rota Otimizada</DialogTitle>
          </DialogHeader>
          {optimizedRoute && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">Distância Total</p>
                    <p className="text-2xl font-bold text-gray-900" data-testid="route-distance">{optimizedRoute.total_distance_km} km</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">Tempo Estimado</p>
                    <p className="text-2xl font-bold text-gray-900" data-testid="route-time">{optimizedRoute.total_time_minutes.toFixed(0)} min</p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="h-[400px] rounded-lg overflow-hidden">
                <MapContainer 
                  center={[-23.5505, -46.6333]} 
                  zoom={12} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {optimizedRoute.route_points.map((point, index) => (
                    <Marker 
                      key={point.id} 
                      position={[point.latitude, point.longitude]}
                    >
                      <Popup>
                        <div className="p-2">
                          {point.type === 'start' ? (
                            <p className="font-semibold">Ponto de Início</p>
                          ) : (
                            <>
                              <p className="font-semibold">Parada {point.order}</p>
                              <p className="text-sm">{point.customer}</p>
                              <p className="text-xs text-gray-600">{point.address}</p>
                            </>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                  <Polyline 
                    positions={optimizedRoute.route_points.map(p => [p.latitude, p.longitude])} 
                    color="blue" 
                    weight={3}
                  />
                </MapContainer>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Driver Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent data-testid="assign-modal">
          <DialogHeader>
            <DialogTitle>Atribuir Motorista</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {drivers.map((driver) => (
              <div
                key={driver.id}
                onClick={() => handleAssignDelivery(driver.id)}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                data-testid={`assign-driver-option-${driver.id}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-900">{driver.name}</p>
                    <p className="text-sm text-gray-600">{driver.license_plate} - {driver.vehicle_type}</p>
                  </div>
                  <span className={`status-badge status-${driver.status}`}>
                    {driver.status === 'ocioso' ? 'Disponível' : driver.status === 'em_entrega' ? 'Ocupado' : 'Voltando'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Deliveries;