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
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../context/useTheme.js';

export const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('admin@rabyas.com');
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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-x-hidden selection:bg-cyan-500 selection:text-white">
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute right-4 top-4 z-20 rounded-xl border border-slate-700 bg-slate-900/80 p-2.5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
        title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="pointer-events-none absolute -left-40 top-1/4 h-[32rem] w-[32rem] rounded-full bg-cyan-500/[0.08] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[36rem] w-[36rem] rounded-full bg-blue-600/[0.10] blur-3xl" />

      <main className="relative z-10 w-full max-w-lg">
        <header className="mb-8 space-y-3 text-center">
          <div className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 p-3.5 shadow-lg shadow-cyan-500/20 ring-1 ring-white/15">
            <Radio className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-[0.12em] text-white sm:text-4xl">RABYAS</h1>
            <p className="mt-1 text-sm font-medium tracking-wide text-cyan-300">Telecom Stock &amp; Asset Tracker</p>
          </div>
          <p className="text-sm text-slate-400">
            Plateforme de gestion des stocks et équipements télécoms
          </p>
        </header>

        <section aria-label="Connexion" className="w-full">
          <div className="rounded-3xl border border-slate-700/70 bg-slate-900/85 px-6 py-9 shadow-2xl shadow-black/40 ring-1 ring-white/[0.04] backdrop-blur-xl sm:px-9 sm:py-11">
            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Espace sécurisé</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Connectez-vous avec les identifiants de votre compte RABYAS.
              </p>
            </div>

            {/* Bannière d'erreur globale accessible */}
            {globalError && (
              <div
                role="alert"
                aria-live="assertive"
                className={`mb-6 flex items-start space-x-3 rounded-2xl border p-4 transition-all ${
                  isNetworkError
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isNetworkError ? (
                    <ServerOff className="h-5 w-5 text-amber-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-rose-400" />
                  )}
                </div>
                <div className="text-sm font-medium leading-relaxed">
                  <span className="mb-0.5 block font-semibold text-white">
                    {isNetworkError ? 'Connexion impossible' : 'Échec de connexion'}
                  </span>
                  {globalError}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-7">
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
                  className={`block w-full pl-11 pr-4 py-4 bg-slate-950/80 border rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-all ${
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
                  className={`block w-full pl-11 pr-12 py-4 bg-slate-950/80 border rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-all ${
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
              className="mt-2 flex w-full cursor-pointer items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-950/40 transition-all hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
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

            <div className="mt-6 flex items-center justify-center gap-2 border-t border-slate-800 pt-5 text-xs text-slate-500">
              <Shield className="h-4 w-4 text-cyan-400" />
              <span>Connexion protégée et données sécurisées</span>
            </div>
          </div>
        </section>

        <footer className="mt-7 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} RABYAS Telecom · Gestion des stocks et équipements
        </footer>
      </main>
    </div>
  );
};

export default Login;
