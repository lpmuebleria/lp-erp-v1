import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Save, Plus, DollarSign, Gift } from 'lucide-react';

export default function HRCommissions() {
  const [users, setUsers] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [commissions, setCommissions] = useState({});
  
  // Prestamos
  const [prestamos, setPrestamos] = useState([]);
  const [newPrestamo, setNewPrestamo] = useState({ user_id: '', monto: '', motivo: '', fecha: new Date().toISOString().split('T')[0] });

  const [isLoading, setIsLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? `http://${window.location.hostname}:8000/api` : 'https://lp-erp-v1.onrender.com/api');

  useEffect(() => {
    fetchUsers();
    fetchPrestamos();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      fetchCommissions();
    }
  }, [month, users]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/hr/users`);
      setUsers(res.data);
      if (newPrestamo.user_id === '' && res.data.length > 0) {
        setNewPrestamo(prev => ({ ...prev, user_id: res.data[0].username }));
      }
    } catch (err) {
      toast.error('Error al cargar empleados');
    }
  };

  const fetchCommissions = async () => {
    try {
      const res = await axios.get(`${API_URL}/hr/comisiones/${month}`);
      const newComm = {};
      users.forEach(u => {
        const existing = res.data.find(c => c.user_id === u.username);
        newComm[u.username] = {
          user_id: u.username,
          mes: month,
          monto_bono: existing ? existing.monto_bono : 0,
          monto_comision: existing ? existing.monto_comision : 0,
          fecha_pago: existing ? existing.fecha_pago : new Date().toISOString().split('T')[0]
        };
      });
      setCommissions(newComm);
    } catch (err) {
      toast.error('Error cargando comisiones');
    }
  };

  const fetchPrestamos = async () => {
    try {
      const res = await axios.get(`${API_URL}/hr/prestamos?pending_only=true`);
      setPrestamos(res.data);
    } catch (err) {
      toast.error('Error cargando adelantos');
    }
  };

  const saveCommissions = async () => {
    setIsLoading(true);
    try {
      const dataToSave = Object.values(commissions).filter(c => parseFloat(c.monto_bono) > 0 || parseFloat(c.monto_comision) > 0);
      if (dataToSave.length === 0) {
        toast('No hay montos para guardar', { icon: 'ℹ️' });
        setIsLoading(false);
        return;
      }
      await axios.post(`${API_URL}/hr/comisiones`, dataToSave);
      toast.success('Comisiones y bonos guardados');
    } catch (err) {
      toast.error('Error al guardar comisiones');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommChange = (userId, field, val) => {
    setCommissions(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: val }
    }));
  };

  const createPrestamo = async (e) => {
    e.preventDefault();
    if (!newPrestamo.monto || newPrestamo.monto <= 0) return toast.error('Monto inválido');
    
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/hr/prestamos`, newPrestamo);
      toast.success('Adelanto registrado');
      setNewPrestamo({ ...newPrestamo, monto: '', motivo: '' });
      fetchPrestamos();
    } catch (err) {
      toast.error('Error al registrar adelanto');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* SECCIÓN COMISIONES Y BONOS */}
      <div className="bg-black/20 border border-white/10 p-6 rounded-3xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-premium-gold flex items-center space-x-2">
              <Gift size={20} />
              <span>Comisiones y Bonos Mensuales</span>
            </h2>
            <p className="text-slate-400 text-xs mt-1">Registra aquí las comisiones por ventas y bonos por meta de los primeros 5 días del mes.</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <input 
              type="month" 
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-premium-gold"
            />
            <button 
              onClick={saveCommissions}
              disabled={isLoading}
              className="bg-premium-gold hover:bg-yellow-400 text-black px-6 py-2 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center space-x-2 transition-transform active:scale-95"
            >
              <Save size={16} />
              <span>Guardar</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white/5 border-b border-white/10 text-premium-gold font-bold uppercase tracking-widest text-[10px]">
              <tr>
                <th className="p-3">Empleado</th>
                <th className="p-3 text-center">Bono Fijo ($)</th>
                <th className="p-3 text-center">Comisiones Variables ($)</th>
                <th className="p-3 text-center">TOTAL MES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {users.map(u => {
                const c = commissions[u.username];
                if (!c) return null;
                const total = parseFloat(c.monto_bono || 0) + parseFloat(c.monto_comision || 0);

                return (
                  <tr key={u.username} className="hover:bg-white/5">
                    <td className="p-3 font-bold text-white uppercase">{u.nombre_completo || u.username}</td>
                    <td className="p-3 text-center">
                      <input 
                        type="number" min="0" step="0.01" value={c.monto_bono}
                        onChange={(e) => handleCommChange(u.username, 'monto_bono', e.target.value)}
                        className="w-24 bg-black/50 border border-white/10 rounded-lg p-2 text-center text-xs text-white focus:border-premium-gold outline-none"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input 
                        type="number" min="0" step="0.01" value={c.monto_comision}
                        onChange={(e) => handleCommChange(u.username, 'monto_comision', e.target.value)}
                        className="w-24 bg-black/50 border border-white/10 rounded-lg p-2 text-center text-xs text-white focus:border-premium-gold outline-none"
                      />
                    </td>
                    <td className="p-3 text-center font-black text-premium-gold text-sm">
                      ${total.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECCIÓN ADELANTOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-black/20 border border-white/10 p-6 rounded-3xl space-y-4">
          <h2 className="text-xl font-black text-premium-gold flex items-center space-x-2">
            <DollarSign size={20} />
            <span>Registrar Adelanto / Préstamo</span>
          </h2>
          <p className="text-slate-400 text-xs">El monto se descontará en la próxima nómina automáticamente.</p>
          
          <form onSubmit={createPrestamo} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Empleado</label>
              <select
                value={newPrestamo.user_id}
                onChange={e => setNewPrestamo({...newPrestamo, user_id: e.target.value})}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-premium-gold"
              >
                {users.map(u => (
                  <option key={u.username} value={u.username} className="bg-premium-slate">{u.nombre_completo || u.username}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Monto ($)</label>
                <input
                  type="number" step="0.01" required
                  value={newPrestamo.monto}
                  onChange={e => setNewPrestamo({...newPrestamo, monto: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-premium-gold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Fecha</label>
                <input
                  type="date" required
                  value={newPrestamo.fecha}
                  onChange={e => setNewPrestamo({...newPrestamo, fecha: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-premium-gold"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Motivo (Opcional)</label>
              <input
                type="text"
                value={newPrestamo.motivo}
                onChange={e => setNewPrestamo({...newPrestamo, motivo: e.target.value})}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-premium-gold"
                placeholder="Ej. Vale para transporte..."
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center space-x-2 transition-transform active:scale-95"
            >
              <Plus size={16} />
              <span>Añadir Adelanto</span>
            </button>
          </form>
        </div>

        <div className="bg-black/20 border border-white/10 p-6 rounded-3xl space-y-4 flex flex-col h-[400px]">
          <h2 className="text-xl font-black text-white">Adelantos Pendientes</h2>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {prestamos.length === 0 ? (
              <p className="text-center text-slate-500 mt-10 text-sm">No hay adelantos pendientes de cobro.</p>
            ) : (
              <div className="space-y-3">
                {prestamos.map(p => (
                  <div key={p.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white uppercase text-sm">{p.nombre_completo}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{p.fecha} - {p.motivo || 'Sin motivo'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-red-400">-${Number(p.monto).toFixed(2)}</p>
                      <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest mt-1 inline-block">PENDIENTE</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
