import { Op } from 'sequelize';
import {
  Article,
  CommandeFournisseur,
  Equipement,
  Fournisseur,
  LigneCommandeFournisseur,
  MouvementStock,
  sequelize,
} from '../models/index.js';
import { PURCHASE_ORDER_STATUSES } from '../models/CommandeFournisseur.js';

const pageOptions = (query) => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 10);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return null;
  }
  return { page, limit, offset: (page - 1) * limit };
};

const orderIncludes = [
  { model: Fournisseur, as: 'fournisseur' },
  {
    model: LigneCommandeFournisseur,
    as: 'lignes',
    include: [{ model: Article, as: 'article' }],
  },
];

const handleValidationError = (res, error) => {
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
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(409).json({
      message: 'Cette ressource est déjà utilisée par une autre donnée.',
    });
  }
  return null;
};

const validateOrderLines = (lines) => {
  if (!Array.isArray(lines) || !lines.length) {
    return 'Une commande doit contenir au moins une ligne.';
  }
  const seenArticleIds = new Set();
  for (const line of lines) {
    const articleId = Number(line.articleId);
    const quantity = Number(line.quantiteCommandee);
    if (!Number.isInteger(articleId) || articleId < 1) {
      return 'Chaque ligne doit être liée à un article valide.';
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return 'La quantité commandée doit être supérieure à zéro.';
    }
    if (seenArticleIds.has(articleId)) {
      return 'Un même article ne peut apparaître qu’une fois dans une commande.';
    }
    seenArticleIds.add(articleId);
  }
  return null;
};

const validateSerializedQuantities = (lines, articles) => {
  const articlesById = new Map(articles.map((article) => [article.id, article]));
  for (const line of lines) {
    const article = articlesById.get(Number(line.articleId));
    if (article?.suiviParNumeroSerie && !Number.isInteger(Number(line.quantiteCommandee))) {
      return `La quantité commandée pour ${article.designation} doit être un nombre entier, car cet article est suivi par numéro de série.`;
    }
  }
  return null;
};

const loadOrder = (id, options = {}) =>
  CommandeFournisseur.findByPk(id, {
    ...options,
    include: orderIncludes,
  });

export const getFournisseurs = async (req, res) => {
  const pagination = pageOptions(req.query);
  if (!pagination) return res.status(400).json({ message: 'Pagination invalide (limite maximale : 100).' });
  const where = {};
  if (req.query.search?.trim()) {
    const term = `%${req.query.search.trim()}%`;
    where[Op.or] = [
      { nom: { [Op.like]: term } },
      { contact: { [Op.like]: term } },
      { email: { [Op.like]: term } },
      { telephone: { [Op.like]: term } },
    ];
  }
  try {
    const result = await Fournisseur.findAndCountAll({
      where,
      order: [['nom', 'ASC']],
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
    console.error('[SupplierController] Erreur getFournisseurs :', error);
    return res.status(500).json({ message: 'Erreur lors du chargement des fournisseurs.' });
  }
};

export const getFournisseur = async (req, res) => {
  try {
    const supplier = await Fournisseur.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Fournisseur introuvable.' });
    return res.json({ data: supplier });
  } catch (error) {
    console.error('[SupplierController] Erreur getFournisseur :', error);
    return res.status(500).json({ message: 'Erreur lors du chargement du fournisseur.' });
  }
};

export const createFournisseur = async (req, res) => {
  try {
    const supplier = await Fournisseur.create({
      nom: req.body.nom,
      contact: req.body.contact || '',
      telephone: req.body.telephone || '',
      email: req.body.email || '',
      adresse: req.body.adresse || '',
    });
    return res.status(201).json({ message: 'Fournisseur créé.', data: supplier });
  } catch (error) {
    const handled = handleValidationError(res, error);
    if (handled) return handled;
    console.error('[SupplierController] Erreur createFournisseur :', error);
    return res.status(500).json({ message: 'Erreur lors de la création du fournisseur.' });
  }
};

export const updateFournisseur = async (req, res) => {
  try {
    const supplier = await Fournisseur.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Fournisseur introuvable.' });
    for (const field of ['nom', 'contact', 'telephone', 'email', 'adresse']) {
      if (req.body[field] !== undefined) supplier[field] = req.body[field];
    }
    await supplier.save();
    return res.json({ message: 'Fournisseur modifié.', data: supplier });
  } catch (error) {
    const handled = handleValidationError(res, error);
    if (handled) return handled;
    console.error('[SupplierController] Erreur updateFournisseur :', error);
    return res.status(500).json({ message: 'Erreur lors de la modification du fournisseur.' });
  }
};

export const deleteFournisseur = async (req, res) => {
  try {
    const supplier = await Fournisseur.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Fournisseur introuvable.' });
    if (await CommandeFournisseur.count({ where: { fournisseurId: supplier.id } })) {
      return res.status(409).json({
        message: 'Ce fournisseur possède déjà des commandes et ne peut pas être supprimé.',
      });
    }
    await supplier.destroy();
    return res.json({ message: 'Fournisseur supprimé.' });
  } catch (error) {
    const handled = handleValidationError(res, error);
    if (handled) return handled;
    console.error('[SupplierController] Erreur deleteFournisseur :', error);
    return res.status(500).json({ message: 'Erreur lors de la suppression du fournisseur.' });
  }
};

export const getCommandes = async (req, res) => {
  const pagination = pageOptions(req.query);
  if (!pagination) return res.status(400).json({ message: 'Pagination invalide (limite maximale : 100).' });
  if (req.query.statut && !PURCHASE_ORDER_STATUSES.includes(req.query.statut)) {
    return res.status(400).json({ message: 'Statut de commande invalide.' });
  }
  const where = {};
  if (req.query.statut) where.statut = req.query.statut;
  if (req.query.fournisseurId) where.fournisseurId = req.query.fournisseurId;
  if (req.query.search?.trim()) {
    const term = `%${req.query.search.trim()}%`;
    where[Op.or] = [
      { commentaire: { [Op.like]: term } },
      { '$fournisseur.nom$': { [Op.like]: term } },
      { '$lignes.article.designation$': { [Op.like]: term } },
      { '$lignes.article.reference$': { [Op.like]: term } },
    ];
  }
  try {
    const result = await CommandeFournisseur.findAndCountAll({
      where,
      include: orderIncludes,
      order: [['dateCommande', 'DESC'], ['id', 'DESC']],
      limit: pagination.limit,
      offset: pagination.offset,
      distinct: true,
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
    console.error('[SupplierController] Erreur getCommandes :', error);
    return res.status(500).json({ message: 'Erreur lors du chargement des commandes.' });
  }
};

export const getCommande = async (req, res) => {
  try {
    const order = await loadOrder(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande introuvable.' });
    return res.json({ data: order });
  } catch (error) {
    console.error('[SupplierController] Erreur getCommande :', error);
    return res.status(500).json({ message: 'Erreur lors du chargement de la commande.' });
  }
};

export const createCommande = async (req, res) => {
  const lineError = validateOrderLines(req.body.lignes);
  if (lineError) return res.status(400).json({ message: lineError });
  const transaction = await sequelize.transaction();
  try {
    const supplier = await Fournisseur.findByPk(req.body.fournisseurId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!supplier) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Fournisseur introuvable.' });
    }
    const articleIds = [...new Set(req.body.lignes.map((line) => Number(line.articleId)))];
    const foundArticles = await Article.findAll({
      where: { id: { [Op.in]: articleIds } },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (foundArticles.length !== articleIds.length) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Un ou plusieurs articles de la commande sont introuvables.' });
    }
    const serializedQuantityError = validateSerializedQuantities(req.body.lignes, foundArticles);
    if (serializedQuantityError) {
      await transaction.rollback();
      return res.status(400).json({ message: serializedQuantityError });
    }
    const requestedStatus = req.body.statut || 'brouillon';
    if (!['brouillon', 'envoyee'].includes(requestedStatus)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Une nouvelle commande doit être un brouillon ou être envoyée.' });
    }
    const order = await CommandeFournisseur.create({
      fournisseurId: supplier.id,
      statut: requestedStatus,
      dateCommande: req.body.dateCommande || new Date(),
      dateEnvoi: requestedStatus === 'envoyee' ? new Date() : null,
      commentaire: req.body.commentaire || '',
    }, { transaction });
    await LigneCommandeFournisseur.bulkCreate(
      req.body.lignes.map((line) => ({
        commandeId: order.id,
        articleId: Number(line.articleId),
        quantiteCommandee: Number(line.quantiteCommandee),
        quantiteRecue: 0,
      })),
      { transaction, validate: true }
    );
    await transaction.commit();
    const createdOrder = await loadOrder(order.id);
    return res.status(201).json({ message: 'Commande créée.', data: createdOrder });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    const handled = handleValidationError(res, error);
    if (handled) return handled;
    console.error('[SupplierController] Erreur createCommande :', error);
    return res.status(500).json({ message: 'Erreur lors de la création de la commande.' });
  }
};

export const updateCommande = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const order = await CommandeFournisseur.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Commande introuvable.' });
    }
    if (order.statut !== 'brouillon') {
      await transaction.rollback();
      return res.status(409).json({ message: 'Seuls les brouillons peuvent être modifiés.' });
    }

    if (req.body.statut !== undefined && req.body.statut !== 'envoyee') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Un brouillon peut uniquement être envoyé.' });
    }

    if (req.body.fournisseurId !== undefined) {
      const supplier = await Fournisseur.findByPk(req.body.fournisseurId, { transaction });
      if (!supplier) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Fournisseur introuvable.' });
      }
      order.fournisseurId = supplier.id;
    }
    if (req.body.dateCommande !== undefined) order.dateCommande = req.body.dateCommande;
    if (req.body.commentaire !== undefined) order.commentaire = req.body.commentaire;

    if (req.body.lignes !== undefined) {
      const lineError = validateOrderLines(req.body.lignes);
      if (lineError) {
        await transaction.rollback();
        return res.status(400).json({ message: lineError });
      }
      const articleIds = [...new Set(req.body.lignes.map((line) => Number(line.articleId)))];
      const foundArticles = await Article.findAll({
        where: { id: { [Op.in]: articleIds } },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (foundArticles.length !== articleIds.length) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Un ou plusieurs articles de la commande sont introuvables.' });
      }
      const serializedQuantityError = validateSerializedQuantities(req.body.lignes, foundArticles);
      if (serializedQuantityError) {
        await transaction.rollback();
        return res.status(400).json({ message: serializedQuantityError });
      }
      await LigneCommandeFournisseur.destroy({ where: { commandeId: order.id }, transaction });
      await LigneCommandeFournisseur.bulkCreate(
        req.body.lignes.map((line) => ({
          commandeId: order.id,
          articleId: Number(line.articleId),
          quantiteCommandee: Number(line.quantiteCommandee),
          quantiteRecue: 0,
        })),
        { transaction, validate: true }
      );
    }
    if (req.body.statut === 'envoyee') {
      order.statut = 'envoyee';
      order.dateEnvoi = new Date();
    }
    await order.save({ transaction });
    await transaction.commit();
    return res.json({ message: 'Commande modifiée.', data: await loadOrder(order.id) });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    const handled = handleValidationError(res, error);
    if (handled) return handled;
    console.error('[SupplierController] Erreur updateCommande :', error);
    return res.status(500).json({ message: 'Erreur lors de la modification de la commande.' });
  }
};

export const deleteCommande = async (req, res) => {
  try {
    const order = await CommandeFournisseur.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande introuvable.' });
    if (order.statut !== 'brouillon') {
      return res.status(409).json({ message: 'Seuls les brouillons peuvent être supprimés.' });
    }
    await sequelize.transaction(async (transaction) => {
      await LigneCommandeFournisseur.destroy({ where: { commandeId: order.id }, transaction });
      await order.destroy({ transaction });
    });
    return res.json({ message: 'Commande supprimée.' });
  } catch (error) {
    console.error('[SupplierController] Erreur deleteCommande :', error);
    return res.status(500).json({ message: 'Erreur lors de la suppression de la commande.' });
  }
};

export const receiveCommande = async (req, res) => {
  const receipts = req.body.lignes;
  if (!Array.isArray(receipts) || receipts.length === 0) {
    return res.status(400).json({ message: 'Saisissez au moins une quantité à réceptionner.' });
  }
  const lineIds = receipts.map((line) => Number(line.ligneId));
  if (
    lineIds.some((id) => !Number.isInteger(id) || id < 1) ||
    new Set(lineIds).size !== lineIds.length
  ) {
    return res.status(400).json({ message: 'Les lignes de réception sont invalides ou en doublon.' });
  }
  for (const receipt of receipts) {
    if (!Number.isFinite(Number(receipt.quantiteRecue)) || Number(receipt.quantiteRecue) <= 0) {
      return res.status(400).json({ message: 'Chaque quantité réceptionnée doit être supérieure à zéro.' });
    }
    if (
      receipt.emplacement !== undefined &&
      (typeof receipt.emplacement !== 'string' || !receipt.emplacement.trim() || receipt.emplacement.length > 160)
    ) {
      return res.status(400).json({ message: 'Chaque emplacement doit contenir au maximum 160 caractères.' });
    }
  }

  const transaction = await sequelize.transaction();
  try {
    const order = await CommandeFournisseur.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Commande introuvable.' });
    }
    if (!['envoyee', 'reçue_partiellement'].includes(order.statut)) {
      await transaction.rollback();
      return res.status(409).json({ message: 'Seule une commande envoyée peut être réceptionnée.' });
    }

    const lines = await LigneCommandeFournisseur.findAll({
      where: { id: { [Op.in]: lineIds }, commandeId: order.id },
      include: [{ model: Article, as: 'article' }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (lines.length !== receipts.length) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Une ligne indiquée n’appartient pas à cette commande.' });
    }

    const receiptsById = new Map(receipts.map((line) => [Number(line.ligneId), line]));
    for (const line of lines) {
      const receipt = receiptsById.get(line.id);
      const quantity = Number(receipt.quantiteRecue);
      const remaining = Number(line.quantiteCommandee) - Number(line.quantiteRecue);
      if (quantity > remaining) {
        await transaction.rollback();
        return res.status(409).json({
          message: `La quantité reçue pour ${line.article.designation} dépasse le reliquat (${remaining}).`,
        });
      }
      if (line.article.suiviParNumeroSerie) {
        const serials = receipt.numerosSerie;
        if (
          !Array.isArray(serials) ||
          !Number.isInteger(quantity) ||
          serials.length !== quantity ||
          serials.some((serial) => typeof serial !== 'string' || !serial.trim())
        ) {
          await transaction.rollback();
          return res.status(400).json({
            message: `Fournissez un numéro de série distinct pour chaque unité reçue de ${line.article.designation}.`,
          });
        }
        const normalizedSerials = serials.map((serial) => serial.trim());
        if (new Set(normalizedSerials).size !== normalizedSerials.length) {
          await transaction.rollback();
          return res.status(400).json({ message: 'Les numéros de série d’une même réception doivent être uniques.' });
        }
        for (const numeroSerie of normalizedSerials) {
          const equipment = await Equipement.create({
            articleId: line.articleId,
            numeroSerie,
            etat: 'neuf',
            emplacement: receipt.emplacement?.trim() || 'Dépôt principal',
          }, { transaction });
          await MouvementStock.create({
            articleId: line.articleId,
            equipementId: equipment.id,
            type: 'entree',
            quantite: 1,
            emplacement: equipment.emplacement,
            commentaire: `Réception commande #${order.id}`,
          }, { transaction });
        }
      } else {
        await MouvementStock.create({
          articleId: line.articleId,
          equipementId: null,
          type: 'entree',
          quantite,
          emplacement: receipt.emplacement?.trim() || 'Dépôt principal',
          commentaire: `Réception commande #${order.id}`,
        }, { transaction });
      }
      line.quantiteRecue = Number(line.quantiteRecue) + quantity;
      await line.save({ transaction });
    }

    const allLines = await LigneCommandeFournisseur.findAll({
      where: { commandeId: order.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const isComplete = allLines.every(
      (line) => Number(line.quantiteRecue) >= Number(line.quantiteCommandee)
    );
    order.statut = isComplete ? 'reçue' : 'reçue_partiellement';
    if (isComplete) order.dateReception = new Date();
    await order.save({ transaction });
    await transaction.commit();
    return res.json({
      message: isComplete ? 'Commande entièrement réceptionnée.' : 'Réception partielle enregistrée.',
      data: await loadOrder(order.id),
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    const handled = handleValidationError(res, error);
    if (handled) return handled;
    console.error('[SupplierController] Erreur receiveCommande :', error);
    return res.status(500).json({ message: 'Erreur lors de la réception de la commande.' });
  }
};
