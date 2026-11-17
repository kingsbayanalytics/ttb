import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config, AppConfig } from '../config';
import { createApp, CreateAppOptions } from '../index';

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

export const setupTestApp = (
  configOverrides: Partial<AppConfig> = {},
  options: CreateAppOptions = {}
) => {
  return createApp({ ...config, ...configOverrides }, options);
};
