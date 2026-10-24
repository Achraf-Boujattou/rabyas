import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import {
  Radio,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ServerOff,
  Shield,
  KeyRound,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../context/useTheme.js';

export const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // États de validation et de soumission
  const [fieldErrors, setFieldErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNetworkError, setIsNetworkError] = useState(false);

  // Rediriger vers le dashboard si déjà authentifié
  useEffect(() => {
    if (isAuthenticated) {
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Validation locale des champs
  const validate = () => {
    const errors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = 'Veuillez saisir votre adresse email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Format d\'adresse email non valide.';
    }

    if (!password) {
      errors.password = 'Veuillez renseigner votre mot de passe.';
    } else if (password.length < 4) {
      errors.password = 'Le mot de passe doit comporter au moins 4 caractères.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError(null);
    setIsNetworkError(false);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(email.trim(), password);

      if (result.success) {
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        setGlobalError(result.error);
        if (result.error.toLowerCase().includes('injoignable')) {
          setIsNetworkError(true);
        }
      }
    } catch {
      setGlobalError('Une erreur inattendue est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pré-remplissage rapide pour la démonstration / tests
  const fillDemoAccount = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setFieldErrors({});
    setGlobalError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden selection:bg-cyan-500 selection:text-white">
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute right-4 top-4 z-20 rounded-xl border border-slate-700 bg-slate-900/80 p-2.5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
        title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      {/* Halo lumineux d'arrière-plan telecom */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-cyan-600/15 via-blue-600/10 to-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Conteneur principal centré et responsive */}
      <div className="w-full max-w-md relative z-10">
        {/* En-tête de marque RABYAS */}
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-xl shadow-cyan-500/20 ring-1 ring-white/20">
            <Radio className="w-8 h-8 text-white animate-pulse" />
          </div>

          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              RABYAS
            </h1>
            <p className="mt-1 text-sm font-medium text-cyan-400/90 tracking-wide">
              Telecom Stock & Asset Tracker
            </p>
          </div>

          <p className="text-xs text-slate-400">
            Plateforme centralisée de gestion des stocks et équipements télécoms
          </p>
        </div>

        {/* Carte du formulaire */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 ring-1 ring-white/5">
          {/* Bannière d'erreur globale accessible */}
          {globalError && (
            <div
              role="alert"
              aria-live="assertive"
              className={`mb-6 p-4 rounded-2xl border flex items-start space-x-3 transition-all ${
                isNetworkError
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isNetworkError ? (
                  <ServerOff className="w-5 h-5 text-amber-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                )}
              </div>
              <div className="text-sm font-medium leading-relaxed">
                <span className="font-semibold block text-white mb-0.5">
                  {isNetworkError ? 'Connexion impossible' : 'Échec de connexion'}
                </span>
                {globalError}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Champ Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-300 mb-1.5"
              >
                Adresse email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="nom@entreprise.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: null }));
                    }
                  }}
                  aria-invalid={fieldErrors.email ? 'true' : 'false'}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  className={`block w-full pl-11 pr-4 py-3 bg-slate-950/80 border rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.email
                      ? 'border-rose-500/60 focus:ring-rose-500/40 focus:border-rose-500'
                      : 'border-slate-800 focus:ring-cyan-500/40 focus:border-cyan-500'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p
                  id="email-error"
                  role="alert"
                  className="mt-1.5 text-xs text-rose-400 flex items-center space-x-1"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fieldErrors.email}</span>
                </p>
              )}
            </div>

            {/* Champ Mot de passe */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-300"
                >
                  Mot de passe
                </label>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: null }));
                    }
                  }}
                  aria-invalid={fieldErrors.password ? 'true' : 'false'}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  className={`block w-full pl-11 pr-12 py-3 bg-slate-950/80 border rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.password
                      ? 'border-rose-500/60 focus:ring-rose-500/40 focus:border-rose-500'
                      : 'border-slate-800 focus:ring-cyan-500/40 focus:border-cyan-500'
                  }`}
                />

                {/* Bouton Afficher / Masquer */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none focus:text-cyan-400 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <Eye className="w-5 h-5" aria-hidden="true" />
                  )}
                </button>
              </div>

              {fieldErrors.password && (
                <p
                  id="password-error"
                  role="alert"
                  className="mt-1.5 text-xs text-rose-400 flex items-center space-x-1"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fieldErrors.password}</span>
                </p>
              )}
            </div>

            {/* Bouton de soumission */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-cyan-500/25 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connexion en cours...</span>
                </>
              ) : (
                <span>Se connecter</span>
              )}
            </button>
          </form>

          {/* Section d'aide pour tests et démonstration */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span>Comptes de test rapides</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillDemoAccount('admin@rabyas.com', 'Admin1234!')}
                className="p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-800/70 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group"
              >
                <div className="font-medium text-slate-200 group-hover:text-cyan-300">
                  👑 Administrateur
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  admin@rabyas.com
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount('magasinier@rabyas.com', 'Magasinier123!')}
                className="p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-800/70 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group"
              >
                <div className="font-medium text-slate-200 group-hover:text-cyan-300">
                  📦 Magasinier
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  magasinier@rabyas.com
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount('technicien@rabyas.com', 'Technicien123!')}
                className="p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-800/70 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group"
              >
                <div className="font-medium text-slate-200 group-hover:text-cyan-300">
                  🛠️ Technicien
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  technicien@rabyas.com
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount('bloque@rabyas.com', 'Bloque123!')}
                className="p-2.5 rounded-lg bg-slate-950/60 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-500/40 text-left transition-all group"
              >
                <div className="font-medium text-rose-300 group-hover:text-rose-200">
                  ⛔ Compte bloqué
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  bloque@rabyas.com
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
          <Shield className="w-4 h-4 text-cyan-500" />
          <span>Accès sécurisé avec chiffrement JWT & Bcrypt • RABYAS Telecom</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
