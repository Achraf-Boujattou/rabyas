import { Op } from 'sequelize';
import {
  Article,
  Equipement,
  MouvementStock,
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

const getStockByArticleIds = async (articleIds) => {
  const stock = new Map(articleIds.map((id) => [id, 0]));
  if (!articleIds.length) return stock;

  const movements = await MouvementStock.findAll({
    where: { articleId: { [Op.in]: articleIds } },
    attributes: ['articleId', 'type', 'quantite'],
    raw: true,
  });

  for (const movement of movements) {
    const current = stock.get(movement.articleId) || 0;
    const quantity = Number(movement.quantite);
    stock.set(
      movement.articleId,
      current + (movement.type === 'sortie' ? -quantity : quantity)
    );
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
    attributes: ['equipementId', 'type', 'quantite'],
    raw: true,
  });
  for (const movement of movements) {
    const current = stock.get(movement.equipementId) || 0;
    const quantity = Number(movement.quantite);
    stock.set(movement.equipementId, current + (movement.type === 'sortie' ? -quantity : quantity));
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
      const history = await MouvementStock.findAll({
        where: { equipementId: equipment.id },
        attributes: ['type', 'quantite'],
        transaction,
      });
      const equipmentStock = history.reduce(
        (sum, movement) => sum + (movement.type === 'sortie' ? -Number(movement.quantite) : Number(movement.quantite)),
        0
      );
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
    const history = await MouvementStock.findAll({
      where: { equipementId: equipment.id },
      attributes: ['type', 'quantite'],
      transaction,
    });
    const equipmentStock = history.reduce(
      (sum, movement) => sum + (movement.type === 'sortie' ? -Number(movement.quantite) : Number(movement.quantite)),
      0
    );
    if (equipmentStock > 0) {
      await MouvementStock.create(
        {
          articleId: equipment.articleId,
          equipementId: equipment.id,
          type: 'sortie',
          quantite: 1,
          emplacement: equipment.emplacement,
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
  if (req.query.articleId) where.articleId = req.query.articleId;
  if (req.query.type) {
    if (!STOCK_MOVEMENT_TYPES.includes(req.query.type)) {
      return res.status(400).json({ message: 'Type de mouvement invalide' });
    }
    where.type = req.query.type;
  }
  try {
    const result = await MouvementStock.findAndCountAll({
      where,
      include: [
        { model: Article, as: 'article', attributes: ['id', 'reference', 'designation', 'unite'] },
        { model: Equipement, as: 'equipement', attributes: ['id', 'numeroSerie'], required: false },
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
  const { articleId, equipementId, type, quantite, commentaire, emplacement, etatRetour, etatSortie } = req.body;
  const quantity = Number(quantite);
  if (!STOCK_MOVEMENT_TYPES.includes(type)) {
    return res.status(400).json({ message: 'Type de mouvement invalide' });
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return res.status(400).json({ message: 'La quantité doit être supérieure à zéro' });
  }
  if (emplacement !== undefined && (
    typeof emplacement !== 'string' ||
    emplacement.trim().length === 0 ||
    emplacement.length > 160
  )) {
    return res.status(400).json({ message: 'Emplacement invalide (160 caractères maximum)' });
  }

  const transaction = await Article.sequelize.transaction();
  try {
    const article = await Article.findByPk(articleId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!article) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Article introuvable' });
    }

    let equipment = null;
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
      const history = await MouvementStock.findAll({
        where: { equipementId: equipment.id },
        attributes: ['type', 'quantite'],
        transaction,
      });
      const equipmentStock = history.reduce(
        (sum, movement) => sum + (movement.type === 'sortie' ? -Number(movement.quantite) : Number(movement.quantite)),
        0
      );
      if (type === 'sortie' && equipmentStock < 1) {
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
      if (type === 'sortie') {
        if (etatSortie !== undefined && !['en_service', 'reforme'].includes(etatSortie)) {
          await transaction.rollback();
          return res.status(400).json({ message: 'État de sortie invalide' });
        }
        equipment.etat = etatSortie || 'en_service';
      } else {
        if (type === 'retour' && !['neuf', 'en_panne', 'repare'].includes(etatRetour)) {
          await transaction.rollback();
          return res.status(400).json({ message: 'Indiquez un état valide pour l’équipement retourné' });
        }
        equipment.etat = type === 'retour' ? etatRetour : 'neuf';
      }
      if (emplacement !== undefined) equipment.emplacement = emplacement;
      await equipment.save({ transaction });
    } else {
      if (equipementId) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Cet article ne suit pas les numéros de série' });
      }
      const movements = await MouvementStock.findAll({
        where: { articleId: article.id },
        attributes: ['type', 'quantite'],
        transaction,
      });
      const currentStock = movements.reduce(
        (sum, movement) => sum + (movement.type === 'sortie' ? -Number(movement.quantite) : Number(movement.quantite)),
        0
      );
      if (type === 'sortie' && quantity > currentStock) {
        await transaction.rollback();
        return res.status(409).json({ message: `Stock insuffisant. Disponible : ${currentStock} ${article.unite}` });
      }
    }

    const movement = await MouvementStock.create(
      {
        articleId: article.id,
        equipementId: equipment?.id || null,
        type,
        quantite: quantity,
        emplacement: equipment ? equipment.emplacement : (emplacement || null),
        commentaire: typeof commentaire === 'string' ? commentaire.trim() : '',
      },
      { transaction }
    );
    await transaction.commit();
    return res.status(201).json({
      message: 'Mouvement enregistré',
      data: movement,
    });
  } catch (error) {
    await transaction.rollback();
    const response = validationError(res, error);
    if (response) return response;
    console.error('[InventoryController] Erreur createMouvement :', error);
    return res.status(500).json({ message: 'Erreur lors de l’enregistrement du mouvement' });
  }
};
