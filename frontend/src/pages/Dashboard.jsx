import { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import {
  Radio,
  Boxes,
  Cpu,
  ArrowLeftRight,
  AlertTriangle,
  Plus,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  HardHat,
  ChevronRight,
} from 'lucide-react';

export const Dashboard = () => {
  const [filterType, setFilterType] = useState('all');

  // Données réalistes pour le suivi du stock télécom
  const stats = [
    {
      title: 'Total Équipements',
      value: '1,248',
      change: '+14 ce mois',
      trend: 'up',
      icon: Cpu,
      color: 'from-blue-600 to-cyan-500',
      badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      title: 'En Service sur Sites',
      value: '892',
      change: '71.5% du parc',
      trend: 'up',
      icon: Radio,
      color: 'from-cyan-500 to-teal-500',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Stock Disponible',
      value: '316',
      change: 'Magasin central',
      trend: 'neutral',
      icon: Boxes,
      color: 'from-emerald-600 to-green-500',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Alertes Réappro.',
      value: '5',
      change: 'Stock critique',
      trend: 'down',
      icon: AlertTriangle,
      color: 'from-amber-600 to-rose-500',
      badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    },
  ];

  // Derniers mouvements de stock télécom
  const recentMovements = [
    {
      id: 'MVT-2026-089',
      equipement: 'Routeur Cisco Catalyst 8300',
      ref: 'CISCO-CAT-8300',
      sn: 'FOC244192K1',
      categorie: 'Routage & Switching',
      type: 'sortie',
      typeLabel: 'Sortie Chantier',
      assigneA: 'Youssef (Technicien)',
      site: 'Site BTS Casa-Nord',
      date: "Aujourd'hui, 14:32",
      statut: 'Livré',
      statutColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    },
    {
      id: 'MVT-2026-088',
      equipement: 'Bobine Fibre 12FO Monomode 2000m',
      ref: 'FIB-G652D-2K',
      sn: 'LOT-9821-2026',
      categorie: 'Fibre & Câblage',
      type: 'sortie',
      typeLabel: 'Sortie Déploiement',
      assigneA: 'Karim (Technicien)',
      site: 'Raccordement FTTH Rabat',
      date: "Aujourd'hui, 11:15",
      statut: 'En cours',
      statutColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    },
    {
      id: 'MVT-2026-087',
      equipement: 'Antenne MIMO 5G Sectorielle 3.5GHz',
      ref: 'ANT-5G-3500-M',
      sn: 'ANT-9902-881',
      categorie: 'Radio & Antennes',
      type: 'entree',
      typeLabel: 'Entrée Stock Fournisseur',
      assigneA: 'Magasin Central',
      site: 'Entrepôt Principal',
      date: "Aujourd'hui, 09:40",
      statut: 'Réceptionné',
      statutColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    },
    {
      id: 'MVT-2026-086',
      equipement: 'Épissureuse Fibre Fujikura 90S+',
      ref: 'FUJI-90S-PLUS',
      sn: '90S-33109-K',
      categorie: 'Outillage & Mesure',
      type: 'retour',
      typeLabel: 'Retour Intervention',
      assigneA: 'Mehdi (Technicien)',
      site: 'Magasin Central',
      date: 'Hier, 17:20',
      statut: 'Contrôlé OK',
      statutColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    },
    {
      id: 'MVT-2026-085',
      equipement: 'Switch Huawei CloudEngine S5735',
      ref: 'HW-S5735-L48T',
      sn: '2102353YDF10',
      categorie: 'Routage & Switching',
      type: 'sortie',
      typeLabel: 'Sortie Déploiement',
      assigneA: 'Youssef (Technicien)',
      site: 'Datacenter Régional Fès',
      date: 'Hier, 14:05',
      statut: 'Livré',
      statutColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    },
  ];

  const filteredMovements =
    filterType === 'all'
      ? recentMovements
      : recentMovements.filter((m) => m.type === filterType);

  return (
    <DashboardLayout>
      <div className="space-y-7">
        {/* En-tête : Titre & Actions principales */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Tableau de Bord Télécom
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Temps Réel
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Supervision des actifs, flux de stocks et suivi du matériel assigné aux techniciens
            </p>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              type="button"
              className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Exporter</span>
            </button>

            <button
              type="button"
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Mouvement</span>
            </button>
          </div>
        </div>

        {/* Bannière d'alerte Stock Critique */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 flex items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center space-x-3.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-white">
                Seuil de Stock d'Alerte Atteint (3 références)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Bobines Fibre 12FO, Connecteurs Optiques SC/APC et Répéteurs 4G ont atteint le stock minimum de sécurité.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="shrink-0 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors"
          >
            Voir les alertes
          </button>
        </div>

        {/* 4 Cartes d'indicateurs clés (KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">
                    {card.title}
                  </span>
                  <div
                    className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${card.color} flex items-center justify-center text-white shadow-md shadow-cyan-500/10 group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-3 flex items-baseline space-x-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {card.value}
                  </span>
                </div>

                <div className="mt-2.5 flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${card.badgeColor}`}
                  >
                    {card.change}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Section Grille : Table des Mouvements + Widgets latéraux */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne 1 & 2 : Tableau des Mouvements Récents */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
            {/* Header de la table avec filtres */}
            <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-950/40">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Mouvements de Stock Récents
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Traçabilité en direct des entrées, sorties et réceptions
                  </p>
                </div>
              </div>

              {/* Boutons de filtrage */}
              <div className="flex items-center space-x-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    filterType === 'all'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setFilterType('sortie')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    filterType === 'sortie'
                      ? 'bg-amber-500/20 text-amber-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sorties
                </button>
                <button
                  onClick={() => setFilterType('entree')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    filterType === 'entree'
                      ? 'bg-blue-500/20 text-blue-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Entrées
                </button>
                <button
                  onClick={() => setFilterType('retour')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    filterType === 'retour'
                      ? 'bg-purple-500/20 text-purple-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Retours
                </button>
              </div>
            </div>

            {/* Table des mouvements */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800/80">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Équipement & Réf</th>
                    <th className="py-3 px-4 font-semibold">Mouvement</th>
                    <th className="py-3 px-4 font-semibold">Technicien / Site</th>
                    <th className="py-3 px-4 font-semibold">Date</th>
                    <th className="py-3 px-4 font-semibold text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredMovements.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {item.equipement}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          S/N : {item.sn} • {item.ref}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          {item.type === 'sortie' ? (
                            <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          ) : item.type === 'entree' ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          )}
                          <span className="font-medium text-slate-200">
                            {item.typeLabel}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {item.categorie}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">
                          {item.assigneA}
                        </div>
                        <div className="text-[11px] text-cyan-400/90 truncate max-w-[160px]">
                          {item.site}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                        {item.date}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${item.statutColor}`}
                        >
                          {item.statut}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pied de tableau */}
            <div className="p-3 bg-slate-950/60 border-t border-slate-800 text-center">
              <button
                type="button"
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center space-x-1"
              >
                <span>Consulter l'historique complet des mouvements</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Colonne 3 : Widgets latéraux (Répartition Stock & Techniciens Actifs) */}
          <div className="space-y-6">
            {/* Widget Répartition du Stock Télécom */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Boxes className="w-4 h-4 text-cyan-400" />
                  <span>Répartition du Stock</span>
                </h3>
                <span className="text-[11px] text-slate-400">Par Catégorie</span>
              </div>

              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Fibre & Câblage Optique</span>
                    <span className="font-semibold text-cyan-400">38%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full w-[38%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Routeurs & Switches</span>
                    <span className="font-semibold text-blue-400">28%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full w-[28%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Antennes & Radio 4G/5G</span>
                    <span className="font-semibold text-emerald-400">20%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[20%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Outillage & Épissureuses</span>
                    <span className="font-semibold text-purple-400">14%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full w-[14%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Widget Techniciens Déployés sur le Terrain */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <HardHat className="w-4 h-4 text-amber-400" />
                  <span>Techniciens en Mission</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  3 Actifs
                </span>
              </div>

              <div className="space-y-3 divide-y divide-slate-800/60">
                <div className="pt-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-bold text-xs">
                      Y
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Youssef B.</div>
                      <div className="text-[10px] text-slate-400">Site BTS Casa-Nord</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                    4 matériels
                  </span>
                </div>

                <div className="pt-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs">
                      M
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Mehdi S.</div>
                      <div className="text-[10px] text-slate-400">FTTH Rabat Agdal</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                    7 matériels
                  </span>
                </div>

                <div className="pt-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs">
                      K
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Karim T.</div>
                      <div className="text-[10px] text-slate-400">Liaison Fès Centre</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                    3 matériels
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
