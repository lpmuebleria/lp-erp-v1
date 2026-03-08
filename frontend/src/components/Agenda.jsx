import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Clock,
    User,
    MapPin,
    Truck,
    CheckCircle2
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://lp-erp-v1.onrender.com/api';

function Agenda() {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [agendaData, setAgendaData] = useState({ events: [], counts: {} });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAgenda();
    }, [date]);

    const fetchAgenda = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/agenda`, { params: { fecha: date } });
            setAgendaData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const changeDate = (days) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        setDate(d.toISOString().split('T')[0]);
    };

    return (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700">
            {/* Date Header */}
            <div className="flex items-center justify-between bg-premium-slate/50 p-6 rounded-3xl border border-white/5 shadow-xl">
                <div className="flex items-center space-x-6">
                    <div className="bg-premium-gold/20 p-4 rounded-2xl text-premium-gold">
                        <CalendarIcon size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white capitalize">
                            {new Date(date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                        </h2>
                        <p className="text-slate-500 text-sm tracking-widest font-mono uppercase mt-1">{date}</p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button onClick={() => changeDate(-1)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white">
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        onClick={() => setDate(new Date().toISOString().split('T')[0])}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black tracking-widest uppercase transition-all"
                    >
                        Hoy
                    </button>
                    <button onClick={() => changeDate(1)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white">
                        <ChevronRight size={24} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Morning Shift */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xl font-bold flex items-center gap-3">
                            <span className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><Clock size={16} /></span>
                            Turno Mañana
                        </h3>
                        <span className="text-xs font-mono text-slate-500">{agendaData.counts?.MANANA || 0} / 5 cupos</span>
                    </div>

                    <div className="space-y-4">
                        {agendaData.events.filter(e => e.turno === 'MANANA').map(event => (
                            <EventCard key={event.id} event={event} />
                        ))}
                        {agendaData.events.filter(e => e.turno === 'MANANA').length === 0 && <EmptyState />}
                    </div>
                </section>

                {/* Afternoon Shift */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xl font-bold flex items-center gap-3">
                            <span className="p-2 bg-orange-500/20 text-orange-400 rounded-lg"><Clock size={16} /></span>
                            Turno Tarde
                        </h3>
                        <span className="text-xs font-mono text-slate-500">{agendaData.counts?.TARDE || 0} / 5 cupos</span>
                    </div>

                    <div className="space-y-4">
                        {agendaData.events.filter(e => e.turno === 'TARDE').map(event => (
                            <EventCard key={event.id} event={event} />
                        ))}
                        {agendaData.events.filter(e => e.turno === 'TARDE').length === 0 && <EmptyState />}
                    </div>
                </section>
            </div>
        </div>
    );
}

function EventCard({ event }) {
    return (
        <div className="bg-white/5 border border-white/5 p-5 rounded-3xl hover:border-premium-gold/30 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="font-bold text-white group-hover:text-premium-gold transition-colors">{event.folio}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <User size={12} /> {event.cliente_nombre}
                    </p>
                </div>
                <div className="p-2 bg-green-500/10 text-green-500 rounded-xl">
                    <Truck size={18} />
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <MapPin size={14} />
                    <span>Zona Metropolitana</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${event.saldo > 0 ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                    {event.saldo > 0 ? 'CON SALDO' : 'LIQUIDADO'}
                </span>
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="bg-white/5 border border-dashed border-white/10 p-10 rounded-3xl text-center">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-700">
                <Clock size={24} />
            </div>
            <p className="text-sm text-slate-600 font-medium">No hay entregas programadas</p>
        </div>
    );
}

export default Agenda;

