import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import api from '../api/axios.js';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';

const TYPES = [
  ['entree', 'Entrée'],
  ['sortie', 'Sortie'],
  ['transfert', 'Transfert'],
];

const EMPTY_FORM = {
  articleId: '',
  type: 'entree',
  quantite: '1',
  equipementId: '',
  etatEntree: 'neuf',
  etatSortie: 'en_service',
  depotSource: '',
  depotDestination: '',
  motif: '',
};

const inputClass =
  'w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20';

const errorMessage = (error, fallback) =>
  error.response?.data?.message || fallback;

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : '—';

const typeLabel = (type) =>
  TYPES.find(([value]) => value === type)?.[1] || (type === 'retour' ? 'Retour' : type);

const typeStyle = {
  entree: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  retour: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  sortie: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  transfert: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
};

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
    {children}
  </label>
);

const Pagination = ({ value, onChange }) => {
  if (!value || value.pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
      <span>Page {value.page} sur {value.pages} · {value.total} mouvement(s)</span>
      <div className="flex gap-2">
        <button type="button" disabled={value.page <= 1} onClick={() => onChange(value.page - 1)} aria-label="Page précédente" className="rounded-lg border border-slate-700 p-2 hover:bg-slate-800 disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button type="button" disabled={value.page >= value.pages} onClick={() => onChange(value.page + 1)} aria-label="Page suivante" className="rounded-lg border border-slate-700 p-2 hover:bg-slate-800 disabled:opacity-40">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export const Movements = () => {
  const [movements, setMovements] = useState([]);
  const [articles, setArticles] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    type: '',
    articleId: '',
    depot: '',
    date: '',
  });
  const [form, setForm] = useState(EMPTY_FORM);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadMovements = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/mouvements', {
        params: {
          page,
          limit: 10,
          type: filters.type || undefined,
          articleId: filters.articleId || undefined,
          depot: filters.depot.trim() || undefined,
          date: filters.date || undefined,
        },
      });
      setMovements(data.data);
      setPagination(data.pagination);
      setError('');
    } catch (requestError) {
      setError(errorMessage(requestError, 'Impossible de charger les mouvements.'));
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  const loadArticles = useCallback(async () => {
    try {
      const { data } = await api.get('/articles', { params: { page: 1, limit: 100 } });
      setArticles(data.data);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Impossible de charger le catalogue d’articles.'));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadMovements(), 0);
    return () => window.clearTimeout(timer);
  }, [loadMovements]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadArticles(), 0);
    return () => window.clearTimeout(timer);
  }, [loadArticles]);

  const selectedArticle = articles.find((article) => String(article.id) === form.articleId);
  const serialTracking = Boolean(selectedArticle?.suiviParNumeroSerie);
  const availableEquipments = equipments.filter((equipment) => {
    const isInStock = Number(equipment.stockActuel) > 0;
    if (form.type === 'entree') {
      return !isInStock && equipment.etat !== 'reforme';
    }
    if (!isInStock) return false;
    return !form.depotSource || equipment.emplacement === form.depotSource;
  });

  useEffect(() => {
    if (!modalOpen || !serialTracking) return undefined;
    let isCurrent = true;
    const loadEquipmentOptions = async () => {
      try {
        const { data } = await api.get('/equipements', {
          params: { articleId: selectedArticle.id, page: 1, limit: 100 },
        });
        if (isCurrent) setEquipments(data.data);
      } catch (requestError) {
        if (isCurrent) {
          setError(errorMessage(requestError, 'Impossible de charger les numéros de série.'));
        }
      }
    };
    const timer = window.setTimeout(() => {
      void loadEquipmentOptions();
    }, 0);
    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [modalOpen, selectedArticle, serialTracking]);

  const openModal = () => {
    setForm(EMPTY_FORM);
    setEquipments([]);
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const setFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  };

  const submitMovement = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        articleId: Number(form.articleId),
        type: form.type,
        quantite: serialTracking ? 1 : Number(form.quantite),
        motif: form.motif.trim(),
      };
      if (serialTracking) {
        payload.equipementId = Number(form.equipementId);
        if (form.type === 'entree') payload.etatEntree = form.etatEntree;
        if (form.type === 'sortie') payload.etatSortie = form.etatSortie;
      }
      if (form.type !== 'entree') payload.depotSource = form.depotSource.trim();
      if (form.type !== 'sortie') payload.depotDestination = form.depotDestination.trim();
      await api.post('/mouvements', payload);
      setNotice('Mouvement enregistré. Le stock est calculé à partir du journal.');
      closeModal();
      if (page !== 1) setPage(1);
      else await loadMovements();
    } catch (requestError) {
      setError(errorMessage(requestError, 'Impossible d’enregistrer ce mouvement.'));
    } finally {
      setSaving(false);
    }
  };

  const cancelMovement = async (movement) => {
    if (!window.confirm(`Créer un mouvement inverse pour annuler le mouvement #${movement.id} ?`)) return;
    setCancellingId(movement.id);
    setError('');
    try {
      await api.post(`/mouvements/${movement.id}/annulation`);
      setNotice(`Le mouvement #${movement.id} a été annulé par un mouvement inverse.`);
      await loadMovements();
    } catch (requestError) {
      setError(errorMessage(requestError, 'Impossible d’annuler ce mouvement.'));
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Inventaire</p>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Mouvements</h1>
            <p className="mt-2 text-sm text-slate-400">Consultez les entrées, sorties et transferts entre dépôts.</p>
          </div>
          <button type="button" onClick={openModal} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-900/20">
            <Plus className="h-4 w-4" /> Nouveau mouvement
          </button>
        </div>

        {error && !modalOpen && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}
        {notice && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div>}

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="grid gap-3 border-b border-slate-800 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input aria-label="Filtrer par dépôt" placeholder="Dépôt..." value={filters.depot} onChange={(event) => setFilter('depot', event.target.value)} className={`${inputClass} pl-9`} />
            </label>
            <select aria-label="Filtrer par type" value={filters.type} onChange={(event) => setFilter('type', event.target.value)} className={inputClass}>
              <option value="">Tous les types</option>
              {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              <option value="retour">Retour</option>
            </select>
            <select aria-label="Filtrer par article" value={filters.articleId} onChange={(event) => setFilter('articleId', event.target.value)} className={inputClass}>
              <option value="">Tous les articles</option>
              {articles.map((article) => <option key={article.id} value={article.id}>{article.designation}</option>)}
            </select>
            <input aria-label="Filtrer par date" title="Afficher les mouvements de cette date" type="date" value={filters.date} onChange={(event) => setFilter('date', event.target.value)} className={inputClass} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Article / équipement</th>
                  <th className="px-4 py-3">Quantité</th>
                  <th className="px-4 py-3">Dépôt source</th>
                  <th className="px-4 py-3">Dépôt destination</th>
                  <th className="px-4 py-3">Motif</th>
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3 text-right">Annulation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {loading ? (
                  <tr><td colSpan="9" className="p-10 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
                ) : movements.length === 0 ? (
                  <tr><td colSpan="9" className="p-10 text-center text-slate-400">Aucun mouvement trouvé.</td></tr>
                ) : movements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-slate-800/30">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatDate(movement.createdAt)}</td>
                    <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${typeStyle[movement.type] || typeStyle.entree}`}>{typeLabel(movement.type)}</span></td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{movement.article?.designation}</p>
                      <p className="mt-1 font-mono text-xs text-slate-500">{movement.equipement?.numeroSerie || movement.article?.reference}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{movement.quantite} {movement.article?.unite}</td>
                    <td className="px-4 py-3 text-slate-400">{movement.depotSource || (['sortie', 'transfert'].includes(movement.type) ? movement.emplacement : '—')}</td>
                    <td className="px-4 py-3 text-slate-400">{movement.depotDestination || (['entree', 'retour'].includes(movement.type) ? movement.emplacement : '—')}</td>
                    <td className="max-w-48 truncate px-4 py-3 text-slate-400" title={movement.commentaire}>{movement.commentaire || '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{movement.utilisateur?.nom || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {movement.annulation ? (
                        <span className="text-xs text-slate-500">Annulé</span>
                      ) : movement.mouvementInverseDeId ? (
                        <span className="text-xs text-blue-300">Mouvement inverse</span>
                      ) : (
                        <button
                          type="button"
                          disabled={cancellingId === movement.id}
                          onClick={() => void cancelMovement(movement)}
                          title="Annuler par mouvement inverse"
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
                        >
                          {cancellingId === movement.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                          Annuler
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination value={pagination} onChange={setPage} />
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/70 p-4">
          <div className="my-auto w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <h2 className="font-semibold text-white">Nouveau mouvement</h2>
              <button type="button" onClick={closeModal} aria-label="Fermer" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={submitMovement} className="space-y-4 p-5">
              {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Type de mouvement">
                  <select className={inputClass} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value, equipementId: '' })}>
                    {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <Field label="Article">
                  <select required className={inputClass} value={form.articleId} onChange={(event) => setForm({ ...form, articleId: event.target.value, equipementId: '' })}>
                    <option value="">Choisir un article</option>
                    {articles.map((article) => <option key={article.id} value={article.id}>{article.reference} · {article.designation}</option>)}
                  </select>
                </Field>
                {serialTracking ? (
                  <div className="sm:col-span-2">
                    <Field label="Équipement / numéro de série">
                      <select required className={inputClass} value={form.equipementId} onChange={(event) => setForm({ ...form, equipementId: event.target.value })}>
                        <option value="">Choisir un numéro de série</option>
                        {availableEquipments.map((equipment) => <option key={equipment.id} value={equipment.id}>{equipment.numeroSerie} · {equipment.emplacement}</option>)}
                      </select>
                    </Field>
                    <p className="mt-1 text-xs text-slate-500">Un mouvement sérialisé concerne un équipement (quantité 1).</p>
                    {form.type === 'entree' && (
                      <Field label="État à l’entrée">
                        <select className={inputClass} value={form.etatEntree} onChange={(event) => setForm({ ...form, etatEntree: event.target.value })}>
                          <option value="neuf">Neuf</option>
                          <option value="en_panne">En panne</option>
                          <option value="repare">Réparé</option>
                        </select>
                      </Field>
                    )}
                    {form.type === 'sortie' && (
                      <Field label="État après sortie">
                        <select className={inputClass} value={form.etatSortie} onChange={(event) => setForm({ ...form, etatSortie: event.target.value })}>
                          <option value="en_service">En service</option>
                          <option value="reforme">Réformé</option>
                        </select>
                      </Field>
                    )}
                  </div>
                ) : (
                  <Field label={`Quantité${selectedArticle ? ` (${selectedArticle.unite})` : ''}`}>
                    <input required type="number" min="0.001" max="999999999" step="0.001" className={inputClass} value={form.quantite} onChange={(event) => setForm({ ...form, quantite: event.target.value })} />
                  </Field>
                )}
                {form.type !== 'entree' && (
                  <Field label="Dépôt source">
                    <input required maxLength={160} className={inputClass} value={form.depotSource} onChange={(event) => setForm({ ...form, depotSource: event.target.value })} placeholder="Dépôt principal" />
                  </Field>
                )}
                {form.type !== 'sortie' && (
                  <Field label="Dépôt destination">
                    <input required maxLength={160} className={inputClass} value={form.depotDestination} onChange={(event) => setForm({ ...form, depotDestination: event.target.value })} placeholder="Dépôt secondaire" />
                  </Field>
                )}
                {form.type === 'transfert' && (
                  <div className="sm:col-span-2 flex items-center gap-2 text-xs text-blue-200">
                    <ArrowLeftRight className="h-4 w-4" />
                    Le transfert retire la quantité du dépôt source et l’ajoute au dépôt destination sans modifier le stock total.
                  </div>
                )}
                <div className="sm:col-span-2">
                  <Field label="Motif (facultatif)">
                    <input maxLength={255} className={inputClass} value={form.motif} onChange={(event) => setForm({ ...form, motif: event.target.value })} placeholder="Réapprovisionnement, affectation, déplacement..." />
                  </Field>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button type="button" onClick={closeModal} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800">Annuler</button>
                <button type="submit" disabled={saving || !articles.length || (serialTracking && !availableEquipments.length)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Movements;
