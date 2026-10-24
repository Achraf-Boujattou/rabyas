import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import { ShieldAlert, Loader2, ArrowLeft } from 'lucide-react';

/**
 * Composant de route protégée avec vérification d'authentification et filtrage optionnel par rôle
 * @param {React.ReactNode} children - Éléments enfants à rendre si autorisé
 * @param {string[]} allowedRoles - Rôles autorisés (ex: ['admin'], ['admin', 'magasinier'])
 */
export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // 1. État de chargement pendant la vérification du token
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 animate-pulse">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
          <p className="text-slate-400 font-medium text-sm animate-pulse">
            Vérification de la session RABYAS...
          </p>
        </div>
      </div>
    );
  }

  // 2. Redirection vers /login si l'utilisateur n'est pas connecté
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Filtrage optionnel par rôle
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Accès Restreint
            </h1>
            <p className="text-sm text-slate-400">
              Votre rôle actuel (<span className="text-cyan-400 font-semibold uppercase">{user.role}</span>) ne possède pas les permissions requises pour accéder à cet espace.
            </p>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400">
            Rôles autorisés :{' '}
            <span className="font-semibold text-slate-300">
              {allowedRoles.join(', ')}
            </span>
          </div>

          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition-colors border border-slate-700 space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retourner au tableau de bord</span>
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
