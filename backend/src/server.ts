import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import API handlers
import { trackDownload } from './api/downloads';
import { submitFeedback } from './api/feedback';
import { uploadDiagnostic, uploadMiddleware, handleMulterError } from './api/diagnostics';
import { getLatestVersion } from './api/version';
import { getAdminMetrics } from './api/admin';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes overview
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    message: 'Rephlo Backend API',
    version: '1.0.0',
    endpoints: [
      'POST /api/track-download',
      'POST /api/feedback',
      'POST /api/diagnostics',
      'GET /api/version',
      'GET /admin/metrics',
    ],
  });
});

// ===== API Endpoint Routes =====

/**
 * POST /api/track-download
 * Log download event and return download URL
 */
app.post('/api/track-download', trackDownload);

/**
 * POST /api/feedback
 * Submit user feedback
 */
app.post('/api/feedback', submitFeedback);

/**
 * POST /api/diagnostics
 * Upload diagnostic file (multipart/form-data)
 */
app.post('/api/diagnostics', uploadMiddleware, handleMulterError, uploadDiagnostic);

/**
 * GET /api/version
 * Get latest app version metadata
 */
app.get('/api/version', getLatestVersion);

/**
 * GET /admin/metrics
 * Get aggregated metrics for admin dashboard
 */
app.get('/admin/metrics', getAdminMetrics);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Rephlo Backend API running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS enabled for: ${CORS_ORIGIN}`);
});

export default app;
