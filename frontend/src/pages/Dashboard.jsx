import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  Package,
  RefreshCw,
  ShoppingCart,
  Wrench,
} from 'lucide-react';
import api from '../api/axios.js';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import { useAuth } from '../context/useAuth.js';

const EquipmentStateChart = lazy(() => import('../components/dashboard/EquipmentStateChart.jsx'));

const STATE_LABELS = {
  neuf: 'Neuf',
  en_service: 'En service',
  en_panne: 'En panne',
  repare: 'Réparé',
  reforme: 'Réformé',
};

const MOVEMENT_LABELS = {
  entree: 'Entrée',
  sortie: 'Sortie',
  retour: 'Retour',
  transfert: 'Transfert',
};

const formatQuantity = (value) => Number(value || 0).toLocaleString('fr-FR', {
  maximumFractionDigits: 3,
});

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—';

const requestDashboard = async () => {
  const { data } = await api.get('/dashboard');
  return data.data;
};

const getMovementStyle = (type) => ({
  entree: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  sortie: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  retour: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  transfert: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
}[type] || 'border-slate-700 bg-slate-800 text-slate-300');

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setDashboard(await requestDashboard());
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Impossible de charger le tableau de bord.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    requestDashboard()
      .then((data) => {
        if (active) setDashboard(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Impossible de charger le tableau de bord.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const isTechnician = user?.role === 'technicien';
  const affectations = dashboard?.affectations || [];
  const stats = dashboard?.stats;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
              RABYAS · Inventaire
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              {isTechnician ? 'Mes affectations en cours' : 'Tableau de bord'}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {isTechnician
                ? 'Consultez le matériel qui vous a été attribué.'
                : 'Vue synthétique du stock, des équipements et des mouvements.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </header>

        {error && (
          <div role="alert" className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {loading && !dashboard ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-12 text-center text-sm text-slate-400">
            Chargement du tableau de bord…
          </div>
        ) : isTechnician ? (
          <TechnicianDashboard affectations={affectations} />
        ) : (
          <ManagerDashboard dashboard={dashboard} stats={stats} />
        )}
      </div>
    </DashboardLayout>
  );
};

const TechnicianDashboard = ({ affectations }) => (
  <section className="space-y-4">
    {affectations.length === 0 ? (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-10 text-center">
        <ClipboardList className="mx-auto h-9 w-9 text-slate-500" />
        <h2 className="mt-3 font-semibold text-white">Aucune affectation en cours</h2>
        <p className="mt-1 text-sm text-slate-400">Les nouvelles affectations apparaîtront ici.</p>
      </div>
    ) : affectations.map((assignment) => (
      <article key={assignment.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">Affectation #{assignment.id}</p>
            <h2 className="mt-1 font-semibold text-white">Matériel attribué</h2>
          </div>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
            En cours
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Attribuée le {formatDate(assignment.dateAttribution)}
        </p>
        <ul className="mt-4 divide-y divide-slate-800">
          {assignment.lignes.map((line) => (
            <li key={line.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-slate-200">{line.article?.designation || 'Article'}</p>
                <p className="text-xs text-slate-400">
                  {line.article?.reference} · Dépôt d’origine : {line.depotOrigine}
                </p>
              </div>
              <div className="text-sm text-slate-300">
                {line.equipement?.numeroSerie
                  ? `N° série : ${line.equipement.numeroSerie} · ${STATE_LABELS[line.equipement.etat] || line.equipement.etat}`
                  : `${formatQuantity(line.quantite)} ${line.article?.unite || ''}`}
              </div>
            </li>
          ))}
        </ul>
      </article>
    ))}
    <Link
      to="/affectations"
      className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
    >
      Voir l’historique de mes affectations <ClipboardList className="h-4 w-4" />
    </Link>
  </section>
);

const ManagerDashboard = ({ dashboard, stats }) => {
  const stateData = dashboard?.equipmentByState || [];
  const movements = dashboard?.recentMovements || [];
  const lowStockArticles = dashboard?.lowStockArticles || [];
  const cards = [
    { label: 'Articles au catalogue', value: stats?.articleCount ?? '—', unit: 'références', icon: Package, href: '/articles', tone: 'text-cyan-300' },
    { label: 'Quantité totale en stock', value: formatQuantity(stats?.totalStock), unit: 'toutes unités confondues', icon: Boxes, href: '/articles', tone: 'text-emerald-300' },
    { label: 'Articles sous le seuil', value: stats?.lowStockCount ?? '—', unit: 'à réapprovisionner', icon: AlertTriangle, href: '/articles', tone: 'text-amber-300' },
    { label: 'Commandes à recevoir', value: stats?.pendingOrdersCount ?? '—', unit: 'envoyées ou reçues partiellement', icon: ShoppingCart, href: '/fournisseurs', tone: 'text-blue-300' },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, unit, icon: Icon, href, tone }) => (
          <Link key={label} to={href} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-slate-700 hover:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-400">{label}</span>
              <Icon className={`h-5 w-5 ${tone}`} />
            </div>
            <p className="mt-4 text-3xl font-bold text-white">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{unit}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center gap-3">
            <Wrench className="h-5 w-5 text-cyan-300" />
            <div>
              <h2 className="font-semibold text-white">Équipements par état</h2>
              <p className="text-xs text-slate-400">Répartition des équipements enregistrés</p>
            </div>
          </div>
          {stateData.length === 0 ? (
            <EmptyPanel text="Aucun équipement enregistré." />
          ) : (
            <div className="mt-4 grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(150px,0.8fr)]">
              <div className="h-56 min-w-0">
                <Suspense fallback={<div className="h-full animate-pulse rounded-full bg-slate-800/60" />}>
                  <EquipmentStateChart data={stateData} />
                </Suspense>
              </div>
              <ul className="space-y-3">
                {stateData.map((item) => (
                  <li key={item.etat} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className={`h-2.5 w-2.5 rounded-full ${{
                        neuf: 'bg-cyan-400',
                        en_service: 'bg-blue-500',
                        en_panne: 'bg-red-400',
                        repare: 'bg-emerald-400',
                        reforme: 'bg-slate-400',
                      }[item.etat] || 'bg-slate-500'}`} />
                      {STATE_LABELS[item.etat] || item.etat}
                    </span>
                    <span className="font-semibold text-white">{item.total}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-300" />
              <div>
                <h2 className="font-semibold text-white">Alertes de stock bas</h2>
                <p className="text-xs text-slate-400">Articles dont le stock est inférieur au seuil minimal</p>
              </div>
            </div>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
              {lowStockArticles.length}
            </span>
          </div>
          {lowStockArticles.length === 0 ? (
            <EmptyPanel text="Aucune alerte de stock bas." />
          ) : (
            <ul className="mt-4 max-h-64 divide-y divide-slate-800 overflow-y-auto">
              {lowStockArticles.map((article) => (
                <li key={article.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-200">{article.designation}</p>
                    <p className="text-xs text-slate-500">{article.reference}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-amber-300">
                      {formatQuantity(article.stockActuel)} {article.unite}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Seuil : {formatQuantity(article.seuilMinimum)} {article.unite}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="h-5 w-5 text-cyan-300" />
            <div>
              <h2 className="font-semibold text-white">10 derniers mouvements</h2>
              <p className="text-xs text-slate-400">Activité récente du stock</p>
            </div>
          </div>
          <Link to="/mouvements" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
            Voir tous les mouvements
          </Link>
        </div>
        {movements.length === 0 ? (
          <EmptyPanel text="Aucun mouvement enregistré." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-950/50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Article / équipement</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Quantité</th>
                  <th className="px-5 py-3">Dépôt / emplacement</th>
                  <th className="px-5 py-3">Utilisateur</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {movements.map((movement) => {
                  const Icon = movement.type === 'entree'
                    ? ArrowDownLeft
                    : movement.type === 'sortie'
                      ? ArrowUpRight
                      : RefreshCw;
                  const location = movement.depotDestination
                    || movement.depotSource
                    || movement.emplacement
                    || '—';
                  return (
                    <tr key={movement.id} className="text-slate-300">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-white">{movement.article?.designation || 'Article'}</p>
                        <p className="text-xs text-slate-500">
                          {movement.equipement?.numeroSerie
                            ? `N° série : ${movement.equipement.numeroSerie}`
                            : movement.article?.reference}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${getMovementStyle(movement.type)}`}>
                          <Icon className="h-3.5 w-3.5" />
                          {MOVEMENT_LABELS[movement.type] || movement.type}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        {formatQuantity(movement.quantite)} {movement.article?.unite}
                      </td>
                      <td className="px-5 py-3.5">{location}</td>
                      <td className="px-5 py-3.5">{movement.utilisateur?.nom || '—'}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-400">{formatDate(movement.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

const EmptyPanel = ({ text }) => (
  <p className="py-10 text-center text-sm text-slate-500">{text}</p>
);

export default Dashboard;
export { Dashboard };
