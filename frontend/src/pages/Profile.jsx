import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import { useAuth } from '../context/useAuth.js';

const roleLabels = {
  admin: 'Administrateur',
  magasinier: 'Magasinier',
  technicien: 'Technicien',
};

export const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [nom, setNom] = useState(user?.nom || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!nom.trim() || !email.trim()) {
      setError('Le nom et l’adresse e-mail sont obligatoires.');
      return;
    }

    const changingPassword = Boolean(currentPassword || newPassword || confirmPassword);
    if (changingPassword) {
      if (!currentPassword) {
        setError('Saisissez votre mot de passe actuel pour le modifier.');
        return;
      }
      if (newPassword.length < 6) {
        setError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('La confirmation du mot de passe ne correspond pas.');
        return;
      }
    }

    const profileData = {
      nom: nom.trim(),
      email: email.trim(),
    };
    if (changingPassword) {
      profileData.currentPassword = currentPassword;
      profileData.newPassword = newPassword;
    }

    setIsSaving(true);
    try {
      const result = await updateProfile(profileData);
      setNom(result.user.nom);
      setEmail(result.user.email);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(result.message || 'Profil mis à jour avec succès.');
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          'Impossible de mettre à jour le profil. Vérifiez votre connexion et réessayez.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Compte
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Mon Profil</h1>
          <p className="mt-2 text-sm text-slate-400">
            Consultez et mettez à jour vos informations personnelles.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-7">
            <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-5">
              <div className="rounded-xl bg-cyan-500/10 p-2.5 text-cyan-400">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Informations personnelles</h2>
                <p className="mt-1 text-xs text-slate-400">Votre identité et votre accès.</p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">Nom complet</span>
                <span className="relative block">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    autoComplete="name"
                    required
                    value={nom}
                    onChange={(event) => setNom(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">Adresse e-mail</span>
                <span className="relative block">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    autoComplete="email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </span>
              </label>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
              <div>
                <p className="text-xs text-slate-400">Rôle du compte</p>
                <p className="mt-1 text-sm font-medium text-white">
                  {roleLabels[user?.role] || 'Utilisateur'}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-7">
            <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-5">
              <div className="rounded-xl bg-indigo-500/10 p-2.5 text-indigo-300">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Changer le mot de passe</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Laissez ces champs vides si vous ne souhaitez pas le modifier.
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">Mot de passe actuel</span>
                <input
                  autoComplete="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">Nouveau mot de passe</span>
                <input
                  autoComplete="new-password"
                  type="password"
                  minLength={6}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">Confirmer le nouveau</span>
                <input
                  autoComplete="new-password"
                  type="password"
                  minLength={6}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                />
              </label>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-900/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
