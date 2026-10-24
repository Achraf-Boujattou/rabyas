import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/useAuth.js';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import api from '../api/axios.js';
import {
  UserPlus,
  Search,
  ShieldCheck,
  Package,
  Wrench,
  KeyRound,
  Edit2,
  Power,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Eye,
  EyeOff,
  UserX,
  Lock,
  Mail,
  User,
  Shield,
  Sparkles,
  Trash2,
} from 'lucide-react';

export const Users = () => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    actifs: 0,
    inactifs: 0,
    admins: 0,
    magasiniers: 0,
    techniciens: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Notifications / Alertes toast
  const [toast, setToast] = useState(null);

  // Modales
  const [showUserModal, setShowUserModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedUser, setSelectedUser] = useState(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [userToReset, setUserToReset] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Suppression définitive
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // État du formulaire utilisateur
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    password: '',
    role: 'technicien',
    actif: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Déclencher un toast temporaire
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Récupération des utilisateurs depuis l'API
  const fetchUsers = useCallback(async () => {
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;
      if (statusFilter !== '') params.actif = statusFilter;

      const res = await api.get('/users', { params });
      if (res.data?.users) {
        setUsers(res.data.users);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error('[Users] Erreur de chargement :', err);
      showToast(err.response?.data?.message || 'Erreur lors du chargement des utilisateurs', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    void Promise.resolve().then(fetchUsers);
  }, [fetchUsers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
  };

  // Ouverture de la modale de création
  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedUser(null);
    setFormData({
      nom: '',
      email: '',
      password: '',
      role: 'technicien',
      actif: true,
    });
    setFormErrors({});
    setShowUserModal(true);
  };

  // Ouverture de la modale de modification
  const handleOpenEdit = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      nom: user.nom,
      email: user.email,
      password: '',
      role: user.role,
      actif: user.actif,
    });
    setFormErrors({});
    setShowUserModal(true);
  };

  // Soumission du formulaire (Création / Modification)
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.nom.trim()) {
      errors.nom = 'Le nom complet est obligatoire';
    }
    if (!formData.email.trim()) {
      errors.email = "L'adresse email est obligatoire";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Format d'adresse email invalide";
    }

    if (modalMode === 'create') {
      if (!formData.password) {
        errors.password = 'Le mot de passe initial est requis';
      } else if (formData.password.length < 6) {
        errors.password = 'Au moins 6 caractères requis';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      if (modalMode === 'create') {
        const payload = {
          nom: formData.nom.trim(),
          email: formData.email.trim().toLowerCase(),
          mot_de_passe: formData.password,
          role: formData.role,
          actif: formData.actif,
        };
        const res = await api.post('/users', payload);
        showToast(res.data?.message || 'Utilisateur créé avec succès !');
      } else {
        const payload = {
          nom: formData.nom.trim(),
          email: formData.email.trim().toLowerCase(),
          role: formData.role,
          actif: formData.actif,
        };
        const res = await api.put(`/users/${selectedUser.id}`, payload);
        showToast(res.data?.message || 'Utilisateur mis à jour avec succès !');
      }

      setShowUserModal(false);
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Une erreur est survenue';
      setFormErrors({ submit: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bascule du statut actif / désactivé (Désactivation au lieu de suppression)
  const handleToggleStatus = async (user) => {
    if (user.id === currentUser?.id) {
      showToast('Vous ne pouvez pas désactiver votre propre compte administrateur', 'error');
      return;
    }

    const actionWord = user.actif ? 'désactiver' : 'réactiver';
    if (!window.confirm(`Êtes-vous certain de vouloir ${actionWord} le compte de ${user.nom} ?`)) {
      return;
    }

    try {
      const res = await api.patch(`/users/${user.id}/toggle-status`);
      showToast(res.data?.message || `Statut du compte mis à jour pour ${user.nom}`);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la modification du statut', 'error');
    }
  };

  // Suppression définitive d'un utilisateur
  const handleOpenDelete = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/users/${userToDelete.id}`);
      showToast(res.data?.message || `Compte de ${userToDelete.nom} supprimé définitivement`);
      setShowDeleteModal(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la suppression', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Ouverture de la modale de réinitialisation de mot de passe
  const handleOpenResetPassword = (user) => {
    setUserToReset(user);
    setNewPassword('');
    setShowNewPassword(false);
    setShowPasswordModal(true);
  };

  // Générateur de mot de passe fort aléatoire
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = 'Rabyas@';
    for (let i = 0; i < 6; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
  };

  // Soumission réinitialisation mot de passe
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('Le mot de passe doit comporter au moins 6 caractères', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.patch(`/users/${userToReset.id}/reset-password`, {
        newPassword,
      });
      showToast(res.data?.message || 'Mot de passe réinitialisé avec succès');
      setShowPasswordModal(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la réinitialisation', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Administrateur',
          classes: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
          icon: ShieldCheck,
        };
      case 'magasinier':
        return {
          label: 'Magasinier',
          classes: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          icon: Package,
        };
      case 'technicien':
      default:
        return {
          label: 'Technicien',
          classes: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
          icon: Wrench,
        };
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Toast flottant */}
        {toast && (
          <div
            className={`fixed top-20 right-6 z-50 p-4 rounded-2xl border shadow-2xl flex items-center space-x-3 transition-all animate-in fade-in slide-in-from-top-4 ${
              toast.type === 'error'
                ? 'bg-rose-950/95 border-rose-500/40 text-rose-200'
                : 'bg-slate-900/95 border-emerald-500/40 text-emerald-200'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* En-tête de page & Action Créer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Gestion des Utilisateurs
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Administration
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Contrôle des accès, attribution des rôles et politiques de sécurité RABYAS
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
              title="Rafraîchir la liste"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nouvel Utilisateur</span>
            </button>
          </div>
        </div>

        {/* 4 Cartes statistiques des Collaborateurs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
            <div className="text-[11px] font-medium text-slate-400">Total Collaborateurs</div>
            <div className="mt-1 text-2xl font-extrabold text-white">{stats.total}</div>
            <div className="mt-1 text-[11px] text-emerald-400 flex items-center space-x-1">
              <span>{stats.actifs} actifs</span>
              {stats.inactifs > 0 && (
                <span className="text-rose-400">({stats.inactifs} désactivés)</span>
              )}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
            <div className="text-[11px] font-medium text-emerald-400">Magasiniers</div>
            <div className="mt-1 text-2xl font-extrabold text-white">{stats.magasiniers}</div>
            <div className="mt-1 text-[10px] text-slate-400">Gestion du stock</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
            <div className="text-[11px] font-medium text-cyan-400">Techniciens</div>
            <div className="mt-1 text-2xl font-extrabold text-white">{stats.techniciens}</div>
            <div className="mt-1 text-[10px] text-slate-400">Interventions terrain</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
            <div className="text-[11px] font-medium text-slate-400">Comptes Actifs</div>
            <div className="mt-1 text-2xl font-extrabold text-emerald-400">
              {stats.total > 0 ? Math.round((stats.actifs / stats.total) * 100) : 100}%
            </div>
            <div className="mt-1 text-[10px] text-slate-400">Taux de disponibilité</div>
          </div>
        </div>

        {/* Barre de Recherche et Filtres */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Recherche texte */}
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Filtres par Rôle et Statut */}
          <div className="flex items-center space-x-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {/* Rôle (uniquement collaborateurs : magasinier et technicien) */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">Tous les collaborateurs</option>
              <option value="magasinier">Magasiniers</option>
              <option value="technicien">Techniciens</option>
            </select>

            {/* Statut */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">Tous les statuts</option>
              <option value="true">Actifs uniquement</option>
              <option value="false">Désactivés uniquement</option>
            </select>

            {(search || roleFilter || statusFilter !== '') && (
              <button
                onClick={() => {
                  setSearch('');
                  setRoleFilter('');
                  setStatusFilter('');
                }}
                className="px-2.5 py-2 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Tableau des utilisateurs */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Utilisateur</th>
                  <th className="py-3 px-4 font-semibold">Rôle</th>
                  <th className="py-3 px-4 font-semibold">Statut</th>
                  <th className="py-3 px-4 font-semibold">Date de création</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                        <span>Chargement des collaborateurs...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.filter((u) => u.role !== 'admin').length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <UserX className="w-8 h-8 text-slate-500" />
                        <span>Aucun collaborateur ne correspond à vos critères</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users
                    .filter((u) => u.role !== 'admin')
                    .map((u) => {
                    const roleInfo = getRoleBadge(u.role);
                    const RoleIcon = roleInfo.icon;

                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          !u.actif ? 'opacity-65 bg-slate-950/20' : ''
                        }`}
                      >
                        {/* Utilisateur Nom + Email */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-md">
                              {u.nom ? u.nom.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="font-semibold text-white">
                                {u.nom}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Rôle */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div
                            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${roleInfo.classes}`}
                          >
                            <RoleIcon className="w-3.5 h-3.5" />
                            <span>{roleInfo.label}</span>
                          </div>
                        </td>

                        {/* Statut (Actif / Désactivé) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {u.actif ? (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>Actif</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              <span>Désactivé</span>
                            </span>
                          )}
                        </td>

                        {/* Date de création */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 text-[11px]">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '-'}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center space-x-1">
                            {/* Bouton Modifier */}
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                              title="Modifier l'utilisateur"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Bouton Réinitialiser Mot de passe */}
                            <button
                              onClick={() => handleOpenResetPassword(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                              title="Réinitialiser le mot de passe"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>

                            {/* Bouton Activer / Désactiver */}
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                u.actif
                                  ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                                  : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                              }`}
                              title={
                                u.actif
                                  ? 'Désactiver ce compte'
                                  : 'Réactiver ce compte'
                              }
                            >
                              <Power className="w-4 h-4" />
                            </button>

                            {/* Bouton Supprimer définitivement */}
                            <button
                              onClick={() => handleOpenDelete(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Supprimer définitivement ce compte"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-950/60 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>{users.filter((u) => u.role !== 'admin').length} collaborateur(s) dans l'équipe</span>
            <span className="text-[11px] text-slate-500">
              Espace de gestion des équipes terrain & magasin
            </span>
          </div>
        </div>

        {/* MODALE 1 : Création / Modification d'un utilisateur */}
        {showUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      {modalMode === 'create'
                        ? 'Créer un nouvel utilisateur'
                        : 'Modifier l\'utilisateur'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {modalMode === 'create'
                        ? 'Ajout d\'un collaborateur avec mot de passe et rôle'
                        : `Mise à jour des accès pour ${selectedUser?.nom}`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowUserModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formErrors.submit && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formErrors.submit}</span>
                </div>
              )}

              <form onSubmit={handleUserSubmit} className="space-y-4">
                {/* Nom */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nom complet
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Ex: Youssef Benjelloun"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  {formErrors.nom && (
                    <p className="mt-1 text-[11px] text-rose-400">{formErrors.nom}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Adresse email (identifiant unique)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      placeholder="nom@rabyas.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  {formErrors.email && (
                    <p className="mt-1 text-[11px] text-rose-400">{formErrors.email}</p>
                  )}
                </div>

                {/* Mot de passe initial (uniquement à la création) */}
                {modalMode === 'create' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Mot de passe initial
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        placeholder="Minimum 6 caractères"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    {formErrors.password && (
                      <p className="mt-1 text-[11px] text-rose-400">{formErrors.password}</p>
                    )}
                  </div>
                )}

                {/* Rôle & Permissions (Règle : 1 seul Administrateur dans tout le système) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">
                      Rôle & Permissions
                    </label>
                    <span className="text-[10px] text-cyan-400 font-medium">
                      {selectedUser?.role === 'admin' ? 'Compte Unique' : '1 seul Admin dans le système'}
                    </span>
                  </div>

                  {selectedUser?.role === 'admin' ? (
                    // L'administrateur unique est verrouillé et ne peut pas être modifié
                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-semibold text-purple-200">
                          Administrateur (Super-Admin Unique)
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-medium">
                        Verrouillé
                      </span>
                    </div>
                  ) : (
                    // Pour tous les autres comptes (création ou modification), seuls Technicien et Magasinier sont sélectionnables
                    <>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      >
                        <option value="technicien">Technicien (Interventions terrain)</option>
                        <option value="magasinier">Magasinier (Gestion des stocks & mouvements)</option>
                      </select>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Le rôle Administrateur est unique et réservé au compte principal.
                      </p>
                    </>
                  )}
                </div>

                {/* Statut Actif */}
                <div className="pt-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.actif}
                      onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500/40 bg-slate-950 border-slate-800"
                    />
                    <span className="text-xs font-medium text-slate-300">
                      Compte actif (autorisé à se connecter immédiatement)
                    </span>
                  </label>
                </div>

                {/* Boutons d'action */}
                <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{modalMode === 'create' ? 'Créer l\'utilisateur' : 'Enregistrer'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODALE 2 : Réinitialisation du mot de passe */}
        {showPasswordModal && userToReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Réinitialiser le mot de passe
                    </h2>
                    <p className="text-xs text-slate-400">
                      Pour l'utilisateur : <span className="text-cyan-400">{userToReset.nom}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Nouveau mot de passe
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Générer un mot de passe fort</span>
                    </button>
                  </div>

                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Minimum 6 caractères"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Le mot de passe sera immédiatement haché avec Bcrypt.
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || !newPassword}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-amber-500/20 disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Mettre à jour le mot de passe</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODALE 3 : Confirmation de suppression définitive */}
        {showDeleteModal && userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-rose-500/30 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-5">
              {/* En-tête */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Supprimer le compte</h2>
                    <p className="text-xs text-slate-400">Cette action est irréversible</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corps */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-700 flex items-center justify-center font-bold text-white text-sm shrink-0">
                    {userToDelete.nom?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{userToDelete.nom}</div>
                    <div className="text-xs text-slate-400 font-mono">{userToDelete.email}</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>
                    Le compte de <strong>{userToDelete.nom}</strong> sera supprimé définitivement de la base de données.
                    Toutes les données associées seront perdues et cette action <strong>ne peut pas être annulée</strong>.
                  </span>
                </div>
              </div>

              {/* Boutons */}
              <div className="flex items-center justify-end space-x-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-pink-700 hover:from-rose-500 hover:to-pink-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-500/20 disabled:opacity-50 transition-all"
                >
                  {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isDeleting ? 'Suppression...' : 'Supprimer définitivement'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Users;
