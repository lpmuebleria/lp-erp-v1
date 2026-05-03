import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import { Save, Edit2, Image as ImageIcon, Download, Cake } from 'lucide-react';

export default function HRDirectory() {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? `http://${window.location.hostname}:8000/api` : 'https://lp-erp-v1.onrender.com/api');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/hr/users`);
      setUsers(res.data);
    } catch (err) {
      toast.error('Error al cargar empleados');
    }
  };

  const saveUser = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axios.put(`${API_URL}/hr/users/${editingUser.username}`, {
        photo_url: editingUser.photo_url || null,
        sueldo_base: editingUser.sueldo_base || 0,
        fecha_ingreso: editingUser.fecha_ingreso || null,
        puesto: editingUser.puesto || null,
        cumpleanos: editingUser.cumpleanos || null,
      });
      toast.success('Empleado actualizado');
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      toast.error('Error al guardar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadBirthday = (username) => {
    window.open(`${API_URL}/hr/birthday/generate/${username}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white">Directorio de Personal</h2>
          <p className="text-slate-400 text-sm">Gestiona la información de recursos humanos de tus empleados.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {users.map(u => (
          <div key={u.username} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center space-x-4">
            <div className="w-16 h-16 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {u.photo_url ? (
                <img src={u.photo_url} alt={u.username} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="text-slate-600" size={24} />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white uppercase text-sm truncate">{u.nombre_completo || u.username}</h3>
              <p className="text-xs text-slate-400 truncate">{u.puesto || 'Sin puesto asignado'}</p>
              <div className="mt-2 flex space-x-2">
                <button 
                  onClick={() => setEditingUser(u)}
                  className="bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit2 size={14} />
                </button>
                {u.cumpleanos && (
                  <button 
                    onClick={() => handleDownloadBirthday(u.username)}
                    className="bg-premium-gold hover:bg-yellow-400 text-black p-1.5 rounded-lg transition-colors"
                    title="Descargar Felicitación"
                  >
                    <Cake size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-premium-slate border border-premium-gold/20 p-6 rounded-3xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black text-white uppercase mb-4">Editar Datos HR</h3>
            <form onSubmit={saveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-premium-gold uppercase tracking-wider mb-1">URL Fotografía (Cloudinary)</label>
                <input
                  type="text"
                  value={editingUser.photo_url || ''}
                  onChange={e => setEditingUser({...editingUser, photo_url: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-premium-gold outline-none"
                  placeholder="https://res.cloudinary.com/..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-premium-gold uppercase tracking-wider mb-1">Sueldo Base Semanal</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingUser.sueldo_base || ''}
                    onChange={e => setEditingUser({...editingUser, sueldo_base: parseFloat(e.target.value)})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-premium-gold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-premium-gold uppercase tracking-wider mb-1">Puesto</label>
                  <input
                    type="text"
                    value={editingUser.puesto || ''}
                    onChange={e => setEditingUser({...editingUser, puesto: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-premium-gold outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-premium-gold uppercase tracking-wider mb-1">Fecha Ingreso</label>
                  <input
                    type="date"
                    value={editingUser.fecha_ingreso || ''}
                    onChange={e => setEditingUser({...editingUser, fecha_ingreso: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-premium-gold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-premium-gold uppercase tracking-wider mb-1">Cumpleaños</label>
                  <input
                    type="date"
                    value={editingUser.cumpleanos || ''}
                    onChange={e => setEditingUser({...editingUser, cumpleanos: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-premium-gold outline-none"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-premium-gold hover:bg-yellow-400 text-black py-3 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center space-x-2 transition-transform active:scale-95"
                >
                  <Save size={16} />
                  <span>Guardar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
