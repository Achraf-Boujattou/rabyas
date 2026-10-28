import { Op, QueryTypes, literal } from 'sequelize';
import {
  Affectation,
  Article,
  Equipement,
  LigneAffectation,
  MouvementStock,
  User,
} from '../models/index.js';
import {
  ASSIGNMENT_BENEFICIARY_TYPES,
  ASSIGNMENT_STATUSES,
} from '../models/Affectation.js';

const EQUIPMENT_RETURN_STATES = ['neuf', 'en_panne', 'repare'];

const parsePagination = (query) => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 10);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return null;
  }
  return { page, limit, offset: (page - 1) * limit };
};

const loadAffectation = (id, options = {}) =>
  Affectation.findByPk(id, {
    ...options,
    include: [
      { model: User, as: 'technicien', attributes: ['id', 'nom', 'email'], required: false },
      { model: User, as: 'utilisateur', attributes: ['id', 'nom'], required: false },
      {
        model: LigneAffectation,
        as: 'lignes',
        include: [
          { model: Article, as: 'article', attributes: ['id', 'reference', 'designation', 'unite'] },
          {
            model: Equipement,
            as: 'equipement',
            attributes: ['id', 'numeroSerie', 'etat', 'emplacement'],
            required: false,
            paranoid: false,
          },
        ],
      },
    ],
  });

const getEquipmentStock = async (equipmentId, transaction) => {
  const movement = await MouvementStock.findOne({
    where: { equipementId: equipmentId },
    attributes: [[
      literal("SUM(CASE WHEN `type` = 'sortie' THEN -`quantite` WHEN `type` = 'transfert' THEN 0 ELSE `quantite` END)"),
      'stock',
    ]],
    raw: true,
    transaction,
  });
  return Number(movement?.stock || 0);
};

const getArticleDepotStock = async (articleId, depot, transaction) => {
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

const getErrorResponse = (error) => {
  if (error.name === 'SequelizeValidationError') {
    return { status: 400, message: error.errors.map((item) => item.message).join(', ') };
  }
  if (error.name === 'SequelizeUniqueConstraintError') {
    return { status: 409, message: error.errors.map((item) => item.message).join(', ') };
  }
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return { status: 409, message: 'Une ressource liée à cette affectation est introuvable.' };
  }
  return null;
};

export const getTechnicianOptions = async (req, res) => {
  try {
    const technicians = await User.findAll({
      where: { role: 'technicien', actif: true },
      attributes: ['id', 'nom', 'email'],
      order: [['nom', 'ASC']],
    });
    return res.json({ data: technicians });
  } catch (error) {
    console.error('[AssignmentController] Erreur getTechnicianOptions :', error);
    return res.status(500).json({ message: 'Erreur lors du chargement des techniciens.' });
  }
};

export const getAffectations = async (req, res) => {
  const pagination = parsePagination(req.query);
  if (!pagination) {
    return res.status(400).json({ message: 'Pagination invalide (limite maximale : 100).' });
  }

  const where = {};
  const isTechnician = req.user.role === 'technicien';
  let beneficiaryTerm = '';
  let equipmentTerm = '';
  if (isTechnician) {
    where.beneficiaireType = 'technicien';
    where.beneficiaireUserId = req.user.id;
  } else {
    if (req.query.statut) {
      if (!ASSIGNMENT_STATUSES.includes(req.query.statut)) {
        return res.status(400).json({ message: 'Statut d’affectation invalide.' });
      }
      where.statut = req.query.statut;
    }
    if (req.query.typeBeneficiaire) {
      if (!ASSIGNMENT_BENEFICIARY_TYPES.includes(req.query.typeBeneficiaire)) {
        return res.status(400).json({ message: 'Type de bénéficiaire invalide.' });
      }
      where.beneficiaireType = req.query.typeBeneficiaire;
    }
    if (req.query.beneficiaire?.trim()) {
      beneficiaryTerm = `%${req.query.beneficiaire.trim()}%`;
    }
    if (req.query.equipement?.trim()) {
      equipmentTerm = `%${req.query.equipement.trim()}%`;
    }
  }

  try {
    if (beneficiaryTerm) {
      const technicians = await User.findAll({
        where: {
          role: 'technicien',
          [Op.or]: [
            { nom: { [Op.like]: beneficiaryTerm } },
            { email: { [Op.like]: beneficiaryTerm } },
          ],
        },
        attributes: ['id'],
      });
      where[Op.or] = [
        { beneficiaireReference: { [Op.like]: beneficiaryTerm } },
        { beneficiaireUserId: { [Op.in]: technicians.map((technician) => technician.id) } },
      ];
    }
    if (equipmentTerm) {
      const matchingLines = await LigneAffectation.findAll({
        attributes: ['affectationId'],
        include: [{
          model: Equipement,
          as: 'equipement',
          attributes: [],
          where: { numeroSerie: { [Op.like]: equipmentTerm } },
          required: true,
          paranoid: false,
        }],
        group: ['affectationId'],
        raw: true,
      });
      where.id = { [Op.in]: matchingLines.map((line) => line.affectationId) };
    }

    const result = await Affectation.findAndCountAll({
      where,
      include: [
        { model: User, as: 'technicien', attributes: ['id', 'nom', 'email'], required: false },
        { model: User, as: 'utilisateur', attributes: ['id', 'nom'], required: false },
        {
          model: LigneAffectation,
          as: 'lignes',
          include: [
            { model: Article, as: 'article', attributes: ['id', 'reference', 'designation', 'unite'] },
            {
              model: Equipement,
              as: 'equipement',
              attributes: ['id', 'numeroSerie', 'etat', 'emplacement'],
              required: false,
              paranoid: false,
            },
          ],
        },
      ],
      distinct: true,
      order: [['dateAttribution', 'DESC'], ['id', 'DESC']],
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
    console.error('[AssignmentController] Erreur getAffectations :', error);
    return res.status(500).json({ message: 'Erreur lors du chargement des affectations.' });
  }
};

export const createAffectation = async (req, res) => {
  const { beneficiaireType, beneficiaireReference, beneficiaireUserId, depotSource, lignes } = req.body;
  if (!ASSIGNMENT_BENEFICIARY_TYPES.includes(beneficiaireType)) {
    return res.status(400).json({ message: 'Type de bénéficiaire invalide.' });
  }
  if (typeof depotSource !== 'string' || !depotSource.trim() || depotSource.trim().length > 160) {
    return res.status(400).json({ message: 'Le dépôt de sortie est obligatoire (160 caractères maximum).' });
  }
  if (!Array.isArray(lignes) || lignes.length === 0) {
    return res.status(400).json({ message: 'Ajoutez au moins un article à l’affectation.' });
  }
  if (lignes.length > 100) {
    return res.status(400).json({ message: 'Une affectation ne peut pas contenir plus de 100 lignes.' });
  }

  let beneficiaryReference = typeof beneficiaireReference === 'string'
    ? beneficiaireReference.trim()
    : '';
  let technicianId = null;
  if (beneficiaireType === 'technicien') {
    technicianId = Number(beneficiaireUserId);
    if (!Number.isInteger(technicianId) || technicianId < 1) {
      return res.status(400).json({ message: 'Sélectionnez un technicien valide.' });
    }
  } else if (!beneficiaryReference || beneficiaryReference.length > 191) {
    return res.status(400).json({ message: 'Le nom du client ou du site est obligatoire (191 caractères maximum).' });
  }

  const articleIds = lignes.map((line) => Number(line.articleId));
  if (articleIds.some((id) => !Number.isInteger(id) || id < 1)) {
    return res.status(400).json({ message: 'Chaque ligne doit sélectionner un article valide.' });
  }
  const selectedEquipmentIds = lignes.flatMap((line) =>
    Array.isArray(line.equipementIds) ? line.equipementIds.map(Number) : []
  );
  if (selectedEquipmentIds.some((id) => !Number.isInteger(id) || id < 1)) {
    return res.status(400).json({ message: 'Un numéro de série sélectionné est invalide.' });
  }
  if (new Set(selectedEquipmentIds).size !== selectedEquipmentIds.length) {
    return res.status(400).json({ message: 'Un équipement ne peut être affecté qu’une seule fois dans le formulaire.' });
  }

  const transaction = await Affectation.sequelize.transaction();
  try {
    if (beneficiaireType === 'technicien') {
      const technician = await User.findOne({
        where: { id: technicianId, role: 'technicien', actif: true },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!technician) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Technicien introuvable ou désactivé.' });
      }
      beneficiaryReference = technician.nom;
    }

    const uniqueArticleIds = [...new Set(articleIds)].sort((left, right) => left - right);
    const articles = await Article.findAll({
      where: { id: { [Op.in]: uniqueArticleIds } },
      transaction,
      lock: transaction.LOCK.UPDATE,
      order: [['id', 'ASC']],
    });
    if (articles.length !== uniqueArticleIds.length) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Un ou plusieurs articles sont introuvables.' });
    }
    const articlesById = new Map(articles.map((article) => [article.id, article]));
    const equipmentById = new Map();
    if (selectedEquipmentIds.length) {
      const equipmentRows = await Equipement.findAll({
        where: { id: { [Op.in]: selectedEquipmentIds } },
        transaction,
        lock: transaction.LOCK.UPDATE,
        order: [['id', 'ASC']],
      });
      if (equipmentRows.length !== selectedEquipmentIds.length) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Un ou plusieurs équipements sélectionnés sont introuvables ou archivés.' });
      }
      for (const equipment of equipmentRows) equipmentById.set(equipment.id, equipment);
    }

    const nonSerializedQuantities = new Map();
    const preparedLines = [];
    for (let index = 0; index < lignes.length; index += 1) {
      const line = lignes[index];
      const article = articlesById.get(Number(line.articleId));
      const equipmentIds = Array.isArray(line.equipementIds)
        ? line.equipementIds.map(Number)
        : [];
      if (article.suiviParNumeroSerie) {
        if (!equipmentIds.length || (line.quantite !== undefined && Number(line.quantite) !== equipmentIds.length)) {
          await transaction.rollback();
          return res.status(400).json({
            message: `Sélectionnez les numéros de série de chaque unité de « ${article.designation} ».`,
          });
        }
        for (const equipmentId of equipmentIds) {
          const equipment = equipmentById.get(equipmentId);
          if (!equipment || equipment.articleId !== article.id) {
            await transaction.rollback();
            return res.status(400).json({ message: `Un numéro de série n’appartient pas à « ${article.designation} ».` });
          }
          if (equipment.etat === 'reforme') {
            await transaction.rollback();
            return res.status(409).json({ message: `L’équipement ${equipment.numeroSerie} est réformé et ne peut pas être affecté.` });
          }
          if (equipment.emplacement !== depotSource.trim()) {
            await transaction.rollback();
            return res.status(409).json({
              message: `${equipment.numeroSerie} se trouve dans « ${equipment.emplacement} », pas dans le dépôt « ${depotSource.trim()} ».`,
            });
          }
          const stock = await getEquipmentStock(equipment.id, transaction);
          if (stock < 1) {
            await transaction.rollback();
            return res.status(409).json({ message: `L’équipement ${equipment.numeroSerie} n’est pas disponible en stock.` });
          }
          preparedLines.push({
            article,
            equipment,
            quantite: 1,
            depotOrigine: equipment.emplacement,
            etatAvant: equipment.etat,
          });
        }
      } else {
        if (equipmentIds.length) {
          await transaction.rollback();
          return res.status(400).json({ message: `L’article « ${article.designation} » ne suit pas les numéros de série.` });
        }
        const quantity = Number(line.quantite);
        if (!Number.isFinite(quantity) || quantity <= 0 || Math.round(quantity * 1000) / 1000 !== quantity) {
          await transaction.rollback();
          return res.status(400).json({ message: `Quantité invalide pour « ${article.designation} » (maximum 3 décimales).` });
        }
        nonSerializedQuantities.set(
          article.id,
          (nonSerializedQuantities.get(article.id) || 0) + quantity
        );
        preparedLines.push({
          article,
          equipment: null,
          quantite: quantity,
          depotOrigine: depotSource.trim(),
          etatAvant: null,
        });
      }
    }

    for (const [articleId, quantity] of nonSerializedQuantities) {
      const article = articlesById.get(articleId);
      const available = await getArticleDepotStock(articleId, depotSource.trim(), transaction);
      if (quantity > available) {
        await transaction.rollback();
        return res.status(409).json({
          message: `Stock insuffisant pour « ${article.designation} » dans « ${depotSource.trim()} ». Disponible : ${Math.max(available, 0)} ${article.unite}.`,
        });
      }
    }

    const affectation = await Affectation.create({
      beneficiaireType,
      beneficiaireReference: beneficiaryReference,
      beneficiaireUserId: technicianId,
      statut: 'en_cours',
      utilisateurId: req.user.id,
    }, { transaction });

    const beneficiaryLabel = beneficiaireType === 'technicien'
      ? `technicien ${beneficiaryReference}`
      : `${beneficiaireType} ${beneficiaryReference}`;

    for (const line of preparedLines) {
      await LigneAffectation.create({
        affectationId: affectation.id,
        articleId: line.article.id,
        equipementId: line.equipment?.id || null,
        quantite: line.quantite,
        depotOrigine: line.depotOrigine,
        etatAvant: line.etatAvant,
      }, { transaction });
      await MouvementStock.create({
        articleId: line.article.id,
        equipementId: line.equipment?.id || null,
        type: 'sortie',
        quantite: line.quantite,
        emplacement: line.depotOrigine,
        depotSource: line.depotOrigine,
        depotDestination: null,
        utilisateurId: req.user.id,
        etatAvant: line.equipment?.etat || null,
        emplacementAvant: line.equipment?.emplacement || null,
        commentaire: `Affectation #${affectation.id} à ${beneficiaryLabel}`,
      }, { transaction });
      if (line.equipment) {
        line.equipment.etat = 'en_service';
        line.equipment.emplacement = beneficiaryReference;
        await line.equipment.save({ transaction });
      }
    }

    await transaction.commit();
    const data = await loadAffectation(affectation.id);
    return res.status(201).json({ message: 'Affectation créée et matériel sorti du stock.', data });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    const handled = getErrorResponse(error);
    if (handled) return res.status(handled.status).json({ message: handled.message });
    console.error('[AssignmentController] Erreur createAffectation :', error);
    return res.status(500).json({ message: 'Erreur lors de la création de l’affectation.' });
  }
};

export const returnAffectation = async (req, res) => {
  const rawStates = req.body?.etatsEquipements;
  const returnStates = new Map();
  if (rawStates !== undefined && !Array.isArray(rawStates)) {
    return res.status(400).json({ message: 'Les états de retour doivent être fournis sous forme de liste.' });
  }
  for (const item of rawStates || []) {
    const equipmentId = Number(item.equipementId);
    if (!Number.isInteger(equipmentId) || equipmentId < 1 || !EQUIPMENT_RETURN_STATES.includes(item.etat)) {
      return res.status(400).json({ message: 'Un état de retour ou un équipement est invalide.' });
    }
    returnStates.set(equipmentId, item.etat);
  }

  const transaction = await Affectation.sequelize.transaction();
  try {
    const affectation = await Affectation.findByPk(req.params.id, {
      include: [{ model: LigneAffectation, as: 'lignes' }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!affectation) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Affectation introuvable.' });
    }
    if (affectation.statut !== 'en_cours') {
      await transaction.rollback();
      return res.status(409).json({ message: 'Cette affectation a déjà été retournée.' });
    }

    const equipmentIds = affectation.lignes.map((line) => line.equipementId).filter(Boolean);
    if ([...returnStates.keys()].some((equipmentId) => !equipmentIds.includes(equipmentId))) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Un état de retour fait référence à un équipement qui ne figure pas dans cette affectation.' });
    }
    const equipmentRows = equipmentIds.length
      ? await Equipement.findAll({
        where: { id: { [Op.in]: equipmentIds } },
        transaction,
        lock: transaction.LOCK.UPDATE,
        paranoid: false,
      })
      : [];
    const equipmentById = new Map(equipmentRows.map((equipment) => [equipment.id, equipment]));
    const lineArticles = await Article.findAll({
      where: { id: { [Op.in]: [...new Set(affectation.lignes.map((line) => line.articleId))] } },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const articleById = new Map(lineArticles.map((article) => [article.id, article]));
    const beneficiaryLabel = affectation.beneficiaireType === 'technicien'
      ? `technicien ${affectation.beneficiaireReference}`
      : `${affectation.beneficiaireType} ${affectation.beneficiaireReference}`;

    for (const line of affectation.lignes) {
      const article = articleById.get(line.articleId);
      if (!article) {
        await transaction.rollback();
        return res.status(409).json({ message: 'Un article de l’affectation est introuvable.' });
      }
      const equipment = line.equipementId ? equipmentById.get(line.equipementId) : null;
      if (line.equipementId && !equipment) {
        await transaction.rollback();
        return res.status(409).json({ message: 'Un équipement de l’affectation est introuvable.' });
      }

      let stateBefore = null;
      let locationBefore = null;
      if (equipment) {
        if (equipment.deletedAt) {
          await transaction.rollback();
          return res.status(409).json({ message: `L’équipement ${equipment.numeroSerie} est archivé et ne peut pas être retourné.` });
        }
        if (await getEquipmentStock(equipment.id, transaction) > 0) {
          await transaction.rollback();
          return res.status(409).json({ message: `L’équipement ${equipment.numeroSerie} est déjà en stock.` });
        }
        stateBefore = equipment.etat;
        locationBefore = equipment.emplacement;
        equipment.etat = returnStates.get(equipment.id) || 'repare';
        equipment.emplacement = line.depotOrigine;
        await equipment.save({ transaction });
      }

      await MouvementStock.create({
        articleId: line.articleId,
        equipementId: line.equipementId,
        type: 'retour',
        quantite: line.quantite,
        emplacement: line.depotOrigine,
        depotSource: null,
        depotDestination: line.depotOrigine,
        utilisateurId: req.user.id,
        etatAvant: stateBefore,
        emplacementAvant: locationBefore,
        commentaire: `Retour de l’affectation #${affectation.id} (${beneficiaryLabel})`,
      }, { transaction });
    }

    affectation.statut = 'retournee';
    affectation.dateRetour = new Date();
    await affectation.save({ transaction });
    await transaction.commit();

    const data = await loadAffectation(affectation.id);
    return res.json({ message: 'Retour enregistré et stock mis à jour.', data });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    const handled = getErrorResponse(error);
    if (handled) return res.status(handled.status).json({ message: handled.message });
    console.error('[AssignmentController] Erreur returnAffectation :', error);
    return res.status(500).json({ message: 'Erreur lors de l’enregistrement du retour.' });
  }
};

export const getAffectationById = async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (req.user.role === 'technicien') {
      where.beneficiaireType = 'technicien';
      where.beneficiaireUserId = req.user.id;
    }
    const data = await loadAffectation(where.id);
    if (!data || (req.user.role === 'technicien' && data.beneficiaireUserId !== req.user.id)) {
      return res.status(404).json({ message: 'Affectation introuvable.' });
    }
    return res.json({ data });
  } catch (error) {
    console.error('[AssignmentController] Erreur getAffectationById :', error);
    return res.status(500).json({ message: 'Erreur lors du chargement de l’affectation.' });
  }
};
