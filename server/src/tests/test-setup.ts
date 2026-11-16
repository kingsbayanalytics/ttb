import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import verseRoutes from '../routes/verseRoutes';
import userRoutes from '../routes/userRoutes';
import progressRoutes from '../routes/progressRoutes';
import { errorMiddleware, notFound } from '../utils/errorHandler';

let mongoServer: MongoMemoryServer | null = null;

export const connectTestDB = async () => {
  if (mongoServer || mongoose.connection.readyState !== 0) {
    await disconnectTestDB();
  }

  const server = await MongoMemoryServer.create();
  mongoServer = server;
  try {
    await mongoose.connect(server.getUri());
  } catch (error) {
    mongoServer = null;
    await server.stop();
    throw error;
  }
};

export const disconnectTestDB = async () => {
  const server = mongoServer;
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } finally {
    mongoServer = null;
    if (server) {
      await server.stop();
    }
  }
};

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
