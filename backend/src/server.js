import { DataTypes } from 'sequelize';
import { connectDatabase, sequelize } from './config/database.js';
import app from './app.js';

const PORT = process.env.PORT || 5000;

const migrateMovementSchema = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const tableName = 'mouvements_articles';
  const columns = await queryInterface.describeTable(tableName);

  if (!columns.depot_source) {
    await queryInterface.addColumn(tableName, 'depot_source', {
      type: DataTypes.STRING(160),
      allowNull: true,
    });
  }
  if (!columns.depot_destination) {
    await queryInterface.addColumn(tableName, 'depot_destination', {
      type: DataTypes.STRING(160),
      allowNull: true,
    });
  }
  if (!columns.utilisateur_id) {
    await queryInterface.addColumn(tableName, 'utilisateur_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
  }
  if (!columns.mouvement_inverse_de_id) {
    await queryInterface.addColumn(tableName, 'mouvement_inverse_de_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true,
    });
  }
  if (!columns.etat_avant) {
    await queryInterface.addColumn(tableName, 'etat_avant', {
      type: DataTypes.ENUM('neuf', 'en_service', 'en_panne', 'repare', 'reforme'),
      allowNull: true,
    });
  }
  if (!columns.emplacement_avant) {
    await queryInterface.addColumn(tableName, 'emplacement_avant', {
      type: DataTypes.STRING(160),
      allowNull: true,
    });
  }
  if (!String(columns.type?.type || '').includes('transfert')) {
    await queryInterface.changeColumn(tableName, 'type', {
      type: DataTypes.ENUM('entree', 'sortie', 'retour', 'transfert'),
      allowNull: false,
    });
  }
};

const startServer = async () => {
  try {
    await connectDatabase();
    await sequelize.sync();
    await migrateMovementSchema();
    console.log('[Serveur] Modèles Sequelize synchronisés avec la base MySQL.');

    const server = app.listen(PORT, () => {
      console.log('====================================================');
      console.log(`  RABYAS Backend API démarré sur le port ${PORT}`);
      console.log(`  Environnement : ${process.env.NODE_ENV || 'development'}`);
      console.log(`  URL locale    : http://localhost:${PORT}`);
      console.log('====================================================');
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        const nextPort = Number(PORT) + 1;
        console.warn(`[Serveur] Le port ${PORT} est déjà utilisé. Tentative sur le port de secours ${nextPort}...`);
        app.listen(nextPort, () => {
          console.log('====================================================');
          console.log(`  RABYAS Backend API démarré sur le port de secours ${nextPort}`);
          console.log(`  URL locale    : http://localhost:${nextPort}`);
          console.log('====================================================');
        });
      } else {
        console.error('[Serveur] Erreur du serveur :', error);
      }
    });
  } catch (error) {
    console.error('[Serveur] Échec critique du démarrage :', error);
    process.exit(1);
  }
};

startServer();
