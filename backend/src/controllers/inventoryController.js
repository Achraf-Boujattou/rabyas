import { literal, Op, QueryTypes } from 'sequelize';
import {
  Article,
  Equipement,
  MouvementStock,
  User,
} from '../models/index.js';
import { ARTICLE_CATEGORIES } from '../models/Article.js';
import { EQUIPMENT_STATES } from '../models/Equipement.js';
import { STOCK_MOVEMENT_TYPES } from '../models/MouvementStock.js';

const parsePagination = (query) => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 10);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return null;
  }
  return { page, limit, offset: (page - 1) * limit };
};

const parseBoolean = (value) => {
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return null;
};

const depotStockForArticle = async (articleId, depot, transaction) => {
  const [result] = await Article.sequelize.query(
    `SELECT
       SUM(
         CASE
           WHEN type IN ('sortie', 'transfert')
             AND COALESCE(depot_source, emplacement, 'Dépôt principal') = :depot
           THEN -quantite ELSE 0
         END
         +
         CASE
           WHEN type IN ('entree', 'retour', 'transfert')
             AND COALESCE(depot_destination, CASE WHEN type IN ('entree', 'retour') THEN emplacement END, 'Dépôt principal') = :depot
           THEN quantite ELSE 0
         END
       ) AS stock
     FROM mouvements_articles
     WHERE article_id = :articleId`,
    {
      replacements: { articleId, depot },
      type: QueryTypes.SELECT,
      transaction,
    }
  );
  return Number(result?.stock || 0);
};

const equipmentStockFromMovements = async (equipmentId, transaction) => {
  const result = await MouvementStock.findOne({
    where: { equipementId: equipmentId },
    attributes: [[
      literal(
        "SUM(CASE WHEN `type` = 'sortie' THEN -`quantite` WHEN `type` = 'transfert' THEN 0 ELSE `quantite` END)"
      ),
      'stock',
    ]],
    raw: true,
    transaction,
  });
  return Number(result?.stock || 0);
};

const getStockByArticleIds = async (articleIds) => {
  const stock = new Map(articleIds.map((id) => [id, 0]));
  if (!articleIds.length) return stock;

  const movements = await MouvementStock.findAll({
    where: { articleId: { [Op.in]: articleIds } },
    attributes: [
      'articleId',
      [
        literal(
          "SUM(CASE WHEN `type` = 'sortie' THEN -`quantite` WHEN `type` = 'transfert' THEN 0 ELSE `quantite` END)"
        ),
        'stock',
      ],
    ],
    group: ['articleId'],
    raw: true,
  });

  for (const movement of movements) {
    stock.set(movement.articleId, Number(movement.stock || 0));
  }

  return stock;
};

const attachStock = async (articles) => {
  const stock = await getStockByArticleIds(articles.map((article) => article.id));
  return articles.map((article) => {
    const values = article.toJSON();
    values.stockActuel = Number((stock.get(article.id) || 0).toFixed(3));
    values.stockBas = values.stockActuel < Number(values.seuilMinimum);
    return values;
  });
};

const attachEquipmentStock = async (equipments) => {
  const stock = new Map(equipments.map((equipment) => [equipment.id, 0]));
  if (!equipments.length) return equipments;
  const movements = await MouvementStock.findAll({
    where: { equipementId: { [Op.in]: equipments.map((equipment) => equipment.id) } },
    attributes: [
      'equipementId',
      [
        literal(
          "SUM(CASE WHEN `type` = 'sortie' THEN -`quantite` WHEN `type` = 'transfert' THEN 0 ELSE `quantite` END)"
        ),
        'stock',
      ],
    ],
    group: ['equipementId'],
    raw: true,
  });
  for (const movement of movements) {
    stock.set(movement.equipementId, Number(movement.stock || 0));
  }
  return equipments.map((equipment) => {
    const values = equipment.toJSON();
    values.stockActuel = Number((stock.get(equipment.id) || 0).toFixed(3));
    return values;
  });
};

const validationError = (res, error) => {
  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      message: error.errors.map((item) => item.message).join(', '),
    });
  }
  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      message: error.errors.map((item) => item.message).join(', '),
    });
  }
  return null;
};

export const getArticles = async (req, res) => {
  const pagination = parsePagination(req.query);
  if (!pagination) {
    return res.status(400).json({ message: 'Pagination invalide (limite maximale : 100)' });
  }

  const { search, categorie } = req.query;
  if (categorie && !ARTICLE_CATEGORIES.includes(categorie)) {
    return res.status(400).json({ message: 'Catégorie invalide' });
  }

  const where = {};
  if (categorie) where.categorie = categorie;
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    where[Op.or] = [
      { reference: { [Op.like]: term } },
      { designation: { [Op.like]: term } },
      { marque: { [Op.like]: term } },
    ];
  }

  try {
    const result = await Article.findAndCountAll({
      where,
      order: [['designation', 'ASC']],
      limit: pagination.limit,
      offset: pagination.offset,
    });
    const data = await attachStock(result.rows);
    return res.json({
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: result.count,
        pages: Math.ceil(result.count / pagination.limit),
      },
    });
  } catch (error) {
    console.error('[InventoryController] Erreur getArticles :', error);
    return res.status(500).json({ message: 'Erreur lors du chargement du catalogue' });
  }
};

export const getArticleById = async (req, res) => {
  try {
    const article = await Article.findByPk(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article introuvable' });
    const [data] = await attachStock([article]);
    return res.json({ data });
  } catch (error) {
    console.error('[InventoryController] Erreur getArticleById :', error);
    return res.status(500).json({ message: 'Erreur lors du chargement de l’article' });
  }
};

export const getArticleStock = async (req, res) => {
  const pagination = parsePagination(req.query);
  if (!pagination) {
    return res.status(400).json({ message: 'Pagination invalide (limite maximale : 100)' });
  }
  try {
    const result = await Article.findAndCountAll({
      order: [['designation', 'ASC']],
      limit: pagination.limit,
      offset: pagination.offset,
    });
    const data = await attachStock(result.rows);
    return res.json({
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: result.count,
        pages: Math.ceil(result.count / pagination.limit),
      },
    });
  } catch (error) {
    console.error('[InventoryController] Erreur getArticleStock :', error);
    return res.status(500).json({ message: 'Erreur lors du calcul des stocks' });
  }
};

export const getLowStockArticles = async (req, res) => {
  const pagination = parsePagination(req.query);
  if (!pagination) {
    return res.status(400).json({ message: 'Pagination invalide (limite maximale : 100)' });
  }
  try {
    const articles = await Article.findAll({ order: [['designation', 'ASC']] });
    const withStock = await attachStock(articles);
    const lowStock = withStock.filter((article) => article.stockBas);
    const data = lowStock.slice(pagination.offset, pagination.offset + pagination.limit);
    return res.json({
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: lowStock.length,
        pages: Math.ceil(lowStock.length / pagination.limit),
      },
    });
  } catch (error) {
    console.error('[InventoryController] Erreur getLowStockArticles :', error);
    return res.status(500).json({ message: 'Erreur lors du calcul des alertes de stock' });
  }
};

export const createArticle = async (req, res) => {
  const { reference, designation, categorie, marque, unite, seuilMinimum, suiviParNumeroSerie } = req.body;
  const serialTracking = parseBoolean(suiviParNumeroSerie);
  if (serialTracking === null) {
    return res.status(400).json({ message: 'Indiquez si l’article est suivi par numéro de série' });
  }
  try {
    const article = await Article.create({
      reference,
      designation,
      categorie,
      marque,
      unite,
      seuilMinimum,
      suiviParNumeroSerie: serialTracking,
    });
    return res.status(201).json({
      message: 'Article créé. Le stock sera alimenté par les mouvements d’entrée.',
      data: { ...article.toJSON(), stockActuel: 0, stockBas: 0 < Number(article.seuilMinimum) },
    });
  } catch (error) {
    const response = validationError(res, error);
    if (response) return response;
    console.error('[InventoryController] Erreur createArticle :', error);
    return res.status(500).json({ message: 'Erreur lors de la création de l’article' });
  }
};

export const updateArticle = async (req, res) => {
  try {
    const article = await Article.findByPk(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article introuvable' });

    if (req.body.suiviParNumeroSerie !== undefined) {
      const tracking = parseBoolean(req.body.suiviParNumeroSerie);
      if (tracking === null) {
        return res.status(400).json({ message: 'Valeur de suivi par numéro de série invalide' });
      }
      if (tracking !== article.suiviParNumeroSerie) {
        const [equipmentCount, movementCount] = await Promise.all([
          Equipement.count({ where: { articleId: article.id } }),
          MouvementStock.count({ where: { articleId: article.id } }),
        ]);
        if (equipmentCount || movementCount) {
          return res.status(409).json({
            message: 'Le suivi par numéro de série ne peut pas être modifié après le premier mouvement ou équipement.',
          });
        }
      }
      article.suiviParNumeroSerie = tracking;
    }

    for (const field of ['reference', 'designation', 'categorie', 'marque', 'unite', 'seuilMinimum']) {
      if (req.body[field] !== undefined) article[field] = req.body[field];
    }
    await article.save();
    const [withStock] = await attachStock([article]);
    return res.json({ message: 'Article mis à jour', data: withStock });
  } catch (error) {
    const response = validationError(res, error);
    if (response) return response;
    console.error('[InventoryController] Erreur updateArticle :', error);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour de l’article' });
  }
};

export const deleteArticle = async (req, res) => {
  try {
    const article = await Article.findByPk(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article introuvable' });
    const [equipmentCount, movementCount] = await Promise.all([
      Equipement.count({ where: { articleId: article.id } }),
      MouvementStock.count({ where: { articleId: article.id } }),
    ]);
    if (equipmentCount || movementCount) {
      return res.status(409).json({
        message: 'Cet article est lié à des équipements ou à un historique de stock et ne peut pas être supprimé.',
      });
    }
    await article.destroy();
    return res.json({ message: 'Article supprimé' });
  } catch (error) {
    console.error('[InventoryController] Erreur deleteArticle :', error);
    return res.status(500).json({ message: 'Erreur lors de la suppression de l’article' });
  }
};

export const getEquipements = async (req, res) => {
  const pagination = parsePagination(req.query);
  if (!pagination) {
    return res.status(400).json({ message: 'Pagination invalide (limite maximale : 100)' });
  }
  const { search, etat, categorie, articleId } = req.query;
  if (etat && !EQUIPMENT_STATES.includes(etat)) {
    return res.status(400).json({ message: 'État d’équipement invalide' });
  }
  if (categorie && !ARTICLE_CATEGORIES.includes(categorie)) {
    return res.status(400).json({ message: 'Catégorie invalide' });
  }

  const where = {};
  const articleWhere = {};
  if (articleId) where.articleId = articleId;
  if (etat) where.etat = etat;
  if (categorie) articleWhere.categorie = categorie;
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    where[Op.or] = [
      { numeroSerie: { [Op.like]: term } },
      { emplacement: { [Op.like]: term } },
      { '$article.reference$': { [Op.like]: term } },
      { '$article.designation$': { [Op.like]: term } },
      { '$article.marque$': { [Op.like]: term } },
    ];
  }
  try {
    const result = await Equipement.findAndCountAll({
      where,
      include: [{ model: Article, as: 'article', where: articleWhere, required: Object.keys(articleWhere).length > 0 }],
      order: [['created_at', 'DESC']],
      limit: pagination.limit,
      offset: pagination.offset,
      distinct: true,
    });
    const data = await attachEquipmentStock(result.rows);
    return res.json({
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: result.count,
        pages: Math.ceil(result.count / pagination.limit),
      },
    });
  } catch (error) {
    console.error('[InventoryController] Erreur getEquipements :', error);
    return res.status(500).json({ message: 'Erreur lors du chargement des équipements' });
  }
};

export const getEquipementById = async (req, res) => {
  try {
    const equipment = await Equipement.findByPk(req.params.id, {
      include: [{ model: Article, as: 'article' }],
    });
    if (!equipment) return res.status(404).json({ message: 'Équipement introuvable' });
    const [data] = await attachEquipmentStock([equipment]);
    return res.json({ data });
  } catch (error) {
    console.error('[InventoryController] Erreur getEquipementById :', error);
    return res.status(500).json({ message: 'Erreur lors du chargement de l’équipement' });
  }
};

export const createEquipement = async (req, res) => {
  const { articleId, numeroSerie, etat = 'neuf', emplacement } = req.body;
  if (!['neuf', 'repare', 'en_panne'].includes(etat)) {
    return res.status(400).json({
      message: 'Un nouvel équipement en stock doit être neuf, réparé ou en panne.',
    });
  }
  const transaction = await Article.sequelize.transaction();
  try {
    const article = await Article.findByPk(articleId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!article) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Article introuvable' });
    }
    if (!article.suiviParNumeroSerie) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Cet article ne suit pas les numéros de série' });
    }
    const equipment = await Equipement.create(
      { articleId: article.id, numeroSerie, etat, emplacement },
      { transaction }
    );
    await MouvementStock.create(
      {
        articleId: article.id,
        equipementId: equipment.id,
        type: 'entree',
        quantite: 1,
        emplacement: equipment.emplacement,
        depotDestination: equipment.emplacement,
        utilisateurId: req.user.id,
        etatAvant: equipment.etat,
        emplacementAvant: equipment.emplacement,
        commentaire: 'Entrée initiale lors de la création de l’équipement',
      },
      { transaction }
    );
    const created = await Equipement.findByPk(equipment.id, {
      include: [{ model: Article, as: 'article' }],
      transaction,
    });
    await transaction.commit();
    return res.status(201).json({ message: 'Équipement créé et ajouté au stock', data: created });
  } catch (error) {
    await transaction.rollback();
    const response = validationError(res, error);
    if (response) return response;
    console.error('[InventoryController] Erreur createEquipement :', error);
    return res.status(500).json({ message: 'Erreur lors de la création de l’équipement' });
  }
};

export const updateEquipement = async (req, res) => {
  const transaction = await Article.sequelize.transaction();
  try {
    const currentEquipment = await Equipement.findByPk(req.params.id);
    if (!currentEquipment) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Équipement introuvable' });
    }
    const article = await Article.findByPk(currentEquipment.articleId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!article) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Article associé introuvable' });
    }
    const equipment = await Equipement.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!equipment) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Équipement introuvable' });
    }

    if (req.body.articleId !== undefined && Number(req.body.articleId) !== equipment.articleId) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Un équipement ne peut pas être rattaché à un autre article' });
    }
    if (req.body.etat === 'reforme' && equipment.etat !== 'reforme') {
      await transaction.rollback();
      return res.status(400).json({
        message: 'Pour réformer un équipement, enregistrez un mouvement de sortie avec l’état « réformé ».',
      });
    }
    if (req.body.etat !== undefined && req.body.etat !== equipment.etat) {
      if (!EQUIPMENT_STATES.includes(req.body.etat)) {
        await transaction.rollback();
        return res.status(400).json({ message: 'État d’équipement invalide' });
      }
      const equipmentStock = await equipmentStockFromMovements(equipment.id, transaction);
      const becomesUnavailable = ['en_service', 'reforme'].includes(req.body.etat);
      const becomesAvailable = ['neuf', 'repare', 'en_panne'].includes(req.body.etat);
      if (equipment.etat === 'reforme') {
        await transaction.rollback();
        return res.status(409).json({ message: 'Un équipement réformé ne peut pas être réactivé.' });
      }
      if (equipmentStock > 0 && becomesUnavailable) {
        await MouvementStock.create(
          {
            articleId: equipment.articleId,
            equipementId: equipment.id,
            type: 'sortie',
            quantite: 1,
            emplacement: req.body.emplacement ?? equipment.emplacement,
            depotSource: equipment.emplacement,
            utilisateurId: req.user.id,
            etatAvant: equipment.etat,
            emplacementAvant: equipment.emplacement,
            commentaire: `Sortie automatique lors du changement d’état vers ${req.body.etat}`,
          },
          { transaction }
        );
      } else if (equipmentStock <= 0 && becomesAvailable) {
        await MouvementStock.create(
          {
            articleId: equipment.articleId,
            equipementId: equipment.id,
            type: 'retour',
            quantite: 1,
            emplacement: req.body.emplacement ?? equipment.emplacement,
            depotDestination: req.body.emplacement ?? equipment.emplacement,
            utilisateurId: req.user.id,
            etatAvant: equipment.etat,
            emplacementAvant: equipment.emplacement,
            commentaire: `Retour automatique lors du changement d’état vers ${req.body.etat}`,
          },
          { transaction }
        );
      }
    }
    for (const field of ['numeroSerie', 'etat', 'emplacement']) {
      if (req.body[field] !== undefined) equipment[field] = req.body[field];
    }
    await equipment.save({ transaction });
    await equipment.reload({
      include: [{ model: Article, as: 'article' }],
      transaction,
    });
    await transaction.commit();
    return res.json({ message: 'Équipement mis à jour', data: equipment });
  } catch (error) {
    await transaction.rollback();
    const response = validationError(res, error);
    if (response) return response;
    console.error('[InventoryController] Erreur updateEquipement :', error);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour de l’équipement' });
  }
};

export const deleteEquipement = async (req, res) => {
  const transaction = await Article.sequelize.transaction();
  try {
    const currentEquipment = await Equipement.findByPk(req.params.id);
    if (!currentEquipment) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Équipement introuvable' });
    }
    const article = await Article.findByPk(currentEquipment.articleId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!article) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Article associé introuvable' });
    }
    const equipment = await Equipement.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!equipment) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Équipement introuvable' });
    }
    const equipmentStock = await equipmentStockFromMovements(equipment.id, transaction);
    if (equipmentStock > 0) {
      await MouvementStock.create(
        {
          articleId: equipment.articleId,
          equipementId: equipment.id,
          type: 'sortie',
          quantite: 1,
          emplacement: equipment.emplacement,
          depotSource: equipment.emplacement,
          utilisateurId: req.user.id,
          etatAvant: equipment.etat,
          emplacementAvant: equipment.emplacement,
          commentaire: 'Sortie automatique lors de l’archivage de l’équipement',
        },
        { transaction }
      );
      equipment.etat = 'reforme';
      await equipment.save({ transaction });
    }
    await equipment.destroy({ transaction });
    await transaction.commit();
    return res.json({ message: 'Équipement supprimé' });
  } catch (error) {
    await transaction.rollback();
    console.error('[InventoryController] Erreur deleteEquipement :', error);
    return res.status(500).json({ message: 'Erreur lors de la suppression de l’équipement' });
  }
};

export const getMouvements = async (req, res) => {
  const pagination = parsePagination(req.query);
  if (!pagination) {
    return res.status(400).json({ message: 'Pagination invalide (limite maximale : 100)' });
  }
  const where = {};
  if (req.query.articleId) {
    const articleId = Number(req.query.articleId);
    if (!Number.isInteger(articleId) || articleId < 1) {
      return res.status(400).json({ message: 'Article invalide' });
    }
    where.articleId = articleId;
  }
  if (req.query.type) {
    if (!STOCK_MOVEMENT_TYPES.includes(req.query.type)) {
      return res.status(400).json({ message: 'Type de mouvement invalide' });
    }
    where.type = req.query.type;
  }
  if (req.query.depot?.trim()) {
    const depot = req.query.depot.trim();
    where[Op.or] = [
      { depotSource: { [Op.like]: `%${depot}%` } },
      { depotDestination: { [Op.like]: `%${depot}%` } },
      { emplacement: { [Op.like]: `%${depot}%` } },
    ];
  }
  if (req.query.date) {
    if (typeof req.query.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
      return res.status(400).json({ message: 'Date invalide (format attendu : AAAA-MM-JJ)' });
    }
    const [, year, month, day] = req.query.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const start = new Date(Number(year), Number(month) - 1, Number(day));
    if (
      Number.isNaN(start.getTime()) ||
      start.getFullYear() !== Number(year) ||
      start.getMonth() !== Number(month) - 1 ||
      start.getDate() !== Number(day)
    ) {
      return res.status(400).json({ message: 'Date invalide' });
    }
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    where.createdAt = { [Op.gte]: start, [Op.lt]: end };
  }
  try {
    const result = await MouvementStock.findAndCountAll({
      where,
      include: [
        { model: Article, as: 'article', attributes: ['id', 'reference', 'designation', 'unite'] },
        { model: Equipement, as: 'equipement', attributes: ['id', 'numeroSerie'], required: false, paranoid: false },
        { model: User, as: 'utilisateur', attributes: ['id', 'nom'], required: false },
        { model: MouvementStock, as: 'annulation', attributes: ['id'], required: false },
      ],
      order: [['created_at', 'DESC']],
      limit: pagination.limit,
      offset: pagination.offset,
    });
    return res.json({
      data: result.rows,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: result.count,
        pages: Math.ceil(result.count / pagination.limit),
      },
    });
  } catch (error) {
    console.error('[InventoryController] Erreur getMouvements :', error);
    return res.status(500).json({ message: 'Erreur lors du chargement des mouvements' });
  }
};

export const createMouvement = async (req, res) => {
  const {
    articleId,
    equipementId,
    type,
    quantite,
    commentaire,
    emplacement,
    depotSource: requestedSource,
    depotDestination: requestedDestination,
    motif,
    etatRetour,
    etatSortie,
    etatEntree,
  } = req.body;
  const quantity = Number(quantite);
  if (!STOCK_MOVEMENT_TYPES.includes(type)) {
    return res.status(400).json({ message: 'Type de mouvement invalide' });
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return res.status(400).json({ message: 'La quantité doit être supérieure à zéro' });
  }
  if (quantity > 999999999.999) {
    return res.status(400).json({ message: 'La quantité dépasse la limite autorisée' });
  }
  const parsedArticleId = Number(articleId);
  if (!Number.isInteger(parsedArticleId) || parsedArticleId < 1) {
    return res.status(400).json({ message: 'Article invalide' });
  }
  if (equipementId !== undefined && (!Number.isInteger(Number(equipementId)) || Number(equipementId) < 1)) {
    return res.status(400).json({ message: 'Équipement invalide' });
  }
  if (
    (requestedSource !== undefined && (typeof requestedSource !== 'string' || !requestedSource.trim())) ||
    (requestedDestination !== undefined && (typeof requestedDestination !== 'string' || !requestedDestination.trim()))
  ) {
    return res.status(400).json({ message: 'Les dépôts renseignés ne peuvent pas être vides' });
  }
  const depotSource = (
    typeof requestedSource === 'string' && requestedSource.trim()
      ? requestedSource.trim()
      : type === 'transfert' && typeof emplacement === 'string' && emplacement.trim()
        ? emplacement.trim()
        : null
  );
  const depotDestination = (
    typeof requestedDestination === 'string' && requestedDestination.trim()
      ? requestedDestination.trim()
      : ['entree', 'retour'].includes(type) && typeof emplacement === 'string' && emplacement.trim()
        ? emplacement.trim()
        : type === 'sortie' && typeof emplacement === 'string' && emplacement.trim()
          ? emplacement.trim()
          : null
  );
  for (const depot of [depotSource, depotDestination]) {
    if (depot !== null && depot.length > 160) {
      return res.status(400).json({ message: 'Un dépôt ne peut pas dépasser 160 caractères' });
    }
  }
  if (type === 'transfert' && (!depotSource || !depotDestination)) {
    return res.status(400).json({ message: 'Un transfert doit préciser le dépôt source et le dépôt destination' });
  }
  if (type === 'transfert' && depotSource === depotDestination) {
    return res.status(400).json({ message: 'Les dépôts source et destination doivent être différents' });
  }

  const transaction = await Article.sequelize.transaction();
  try {
    const article = await Article.findByPk(parsedArticleId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!article) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Article introuvable' });
    }
    if (Math.round(quantity * 1000) / 1000 !== quantity) {
      await transaction.rollback();
      return res.status(400).json({ message: 'La quantité doit respecter une précision maximale de trois décimales' });
    }

    let equipment = null;
    let movementSource = depotSource;
    let etatAvant = null;
    let emplacementAvant = null;
    if (article.suiviParNumeroSerie) {
      if (!equipementId || quantity !== 1) {
        await transaction.rollback();
        return res.status(400).json({
          message: 'Les articles sérialisés nécessitent un équipement et une quantité égale à 1',
        });
      }
      equipment = await Equipement.findByPk(equipementId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!equipment || equipment.articleId !== article.id) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Équipement invalide pour cet article' });
      }
      etatAvant = equipment.etat;
      emplacementAvant = equipment.emplacement;
      const equipmentStock = await equipmentStockFromMovements(equipment.id, transaction);
      if (['sortie', 'transfert'].includes(type) && equipmentStock < 1) {
        await transaction.rollback();
        return res.status(409).json({ message: 'Cet équipement n’est pas disponible en stock' });
      }
      if ((type === 'entree' || type === 'retour') && equipmentStock > 0) {
        await transaction.rollback();
        return res.status(409).json({ message: 'Cet équipement est déjà présent en stock' });
      }
      if (equipment.etat === 'reforme') {
        await transaction.rollback();
        return res.status(409).json({ message: 'Un équipement réformé ne peut plus être mouvementé' });
      }
      if (['sortie', 'transfert'].includes(type) && depotSource && equipment.emplacement !== depotSource) {
        await transaction.rollback();
        return res.status(409).json({
          message: `Cet équipement se trouve à « ${equipment.emplacement} », pas dans le dépôt source « ${depotSource} »`,
        });
      }
      if (['sortie', 'transfert'].includes(type)) movementSource = equipment.emplacement;
      if (type === 'sortie') {
        if (etatSortie !== undefined && !['en_service', 'reforme'].includes(etatSortie)) {
          await transaction.rollback();
          return res.status(400).json({ message: 'État de sortie invalide' });
        }
        equipment.etat = etatSortie || 'en_service';
        if (depotDestination) equipment.emplacement = depotDestination;
      } else if (type === 'transfert') {
        equipment.emplacement = depotDestination;
      } else {
        if (type === 'entree' && etatEntree !== undefined && !['neuf', 'en_panne', 'repare'].includes(etatEntree)) {
          await transaction.rollback();
          return res.status(400).json({ message: 'État d’entrée invalide' });
        }
        if (type === 'retour' && !['neuf', 'en_panne', 'repare'].includes(etatRetour)) {
          await transaction.rollback();
          return res.status(400).json({ message: 'Indiquez un état valide pour l’équipement retourné' });
        }
        equipment.etat = type === 'retour' ? etatRetour : (etatEntree || 'neuf');
        equipment.emplacement = depotDestination || equipment.emplacement;
      }
      await equipment.save({ transaction });
    } else {
      if (equipementId) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Cet article ne suit pas les numéros de série' });
      }
      if (['sortie', 'transfert'].includes(type)) {
        movementSource ||= 'Dépôt principal';
        const sourceStock = await depotStockForArticle(
          article.id,
          movementSource,
          transaction
        );
        if (quantity > sourceStock) {
          await transaction.rollback();
          return res.status(409).json({
            message: `Stock insuffisant dans le dépôt source. Disponible : ${Math.max(sourceStock, 0)} ${article.unite}`,
          });
        }
      }
    }

    const legacyLocation = depotDestination || movementSource || (
      typeof emplacement === 'string' && emplacement.trim()
        ? emplacement.trim()
        : 'Dépôt principal'
    );
    const movement = await MouvementStock.create(
      {
        articleId: article.id,
        equipementId: equipment?.id || null,
        type,
        quantite: quantity,
        emplacement: legacyLocation,
        depotSource: movementSource,
        depotDestination,
        utilisateurId: req.user.id,
        etatAvant,
        emplacementAvant,
        commentaire: typeof motif === 'string'
          ? motif.trim()
          : typeof commentaire === 'string'
            ? commentaire.trim()
            : '',
      },
      { transaction }
    );
    await transaction.commit();
    return res.status(201).json({
      message: 'Mouvement enregistré',
      data: movement,
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    const response = validationError(res, error);
    if (response) return response;
    console.error('[InventoryController] Erreur createMouvement :', error);
    return res.status(500).json({ message: 'Erreur lors de l’enregistrement du mouvement' });
  }
};

export const cancelMouvement = async (req, res) => {
  const transaction = await Article.sequelize.transaction();
  try {
    const original = await MouvementStock.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!original) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Mouvement introuvable' });
    }
    if (original.mouvementInverseDeId) {
      await transaction.rollback();
      return res.status(409).json({ message: 'Un mouvement inverse ne peut pas être annulé directement' });
    }
    const existingInverse = await MouvementStock.findOne({
      where: { mouvementInverseDeId: original.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (existingInverse) {
      await transaction.rollback();
      return res.status(409).json({ message: 'Ce mouvement a déjà été annulé' });
    }

    const article = await Article.findByPk(original.articleId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!article) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Article associé introuvable' });
    }

    let inverseType;
    let depotSource = null;
    let depotDestination = null;
    const originalSource = original.depotSource || (
      ['sortie', 'transfert'].includes(original.type)
        ? original.emplacement || 'Dépôt principal'
        : null
    );
    const originalDestination = original.depotDestination || (
      ['entree', 'retour'].includes(original.type)
        ? original.emplacement || 'Dépôt principal'
        : null
    );
    if (original.type === 'transfert') {
      inverseType = 'transfert';
      depotSource = originalDestination;
      depotDestination = originalSource;
    } else if (original.type === 'entree' || original.type === 'retour') {
      inverseType = 'sortie';
      depotSource = originalDestination || 'Dépôt principal';
    } else {
      inverseType = 'entree';
      depotDestination = originalSource || 'Dépôt principal';
    }

    let equipment = null;
    let etatAvant = null;
    let emplacementAvant = null;
    if (article.suiviParNumeroSerie) {
      if (!original.equipementId) {
        await transaction.rollback();
        return res.status(409).json({ message: 'Ce mouvement sérialisé ne contient pas de numéro de série à annuler' });
      }
      equipment = await Equipement.findByPk(original.equipementId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
        paranoid: false,
      });
      if (!equipment) {
        await transaction.rollback();
        return res.status(409).json({ message: 'L’équipement associé à ce mouvement est introuvable' });
      }
      if (equipment.deletedAt) {
        await transaction.rollback();
        return res.status(409).json({ message: 'Cet équipement est archivé ; son mouvement ne peut pas être annulé ici' });
      }
      etatAvant = equipment.etat;
      emplacementAvant = equipment.emplacement;
      const equipmentStock = await equipmentStockFromMovements(equipment.id, transaction);
      if (['sortie', 'transfert'].includes(inverseType) && equipmentStock < 1) {
        await transaction.rollback();
        return res.status(409).json({ message: 'Annulation impossible : cet équipement n’est plus disponible en stock' });
      }
      if (inverseType === 'entree' && equipmentStock > 0) {
        await transaction.rollback();
        return res.status(409).json({ message: 'Annulation impossible : cet équipement est déjà en stock' });
      }
      if (
        ['sortie', 'transfert'].includes(inverseType) &&
        depotSource &&
        equipment.emplacement !== depotSource
      ) {
        await transaction.rollback();
        return res.status(409).json({
          message: `Annulation impossible : l’équipement n’est plus dans le dépôt « ${depotSource} »`,
        });
      }
      equipment.etat = original.etatAvant || (
        inverseType === 'entree' ? 'neuf' : equipment.etat
      );
      equipment.emplacement = original.emplacementAvant || (
        inverseType === 'transfert'
          ? depotDestination
          : depotSource || depotDestination || equipment.emplacement
      );
      await equipment.save({ transaction });
    } else if (['sortie', 'transfert'].includes(inverseType)) {
      const available = await depotStockForArticle(
        article.id,
        depotSource || 'Dépôt principal',
        transaction
      );
      if (Number(original.quantite) > available) {
        await transaction.rollback();
        return res.status(409).json({
          message: `Annulation impossible : stock insuffisant dans le dépôt source. Disponible : ${Math.max(available, 0)} ${article.unite}`,
        });
      }
    }

    const inverse = await MouvementStock.create({
      articleId: article.id,
      equipementId: equipment?.id || null,
      type: inverseType,
      quantite: original.quantite,
      emplacement: depotDestination || depotSource || original.emplacement || 'Dépôt principal',
      depotSource,
      depotDestination,
      utilisateurId: req.user.id,
      mouvementInverseDeId: original.id,
      etatAvant,
      emplacementAvant,
      commentaire: `Annulation du mouvement #${original.id}`,
    }, { transaction });
    await transaction.commit();
    return res.status(201).json({
      message: 'Mouvement annulé par la création d’un mouvement inverse',
      data: inverse,
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    const response = validationError(res, error);
    if (response) return response;
    console.error('[InventoryController] Erreur cancelMouvement :', error);
    return res.status(500).json({ message: 'Erreur lors de l’annulation du mouvement' });
  }
};
