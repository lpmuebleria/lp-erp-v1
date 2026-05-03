import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Save, Calendar as CalendarIcon, Printer, FileText } from 'lucide-react';

export default function HRPayroll() {
  const [week, setWeek] = useState(getISOWeekString(new Date()));
  const [payrollData, setPayrollData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? `http://${window.location.hostname}:8000/api` : 'https://lp-erp-v1.onrender.com/api');

  // Helper
  function getISOWeekString(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
  }

  useEffect(() => {
    calculatePayroll();
  }, [week]);

  const calculatePayroll = async () => {
    try {
      // Fetch users, attendance, prestamos pending
      const [usersRes, attRes, loansRes, savedNominaRes] = await Promise.all([
        axios.get(`${API_URL}/hr/users`),
        axios.get(`${API_URL}/hr/asistencia/${week}`),
        axios.get(`${API_URL}/hr/prestamos?pending_only=true`),
        axios.get(`${API_URL}/hr/nomina/${week}`)
      ]);

      const users = usersRes.data;
      const atts = attRes.data;
      const loans = loansRes.data;
      const savedNomina = savedNominaRes.data;

      const data = users.map(u => {
        // If already saved in DB, use that
        const saved = savedNomina.find(n => n.user_id === u.username);
        if (saved) {
          return {
            ...saved,
            nombre_completo: u.nombre_completo || u.username,
            is_saved: true
          };
        }

        // Calculate dynamic
        const sueldo = u.sueldo_base || 0;
        const sueldoDiario = sueldo / 7; 
        const pagoHoraExtra = (sueldoDiario / 8) * 2; // Example: double pay per extra hour

        const att = atts.find(a => a.user_id === u.username);
        let faltas = 0;
        let hextras = 0;
        if (att) {
          ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'].forEach(d => {
            if (att[d] === 'FALTA') faltas++;
          });
          hextras = att.horas_extras || 0;
        }

        const userLoans = loans.filter(l => l.user_id === u.username);
        const totalLoans = userLoans.reduce((acc, curr) => acc + parseFloat(curr.monto), 0);

        const d_faltas = faltas * sueldoDiario;
        const p_extras = hextras * pagoHoraExtra;
        const total = sueldo + p_extras - d_faltas - totalLoans;

        return {
          user_id: u.username,
          nombre_completo: u.nombre_completo || u.username,
          semana: week,
          sueldo_base: sueldo,
          pago_horas_extras: p_extras,
          deduccion_faltas: d_faltas,
          deduccion_prestamos: totalLoans,
          total_pagado: total > 0 ? total : 0,
          fecha_pago: new Date().toISOString().split('T')[0],
          is_saved: false
        };
      });

      setPayrollData(data);

    } catch (err) {
      toast.error('Error al calcular nómina');
    }
  };

  const savePayroll = async () => {
    setIsLoading(true);
    try {
      const payload = payrollData.filter(p => !p.is_saved).map(p => ({
        user_id: p.user_id,
        semana: p.semana,
        sueldo_base: p.sueldo_base,
        pago_horas_extras: p.pago_horas_extras,
        deduccion_prestamos: p.deduccion_prestamos,
        deduccion_faltas: p.deduccion_faltas,
        total_pagado: p.total_pagado,
        fecha_pago: p.fecha_pago
      }));

      if (payload.length === 0) {
        toast('Toda la nómina ya estaba guardada', { icon: 'ℹ️' });
        return;
      }

      await axios.post(`${API_URL}/hr/nomina`, payload);
      toast.success('Nómina y deducciones aplicadas');
      calculatePayroll(); // Refresh
    } catch (err) {
      toast.error('Error al guardar nómina');
    } finally {
      setIsLoading(false);
    }
  };

  const printReceipt = (p) => {
    // Basic HTML print
    const html = `
      <html>
        <head>
          <title>Recibo de Nómina - ${p.nombre_completo}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
            .box { border: 2px solid #000; padding: 20px; border-radius: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .total { font-weight: bold; font-size: 18px; text-align: right; margin-top: 20px; }
            .signature { margin-top: 80px; text-align: center; }
            .line { border-top: 1px solid #000; width: 300px; margin: 0 auto 10px auto; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <h1>LP MUEBLERÍA DE JALISCO</h1>
            <p>Recibo de Nómina - Semana ${p.semana}</p>
          </div>
          <div class="box">
            <p><strong>Empleado:</strong> ${p.nombre_completo}</p>
            <p><strong>Fecha de Pago:</strong> ${p.fecha_pago}</p>
            
            <table>
              <tr><th>Concepto</th><th>Percepción</th><th>Deducción</th></tr>
              <tr><td>Sueldo Base Semanal</td><td>$${p.sueldo_base.toFixed(2)}</td><td></td></tr>
              <tr><td>Pago Horas Extras</td><td>$${p.pago_horas_extras.toFixed(2)}</td><td></td></tr>
              <tr><td>Descuento por Faltas</td><td></td><td>$${p.deduccion_faltas.toFixed(2)}</td></tr>
              <tr><td>Descuento Préstamos/Adelantos</td><td></td><td>$${p.deduccion_prestamos.toFixed(2)}</td></tr>
            </table>

            <div class="total">
              TOTAL A PAGAR: $${p.total_pagado.toFixed(2)}
            </div>
          </div>
          <div class="signature">
            <div class="line"></div>
            <p>Firma de conformidad del empleado</p>
          </div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Nómina Semanal</h2>
          <p className="text-slate-400 text-sm">Cálculo de sueldos, descuentos e impresión de recibos.</p>
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
            onClick={savePayroll}
            disabled={isLoading}
            className="bg-premium-gold hover:bg-yellow-400 text-black px-6 py-2 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center space-x-2 transition-transform active:scale-95 shadow-lg shadow-premium-gold/20"
          >
            <Save size={16} />
            <span>Cerrar Nómina</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar border border-white/10 rounded-2xl bg-black/20">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-white/5 border-b border-white/10 text-premium-gold font-bold uppercase tracking-widest text-[10px]">
            <tr>
              <th className="p-4">Empleado</th>
              <th className="p-4 text-right">Sueldo Base</th>
              <th className="p-4 text-right text-green-400">+ Horas Extras</th>
              <th className="p-4 text-right text-red-400">- Faltas</th>
              <th className="p-4 text-right text-red-400">- Préstamos</th>
              <th className="p-4 text-right font-black text-white">TOTAL</th>
              <th className="p-4 text-center">Estado</th>
              <th className="p-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300">
            {payrollData.map((p, i) => (
              <tr key={i} className="hover:bg-white/5 transition-colors">
                <td className="p-4 font-bold text-white uppercase">{p.nombre_completo}</td>
                <td className="p-4 text-right">${Number(p.sueldo_base).toFixed(2)}</td>
                <td className="p-4 text-right text-green-400/80">${Number(p.pago_horas_extras).toFixed(2)}</td>
                <td className="p-4 text-right text-red-400/80">-${Number(p.deduccion_faltas).toFixed(2)}</td>
                <td className="p-4 text-right text-red-400/80">-${Number(p.deduccion_prestamos).toFixed(2)}</td>
                <td className="p-4 text-right font-black text-premium-gold text-lg">${Number(p.total_pagado).toFixed(2)}</td>
                <td className="p-4 text-center">
                  {p.is_saved ? (
                    <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-[10px] font-bold tracking-widest">CERRADA</span>
                  ) : (
                    <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full text-[10px] font-bold tracking-widest">PENDIENTE</span>
                  )}
                </td>
                <td className="p-4 text-center">
                  <button 
                    onClick={() => printReceipt(p)}
                    className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl transition-colors"
                    title="Imprimir Recibo"
                  >
                    <Printer size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {payrollData.length === 0 && (
              <tr>
                <td colSpan="8" className="p-8 text-center text-slate-500">No hay datos de empleados para calcular.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
