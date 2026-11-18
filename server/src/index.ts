import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { config, AppConfig } from './config';
import { errorMiddleware, notFound } from './utils/errorHandler';
import authRoutes from './routes/authRoutes';
import verseRoutes from './routes/verseRoutes';
import userRoutes from './routes/userRoutes';
import progressRoutes from './routes/progressRoutes';
import statsRoutes from './routes/statsRoutes';

export interface CreateAppOptions {
  clientBuildDir?: string;
}

export function createApp(
  appConfig: AppConfig = config,
  options: CreateAppOptions = {}
) {
  const app = express();

  app.set('appConfig', appConfig);

  // Security headers and CORS
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': [
            "'self'",
            "'sha256-4bOLYhNW9l8wdl1cImo9FJKWTTIJDdzQ3TUUdsvCOHY='",
          ],
        },
      },
    })
  );
  app.use(
    cors({
      origin: appConfig.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json());
  app.use(morgan('dev'));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/verses', verseRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/progress', progressRoutes);
  app.use('/api/stats', statsRoutes);

  // Unknown /api/* routes always return JSON 404
  app.use('/api', notFound);

  if (appConfig.isProduction) {
    const clientBuildDir =
      options.clientBuildDir ?? path.resolve(__dirname, '../../client/build');
    app.use(express.static(clientBuildDir));

    app.get('*', (req, res, next) => {
      if (path.extname(req.path)) {
        return next();
      }
      res.sendFile(path.resolve(clientBuildDir, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => {
      res.json({ message: 'Welcome to Type the Bible API' });
    });
  }

  // Error handling middleware
  app.use(notFound);
  app.use(errorMiddleware);

  return app;
}

const app = createApp(config);

// Connect to MongoDB
const connectDB = async () => {
  if (!config.mongodbUri) {
    console.error('Configuration error: MONGODB_URI is required.');
    process.exit(1);
  }
  try {
    const conn = await mongoose.connect(config.mongodbUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Start server
if (!config.isTest) {
  connectDB().then(() => {
    app.listen(config.port, () => {
      console.log(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
    });
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err: Error) => {
    console.log(`Error: ${err.message}`);
    process.exit(1);
  });
}

export default app;
