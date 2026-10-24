import dotenv from 'dotenv';
import { sequelize, User } from './models/index.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    console.log('[Seed] Initialisation du script de seed...');

    const adminName = process.env.ADMIN_NAME || 'Admin RABYAS';
    const adminEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.trim().toLowerCase() : null;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error('[Seed] ERREUR : ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis dans .env');
      process.exit(1);
    }

    // Connexion et synchronisation du modèle
    await sequelize.authenticate();
    console.log('[Seed] Connecté à MySQL avec succès.');

    // S'assure que la table users existe
    await User.sync();
    console.log('[Seed] Table `users` synchronisée.');

    // 1. Administrateur principal (issu du .env)
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });

    if (existingAdmin) {
      console.log(`[Seed] L'administrateur "${adminEmail}" existe déjà (ID: ${existingAdmin.id}, Rôle: ${existingAdmin.role}).`);
      if (!existingAdmin.actif || existingAdmin.role !== 'admin') {
        existingAdmin.actif = true;
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('[Seed] Statut administrateur et actif vérifié/mis à jour.');
      }
    } else {
      const newAdmin = await User.create({
        nom: adminName,
        email: adminEmail,
        mot_de_passe: adminPassword,
        role: 'admin',
        actif: true,
      });

      console.log('----------------------------------------------------');
      console.log('[Seed] COMPTE ADMINISTRATEUR CRÉÉ AVEC SUCCÈS :');
      console.log(`  ID    : ${newAdmin.id}`);
      console.log(`  Nom   : ${newAdmin.nom}`);
      console.log(`  Email : ${newAdmin.email}`);
      console.log(`  Rôle  : ${newAdmin.role}`);
      console.log(`  Actif : ${newAdmin.actif}`);
      console.log('----------------------------------------------------');
    }

    // 2. Comptes de test pour les autres rôles et cas de test (magasinier, technicien, compte désactivé)
    const demoAccounts = [
      {
        nom: 'Karim Magasinier',
        email: 'magasinier@rabyas.com',
        mot_de_passe: 'Magasinier123!',
        role: 'magasinier',
        actif: true,
      },
      {
        nom: 'Youssef Technicien',
        email: 'technicien@rabyas.com',
        mot_de_passe: 'Technicien123!',
        role: 'technicien',
        actif: true,
      },
      {
        nom: 'Compte Désactivé',
        email: 'bloque@rabyas.com',
        mot_de_passe: 'Bloque123!',
        role: 'technicien',
        actif: false,
      },
    ];

    for (const demo of demoAccounts) {
      const exists = await User.findOne({ where: { email: demo.email } });
      if (!exists) {
        await User.create(demo);
        console.log(`[Seed] Compte de démonstration créé : ${demo.email} (Rôle: ${demo.role}, Actif: ${demo.actif})`);
      }
    }

    await sequelize.close();
    console.log('[Seed] Script terminé avec succès.');
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Erreur lors de l\'exécution du seed :', error);
    try {
      await sequelize.close();
    } catch (_) {}
    process.exit(1);
  }
};

seedAdmin();
