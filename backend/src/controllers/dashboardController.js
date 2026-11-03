import { col, fn, QueryTypes } from 'sequelize';
import {
  Affectation,
  Article,
  CommandeFournisseur,
  Equipement,
  LigneAffectation,
  MouvementStock,
  User,
} from '../models/index.js';

const stockExpression = `
  CASE
    WHEN m.type = 'sortie' THEN -m.quantite
    WHEN m.type = 'transfert' THEN 0
    ELSE m.quantite
  END
`;

const getInventorySummary = async () => {
  const [summary] = await Article.sequelize.query(
    `SELECT
       COUNT(*) AS articleCount,
       COALESCE(SUM(article_stock.stock), 0) AS totalStock
     FROM (
       SELECT a.id, COALESCE(SUM(${stockExpression}), 0) AS stock
       FROM catalogue_articles a
       LEFT JOIN mouvements_articles m ON m.article_id = a.id
       GROUP BY a.id
     ) AS article_stock`,
    { type: QueryTypes.SELECT }
  );
  const lowStockArticles = await Article.sequelize.query(
    `SELECT
       a.id,
       a.reference,
       a.designation,
       a.unite,
       a.seuil_minimum AS seuilMinimum,
       COALESCE(SUM(${stockExpression}), 0) AS stockActuel
     FROM catalogue_articles a
     LEFT JOIN mouvements_articles m ON m.article_id = a.id
     GROUP BY a.id, a.reference, a.designation, a.unite, a.seuil_minimum
     HAVING COALESCE(SUM(${stockExpression}), 0) < a.seuil_minimum
     ORDER BY (a.seuil_minimum - COALESCE(SUM(${stockExpression}), 0)) DESC, a.designation ASC`,
    { type: QueryTypes.SELECT }
  );

  return {
    articleCount: Number(summary.articleCount),
    totalStock: Number(Number(summary.totalStock).toFixed(3)),
    lowStockArticles: lowStockArticles.map((article) => ({
      ...article,
      seuilMinimum: Number(article.seuilMinimum),
      stockActuel: Number(Number(article.stockActuel).toFixed(3)),
    })),
  };
};

const getTechnicianDashboard = async (userId) => {
  const affectations = await Affectation.findAll({
    where: {
      beneficiaireType: 'technicien',
      beneficiaireUserId: userId,
      statut: 'en_cours',
    },
    attributes: ['id', 'beneficiaireType', 'beneficiaireReference', 'statut', 'dateAttribution'],
    include: [{
      model: LigneAffectation,
      as: 'lignes',
      attributes: ['id', 'quantite', 'depotOrigine', 'equipementId'],
      include: [
        { model: Article, as: 'article', attributes: ['id', 'reference', 'designation', 'unite'] },
        {
          model: Equipement,
          as: 'equipement',
          attributes: ['id', 'numeroSerie', 'etat'],
          required: false,
          paranoid: false,
        },
      ],
    }],
    order: [['dateAttribution', 'DESC'], ['id', 'DESC']],
  });

  return { affectations };
};

export const getDashboard = async (req, res) => {
  try {
    if (req.user.role === 'technicien') {
      return res.json({
        role: req.user.role,
        data: await getTechnicianDashboard(req.user.id),
      });
    }

    const [inventory, recentMovements, equipmentByState, pendingOrdersCount] = await Promise.all([
      getInventorySummary(),
      MouvementStock.findAll({
        limit: 10,
        order: [['created_at', 'DESC'], ['id', 'DESC']],
        include: [
          { model: Article, as: 'article', attributes: ['id', 'reference', 'designation', 'unite'] },
          {
            model: Equipement,
            as: 'equipement',
            attributes: ['id', 'numeroSerie'],
            required: false,
            paranoid: false,
          },
          { model: User, as: 'utilisateur', attributes: ['id', 'nom'], required: false },
        ],
      }),
      Equipement.findAll({
        attributes: ['etat', [fn('COUNT', col('id')), 'total']],
        group: ['etat'],
        order: [['etat', 'ASC']],
        raw: true,
      }),
      CommandeFournisseur.count({
        where: { statut: ['envoyee', 'reçue_partiellement'] },
      }),
    ]);

    return res.json({
      role: req.user.role,
      data: {
        stats: {
          articleCount: inventory.articleCount,
          totalStock: inventory.totalStock,
          lowStockCount: inventory.lowStockArticles.length,
          pendingOrdersCount,
        },
        lowStockArticles: inventory.lowStockArticles,
        recentMovements,
        equipmentByState: equipmentByState.map((item) => ({
          etat: item.etat,
          total: Number(item.total),
        })),
      },
    });
  } catch (error) {
    console.error('[DashboardController] Erreur getDashboard :', error);
    return res.status(500).json({ message: 'Erreur lors du chargement du tableau de bord.' });
  }
};

export default { getDashboard };
