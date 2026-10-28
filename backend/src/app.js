import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import articleRoutes from './routes/articleRoutes.js';
import equipementRoutes from './routes/equipementRoutes.js';
import mouvementRoutes from './routes/mouvementRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import './models/index.js';

const app = express();
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      const isAllowedLocalOrigin = (() => {
        if (!isDevelopment || !origin) {
          return false;
        }

        try {
          const parsedOrigin = new URL(origin);
          return (
            parsedOrigin.protocol === 'http:' &&
            ['localhost', '127.0.0.1'].includes(parsedOrigin.hostname)
          );
        } catch {
          return false;
        }
      })();

      if (!origin || allowedOrigins.includes(origin) || isAllowedLocalOrigin) {
        return callback(null, true);
      }
      return callback(new Error(`Origine ${origin} non autorisée par CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'RABYAS Telecom Stock & Asset Tracker API',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/equipements', equipementRoutes);
app.use('/api/mouvements', mouvementRoutes);
app.use('/api/fournisseurs', supplierRoutes);
app.use('/api/affectations', assignmentRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: `Route introuvable : ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, req, res, next) => {
  console.error('[Serveur] Erreur non gérée :', err);

  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ message: err.message });
  }

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const messages = err.errors.map((error) => error.message);
    return res.status(400).json({
      message: 'Erreur de validation',
      errors: messages,
    });
  }

  return res.status(500).json({
    message: 'Une erreur interne du serveur est survenue',
  });
});

export default app;
