import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  ClipboardList,
  Edit2,
  Loader2,
  PackagePlus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import api from '../api/axios.js';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';

const CATEGORIES = [
  ['routeur', 'Routeur'],
  ['switch', 'Switch'],
  ['modem', 'Modem'],
  ['ont', 'ONT'],
  ['cable', 'Câble'],
  ['antenne', 'Antenne'],
  ['carte_sim', 'Carte SIM'],
  ['autre', 'Autre'],
];

const STATES = [
  ['neuf', 'Neuf'],
  ['en_service', 'En service'],
  ['en_panne', 'En panne'],
  ['repare', 'Réparé'],
  ['reforme', 'Réformé'],
];

const MOVEMENT_TYPES = [
  ['entree', 'Entrée'],
  ['sortie', 'Sortie'],
  ['retour', 'Retour'],
];

const EMPTY_ARTICLE = {
  reference: '',
  designation: '',
  categorie: 'autre',
  marque: '',
  unite: 'unité',
  seuilMinimum: '0',
  suiviParNumeroSerie: false,
};

const EMPTY_EQUIPMENT = {
  articleId: '',
  numeroSerie: '',
  etat: 'neuf',
  emplacement: '',
};

const EMPTY_MOVEMENT = {
  articleId: '',
  type: 'entree',
  quantite: '1',
  equipementId: '',
  etatRetour: 'repare',
  etatSortie: 'en_service',
  emplacement: '',
  commentaire: '',
};

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || fallback;

const formatNumber = (value) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(Number(value) || 0);

const categoryLabel = (value) =>
  CATEGORIES.find(([key]) => key === value)?.[1] || value;

const stateLabel = (value) =>
  STATES.find(([key]) => key === value)?.[1] || value;

const stateStyles = {
  neuf: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  en_service: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  en_panne: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  repare: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  reforme: 'border-slate-600 bg-slate-700/40 text-slate-300',
};

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
    {children}
  </label>
);

const inputClass =
  'w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20';

const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
      <span>
        Page {pagination.page} sur {pagination.pages} · {pagination.total} résultat(s)
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          aria-label="Page précédente"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
          className="rounded-lg border border-slate-700 p-2 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Page suivante"
          disabled={pagination.page >= pagination.pages}
          onClick={() => onPageChange(pagination.page + 1)}
          className="rounded-lg border border-slate-700 p-2 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export const Articles = () => {
  const [activeTab, setActiveTab] = useState('catalogue');
  const [articles, setArticles] = useState([]);
  const [articleOptions, setArticleOptions] = useState([]);
  const [equipements, setEquipements] = useState([]);
  const [movementEquipments, setMovementEquipments] = useState([]);
  const [articlePagination, setArticlePagination] = useState(null);
  const [equipmentPagination, setEquipmentPagination] = useState(null);
  const [articlePage, setArticlePage] = useState(1);
  const [equipmentPage, setEquipmentPage] = useState(1);
  const [articleSearch, setArticleSearch] = useState('');
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [articleCategory, setArticleCategory] = useState('');
  const [equipmentCategory, setEquipmentCategory] = useState('');
  const [equipmentState, setEquipmentState] = useState('');
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [loadingEquipment, setLoadingEquipment] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(null);
  const [articleForm, setArticleForm] = useState(EMPTY_ARTICLE);
  const [equipmentForm, setEquipmentForm] = useState(EMPTY_EQUIPMENT);
  const [movementForm, setMovementForm] = useState(EMPTY_MOVEMENT);

  const loadArticles = useCallback(async () => {
    setLoadingArticles(true);
    try {
      const { data } = await api.get('/articles', {
        params: {
          page: articlePage,
          limit: 10,
          search: articleSearch.trim() || undefined,
          categorie: articleCategory || undefined,
        },
      });
      setArticles(data.data);
      setArticlePagination(data.pagination);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible de charger le catalogue.'));
    } finally {
      setLoadingArticles(false);
    }
  }, [articleCategory, articlePage, articleSearch]);

  const loadArticleOptions = useCallback(async () => {
    try {
      const { data } = await api.get('/articles', { params: { page: 1, limit: 100 } });
      setArticleOptions(data.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible de charger les articles.'));
    }
  }, []);

  const loadEquipements = useCallback(async () => {
    setLoadingEquipment(true);
    try {
      const { data } = await api.get('/equipements', {
        params: {
          page: equipmentPage,
          limit: 10,
          search: equipmentSearch.trim() || undefined,
          categorie: equipmentCategory || undefined,
          etat: equipmentState || undefined,
        },
      });
      setEquipements(data.data);
      setEquipmentPagination(data.pagination);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible de charger les équipements.'));
    } finally {
      setLoadingEquipment(false);
    }
  }, [equipmentCategory, equipmentPage, equipmentSearch, equipmentState]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadArticles(), 0);
    return () => window.clearTimeout(timer);
  }, [loadArticles]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadEquipements(), 0);
    return () => window.clearTimeout(timer);
  }, [loadEquipements]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadArticleOptions(), 0);
    return () => window.clearTimeout(timer);
  }, [loadArticleOptions]);

  const refreshInventory = async () => {
    await Promise.all([loadArticles(), loadArticleOptions(), loadEquipements()]);
  };

  const openArticleModal = (article = null) => {
    setError('');
    setArticleForm(article ? {
      reference: article.reference,
      designation: article.designation,
      categorie: article.categorie,
      marque: article.marque || '',
      unite: article.unite,
      seuilMinimum: String(article.seuilMinimum),
      suiviParNumeroSerie: article.suiviParNumeroSerie,
    } : EMPTY_ARTICLE);
    setModal(article ? { type: 'article', id: article.id } : { type: 'article' });
  };

  const openEquipmentModal = (equipment = null) => {
    setError('');
    setEquipmentForm(equipment ? {
      articleId: String(equipment.articleId),
      numeroSerie: equipment.numeroSerie,
      etat: equipment.etat,
      emplacement: equipment.emplacement,
    } : {
      ...EMPTY_EQUIPMENT,
      articleId: String(articleOptions.find((article) => article.suiviParNumeroSerie)?.id || ''),
    });
    setModal(equipment ? { type: 'equipment', id: equipment.id } : { type: 'equipment' });
  };

  const openMovementModal = (article = null) => {
    setError('');
    setMovementForm({
      ...EMPTY_MOVEMENT,
      articleId: article ? String(article.id) : '',
    });
    setModal({ type: 'movement' });
  };

  const closeModal = () => setModal(null);

  const handleArticleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...articleForm,
        seuilMinimum: Number(articleForm.seuilMinimum),
      };
      if (modal.id) {
        await api.put(`/articles/${modal.id}`, payload);
        setNotice('Article modifié.');
      } else {
        await api.post('/articles', payload);
        setNotice('Article créé.');
        setArticlePage(1);
      }
      closeModal();
      await refreshInventory();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible d’enregistrer cet article.'));
    } finally {
      setSaving(false);
    }
  };

  const handleEquipmentSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (modal.id) {
        await api.put(`/equipements/${modal.id}`, equipmentForm);
        setNotice('Équipement modifié.');
      } else {
        await api.post('/equipements', equipmentForm);
        setNotice('Équipement créé et ajouté au stock.');
        setEquipmentPage(1);
      }
      closeModal();
      await refreshInventory();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible d’enregistrer cet équipement.'));
    } finally {
      setSaving(false);
    }
  };

  const handleMovementSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const article = articleOptions.find((item) => String(item.id) === movementForm.articleId);
      const payload = {
        articleId: Number(movementForm.articleId),
        type: movementForm.type,
        quantite: article?.suiviParNumeroSerie ? 1 : Number(movementForm.quantite),
        commentaire: movementForm.commentaire,
      };
      if (article?.suiviParNumeroSerie) {
        payload.equipementId = Number(movementForm.equipementId);
        payload.emplacement = movementForm.emplacement.trim();
        if (movementForm.type === 'retour') payload.etatRetour = movementForm.etatRetour;
        if (movementForm.type === 'sortie') payload.etatSortie = movementForm.etatSortie;
      }
      await api.post('/mouvements', payload);
      setNotice('Mouvement enregistré ; le stock a été recalculé.');
      closeModal();
      await refreshInventory();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible d’enregistrer le mouvement.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteArticle = async (article) => {
    if (!window.confirm(`Supprimer l’article « ${article.designation} » ?`)) return;
    setError('');
    try {
      await api.delete(`/articles/${article.id}`);
      setNotice('Article supprimé.');
      await refreshInventory();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible de supprimer cet article.'));
    }
  };

  const handleDeleteEquipment = async (equipment) => {
    if (!window.confirm(`Supprimer l’équipement ${equipment.numeroSerie} ?`)) return;
    setError('');
    try {
      await api.delete(`/equipements/${equipment.id}`);
      setNotice('Équipement supprimé.');
      await refreshInventory();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible de supprimer cet équipement.'));
    }
  };

  const selectedMovementArticle = articleOptions.find(
    (article) => String(article.id) === movementForm.articleId
  );
  const selectedEquipmentArticle = articleOptions.find(
    (article) => String(article.id) === equipmentForm.articleId
  );

  useEffect(() => {
    if (modal?.type !== 'movement' || !selectedMovementArticle?.suiviParNumeroSerie) return;
    const loadSerialEquipments = async () => {
      try {
        const { data } = await api.get('/equipements', {
          params: { articleId: selectedMovementArticle.id, page: 1, limit: 100 },
        });
        setMovementEquipments(data.data);
      } catch (requestError) {
        setError(getErrorMessage(requestError, 'Impossible de charger les équipements.'));
      }
    };
    void loadSerialEquipments();
  }, [modal?.type, selectedMovementArticle]);

  const availableMovementEquipments = movementEquipments.filter((equipment) =>
    equipment.articleId === selectedMovementArticle?.id &&
    (movementForm.type === 'sortie'
      ? Number(equipment.stockActuel) > 0
      : Number(equipment.stockActuel) <= 0 && equipment.etat !== 'reforme')
  );

  const renderModal = () => {
    if (!modal) return null;
    const isArticle = modal.type === 'article';
    const isEquipment = modal.type === 'equipment';
    const title = isArticle
      ? modal.id ? 'Modifier un article' : 'Nouvel article'
      : isEquipment
        ? modal.id ? 'Modifier un équipement' : 'Nouvel équipement'
        : 'Nouveau mouvement de stock';

    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/70 p-4">
        <div className="my-auto w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-white">{title}</h2>
            <button type="button" onClick={closeModal} aria-label="Fermer" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form
            onSubmit={isArticle ? handleArticleSubmit : isEquipment ? handleEquipmentSubmit : handleMovementSubmit}
            className="space-y-4 p-5"
          >
            {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}

            {isArticle && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Référence">
                  <input required maxLength={80} className={inputClass} value={articleForm.reference} onChange={(event) => setArticleForm({ ...articleForm, reference: event.target.value })} />
                </Field>
                <Field label="Désignation">
                  <input required maxLength={160} className={inputClass} value={articleForm.designation} onChange={(event) => setArticleForm({ ...articleForm, designation: event.target.value })} />
                </Field>
                <Field label="Catégorie">
                  <select className={inputClass} value={articleForm.categorie} onChange={(event) => setArticleForm({ ...articleForm, categorie: event.target.value })}>
                    {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <Field label="Marque">
                  <input maxLength={100} className={inputClass} value={articleForm.marque} onChange={(event) => setArticleForm({ ...articleForm, marque: event.target.value })} />
                </Field>
                <Field label="Unité">
                  <input required maxLength={30} className={inputClass} value={articleForm.unite} onChange={(event) => setArticleForm({ ...articleForm, unite: event.target.value })} />
                </Field>
                <Field label="Seuil minimum">
                  <input required type="number" min="0" step="0.001" className={inputClass} value={articleForm.seuilMinimum} onChange={(event) => setArticleForm({ ...articleForm, seuilMinimum: event.target.value })} />
                </Field>
                <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-300 sm:col-span-2">
                  <input type="checkbox" checked={articleForm.suiviParNumeroSerie} onChange={(event) => setArticleForm({ ...articleForm, suiviParNumeroSerie: event.target.checked })} className="h-4 w-4 accent-cyan-500" />
                  Suivi individuel par numéro de série
                </label>
              </div>
            )}

            {isEquipment && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Article sérialisé">
                  <select required disabled={Boolean(modal.id)} className={inputClass} value={equipmentForm.articleId} onChange={(event) => setEquipmentForm({ ...equipmentForm, articleId: event.target.value })}>
                    <option value="">Choisir un article</option>
                    {articleOptions.filter((article) => article.suiviParNumeroSerie).map((article) => <option key={article.id} value={article.id}>{article.reference} · {article.designation}</option>)}
                  </select>
                </Field>
                <Field label="Numéro de série">
                  <input required maxLength={120} className={inputClass} value={equipmentForm.numeroSerie} onChange={(event) => setEquipmentForm({ ...equipmentForm, numeroSerie: event.target.value })} />
                </Field>
                <Field label="État">
                  <select className={inputClass} value={equipmentForm.etat} onChange={(event) => setEquipmentForm({ ...equipmentForm, etat: event.target.value })}>
                    {STATES.filter(([value]) => modal.id ? value !== 'reforme' || equipmentForm.etat === 'reforme' : value !== 'en_service' && value !== 'reforme').map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <Field label="Emplacement / dépôt">
                  <input required maxLength={160} className={inputClass} value={equipmentForm.emplacement} onChange={(event) => setEquipmentForm({ ...equipmentForm, emplacement: event.target.value })} />
                </Field>
                {!modal.id && <p className="text-xs text-cyan-200 sm:col-span-2">L’équipement sera automatiquement ajouté au stock par un mouvement d’entrée.</p>}
                {modal.id && <p className="text-xs text-slate-400 sm:col-span-2">Un changement d’état peut enregistrer automatiquement une entrée ou une sortie de stock.</p>}
              </div>
            )}

            {modal.type === 'movement' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Article">
                  <select required className={inputClass} value={movementForm.articleId} onChange={(event) => setMovementForm({ ...movementForm, articleId: event.target.value, equipementId: '' })}>
                    <option value="">Choisir un article</option>
                    {articleOptions.map((article) => <option key={article.id} value={article.id}>{article.reference} · {article.designation}</option>)}
                  </select>
                </Field>
                <Field label="Type de mouvement">
                  <select className={inputClass} value={movementForm.type} onChange={(event) => setMovementForm({ ...movementForm, type: event.target.value, equipementId: '' })}>
                    {MOVEMENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                {selectedMovementArticle?.suiviParNumeroSerie ? (
                  <>
                    <Field label="Équipement">
                      <select required className={inputClass} value={movementForm.equipementId} onChange={(event) => setMovementForm({ ...movementForm, equipementId: event.target.value })}>
                        <option value="">Choisir le numéro de série</option>
                        {availableMovementEquipments.map((equipment) => <option key={equipment.id} value={equipment.id}>{equipment.numeroSerie} · {stateLabel(equipment.etat)}</option>)}
                      </select>
                    </Field>
                    {movementForm.type === 'retour' && (
                      <Field label="État au retour">
                        <select className={inputClass} value={movementForm.etatRetour} onChange={(event) => setMovementForm({ ...movementForm, etatRetour: event.target.value })}>
                          {STATES.filter(([value]) => value !== 'en_service' && value !== 'reforme').map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </Field>
                    )}
                    {movementForm.type === 'sortie' && (
                      <Field label="État après sortie">
                        <select className={inputClass} value={movementForm.etatSortie} onChange={(event) => setMovementForm({ ...movementForm, etatSortie: event.target.value })}>
                          <option value="en_service">En service</option>
                          <option value="reforme">Réformé</option>
                        </select>
                      </Field>
                    )}
                    <Field label="Nouvel emplacement / dépôt">
                      <input required maxLength={160} className={inputClass} value={movementForm.emplacement} onChange={(event) => setMovementForm({ ...movementForm, emplacement: event.target.value })} />
                    </Field>
                  </>
                ) : (
                  <Field label={`Quantité${selectedMovementArticle ? ` (${selectedMovementArticle.unite})` : ''}`}>
                    <input required type="number" min="0.001" step="0.001" className={inputClass} value={movementForm.quantite} onChange={(event) => setMovementForm({ ...movementForm, quantite: event.target.value })} />
                  </Field>
                )}
                <div className="sm:col-span-2">
                  <Field label="Commentaire (facultatif)">
                    <input maxLength={255} className={inputClass} value={movementForm.commentaire} onChange={(event) => setMovementForm({ ...movementForm, commentaire: event.target.value })} />
                  </Field>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
              <button type="button" onClick={closeModal} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800">Annuler</button>
              <button type="submit" disabled={saving || (isEquipment && !selectedEquipmentArticle?.suiviParNumeroSerie)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? 'Enregistrement...' : 'Enregistrer'}
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Inventaire</p>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Articles</h1>
            <p className="mt-2 text-sm text-slate-400">Gérez votre catalogue et le parc des équipements sérialisés.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeTab === 'catalogue' ? (
              <>
                <button type="button" onClick={() => openMovementModal()} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800">
                  <PackagePlus className="h-4 w-4" /> Mouvement
                </button>
                <button type="button" onClick={() => openArticleModal()} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-900/20">
                  <CirclePlus className="h-4 w-4" /> Nouvel article
                </button>
              </>
            ) : (
              <button type="button" onClick={() => openEquipmentModal()} disabled={!articleOptions.some((article) => article.suiviParNumeroSerie)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                <CirclePlus className="h-4 w-4" /> Nouvel équipement
              </button>
            )}
          </div>
        </div>

        {error && !modal && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}
        {notice && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div>}

        <div className="flex gap-2 border-b border-slate-800">
          <button type="button" onClick={() => setActiveTab('catalogue')} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab === 'catalogue' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-white'}`}>
            <ClipboardList className="h-4 w-4" /> Catalogue
          </button>
          <button type="button" onClick={() => setActiveTab('equipements')} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab === 'equipements' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-white'}`}>
            <Boxes className="h-4 w-4" /> Équipements
          </button>
        </div>

        {activeTab === 'catalogue' ? (
          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
            <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:flex-row">
              <label className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input aria-label="Rechercher un article" placeholder="Rechercher référence, désignation, marque..." value={articleSearch} onChange={(event) => { setArticleSearch(event.target.value); setArticlePage(1); }} className={`${inputClass} pl-9`} />
              </label>
              <select aria-label="Filtrer par catégorie" value={articleCategory} onChange={(event) => { setArticleCategory(event.target.value); setArticlePage(1); }} className={`${inputClass} sm:w-52`}>
                <option value="">Toutes les catégories</option>
                {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr><th className="px-4 py-3">Référence / désignation</th><th className="px-4 py-3">Catégorie</th><th className="px-4 py-3">Marque</th><th className="px-4 py-3">Stock actuel</th><th className="px-4 py-3">Seuil min.</th><th className="px-4 py-3">Suivi série</th><th className="px-4 py-3 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {loadingArticles ? (
                    <tr><td colSpan="7" className="p-10 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
                  ) : articles.length === 0 ? (
                    <tr><td colSpan="7" className="p-10 text-center text-slate-400">Aucun article trouvé.</td></tr>
                  ) : articles.map((article) => (
                    <tr key={article.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3"><p className="font-semibold text-white">{article.designation}</p><p className="mt-1 text-xs text-slate-500">{article.reference}</p></td>
                      <td className="px-4 py-3 text-slate-300">{categoryLabel(article.categorie)}</td>
                      <td className="px-4 py-3 text-slate-400">{article.marque || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${article.stockBas ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
                          {article.stockBas && <AlertTriangle className="h-3.5 w-3.5" />}
                          {formatNumber(article.stockActuel)} {article.unite}
                        </span>
                        {article.stockBas && <span className="ml-2 text-[11px] text-amber-300">Stock bas</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{formatNumber(article.seuilMinimum)} {article.unite}</td>
                      <td className="px-4 py-3 text-slate-400">{article.suiviParNumeroSerie ? 'Oui' : 'Non'}</td>
                      <td className="px-4 py-3"><div className="flex justify-end gap-1">
                        <button type="button" title="Mouvement de stock" onClick={() => openMovementModal(article)} className="rounded-lg p-2 text-cyan-300 hover:bg-cyan-500/10"><PackagePlus className="h-4 w-4" /></button>
                        <button type="button" title="Modifier" onClick={() => openArticleModal(article)} className="rounded-lg p-2 text-slate-300 hover:bg-slate-700"><Edit2 className="h-4 w-4" /></button>
                        <button type="button" title="Supprimer" onClick={() => handleDeleteArticle(article)} className="rounded-lg p-2 text-rose-300 hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={articlePagination} onPageChange={setArticlePage} />
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
            <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:flex-row">
              <label className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input aria-label="Rechercher un équipement" placeholder="Rechercher numéro de série, article, dépôt..." value={equipmentSearch} onChange={(event) => { setEquipmentSearch(event.target.value); setEquipmentPage(1); }} className={`${inputClass} pl-9`} />
              </label>
              <select aria-label="Filtrer les équipements par catégorie" value={equipmentCategory} onChange={(event) => { setEquipmentCategory(event.target.value); setEquipmentPage(1); }} className={`${inputClass} sm:w-48`}>
                <option value="">Toutes catégories</option>
                {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select aria-label="Filtrer les équipements par état" value={equipmentState} onChange={(event) => { setEquipmentState(event.target.value); setEquipmentPage(1); }} className={`${inputClass} sm:w-48`}>
                <option value="">Tous les états</option>
                {STATES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr><th className="px-4 py-3">Numéro de série</th><th className="px-4 py-3">Article</th><th className="px-4 py-3">Catégorie</th><th className="px-4 py-3">État</th><th className="px-4 py-3">Emplacement / dépôt</th><th className="px-4 py-3 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {loadingEquipment ? (
                    <tr><td colSpan="6" className="p-10 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
                  ) : equipements.length === 0 ? (
                    <tr><td colSpan="6" className="p-10 text-center text-slate-400">Aucun équipement trouvé.</td></tr>
                  ) : equipements.map((equipment) => (
                    <tr key={equipment.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-white">{equipment.numeroSerie}</td>
                      <td className="px-4 py-3"><p className="font-medium text-white">{equipment.article?.designation}</p><p className="mt-1 text-xs text-slate-500">{equipment.article?.reference}</p></td>
                      <td className="px-4 py-3 text-slate-300">{categoryLabel(equipment.article?.categorie)}</td>
                      <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${stateStyles[equipment.etat] || stateStyles.neuf}`}>{stateLabel(equipment.etat)}</span></td>
                      <td className="px-4 py-3 text-slate-400">{equipment.emplacement}</td>
                      <td className="px-4 py-3"><div className="flex justify-end gap-1">
                        <button type="button" title="Modifier" onClick={() => openEquipmentModal(equipment)} className="rounded-lg p-2 text-slate-300 hover:bg-slate-700"><Edit2 className="h-4 w-4" /></button>
                        <button type="button" title="Supprimer" onClick={() => handleDeleteEquipment(equipment)} className="rounded-lg p-2 text-rose-300 hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={equipmentPagination} onPageChange={setEquipmentPage} />
          </section>
        )}
      </div>
      {renderModal()}
    </DashboardLayout>
  );
};

export default Articles;
