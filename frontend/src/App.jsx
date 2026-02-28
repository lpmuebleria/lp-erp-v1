import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Package,
  ShoppingCart,
  ClipboardList,
  Calendar,
  PlusCircle,
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon,
  FileText,
  Archive,
  Bell,
  Check,
  Wallet
} from 'lucide-react';
import axios from 'axios';

// Ensure all requests send and receive cookies for FastAPI SessionMiddleware
axios.defaults.withCredentials = true;

import Inventory from './components/Inventory';
import Sales from './components/Sales';
import Orders from './components/Orders';
import OrderDetails from './components/OrderDetails';
import Agenda from './components/Agenda';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Settings from './components/Settings';
import Quotes from './components/Quotes';
import Layaways from './components/Layaways';
import Payments from './components/Payments';
import ConceptDetails from './components/ConceptDetails';

function App() {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem('lp_erp_auth');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  // Concept Drill-Down State (Fullscreen isolated view)
  const [activeConcept, setActiveConcept] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  useEffect(() => {
    if (auth) {
      localStorage.setItem('lp_erp_auth', JSON.stringify(auth));
      axios.defaults.headers.common['X-User-ID'] = auth.user;
      axios.defaults.headers.common['X-Is-Superadmin'] = auth.is_superadmin ? 'true' : 'false';

      if (auth.role === 'vendedor' && activeTab === 'dashboard') {
        setActiveTab('sales');
      }
      fetchNotifications();
    } else {
      localStorage.removeItem('lp_erp_auth');
      delete axios.defaults.headers.common['X-User-ID'];
      delete axios.defaults.headers.common['X-Is-Superadmin'];
      setNotifications([]);
    }
  }, [auth, activeTab]); // also refetch when navigating tabs

  const fetchNotifications = async () => {
    if (!auth) return;
    try {
      const res = await axios.get(`${API_URL}/notifications?role=${auth.role}`);
      setNotifications(res.data || []);
    } catch (err) {
      console.error("Error fetching notifications", err);
    }
  };

  const markAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.patch(`${API_URL}/notifications/${id}/read`);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (err) {
      console.error("Error marking as read", err);
    }
  };

  const handleLogout = () => {
    setAuth(null);
  };

  if (!auth) {
    return <Login onLoginSuccess={(userData) => setAuth(userData)} />;
  }

  // Unified permissions check
  const canAccess = (module) => {
    if (auth.is_superadmin) return true;
    return auth.permissions?.[module]?.can_view === true;
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, show: canAccess('dashboard') },
    { id: 'inventory', label: 'Inventario', icon: Package, show: canAccess('inventory') },
    { id: 'sales', label: 'Ventas', icon: ShoppingCart, show: canAccess('sales') },
    { id: 'orders', label: 'Pedidos', icon: ClipboardList, show: canAccess('orders') },
    { id: 'quotes', label: 'Cotizaciones', icon: FileText, show: canAccess('quotes') },
    { id: 'apartados', label: 'Apartados', icon: Archive, show: canAccess('apartados') },
    { id: 'payments', label: 'Caja y Pagos', icon: Wallet, show: canAccess('payments') },
    { id: 'agenda', label: 'Agenda', icon: Calendar, show: canAccess('agenda') },
    { id: 'settings', label: 'Configuración', icon: SettingsIcon, show: canAccess('settings') },
  ];

  const visibleMenuItems = menuItems.filter(item => item.show);

  if (activeConcept) {
    return <ConceptDetails concepto={activeConcept} onBack={() => setActiveConcept(null)} />;
  }

  return (
    <div className="flex h-screen bg-premium-bg text-white overflow-hidden font-sans selection:bg-premium-gold/30">
      {/* Sidebar */}
      <aside className="w-72 bg-premium-slate border-r border-white/5 flex flex-col shadow-2xl relative z-20">
        <div className="p-8">
          <h1 className="text-2xl font-black text-white tracking-tighter flex items-center space-x-2">
            <div className="w-8 h-8 bg-premium-gold rounded-lg flex items-center justify-center">
              <span className="text-black text-lg">LP</span>
            </div>
            <span>ERP <span className="text-premium-gold italic text-sm">v2</span></span>
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-[4px] mt-1 ml-1 text-center font-black">MUEBLERÍA TORREÓN</p>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
          {visibleMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSelectedOrderId(null);
              }}
              className={`w-full flex items-center space-x-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${activeTab === item.id
                ? 'bg-premium-gold text-black font-bold shadow-lg shadow-premium-gold/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-black' : 'group-hover:text-premium-gold transition-colors'} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User Profile / Logout */}
        <div className="p-6 border-t border-white/5 space-y-4">
          <div className="flex items-center space-x-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
              <UserIcon className="text-premium-gold" size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-white truncate w-32 uppercase">{auth.user}</p>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{auth.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl border border-white/5 text-slate-500 hover:text-red-400 hover:bg-red-400/5 transition-all text-xs font-bold uppercase tracking-widest"
          >
            <LogOut size={14} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/[0.02] via-transparent to-transparent">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tight uppercase">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
            <p className="text-slate-500 font-medium italic mt-1">
              Bienvenido de nuevo, {auth.user}
            </p>
          </div>

          <div className="flex items-center space-x-6 relative">
            {/* Header Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="relative p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-premium-gold/50 transition-all duration-300 group shadow-lg"
              >
                <Bell size={20} className="group-hover:rotate-12 transition-transform" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-lg border-2 border-premium-slate animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Dropdown Menu */}
              {showNotifMenu && (
                <div className="absolute top-14 right-0 w-80 bg-premium-slate border border-premium-gold/20 rounded-3xl shadow-2xl z-50 overflow-hidden transform origin-top-right animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-white/10 bg-black/20 flex justify-between items-center">
                    <h3 className="font-black text-sm uppercase tracking-widest text-premium-gold">Notificaciones</h3>
                    <span className="text-[10px] bg-white/10 text-white px-2 py-1 rounded-full font-bold">{notifications.length}</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">
                        <Bell className="mx-auto mb-2 opacity-20" size={32} />
                        <p className="text-xs">No hay notificaciones nuevas</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors relative group cursor-pointer"
                          onClick={() => {
                            setShowNotifMenu(false);
                            if (n.related_order_id) {
                              setActiveTab('orders');
                              setSelectedOrderId(n.related_order_id);
                            }
                          }}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${n.type === 'error' ? 'bg-red-500/20 text-red-400' :
                              n.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                                n.type === 'success' ? 'bg-green-500/20 text-green-400' :
                                  'bg-blue-500/20 text-blue-400'
                              }`}>{n.type}</span>
                            <span className="text-[9px] text-slate-500">{n.created_at.split('T')[0]}</span>
                          </div>
                          <p className="font-bold text-sm text-white mt-1 leading-tight group-hover:text-premium-gold transition-colors">{n.title}</p>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{n.message}</p>

                          <button
                            onClick={(e) => markAsRead(n.id, e)}
                            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1.5 bg-white/10 rounded-lg hover:bg-premium-gold hover:text-black transition-all"
                            title="Marcar como leída"
                          >
                            <Check size={14} strokeWidth={3} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {activeTab !== 'sales' && !selectedOrderId && (
              <button
                onClick={() => setActiveTab('sales')}
                className="bg-premium-gold hover:bg-yellow-400 text-black px-6 py-3 rounded-2xl font-black text-sm flex items-center space-x-2 transition-all shadow-xl shadow-premium-gold/10 hover:shadow-premium-gold/20 active:scale-95"
              >
                <PlusCircle size={18} />
                <span>NUEVA VENTA</span>
              </button>
            )}
          </div>
        </header>

        <div className="relative">
          {activeTab === 'dashboard' && canAccess('dashboard') && <Dashboard onConceptClick={(c) => setActiveConcept(c)} />}
          {activeTab === 'inventory' && canAccess('inventory') && <Inventory role={auth.role} isSuperadmin={auth.is_superadmin} />}
          {activeTab === 'sales' && canAccess('sales') && <Sales vendedor={auth.user} />}
          {activeTab === 'orders' && canAccess('orders') && (
            selectedOrderId
              ? <OrderDetails orderId={selectedOrderId} role={auth.role} isSuperadmin={auth.is_superadmin} onBack={() => setSelectedOrderId(null)} />
              : <Orders role={auth.role} onSelectOrder={(id) => setSelectedOrderId(id)} />
          )}
          {activeTab === 'agenda' && canAccess('agenda') && <Agenda />}
          {activeTab === 'quotes' && canAccess('quotes') && <Quotes />}
          {activeTab === 'apartados' && canAccess('apartados') && <Layaways />}
          {activeTab === 'payments' && canAccess('payments') && <Payments />}
          {activeTab === 'settings' && canAccess('settings') && <Settings />}
        </div>
      </main>
    </div>
  );
}

export default App;
