import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Save, Calendar as CalendarIcon } from 'lucide-react';

export default function HRAttendance() {
  const [users, setUsers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [week, setWeek] = useState(getISOWeekString(new Date()));
  const [isLoading, setIsLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? `http://${window.location.hostname}:8000/api` : 'https://lp-erp-v1.onrender.com/api');

  const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const statusOptions = ['ASISTENCIA', 'FALTA', 'RETARDO', 'DESCANSO', 'VACACIONES', 'PERMISO'];

  // Helper to get YYYY-Www format
  function getISOWeekString(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
  }

  useEffect(() => {
    fetchData();
  }, [week]);

  const fetchData = async () => {
    try {
      const usersRes = await axios.get(`${API_URL}/hr/users`);
      const attRes = await axios.get(`${API_URL}/hr/asistencia/${week}`);
      
      setUsers(usersRes.data);
      
      // Merge
      const newAtt = {};
      usersRes.data.forEach(u => {
        const existing = attRes.data.find(a => a.user_id === u.username);
        if (existing) {
          newAtt[u.username] = { ...existing };
        } else {
          newAtt[u.username] = {
            user_id: u.username,
            semana: week,
            lunes: 'ASISTENCIA', martes: 'ASISTENCIA', miercoles: 'ASISTENCIA',
            jueves: 'ASISTENCIA', viernes: 'ASISTENCIA', sabado: 'DESCANSO', domingo: 'DESCANSO',
            horas_extras: 0
          };
        }
      });
      setAttendance(newAtt);
    } catch (err) {
      toast.error('Error al cargar datos');
    }
  };

  const handleStatusChange = (userId, day, val) => {
    setAttendance(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [day]: val }
    }));
  };

  const saveAttendance = async () => {
    setIsLoading(true);
    try {
      const dataToSave = Object.values(attendance);
      await axios.post(`${API_URL}/hr/asistencia`, dataToSave);
      toast.success('Asistencia guardada correctamente');
    } catch (err) {
      toast.error('Error al guardar asistencia');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Asistencia Semanal</h2>
          <p className="text-slate-400 text-sm">Captura manual por lote de la semana completa.</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-black/40 px-4 py-2 rounded-xl border border-white/10">
            <CalendarIcon size={16} className="text-premium-gold" />
            <input 
              type="week" 
              value={week}
              onChange={e => setWeek(e.target.value)}
              className="bg-transparent text-white font-bold outline-none text-sm"
            />
          </div>
          <button 
            onClick={saveAttendance}
            disabled={isLoading}
            className="bg-premium-gold hover:bg-yellow-400 text-black px-6 py-2 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center space-x-2 transition-transform active:scale-95 shadow-lg shadow-premium-gold/20"
          >
            <Save size={16} />
            <span>Guardar</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar border border-white/10 rounded-2xl bg-black/20">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-white/5 border-b border-white/10 text-premium-gold font-bold uppercase tracking-widest text-xs">
            <tr>
              <th className="p-4">Empleado</th>
              {days.map(d => (
                <th key={d} className="p-4 text-center">{d.substring(0,2)}</th>
              ))}
              <th className="p-4 text-center">Hrs Extras</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300">
            {users.map(u => {
              const att = attendance[u.username];
              if (!att) return null;
              
              return (
                <tr key={u.username} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-bold text-white">
                    {u.nombre_completo || u.username}
                  </td>
                  {days.map(d => (
                    <td key={d} className="p-2 text-center">
                      <select 
                        value={att[d]} 
                        onChange={(e) => handleStatusChange(u.username, d, e.target.value)}
                        className={`bg-black/50 border border-white/10 rounded-lg p-1 text-xs outline-none focus:border-premium-gold ${
                          att[d] === 'FALTA' ? 'text-red-400 font-bold' : 
                          att[d] === 'ASISTENCIA' ? 'text-green-400' : 'text-yellow-400'
                        }`}
                      >
                        {statusOptions.map(opt => (
                          <option key={opt} value={opt} className="text-white bg-premium-slate">{opt}</option>
                        ))}
                      </select>
                    </td>
                  ))}
                  <td className="p-2 text-center">
                    <input 
                      type="number" 
                      min="0"
                      step="0.5"
                      value={att.horas_extras}
                      onChange={(e) => handleStatusChange(u.username, 'horas_extras', parseFloat(e.target.value) || 0)}
                      className="w-16 bg-black/50 border border-white/10 rounded-lg p-1 text-center text-xs text-white focus:border-premium-gold outline-none"
                    />
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan="9" className="p-8 text-center text-slate-500">No hay empleados registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
