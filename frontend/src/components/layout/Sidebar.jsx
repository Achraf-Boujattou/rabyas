import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import {
  Radio,
  LayoutDashboard,
  Package,
  ShieldCheck,
  LogOut,
  X,
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigationSections = [
    {
      title: 'Menu Principal',
      items: [
        {
          name: "Vue d'ensemble",
          path: '/dashboard',
          icon: LayoutDashboard,
          badge: null,
        },
        ...(user?.role === 'admin' || user?.role === 'magasinier'
          ? [
              {
                name: 'Articles',
                path: '/articles',
                icon: Package,
                badge: null,
              },
            ]
          : []),
        ...(user?.role === 'admin'
          ? [
              {
                name: 'Gestion des utilisateurs',
                path: '/users',
                icon: ShieldCheck,
                badge: null,
              },
            ]
          : []),
      ],
    },
  ];

  return (
    <>
      {/* Overlay sombre pour mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar principale */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header Marque */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80 bg-slate-950/40">
          <Link to="/dashboard" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-wider text-white">
                RABYAS
              </span>
              <span className="text-[11px] font-medium text-cyan-400 -mt-0.5 tracking-tight">
                Telecom Asset Tracker
              </span>
            </div>
          </Link>

          {/* Bouton fermer sur mobile */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Fermer la barre latérale"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7 custom-scrollbar">
          {navigationSections.map((section) => (
            <div key={section.title} className="space-y-2">
              <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {section.title}
              </div>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.path === '/dashboard'
                      ? location.pathname === '/dashboard' || location.pathname === '/'
                      : location.pathname === item.path;

                  const isInternalRoute = item.path.startsWith('/');
                  const LinkComponent = isInternalRoute ? Link : 'a';
                  const linkProps = isInternalRoute ? { to: item.path } : { href: item.path };

                  return (
                    <LinkComponent
                      key={item.path}
                      {...linkProps}
                      onClick={() => {
                        if (isInternalRoute && window.innerWidth < 1024) {
                          onClose();
                        }
                      }}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon
                          className={`w-4 h-4 transition-colors ${
                            isActive
                              ? 'text-cyan-400'
                              : 'text-slate-400 group-hover:text-slate-300'
                          }`}
                        />
                        <span>{item.name}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                            item.badgeColor ||
                            'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </LinkComponent>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Pied de sidebar : Profil utilisateur & statut */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800/80 flex items-center justify-between shadow-inner">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md">
                {user?.nom ? user.nom.charAt(0).toUpperCase() : 'U'}
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate">
                  {user?.nom}
                </span>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-[10px] text-slate-400 truncate">
                    {user?.email}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Se déconnecter"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
              aria-label="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
