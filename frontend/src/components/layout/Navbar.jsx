import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import {
  Menu,
  Search,
  Loader2,
  Bell,
  AlertTriangle,
  ArrowRightLeft,
  LogOut,
  User,
  Shield,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../../context/useTheme.js';
import api from '../../api/axios.js';

export const Navbar = ({ onOpenSidebar }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [readNotificationIds, setReadNotificationIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`rabyas_read_notifications_${user?.id}`);
      const ids = saved ? JSON.parse(saved) : [];
      return Array.isArray(ids) ? ids : [];
    } catch {
      return [];
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ equipment: [], users: [], suppliers: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const notifRef = useRef(null);
  const userMenuRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  const loadNotifications = useCallback(async (signal) => {
    if (!['admin', 'magasinier'].includes(user?.role)) {
      setNotifications([]);
      return;
    }

    setNotificationsLoading(true);
    setNotificationsError('');
    const responses = await Promise.allSettled([
      api.get('/articles/stock/low-stock', {
        params: { page: 1, limit: 10 },
        signal,
      }),
      api.get('/mouvements', {
        params: { page: 1, limit: 10 },
        signal,
      }),
    ]);
    if (signal?.aborted) return;

    const [stockResponse, movementResponse] = responses;
    const failedResponses = responses.filter((response) => response.status === 'rejected');
    const nextNotifications = [];

    if (stockResponse.status === 'fulfilled') {
      for (const article of stockResponse.value.data?.data || []) {
        nextNotifications.push({
          id: `stock-${article.id}`,
          type: 'stock',
          title: 'Stock bas',
          description: `${article.designation} : ${article.stockActuel} ${article.unite} disponible(s), seuil ${article.seuilMinimum}.`,
          destination: '/articles',
          sortDate: 0,
          time: 'Stock actuel',
        });
      }
    }

    if (movementResponse.status === 'fulfilled') {
      for (const movement of movementResponse.value.data?.data || []) {
        const typeLabels = {
          entree: 'Entrée enregistrée',
          sortie: 'Sortie enregistrée',
          retour: 'Retour enregistré',
          transfert: 'Transfert enregistré',
        };
        const createdAt = new Date(movement.createdAt);
        const validDate = !Number.isNaN(createdAt.getTime());
        nextNotifications.push({
          id: `movement-${movement.id}`,
          type: 'movement',
          title: typeLabels[movement.type] || 'Mouvement enregistré',
          description: `${movement.article?.designation || 'Article'} · ${movement.quantite} ${movement.article?.unite || ''}`.trim(),
          destination: '/mouvements',
          sortDate: validDate ? createdAt.getTime() : 0,
          time: validDate
            ? new Intl.DateTimeFormat('fr-FR', {
              dateStyle: 'short',
              timeStyle: 'short',
            }).format(createdAt)
            : 'Date inconnue',
        });
      }
    }

    nextNotifications.sort((left, right) => right.sortDate - left.sortDate);
    setNotifications(nextNotifications);
    setNotificationsError(
      failedResponses.length
        ? failedResponses[0].reason.response?.data?.message ||
          'Certaines notifications n’ont pas pu être chargées.'
        : ''
    );
    setNotificationsLoading(false);
  }, [user?.role]);

  useEffect(() => {
    const controller = new AbortController();
    const initialLoadId = window.setTimeout(
      () => void loadNotifications(controller.signal),
      0
    );
    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 60_000);
    return () => {
      controller.abort();
      window.clearTimeout(initialLoadId);
      window.clearInterval(intervalId);
    };
  }, [loadNotifications]);

  const unreadNotifications = notifications.filter(
    (notification) => !readNotificationIds.includes(notification.id)
  );

  const markNotificationsAsRead = () => {
    const nextReadIds = [...new Set([
      ...readNotificationIds,
      ...notifications.map((notification) => notification.id),
    ])];
    setReadNotificationIds(nextReadIds);
    try {
      localStorage.setItem(
        `rabyas_read_notifications_${user?.id}`,
        JSON.stringify(nextReadIds)
      );
    } catch (error) {
      console.error('[Navbar] Impossible d’enregistrer l’état des notifications :', error);
    }
  };

  const openNotification = (notification) => {
    if (!readNotificationIds.includes(notification.id)) {
      const nextReadIds = [...readNotificationIds, notification.id];
      setReadNotificationIds(nextReadIds);
      try {
        localStorage.setItem(
          `rabyas_read_notifications_${user?.id}`,
          JSON.stringify(nextReadIds)
        );
      } catch (error) {
        console.error('[Navbar] Impossible d’enregistrer l’état de la notification :', error);
      }
    }
    setShowNotifications(false);
    navigate(notification.destination);
  };

  // Fermer les dropdowns au clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleSearchShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
        setShowSearchResults(true);
      }
    };
    document.addEventListener('keydown', handleSearchShortcut);
    return () => document.removeEventListener('keydown', handleSearchShortcut);
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) return undefined;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError('');
      const canSearchEquipment = ['admin', 'magasinier'].includes(user?.role);
      const requestTypes = [];
      if (canSearchEquipment) {
        requestTypes.push('equipment');
      }
      if (user?.role === 'admin') requestTypes.push('users');
      if (['admin', 'magasinier'].includes(user?.role)) requestTypes.push('suppliers');

      const requests = requestTypes.map((type) => {
        if (type === 'equipment') {
          return api.get('/equipements', {
            params: { page: 1, limit: 5, search: query },
            signal: controller.signal,
          });
        }
        if (type === 'users') {
          return api.get('/users', {
            params: { search: query },
            signal: controller.signal,
          });
        }
        return api.get('/fournisseurs', {
          params: { page: 1, limit: 5, search: query },
          signal: controller.signal,
        });
      });

      const responses = await Promise.allSettled(requests);
      if (controller.signal.aborted) return;

      const failedRequests = responses.filter((response) => response.status === 'rejected');
      const successfulResponses = responses.filter((response) => response.status === 'fulfilled');
      const resultsByType = Object.fromEntries(
        requestTypes.map((type, index) => [type, responses[index]])
      );

      if (successfulResponses.length === 0 && failedRequests.length > 0) {
        setSearchError(
          failedRequests[0].reason.response?.data?.message ||
            'La recherche est momentanément indisponible.'
        );
      }
      setSearchResults({
        equipment: resultsByType.equipment?.status === 'fulfilled'
          ? resultsByType.equipment.value.data?.data || []
          : [],
        users: resultsByType.users?.status === 'fulfilled'
          ? resultsByType.users.value.data?.users || []
          : [],
        suppliers: resultsByType.suppliers?.status === 'fulfilled'
          ? resultsByType.suppliers.value.data?.data || []
          : [],
      });
      setSearchLoading(false);
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, user?.role]);

  const selectSearchResult = (type) => {
    const params = new URLSearchParams();
    params.set('search', searchQuery.trim());
    if (type === 'equipment') {
      params.set('tab', 'equipements');
      navigate(`/articles?${params.toString()}`);
    } else if (type === 'user') {
      navigate(`/users?${params.toString()}`);
    } else {
      params.set('tab', 'fournisseurs');
      navigate(`/fournisseurs?${params.toString()}`);
    }
    setShowSearchResults(false);
    setSearchQuery('');
  };

  const searchShortcut = navigator.platform?.includes('Mac') ? '⌘K' : 'Ctrl K';
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
        <div className="relative w-full hidden sm:block" ref={searchRef}>
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Rechercher équipement, utilisateur ou fournisseur..."
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSearchResults({ equipment: [], users: [], suppliers: [] });
              setSearchLoading(false);
              setSearchError('');
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setShowSearchResults(false);
              if (event.key === 'Enter') {
                const firstEquipment = searchResults.equipment[0];
                const firstUser = searchResults.users[0];
                const firstSupplier = searchResults.suppliers[0];
                if (firstEquipment) selectSearchResult('equipment');
                else if (firstUser) selectSearchResult('user');
                else if (firstSupplier) selectSearchResult('supplier');
              }
            }}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showSearchResults}
            aria-controls="navbar-search-results"
            className="w-full pl-10 pr-12 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded">
              {searchShortcut}
            </kbd>
          </div>
          {showSearchResults && searchQuery.trim().length >= 2 && (
            <div
              id="navbar-search-results"
              role="listbox"
              className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 py-2 shadow-2xl"
            >
              {searchLoading && (
                <div className="flex items-center gap-2 px-4 py-3 text-xs text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Recherche en cours...
                </div>
              )}
              {searchError && (
                <div className="px-4 py-3 text-xs text-rose-300">{searchError}</div>
              )}
              {!searchLoading && !searchError && searchResults.equipment.length === 0 &&
                searchResults.users.length === 0 && searchResults.suppliers.length === 0 && (
                  <div className="px-4 py-3 text-xs text-slate-400">
                    {['admin', 'magasinier'].includes(user?.role)
                      ? `Aucun résultat pour « ${searchQuery.trim()} ».`
                      : 'La recherche est réservée aux administrateurs et magasiniers.'}
                  </div>
                )}
              {searchResults.equipment.length > 0 && (
                <div>
                  <div className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Équipements
                  </div>
                  {searchResults.equipment.map((equipment) => (
                    <button
                      key={`equipment-${equipment.id}`}
                      type="button"
                      role="option"
                      aria-selected="false"
                      onClick={() => selectSearchResult('equipment')}
                      className="flex w-full flex-col px-4 py-2 text-left hover:bg-slate-800 focus:bg-slate-800 focus:outline-none"
                    >
                      <span className="text-xs font-medium text-white">
                        {equipment.article?.designation || 'Équipement'}
                      </span>
                      <span className="mt-0.5 text-[11px] text-slate-400">
                        S/N : {equipment.numeroSerie}
                        {equipment.emplacement ? ` · ${equipment.emplacement}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {searchResults.users.length > 0 && (
                <div>
                  <div className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Utilisateurs
                  </div>
                  {searchResults.users.map((searchedUser) => (
                    <button
                      key={`user-${searchedUser.id}`}
                      type="button"
                      role="option"
                      aria-selected="false"
                      onClick={() => selectSearchResult('user')}
                      className="flex w-full flex-col px-4 py-2 text-left hover:bg-slate-800 focus:bg-slate-800 focus:outline-none"
                    >
                      <span className="text-xs font-medium text-white">{searchedUser.nom}</span>
                      <span className="mt-0.5 text-[11px] text-slate-400">
                        {searchedUser.email} · {searchedUser.role}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {searchResults.suppliers.length > 0 && (
                <div>
                  <div className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Fournisseurs
                  </div>
                  {searchResults.suppliers.map((supplier) => (
                    <button
                      key={`supplier-${supplier.id}`}
                      type="button"
                      role="option"
                      aria-selected="false"
                      onClick={() => selectSearchResult('supplier')}
                      className="flex w-full flex-col px-4 py-2 text-left hover:bg-slate-800 focus:bg-slate-800 focus:outline-none"
                    >
                      <span className="text-xs font-medium text-white">{supplier.nom}</span>
                      <span className="mt-0.5 text-[11px] text-slate-400">
                        {[supplier.contact, supplier.email, supplier.telephone].filter(Boolean).join(' · ')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Côté Droit : Notifications + Menu Utilisateur */}
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

        {/* Menu Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              const shouldOpen = !showNotifications;
              setShowNotifications(shouldOpen);
              if (shouldOpen) void loadNotifications();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 relative focus:outline-none transition-colors"
            aria-label="Notifications"
            aria-expanded={showNotifications}
          >
            <Bell className="w-5 h-5" />
            {unreadNotifications.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-slate-900">
                {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
              </span>
            )}
          </button>

          {/* Dropdown Notifications */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
              <div className="p-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Notifications
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/20">
                  {unreadNotifications.length} non lue(s)
                </span>
              </div>

              <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
                {notificationsLoading && notifications.length === 0 && (
                  <div className="flex items-center gap-2 px-4 py-5 text-xs text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement des notifications...
                  </div>
                )}
                {notificationsError && (
                  <div className="px-4 py-3 text-xs text-rose-300">{notificationsError}</div>
                )}
                {!notificationsLoading && notifications.length === 0 && !notificationsError && (
                  <div className="px-4 py-5 text-center text-xs text-slate-400">
                    Aucune notification pour le moment.
                  </div>
                )}
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => openNotification(notification)}
                    className={`flex w-full space-x-3 p-3.5 text-left transition-colors hover:bg-slate-800/40 ${
                      readNotificationIds.includes(notification.id) ? 'opacity-65' : ''
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {notification.type === 'stock' ? (
                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white">{notification.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{notification.description}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{notification.time}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between p-2 border-t border-slate-800 bg-slate-950/40">
                <button
                  onClick={() => void loadNotifications()}
                  className="text-[11px] font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Actualiser
                </button>
                <button
                  onClick={markNotificationsAsRead}
                  disabled={unreadNotifications.length === 0}
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
