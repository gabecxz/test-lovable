import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, MapPin, User, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const History = () => {
  const [completedDeliveries, setCompletedDeliveries] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [deliveriesRes, driversRes] = await Promise.all([
        axios.get(`${API}/deliveries`),
        axios.get(`${API}/drivers`)
      ]);
      const completed = deliveriesRes.data.filter(
        d => d.status === 'entregue' || d.status === 'cancelada'
      );
      setCompletedDeliveries(completed);
      setDrivers(driversRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar histórico');
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (completedDeliveries.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const headers = ['Cliente', 'Endereço', 'Status', 'Motorista', 'Data de Conclusão'];
    const rows = completedDeliveries.map(delivery => {
      const driver = drivers.find(d => d.id === delivery.driver_id);
      return [
        delivery.customer,
        delivery.address,
        delivery.status === 'entregue' ? 'Entregue' : 'Cancelada',
        driver ? driver.name : 'N/A',
        delivery.completed_at ? new Date(delivery.completed_at).toLocaleString('pt-BR') : 'N/A'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historico-entregas-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Relatório exportado com sucesso!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="history-loading">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="history-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Histórico</h1>
          <p className="text-gray-600 mt-1">Entregas concluídas e canceladas</p>
        </div>
        {completedDeliveries.length > 0 && (
          <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700" data-testid="export-csv-btn">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Entregas Concluídas</p>
                <p className="text-3xl font-bold text-green-600" data-testid="completed-count">
                  {completedDeliveries.filter(d => d.status === 'entregue').length}
                </p>
              </div>
              <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Entregas Canceladas</p>
                <p className="text-3xl font-bold text-red-600" data-testid="cancelled-count">
                  {completedDeliveries.filter(d => d.status === 'cancelada').length}
                </p>
              </div>
              <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center">
                <XCircle className="w-7 h-7 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History List */}
      <Card className="border-0 shadow-md" data-testid="history-list">
        <CardContent className="p-6">
          <div className="space-y-4">
            {completedDeliveries.map((delivery) => {
              const driver = drivers.find(d => d.id === delivery.driver_id);
              return (
                <div
                  key={delivery.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  data-testid={`history-item-${delivery.id}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900" data-testid={`history-customer-${delivery.id}`}>{delivery.customer}</h3>
                        <span className={`status-badge status-${delivery.status}`} data-testid={`history-status-${delivery.id}`}>
                          {delivery.status === 'entregue' ? 'Entregue' : 'Cancelada'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-start gap-2 text-sm text-gray-700">
                          <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                          <span data-testid={`history-address-${delivery.id}`}>{delivery.address}</span>
                        </div>
                        {driver && (
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <User className="w-4 h-4 text-gray-500" />
                            <span data-testid={`history-driver-${delivery.id}`}>{driver.name}</span>
                          </div>
                        )}
                        {delivery.completed_at && (
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span data-testid={`history-date-${delivery.id}`}>
                              {format(new Date(delivery.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {completedDeliveries.length === 0 && (
        <Card className="border-0 shadow-md" data-testid="no-history">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma entrega concluída</h3>
            <p className="text-gray-600">O histórico aparecerá aqui quando houver entregas finalizadas</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default History;