import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Phone, Car } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    license_plate: '',
    vehicle_type: '',
    status: 'ocioso'
  });

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await axios.get(`${API}/drivers`);
      setDrivers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast.error('Erro ao carregar motoristas');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDriver) {
        await axios.put(`${API}/drivers/${editingDriver.id}`, formData);
        toast.success('Motorista atualizado com sucesso!');
      } else {
        await axios.post(`${API}/drivers`, formData);
        toast.success('Motorista criado com sucesso!');
      }
      setModalOpen(false);
      resetForm();
      fetchDrivers();
    } catch (error) {
      console.error('Error saving driver:', error);
      toast.error('Erro ao salvar motorista');
    }
  };

  const handleEdit = (driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      license_plate: driver.license_plate,
      vehicle_type: driver.vehicle_type,
      status: driver.status
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este motorista?')) {
      try {
        await axios.delete(`${API}/drivers/${id}`);
        toast.success('Motorista excluído com sucesso!');
        fetchDrivers();
      } catch (error) {
        console.error('Error deleting driver:', error);
        toast.error('Erro ao excluir motorista');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      license_plate: '',
      vehicle_type: '',
      status: 'ocioso'
    });
    setEditingDriver(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="drivers-loading">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando motoristas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="drivers-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Motoristas</h1>
          <p className="text-gray-600 mt-1">Gerencie seus motoristas</p>
        </div>
        <Button onClick={handleOpenModal} className="bg-blue-600 hover:bg-blue-700" data-testid="add-driver-btn">
          <Plus className="w-4 h-4 mr-2" />
          Novo Motorista
        </Button>
      </div>

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drivers.map((driver) => (
          <Card key={driver.id} className="card-hover border-0 shadow-md" data-testid={`driver-card-${driver.id}`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2" data-testid={`driver-name-${driver.id}`}>{driver.name}</h3>
                  <span className={`status-badge status-${driver.status}`} data-testid={`driver-status-${driver.id}`}>
                    {driver.status === 'ocioso' ? 'Ocioso' : driver.status === 'em_entrega' ? 'Em Entrega' : 'Voltando'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(driver)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    data-testid={`edit-driver-${driver.id}`}
                  >
                    <Edit2 className="w-4 h-4 text-blue-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(driver.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    data-testid={`delete-driver-${driver.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700" data-testid={`driver-phone-${driver.id}`}>{driver.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Car className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700" data-testid={`driver-vehicle-${driver.id}`}>{driver.license_plate} - {driver.vehicle_type}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {drivers.length === 0 && (
        <Card className="border-0 shadow-md" data-testid="no-drivers">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Car className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum motorista cadastrado</h3>
            <p className="text-gray-600 mb-4">Comece adicionando seu primeiro motorista</p>
            <Button onClick={handleOpenModal} className="bg-blue-600 hover:bg-blue-700" data-testid="add-first-driver-btn">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Motorista
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent data-testid="driver-modal">
          <DialogHeader>
            <DialogTitle>{editingDriver ? 'Editar Motorista' : 'Novo Motorista'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="driver-name-input"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  data-testid="driver-phone-input"
                />
              </div>
              <div>
                <Label htmlFor="license_plate">Placa do Veículo</Label>
                <Input
                  id="license_plate"
                  value={formData.license_plate}
                  onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                  required
                  data-testid="driver-plate-input"
                />
              </div>
              <div>
                <Label htmlFor="vehicle_type">Tipo de Veículo</Label>
                <Input
                  id="vehicle_type"
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  placeholder="Ex: Moto, Carro, Van"
                  required
                  data-testid="driver-vehicle-input"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger data-testid="driver-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ocioso">Ocioso</SelectItem>
                    <SelectItem value="em_entrega">Em Entrega</SelectItem>
                    <SelectItem value="voltando">Voltando</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} data-testid="cancel-driver-btn">
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" data-testid="save-driver-btn">
                {editingDriver ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Drivers;