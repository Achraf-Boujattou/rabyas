import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import {
  Menu,
  Search,
  Bell,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  User,
  Shield,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../../context/useTheme.js';

export const Navbar = ({ onOpenSidebar }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  // Fermer les dropdowns au clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleStyle = (role) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin', badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
      case 'magasinier':
        return { label: 'Magasinier', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      case 'technicien':
      default:
        return { label: 'Technicien', badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' };
    }
  };

  const roleStyle = getRoleStyle(user?.role);

  const demoNotifications = [
    {
      id: 1,
      title: 'Alerte Stock Critique',
      desc: 'Bobines Fibre Optique 12FO : moins de 3 unités en magasin',
      time: 'Il y a 10 min',
      type: 'warning',
    },
    {
      id: 2,
      title: 'Matériel Retourné',
      desc: 'Routeur Cisco ISR 4331 réceptionné de la mission Sud',
      time: 'Il y a 1 heure',
      type: 'success',
    },
    {
      id: 3,
      title: 'Attribution Équipement',
      desc: '3 Switches Huawei assignés à Youssef (Technicien)',
      time: 'Il y a 3 heures',
      type: 'info',
    },
  ];

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Côté Gauche : Toggle Mobile + Barre de recherche */}
      <div className="flex items-center space-x-4 flex-1 max-w-xl">
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden focus:outline-none"
          aria-label="Ouvrir le menu de navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Barre de recherche d'équipements */}
        <div className="relative w-full hidden sm:block">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Rechercher équipement, N° de série (S/N), technicien..."
            className="w-full pl-10 pr-12 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Côté Droit : Statut Système + Notifications + Menu Utilisateur */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-xl border border-slate-800 p-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
          title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Statut Système En Ligne */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-medium text-[11px]">Serveur MySQL Connecté</span>
        </div>

        {/* Menu Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 relative focus:outline-none transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-slate-900" />
          </button>

          {/* Dropdown Notifications */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
              <div className="p-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Alertes Réseau & Stock
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/20">
                  3 nouvelles
                </span>
              </div>

              <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
                {demoNotifications.map((notif) => (
                  <div key={notif.id} className="p-3.5 hover:bg-slate-800/40 transition-colors flex space-x-3">
                    <div className="shrink-0 mt-0.5">
                      {notif.type === 'warning' ? (
                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white">{notif.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{notif.desc}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{notif.time}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2 border-t border-slate-800 text-center bg-slate-950/40">
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Tout marquer comme lu
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Badge Rôle */}
        <div
          className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${roleStyle.badge}`}
        >
          {roleStyle.label}
        </div>

        {/* Profil & Dropdown Utilisateur */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center space-x-2.5 p-1.5 pr-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-800 transition-all focus:outline-none"
            aria-expanded={showUserDropdown}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-cyan-500/20">
              {user?.nom ? user.nom.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-white leading-tight">
                {user?.nom}
              </span>
              <span className="text-[10px] text-slate-400 leading-tight">
                {user?.email}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Menu Déroulant Utilisateur */}
          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2.5 border-b border-slate-800 mb-1">
                <div className="text-xs font-semibold text-white">{user?.nom}</div>
                <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
                <div className="mt-1.5 inline-block px-2 py-0.5 text-[10px] font-semibold rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Rôle : {user?.role}
                </div>
              </div>

              <div className="px-1 space-y-0.5">
                <Link
                  to="/profile"
                  onClick={() => setShowUserDropdown(false)}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Mon Profil</span>
                </Link>

                <button
                  onClick={() => setShowUserDropdown(false)}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left"
                >
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span>Sécurité & Sessions</span>
                </button>
              </div>

              <div className="pt-1 mt-1 border-t border-slate-800 px-1">
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    logout();
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors text-left font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Se déconnecter</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
