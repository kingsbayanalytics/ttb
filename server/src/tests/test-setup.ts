import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import verseRoutes from '../routes/verseRoutes';
import userRoutes from '../routes/userRoutes';
import progressRoutes from '../routes/progressRoutes';
import { errorMiddleware, notFound } from '../utils/errorHandler';

export const setupTestApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  // API Routes
  app.use('/api/verses', verseRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/progress', progressRoutes);

  // Error handling middleware
  app.use(notFound);
  app.use(errorMiddleware);

  return app;
};