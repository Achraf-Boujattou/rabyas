import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/useAuth.js';
import api from '../api/axios.js';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import {
  ArrowDownToLine,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';

const EMPTY_LINE = { articleId: '', quantite: '1', equipementIds: [] };
const EMPTY_FORM = {
  beneficiaireType: 'technicien',
  beneficiaireUserId: '',
  beneficiaireReference: '',
  depotSource: 'Dépôt principal',
  lignes: [{ ...EMPTY_LINE }],
};

const inputClass =
  'w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20';

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || fallback;

const formatDate = (date) => date
  ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
  : '—';

const formatQuantity = (quantity) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(Number(quantity) || 0);

const beneficiaryLabel = (assignment) =>
  assignment.beneficiaireType === 'technicien'
    ? assignment.technicien?.nom || assignment.beneficiaireReference
    : assignment.beneficiaireReference;

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
    {children}
  </label>
);

const Pagination = ({ pagination, onChange }) => {
  if (!pagination || pagination.pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
      <span>Page {pagination.page} sur {pagination.pages} · {pagination.total} affectation(s)</span>
      <div className="flex gap-2">
        <button
          type="button"
          aria-label="Page précédente"
          disabled={pagination.page <= 1}
          onClick={() => onChange(pagination.page - 1)}
          className="rounded-lg border border-slate-700 p-2 hover:bg-slate-800 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Page suivante"
          disabled={pagination.page >= pagination.pages}
          onClick={() => onChange(pagination.page + 1)}
          className="rounded-lg border border-slate-700 p-2 hover:bg-slate-800 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export const Assignments = () => {
  const { user } = useAuth();
  const isTechnician = user?.role === 'technicien';
  const [assignments, setAssignments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ beneficiaire: '', statut: '', equipement: '' });
  const [articles, setArticles] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [equipmentOptions, setEquipmentOptions] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [returnStates, setReturnStates] = useState({});
  const [returningAssignment, setReturningAssignment] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [notice, setNotice] = useState('');

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/affectations', {
        params: {
          page,
          limit: 10,
          beneficiaire: isTechnician ? undefined : filters.beneficiaire.trim() || undefined,
          statut: isTechnician ? undefined : filters.statut || undefined,
          equipement: isTechnician ? undefined : filters.equipement.trim() || undefined,
        },
      });
      setAssignments(data.data);
      setPagination(data.pagination);
      setError('');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible de charger les affectations.'));
    } finally {
      setLoading(false);
    }
  }, [filters, isTechnician, page]);

  const loadOptions = useCallback(async () => {
    if (isTechnician) return;
    try {
      const [articleResponse, technicianResponse] = await Promise.all([
        api.get('/articles', { params: { page: 1, limit: 100 } }),
        api.get('/affectations/techniciens'),
      ]);
      setArticles(articleResponse.data.data);
      setTechnicians(technicianResponse.data.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible de charger les listes nécessaires.'));
    }
  }, [isTechnician]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAssignments(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAssignments]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadOptions(), 0);
    return () => window.clearTimeout(timer);
  }, [loadOptions]);

  const articleById = useMemo(
    () => new Map(articles.map((article) => [String(article.id), article])),
    [articles]
  );

  const openCreateModal = () => {
    setForm({
      ...EMPTY_FORM,
      beneficiaireUserId: technicians[0] ? String(technicians[0].id) : '',
      lignes: [{ ...EMPTY_LINE }],
    });
    setEquipmentOptions({});
    setModalError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setReturningAssignment(null);
    setModalError('');
  };

  const updateLine = (index, changes) => {
    setForm((current) => ({
      ...current,
      lignes: current.lignes.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...changes } : line
      ),
    }));
  };

  const selectArticleForLine = async (index, articleId) => {
    updateLine(index, { articleId, equipementIds: [] });
    const article = articleById.get(articleId);
    if (!article?.suiviParNumeroSerie) return;
    try {
      const { data } = await api.get('/equipements', {
        params: { articleId, page: 1, limit: 100 },
      });
      setEquipmentOptions((current) => ({ ...current, [articleId]: data.data }));
    } catch (requestError) {
      setModalError(getErrorMessage(requestError, 'Impossible de charger les numéros de série.'));
    }
  };

  const startReturn = (assignment) => {
    const initialStates = {};
    for (const line of assignment.lignes) {
      if (line.equipementId) initialStates[line.equipementId] = 'repare';
    }
    setReturnStates(initialStates);
    setReturningAssignment(assignment);
    setModalError('');
  };

  const submitAssignment = async (event) => {
    event.preventDefault();
    setSaving(true);
    setModalError('');
    try {
      const lines = form.lignes.map((line) => {
        const article = articleById.get(line.articleId);
        return {
          articleId: Number(line.articleId),
          ...(article?.suiviParNumeroSerie
            ? { equipementIds: line.equipementIds.map(Number) }
            : { quantite: Number(line.quantite) }),
        };
      });
      await api.post('/affectations', {
        beneficiaireType: form.beneficiaireType,
        beneficiaireUserId: form.beneficiaireType === 'technicien'
          ? Number(form.beneficiaireUserId)
          : undefined,
        beneficiaireReference: form.beneficiaireType === 'technicien'
          ? undefined
          : form.beneficiaireReference.trim(),
        depotSource: form.depotSource.trim(),
        lignes: lines,
      });
      setModalOpen(false);
      setNotice('Affectation créée ; le stock a été mis à jour.');
      setPage(1);
      await loadAssignments();
    } catch (requestError) {
      setModalError(getErrorMessage(requestError, 'Impossible de créer cette affectation.'));
    } finally {
      setSaving(false);
    }
  };

  const submitReturn = async (event) => {
    event.preventDefault();
    if (!returningAssignment) return;
    setSaving(true);
    setModalError('');
    try {
      await api.post(`/affectations/${returningAssignment.id}/retour`, {
        etatsEquipements: Object.entries(returnStates).map(([equipementId, etat]) => ({
          equipementId: Number(equipementId),
          etat,
        })),
      });
      setReturningAssignment(null);
      setNotice('Retour enregistré ; le matériel est de nouveau en stock.');
      await loadAssignments();
    } catch (requestError) {
      setModalError(getErrorMessage(requestError, 'Impossible d’enregistrer le retour.'));
    } finally {
      setSaving(false);
    }
  };

  const changeFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Inventaire</p>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              {isTechnician ? 'Mes affectations' : 'Affectations'}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {isTechnician
                ? 'Consultez les équipements qui vous ont été attribués.'
                : 'Attribuez du matériel et suivez son retour auprès des bénéficiaires.'}
            </p>
          </div>
          {!isTechnician && (
            <button
              type="button"
              onClick={openCreateModal}
              disabled={!articles.length}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-900/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Nouvelle affectation
            </button>
          )}
        </div>

        {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}
        {notice && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div>}

        {!isTechnician && (
          <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:grid-cols-3">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                aria-label="Filtrer par bénéficiaire"
                value={filters.beneficiaire}
                onChange={(event) => changeFilter('beneficiaire', event.target.value)}
                placeholder="Bénéficiaire..."
                className={`${inputClass} pl-9`}
              />
            </label>
            <label className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                aria-label="Filtrer par équipement"
                value={filters.equipement}
                onChange={(event) => changeFilter('equipement', event.target.value)}
                placeholder="N° de série..."
                className={`${inputClass} pl-9`}
              />
            </label>
            <select
              aria-label="Filtrer par statut"
              value={filters.statut}
              onChange={(event) => changeFilter('statut', event.target.value)}
              className={inputClass}
            >
              <option value="">Tous les statuts</option>
              <option value="en_cours">En cours</option>
              <option value="retournee">Retournée</option>
            </select>
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Bénéficiaire</th>
                  <th className="px-4 py-3">Matériel attribué</th>
                  <th className="px-4 py-3">Dépôt d’origine</th>
                  <th className="px-4 py-3">Date d’attribution</th>
                  <th className="px-4 py-3">Attribué par</th>
                  <th className="px-4 py-3">Statut / retour</th>
                  {!isTechnician && <th className="px-4 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {loading ? (
                  <tr><td colSpan={isTechnician ? 6 : 7} className="p-10 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
                ) : assignments.length === 0 ? (
                  <tr><td colSpan={isTechnician ? 6 : 7} className="p-10 text-center text-slate-400">
                    {isTechnician ? 'Aucune affectation ne vous est attribuée.' : 'Aucune affectation trouvée.'}
                  </td></tr>
                ) : assignments.map((assignment) => (
                  <tr key={assignment.id} className="align-top hover:bg-slate-800/30">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-white">{beneficiaryLabel(assignment)}</p>
                      <p className="mt-1 text-xs capitalize text-slate-400">
                        {assignment.beneficiaireType}
                        {assignment.beneficiaireType === 'technicien' && assignment.technicien?.email
                          ? ` · ${assignment.technicien.email}`
                          : ''}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">Affectation #{assignment.id}</p>
                    </td>
                    <td className="max-w-sm px-4 py-4">
                      <ul className="space-y-2">
                        {assignment.lignes.map((line) => (
                          <li key={line.id}>
                            <span className="font-medium text-slate-200">{line.article?.designation || 'Article'}</span>
                            <span className="ml-1 text-slate-400">
                              · {formatQuantity(line.quantite)} {line.article?.unite || ''}
                            </span>
                            {line.equipement?.numeroSerie && (
                              <span className="block text-xs text-cyan-300">
                                S/N {line.equipement.numeroSerie}
                                {assignment.statut === 'retournee' && line.equipement.etat
                                  ? ` · ${line.equipement.etat.replace('_', ' ')}`
                                  : ''}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-4 text-slate-300">
                      {[...new Set(assignment.lignes.map((line) => line.depotOrigine))].join(', ')}
                    </td>
                    <td className="px-4 py-4 text-slate-400">{formatDate(assignment.dateAttribution)}</td>
                    <td className="px-4 py-4 text-slate-300">{assignment.utilisateur?.nom || '—'}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        assignment.statut === 'en_cours'
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      }`}>
                        {assignment.statut === 'en_cours' ? 'En cours' : 'Retournée'}
                      </span>
                      {assignment.dateRetour && <p className="mt-1 text-xs text-slate-400">{formatDate(assignment.dateRetour)}</p>}
                    </td>
                    {!isTechnician && (
                      <td className="px-4 py-4 text-right">
                        {assignment.statut === 'en_cours' ? (
                          <button
                            type="button"
                            onClick={() => startReturn(assignment)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/10"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Enregistrer le retour
                          </button>
                        ) : <span className="text-xs text-slate-500">Terminé</span>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onChange={setPage} />
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/70 p-4">
          <div className="my-auto w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="font-semibold text-white">Nouvelle affectation</h2>
                <p className="mt-1 text-xs text-slate-400">Le matériel sera sorti du stock après validation.</p>
              </div>
              <button type="button" onClick={closeModal} aria-label="Fermer" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={submitAssignment} className="max-h-[80vh] space-y-5 overflow-y-auto p-5">
              {modalError && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{modalError}</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Type de bénéficiaire">
                  <select
                    className={inputClass}
                    value={form.beneficiaireType}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      beneficiaireType: event.target.value,
                      beneficiaireUserId: '',
                      beneficiaireReference: '',
                    }))}
                  >
                    <option value="technicien">Technicien</option>
                    <option value="client">Client</option>
                    <option value="site">Site</option>
                  </select>
                </Field>
                {form.beneficiaireType === 'technicien' ? (
                  <Field label="Technicien bénéficiaire">
                    <select required className={inputClass} value={form.beneficiaireUserId} onChange={(event) => setForm((current) => ({ ...current, beneficiaireUserId: event.target.value }))}>
                      <option value="">Choisir un technicien</option>
                      {technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.nom} · {technician.email}</option>)}
                    </select>
                  </Field>
                ) : (
                  <Field label={form.beneficiaireType === 'client' ? 'Nom du client' : 'Nom du site'}>
                    <input required maxLength={191} className={inputClass} value={form.beneficiaireReference} onChange={(event) => setForm((current) => ({ ...current, beneficiaireReference: event.target.value }))} placeholder={form.beneficiaireType === 'client' ? 'Ex. Société ABC' : 'Ex. Site Casablanca Centre'} />
                  </Field>
                )}
                <Field label="Dépôt de sortie">
                  <input required maxLength={160} className={inputClass} value={form.depotSource} onChange={(event) => setForm((current) => ({ ...current, depotSource: event.target.value }))} placeholder="Dépôt principal" />
                </Field>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Articles et équipements</h3>
                  <button type="button" onClick={() => setForm((current) => ({ ...current, lignes: [...current.lignes, { ...EMPTY_LINE }] }))} className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-cyan-200">
                    <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
                  </button>
                </div>
                {form.lignes.map((line, index) => {
                  const article = articleById.get(line.articleId);
                  const serialOptions = (equipmentOptions[line.articleId] || []).filter(
                    (equipment) => Number(equipment.stockActuel) > 0 &&
                      equipment.emplacement === form.depotSource.trim() &&
                      equipment.etat !== 'reforme'
                  );
                  return (
                    <div key={`assignment-line-${index}`} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 sm:grid-cols-2">
                      <Field label="Article">
                        <select required className={inputClass} value={line.articleId} onChange={(event) => void selectArticleForLine(index, event.target.value)}>
                          <option value="">Choisir un article</option>
                          {articles.map((option) => <option key={option.id} value={option.id}>{option.reference} · {option.designation}</option>)}
                        </select>
                      </Field>
                      {article?.suiviParNumeroSerie ? (
                        <Field label="Numéros de série disponibles">
                          <select
                            multiple
                            required
                            size={Math.min(Math.max(serialOptions.length, 2), 5)}
                            className={`${inputClass} min-h-24`}
                            value={line.equipementIds}
                            onChange={(event) => updateLine(index, {
                              equipementIds: Array.from(event.target.selectedOptions, (option) => option.value),
                            })}
                          >
                            {serialOptions.map((equipment) => <option key={equipment.id} value={equipment.id}>{equipment.numeroSerie} · {equipment.etat}</option>)}
                          </select>
                          <span className="mt-1 block text-[11px] text-slate-500">Sélectionnez un ou plusieurs équipements disponibles dans le dépôt indiqué.</span>
                        </Field>
                      ) : (
                        <Field label={`Quantité${article ? ` (${article.unite})` : ''}`}>
                          <input required type="number" min="0.001" step="0.001" className={inputClass} value={line.quantite} onChange={(event) => updateLine(index, { quantite: event.target.value })} />
                        </Field>
                      )}
                      {form.lignes.length > 1 && (
                        <div className="sm:col-span-2">
                          <button type="button" onClick={() => setForm((current) => ({ ...current, lignes: current.lignes.filter((_, lineIndex) => lineIndex !== index) }))} className="text-xs text-rose-300 hover:text-rose-200">Retirer cette ligne</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button type="button" onClick={closeModal} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800">Annuler</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? 'Enregistrement...' : 'Créer l’affectation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {returningAssignment && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/70 p-4">
          <div className="my-auto w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="font-semibold text-white">Enregistrer le retour</h2>
                <p className="mt-1 text-xs text-slate-400">Affectation #{returningAssignment.id} · {beneficiaryLabel(returningAssignment)}</p>
              </div>
              <button type="button" onClick={closeModal} aria-label="Fermer" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={submitReturn} className="space-y-4 p-5">
              {modalError && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{modalError}</p>}
              <p className="text-sm text-slate-300">Ce retour concerne toutes les lignes de l’affectation. Le matériel sera remis dans son dépôt d’origine.</p>
              {returningAssignment.lignes.filter((line) => line.equipementId).map((line) => (
                <Field key={line.id} label={`${line.article?.designation || 'Équipement'} · S/N ${line.equipement?.numeroSerie}`}>
                  <select
                    className={inputClass}
                    value={returnStates[line.equipementId] || 'repare'}
                    onChange={(event) => setReturnStates((current) => ({ ...current, [line.equipementId]: event.target.value }))}
                  >
                    <option value="neuf">Neuf</option>
                    <option value="repare">Réparé</option>
                    <option value="en_panne">En panne</option>
                  </select>
                </Field>
              ))}
              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button type="button" onClick={closeModal} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800">Annuler</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
                  {saving ? 'Enregistrement...' : 'Confirmer le retour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Assignments;
