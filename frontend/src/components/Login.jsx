import React, { useState } from 'react';
import axios from 'axios';
import { Lock, User, Key, ShieldCheck, Info } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://lp-erp-v1.onrender.com/api';

function Login({ onLoginSuccess }) {
    const [mode, setMode] = useState('pin'); // 'admin' or 'pin'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = { username, password };

            const response = await axios.post(`${API_URL}/login`, payload, { withCredentials: true });
            onLoginSuccess(response.data); // data contains { user, role }
        } catch (err) {
            setError(err.response?.data?.detail || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-premium-bg flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-premium-slate via-premium-bg to-black">
            <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
                {/* Logo / Branding */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-premium-gold/10 border border-premium-gold/20 mb-6 shadow-2xl shadow-premium-gold/5">
                        <Lock className="text-premium-gold" size={40} />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2">LP ERP <span className="text-premium-gold text-lg vertical-top italic">v2</span></h1>
                    <p className="text-slate-500 font-medium italic">Acceso al Sistema Administrativo</p>
                </div>

                {/* Login Card */}
                <div className="bg-premium-slate/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden p-10 relative">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <LoginField
                            icon={<User size={18} />}
                            label="ID de Acceso"
                            type="text"
                            value={username}
                            onChange={setUsername}
                            placeholder="Usuario"
                        />
                        <LoginField
                            icon={<Lock size={18} />}
                            label="Contraseña"
                            type="password"
                            value={password}
                            onChange={setPassword}
                            placeholder="••••••••"
                        />

                        {error && (
                            <div className="flex items-center space-x-2 text-red-400 bg-red-400/10 p-4 rounded-2xl text-xs font-bold border border-red-400/20 animate-in shake duration-300">
                                <Info size={14} />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !username || !password}
                            className="w-full bg-premium-gold text-black font-black py-4 rounded-2xl shadow-xl shadow-premium-gold/10 hover:bg-yellow-400 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                        >
                            {loading ? 'Verificando...' : 'Entrar al Sistema'}
                        </button>
                    </form>
                </div>

                <p className="text-center mt-10 text-slate-600 text-[10px] uppercase font-bold tracking-[0.2em]">
                    Mueblería Torreón &copy; 2026
                </p>
            </div>
        </div>
    );
}

function LoginField({ icon, label, type, value, onChange, placeholder }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest block pl-2">{label}</label>
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-premium-gold transition-colors">
                    {icon}
                </div>
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-premium-gold/50 transition-all placeholder:text-slate-600"
                    placeholder={placeholder}
                    required
                />
            </div>
        </div>
    );
}

export default Login;

