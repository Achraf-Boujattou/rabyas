import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Edit2,
  Loader2,
  PackageCheck,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import api from '../api/axios.js';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';

const EMPTY_SUPPLIER = {
  nom: '',
  contact: '',
  telephone: '',
  email: '',
  adresse: '',
};

const EMPTY_LINE = { articleId: '', quantiteCommandee: '1' };
const inputClass =
  'w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20';

const STATUS_LABELS = {
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  reçue_partiellement: 'Reçue partiellement',
  reçue: 'Reçue',
};

const STATUS_STYLES = {
  brouillon: 'border-slate-600 bg-slate-700/40 text-slate-300',
  envoyee: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  reçue_partiellement: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  reçue: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
};

const Pagination = ({ pagination, onChange }) => {
  if (!pagination || pagination.pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
      <span>Page {pagination.page} sur {pagination.pages} · {pagination.total} résultat(s)</span>
      <div className="flex gap-2">
        <button type="button" aria-label="Page précédente" disabled={pagination.page <= 1} onClick={() => onChange(pagination.page - 1)} className="rounded-lg border border-slate-700 p-2 hover:bg-slate-800 disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Page suivante" disabled={pagination.page >= pagination.pages} onClick={() => onChange(pagination.page + 1)} className="rounded-lg border border-slate-700 p-2 hover:bg-slate-800 disabled:opacity-40">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
    {children}
  </label>
);

const showError = (error, fallback) =>
  error.response?.data?.message || fallback;

const formatDate = (value) =>
  value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value)) : '—';

export const Suppliers = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() =>
    searchParams.get('tab') === 'commandes' ? 'commandes' : 'fournisseurs'
  );
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [articles, setArticles] = useState([]);
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [supplierPagination, setSupplierPagination] = useState(null);
  const [orderPagination, setOrderPagination] = useState(null);
  const [supplierPage, setSupplierPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [supplierSearch, setSupplierSearch] = useState(() => searchParams.get('search') || '');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(null);
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER);
  const [orderForm, setOrderForm] = useState({
    fournisseurId: '',
    commentaire: '',
    lignes: [{ ...EMPTY_LINE }],
  });
  const [receiptForm, setReceiptForm] = useState({});

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/fournisseurs', {
        params: { page: supplierPage, limit: 10, search: supplierSearch.trim() || undefined },
      });
      setSuppliers(data.data);
      setSupplierPagination(data.pagination);
    } catch (requestError) {
      setError(showError(requestError, 'Impossible de charger les fournisseurs.'));
    } finally {
      setLoading(false);
    }
  }, [supplierPage, supplierSearch]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/fournisseurs/commandes', {
        params: {
          page: orderPage,
          limit: 10,
          search: orderSearch.trim() || undefined,
          statut: orderStatus || undefined,
        },
      });
      setOrders(data.data);
      setOrderPagination(data.pagination);
    } catch (requestError) {
      setError(showError(requestError, 'Impossible de charger les commandes.'));
    } finally {
      setLoading(false);
    }
  }, [orderPage, orderSearch, orderStatus]);

  const loadArticles = useCallback(async () => {
    try {
      const { data } = await api.get('/articles', { params: { page: 1, limit: 100 } });
      setArticles(data.data);
    } catch (requestError) {
      setError(showError(requestError, 'Impossible de charger les articles.'));
    }
  }, []);

  const loadSupplierOptions = useCallback(async () => {
    try {
      const { data } = await api.get('/fournisseurs', { params: { page: 1, limit: 100 } });
      setSupplierOptions(data.data);
    } catch (requestError) {
      setError(showError(requestError, 'Impossible de charger la liste des fournisseurs.'));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSuppliers(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSuppliers]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadOrders(), 0);
    return () => window.clearTimeout(timer);
  }, [loadOrders]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadArticles(), 0);
    return () => window.clearTimeout(timer);
  }, [loadArticles]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSupplierOptions(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSupplierOptions]);

  const refreshData = async () => {
    await Promise.all([loadSuppliers(), loadSupplierOptions(), loadOrders(), loadArticles()]);
  };

  const openSupplierModal = (supplier = null) => {
    setError('');
    setSupplierForm(supplier ? {
      nom: supplier.nom,
      contact: supplier.contact || '',
      telephone: supplier.telephone || '',
      email: supplier.email || '',
      adresse: supplier.adresse || '',
    } : EMPTY_SUPPLIER);
    setModal(supplier ? { type: 'supplier', id: supplier.id } : { type: 'supplier' });
  };

  const openOrderModal = (order = null) => {
    setError('');
    setOrderForm(order ? {
      fournisseurId: String(order.fournisseurId),
      commentaire: order.commentaire || '',
      lignes: order.lignes.map((line) => ({
        articleId: String(line.articleId),
        quantiteCommandee: String(line.quantiteCommandee),
      })),
    } : {
      fournisseurId: String(order?.fournisseurId || supplierOptions[0]?.id || ''),
      commentaire: '',
      lignes: [{ ...EMPTY_LINE }],
    });
    setModal(order ? { type: 'order', id: order.id } : { type: 'order' });
  };

  const openReceiptModal = (order) => {
    setError('');
    setReceiptForm(Object.fromEntries(
      order.lignes.map((line) => [
        line.id,
        {
          quantiteRecue: '',
          numerosSerie: '',
          emplacement: 'Dépôt principal',
        },
      ])
    ));
    setModal({ type: 'receipt', order });
  };

  const closeModal = () => setModal(null);

  const submitSupplier = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (modal.id) {
        await api.put(`/fournisseurs/${modal.id}`, supplierForm);
        setNotice('Fournisseur modifié.');
      } else {
        await api.post('/fournisseurs', supplierForm);
        setNotice('Fournisseur créé.');
        setSupplierPage(1);
      }
      closeModal();
      await refreshData();
    } catch (requestError) {
      setError(showError(requestError, 'Impossible d’enregistrer le fournisseur.'));
    } finally {
      setSaving(false);
    }
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        fournisseurId: Number(orderForm.fournisseurId),
        commentaire: orderForm.commentaire,
        lignes: orderForm.lignes.map((line) => ({
          articleId: Number(line.articleId),
          quantiteCommandee: Number(line.quantiteCommandee),
        })),
      };
      if (modal.id) {
        await api.put(`/fournisseurs/commandes/${modal.id}`, payload);
        setNotice('Commande modifiée.');
      } else {
        await api.post('/fournisseurs/commandes', payload);
        setNotice('Commande créée en brouillon.');
        setOrderPage(1);
      }
      closeModal();
      await refreshData();
    } catch (requestError) {
      setError(showError(requestError, 'Impossible d’enregistrer la commande.'));
    } finally {
      setSaving(false);
    }
  };

  const submitReceipt = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const lines = modal.order.lignes
        .map((line) => {
          const values = receiptForm[line.id] || {};
          if (!values.quantiteRecue || Number(values.quantiteRecue) <= 0) return null;
          const receipt = {
            ligneId: line.id,
            quantiteRecue: Number(values.quantiteRecue),
            emplacement: values.emplacement,
          };
          if (line.article?.suiviParNumeroSerie) {
            receipt.numerosSerie = values.numerosSerie
              .split(/\r?\n/)
              .map((serial) => serial.trim())
              .filter(Boolean);
          }
          return receipt;
        })
        .filter(Boolean);
      await api.post(`/fournisseurs/commandes/${modal.order.id}/reception`, { lignes: lines });
      setNotice('Réception enregistrée et stock mis à jour.');
      closeModal();
      await refreshData();
    } catch (requestError) {
      setError(showError(requestError, 'Impossible d’enregistrer la réception.'));
    } finally {
      setSaving(false);
    }
  };

  const sendOrder = async (order) => {
    setError('');
    try {
      await api.put(`/fournisseurs/commandes/${order.id}`, { statut: 'envoyee' });
      setNotice('Commande marquée comme envoyée.');
      await refreshData();
    } catch (requestError) {
      setError(showError(requestError, 'Impossible d’envoyer cette commande.'));
    }
  };

  const deleteSupplier = async (supplier) => {
    if (!window.confirm(`Supprimer le fournisseur « ${supplier.nom} » ?`)) return;
    setError('');
    try {
      await api.delete(`/fournisseurs/${supplier.id}`);
      setNotice('Fournisseur supprimé.');
      await refreshData();
    } catch (requestError) {
      setError(showError(requestError, 'Impossible de supprimer ce fournisseur.'));
    }
  };

  const deleteOrder = async (order) => {
    if (!window.confirm(`Supprimer le brouillon de commande #${order.id} ?`)) return;
    setError('');
    try {
      await api.delete(`/fournisseurs/commandes/${order.id}`);
      setNotice('Commande supprimée.');
      await refreshData();
    } catch (requestError) {
      setError(showError(requestError, 'Impossible de supprimer cette commande.'));
    }
  };

  const updateLine = (index, field, value) => {
    setOrderForm((current) => ({
      ...current,
      lignes: current.lignes.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line
      ),
    }));
  };

  const renderModal = () => {
    if (!modal) return null;
    const title = modal.type === 'supplier'
      ? modal.id ? 'Modifier un fournisseur' : 'Nouveau fournisseur'
      : modal.type === 'order'
        ? modal.id ? 'Modifier la commande' : 'Nouvelle commande'
        : `Réceptionner la commande #${modal.order.id}`;

    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/70 p-4">
        <div className="my-auto w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-white">{title}</h2>
            <button type="button" onClick={closeModal} aria-label="Fermer" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form
            onSubmit={modal.type === 'supplier' ? submitSupplier : modal.type === 'order' ? submitOrder : submitReceipt}
            className="max-h-[80vh] space-y-4 overflow-y-auto p-5"
          >
            {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}

            {modal.type === 'supplier' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nom du fournisseur">
                  <input required maxLength={160} className={inputClass} value={supplierForm.nom} onChange={(event) => setSupplierForm({ ...supplierForm, nom: event.target.value })} />
                </Field>
                <Field label="Contact">
                  <input maxLength={160} className={inputClass} value={supplierForm.contact} onChange={(event) => setSupplierForm({ ...supplierForm, contact: event.target.value })} />
                </Field>
                <Field label="Téléphone">
                  <input type="tel" maxLength={40} className={inputClass} value={supplierForm.telephone} onChange={(event) => setSupplierForm({ ...supplierForm, telephone: event.target.value })} />
                </Field>
                <Field label="E-mail">
                  <input type="email" maxLength={191} className={inputClass} value={supplierForm.email} onChange={(event) => setSupplierForm({ ...supplierForm, email: event.target.value })} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Adresse">
                    <textarea rows="3" className={inputClass} value={supplierForm.adresse} onChange={(event) => setSupplierForm({ ...supplierForm, adresse: event.target.value })} />
                  </Field>
                </div>
              </div>
            )}

            {modal.type === 'order' && (
              <div className="space-y-4">
                <Field label="Fournisseur">
                  <select required className={inputClass} value={orderForm.fournisseurId} onChange={(event) => setOrderForm({ ...orderForm, fournisseurId: event.target.value })}>
                    <option value="">Choisir un fournisseur</option>
                    {supplierOptions.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.nom}</option>)}
                  </select>
                </Field>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Articles commandés</h3>
                    <button type="button" onClick={() => setOrderForm({ ...orderForm, lignes: [...orderForm.lignes, { ...EMPTY_LINE }] })} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs text-cyan-300 hover:bg-slate-800">
                      <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
                    </button>
                  </div>
                  {orderForm.lignes.map((line, index) => (
                    <div key={`${index}-${line.articleId}`} className="grid gap-3 rounded-xl border border-slate-800 p-3 sm:grid-cols-[1fr_150px_auto]">
                      <Field label="Article">
                        <select required className={inputClass} value={line.articleId} onChange={(event) => updateLine(index, 'articleId', event.target.value)}>
                          <option value="">Choisir un article</option>
                          {articles.map((article) => <option key={article.id} value={article.id}>{article.reference} · {article.designation} ({article.unite})</option>)}
                        </select>
                      </Field>
                      <Field label="Quantité commandée">
                        <input required type="number" min="0.001" step="0.001" className={inputClass} value={line.quantiteCommandee} onChange={(event) => updateLine(index, 'quantiteCommandee', event.target.value)} />
                      </Field>
                      <button type="button" disabled={orderForm.lignes.length <= 1} onClick={() => setOrderForm({ ...orderForm, lignes: orderForm.lignes.filter((_, lineIndex) => lineIndex !== index) })} aria-label="Retirer la ligne" className="mt-6 rounded-lg p-2 text-rose-300 hover:bg-rose-500/10 disabled:opacity-30">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <Field label="Commentaire (facultatif)">
                  <textarea rows="2" maxLength={500} className={inputClass} value={orderForm.commentaire} onChange={(event) => setOrderForm({ ...orderForm, commentaire: event.target.value })} />
                </Field>
                <p className="text-xs text-slate-400">La commande est enregistrée en brouillon. Vous pourrez ensuite l’envoyer.</p>
              </div>
            )}

            {modal.type === 'receipt' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">{modal.order.fournisseur?.nom} · {formatDate(modal.order.dateCommande)}</p>
                {modal.order.lignes.map((line) => {
                  const remaining = Number(line.quantiteCommandee) - Number(line.quantiteRecue);
                  const values = receiptForm[line.id] || {};
                  return (
                    <div key={line.id} className="space-y-3 rounded-xl border border-slate-800 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-white">{line.article?.designation}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {line.article?.reference} · Commandé {line.quantiteCommandee} {line.article?.unite} · Reçu {line.quantiteRecue} · Reste {remaining}
                          </p>
                        </div>
                      </div>
                      {remaining > 0 && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label={`Quantité reçue maintenant${line.article?.suiviParNumeroSerie ? ' (unités entières)' : ''}`}>
                            <input
                              type="number"
                              min="0"
                              max={remaining}
                              step={line.article?.suiviParNumeroSerie ? '1' : '0.001'}
                              className={inputClass}
                              value={values.quantiteRecue}
                              onChange={(event) => setReceiptForm({
                                ...receiptForm,
                                [line.id]: { ...values, quantiteRecue: event.target.value },
                              })}
                            />
                          </Field>
                          <Field label="Dépôt / emplacement">
                            <input
                              required={Boolean(values.quantiteRecue)}
                              maxLength={160}
                              className={inputClass}
                              value={values.emplacement}
                              onChange={(event) => setReceiptForm({
                                ...receiptForm,
                                [line.id]: { ...values, emplacement: event.target.value },
                              })}
                            />
                          </Field>
                          {line.article?.suiviParNumeroSerie && (
                            <div className="sm:col-span-2">
                              <Field label="Numéros de série (un par ligne)">
                                <textarea
                                  rows="3"
                                  required={Boolean(values.quantiteRecue)}
                                  placeholder={'ONT-0001\nONT-0002'}
                                  className={inputClass}
                                  value={values.numerosSerie || ''}
                                  onChange={(event) => setReceiptForm({
                                    ...receiptForm,
                                    [line.id]: { ...values, numerosSerie: event.target.value },
                                  })}
                                />
                              </Field>
                            </div>
                          )}
                        </div>
                      )}
                      {remaining <= 0 && <p className="text-xs font-medium text-emerald-300">Ligne entièrement réceptionnée.</p>}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
              <button type="button" onClick={closeModal} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800">Annuler</button>
              <button type="submit" disabled={saving || (modal.type === 'order' && (!supplierOptions.length || !articles.length))} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? 'Enregistrement...' : modal.type === 'receipt' ? 'Enregistrer la réception' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Approvisionnement</p>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Fournisseurs</h1>
            <p className="mt-2 text-sm text-slate-400">Gérez vos partenaires et suivez les commandes de réapprovisionnement.</p>
          </div>
          <button
            type="button"
            onClick={() => activeTab === 'fournisseurs' ? openSupplierModal() : openOrderModal()}
            disabled={activeTab === 'commandes' && (!supplierOptions.length || !articles.length)}
            className="inline-flex items-center gap-2 self-start rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-900/20 disabled:opacity-50 sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            {activeTab === 'fournisseurs' ? 'Nouveau fournisseur' : 'Nouvelle commande'}
          </button>
        </div>

        {error && !modal && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}
        {notice && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div>}

        <div className="flex gap-2 border-b border-slate-800">
          <button type="button" onClick={() => { setActiveTab('fournisseurs'); setError(''); }} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab === 'fournisseurs' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-white'}`}>
            <Building2 className="h-4 w-4" /> Fournisseurs
          </button>
          <button type="button" onClick={() => { setActiveTab('commandes'); setError(''); }} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab === 'commandes' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-white'}`}>
            <ClipboardList className="h-4 w-4" /> Commandes
          </button>
        </div>

        {activeTab === 'fournisseurs' ? (
          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
            <div className="border-b border-slate-800 p-4">
              <label className="relative block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input aria-label="Rechercher un fournisseur" placeholder="Rechercher un nom, contact, téléphone ou e-mail..." value={supplierSearch} onChange={(event) => { setSupplierSearch(event.target.value); setSupplierPage(1); }} className={`${inputClass} pl-9`} />
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr><th className="px-4 py-3">Fournisseur</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Téléphone</th><th className="px-4 py-3">E-mail</th><th className="px-4 py-3">Adresse</th><th className="px-4 py-3 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {loading ? (
                    <tr><td colSpan="6" className="p-10 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
                  ) : suppliers.length === 0 ? (
                    <tr><td colSpan="6" className="p-10 text-center text-slate-400">Aucun fournisseur trouvé.</td></tr>
                  ) : suppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-semibold text-white">{supplier.nom}</td>
                      <td className="px-4 py-3 text-slate-300">{supplier.contact || '—'}</td>
                      <td className="px-4 py-3 text-slate-300">{supplier.telephone || '—'}</td>
                      <td className="px-4 py-3 text-slate-400">{supplier.email || '—'}</td>
                      <td className="max-w-48 truncate px-4 py-3 text-slate-400">{supplier.adresse || '—'}</td>
                      <td className="px-4 py-3"><div className="flex justify-end gap-1">
                        <button type="button" title="Modifier" onClick={() => openSupplierModal(supplier)} className="rounded-lg p-2 text-slate-300 hover:bg-slate-700"><Edit2 className="h-4 w-4" /></button>
                        <button type="button" title="Supprimer" onClick={() => deleteSupplier(supplier)} className="rounded-lg p-2 text-rose-300 hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={supplierPagination} onChange={setSupplierPage} />
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
            <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:flex-row">
              <label className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input aria-label="Rechercher une commande" placeholder="Rechercher dans les commentaires..." value={orderSearch} onChange={(event) => { setOrderSearch(event.target.value); setOrderPage(1); }} className={`${inputClass} pl-9`} />
              </label>
              <select aria-label="Filtrer les commandes par statut" className={`${inputClass} sm:w-56`} value={orderStatus} onChange={(event) => { setOrderStatus(event.target.value); setOrderPage(1); }}>
                <option value="">Tous les statuts</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr><th className="px-4 py-3">Commande</th><th className="px-4 py-3">Fournisseur</th><th className="px-4 py-3">Articles</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {loading ? (
                    <tr><td colSpan="6" className="p-10 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
                  ) : orders.length === 0 ? (
                    <tr><td colSpan="6" className="p-10 text-center text-slate-400">Aucune commande trouvée.</td></tr>
                  ) : orders.map((order) => (
                    <tr key={order.id} className="align-top hover:bg-slate-800/30">
                      <td className="px-4 py-3"><p className="font-semibold text-white">Commande #{order.id}</p><p className="mt-1 text-xs text-slate-500">Envoi : {formatDate(order.dateEnvoi)}</p></td>
                      <td className="px-4 py-3 text-slate-300">{order.fournisseur?.nom || '—'}</td>
                      <td className="px-4 py-3"><div className="space-y-1.5">{order.lignes?.map((line) => <p key={line.id} className="text-xs text-slate-300">{line.article?.designation}: {line.quantiteRecue}/{line.quantiteCommandee} {line.article?.unite}</p>)}</div></td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(order.dateCommande)}</td>
                      <td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[order.statut]}`}>{STATUS_LABELS[order.statut]}</span></td>
                      <td className="px-4 py-3"><div className="flex justify-end gap-1">
                        {order.statut === 'brouillon' && <>
                          <button type="button" title="Modifier le brouillon" onClick={() => openOrderModal(order)} className="rounded-lg p-2 text-slate-300 hover:bg-slate-700"><Edit2 className="h-4 w-4" /></button>
                          <button type="button" title="Marquer comme envoyée" onClick={() => sendOrder(order)} className="rounded-lg p-2 text-blue-300 hover:bg-blue-500/10"><Send className="h-4 w-4" /></button>
                          <button type="button" title="Supprimer le brouillon" onClick={() => deleteOrder(order)} className="rounded-lg p-2 text-rose-300 hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
                        </>}
                        {['envoyee', 'reçue_partiellement'].includes(order.statut) && <button type="button" title="Réceptionner" onClick={() => openReceiptModal(order)} className="rounded-lg p-2 text-emerald-300 hover:bg-emerald-500/10"><PackageCheck className="h-4 w-4" /></button>}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={orderPagination} onChange={setOrderPage} />
          </section>
        )}
      </div>
      {renderModal()}
    </DashboardLayout>
  );
};

export default Suppliers;
