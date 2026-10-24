import { connectDatabase, sequelize } from './config/database.js';
import app from './app.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDatabase();
    await sequelize.sync();
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
