/**
 * Tspec API Specification - Health Endpoints
 *
 * This file defines the OpenAPI spec for health check endpoints using Tspec.
 * All endpoints are public (no authentication required) for monitoring systems.
 *
 * Endpoints:
 * - GET / - API overview and available endpoints
 * - GET /health - Basic health check with diagnostics
 * - GET /health/ready - Readiness check for load balancers
 * - GET /health/live - Liveness check for container orchestration
 */

import { Tspec } from 'tspec';

// =============================================================================
// GET / - API Overview
// =============================================================================

/**
 * API Overview Response
 * General API information and available endpoints
 */
export interface ApiOverviewResponse {
  /** API name */
  name: string;
  /** API version (semver) */
  version: string;
  /** API description */
  description: string;
  /** Path to API documentation */
  documentation: string;
  /** Path to health check endpoint */
  health: string;
  /** Available endpoint groups */
  endpoints: Record<string, unknown>;
}

// =============================================================================
// GET /health - Basic Health Check
// =============================================================================

/**
 * Health Check Response
 * Comprehensive server health status with diagnostics
 */
export interface HealthResponse {
  /** Overall health status */
  status: string;
  /** Current server timestamp (ISO 8601) */
  timestamp: string;
  /** Server uptime in seconds */
  uptime: number;
  /** Environment name (development, production, etc.) */
  environment: string;
  /** API version */
  version: string;
  /** Service status checks */
  services: {
    /** Database connection status */
    database: string;
    /** Redis connection status */
    redis: string;
    /** Dependency injection container status */
    di_container: string;
  };
  /** Memory usage information */
  memory: {
    /** Used memory in bytes */
    used: number;
    /** Total available memory in bytes */
    total: number;
  };
}

// =============================================================================
// GET /health/ready - Readiness Check
// =============================================================================

/**
 * Readiness Check Response (Ready State)
 * Indicates service is ready to accept traffic
 */
export interface ReadinessReadyResponse {
  /** Service readiness status */
  status: 'ready';
  /** Current timestamp (ISO 8601) */
  timestamp: string;
  /** Readiness check results by dependency */
  checks: Record<string, unknown>;
}

/**
 * Readiness Check Response (Not Ready State)
 * Indicates service is not ready (dependencies unavailable)
 */
export interface ReadinessNotReadyResponse {
  /** Service readiness status */
  status: 'not_ready';
  /** Current timestamp (ISO 8601) */
  timestamp: string;
  /** Readiness check results showing failures */
  checks: Record<string, unknown>;
}

// =============================================================================
// GET /health/live - Liveness Check
// =============================================================================

/**
 * Liveness Check Response
 * Simple check to verify server is alive and responding
 */
export interface LivenessResponse {
  /** Server liveness status */
  status: 'alive';
  /** Current timestamp (ISO 8601) */
  timestamp: string;
}

// =============================================================================
// Tspec API Specification
// =============================================================================

/**
 * Tspec API specification for health endpoints
 */
export type HealthApiSpec = Tspec.DefineApiSpec<{
  tags: ['Health'];
  paths: {
    '/': {
      get: {
        summary: 'API overview';
        description: `Get API information and available endpoints.

**Use Case:**
- Discover available API endpoints
- Get API version and documentation links
- Verify API is reachable

**Response Includes:**
- API name and version
- Documentation URL
- Health check endpoint
- Endpoint groups

**No Authentication Required** - Public endpoint for API discovery`;
        security: never;
        responses: {
          /** API overview with endpoint information */
          200: ApiOverviewResponse;
        };
      };
    };
    '/health': {
      get: {
        summary: 'Basic health check';
        description: `Returns comprehensive server status and diagnostics.

**Use Case:**
- Monitor server health status
- Check service availability
- View memory usage and uptime
- Verify database and Redis connectivity

**Response Includes:**
- Overall health status
- Server uptime and timestamp
- Environment name
- Service status (database, Redis, DI container)
- Memory usage metrics

**Recommended Check Interval**: Every 30 seconds

**No Authentication Required** - Public endpoint for monitoring systems`;
        security: never;
        responses: {
          /** Comprehensive health status with diagnostics */
          200: HealthResponse;
        };
      };
    };
    '/health/ready': {
      get: {
        summary: 'Readiness check';
        description: `Checks database connectivity and critical dependencies.

**Use Case:**
- Kubernetes/Docker readiness probe
- Load balancer health check
- Verify service can accept traffic
- Pre-deployment validation

**Check Logic:**
- Database connection active
- Redis connection available (if required)
- All critical dependencies initialized

**Returns 200** when service is ready to accept traffic
**Returns 503** when service is starting up or dependencies unavailable

**Recommended Check Interval**: Every 5 seconds

**No Authentication Required** - Public endpoint for orchestration systems`;
        security: never;
        responses: {
          /** Service is ready to accept traffic */
          200: ReadinessReadyResponse;
          /** Service is not ready (dependencies unavailable) */
          503: ReadinessNotReadyResponse;
        };
      };
    };
    '/health/live': {
      get: {
        summary: 'Liveness check';
        description: `Simple check to verify the server is running.

**Use Case:**
- Kubernetes/Docker liveness probe
- Detect server crashes or hangs
- Trigger container restart if unresponsive

**Check Logic:**
- Server process is alive
- Event loop is responsive
- No deep dependency checks (fast response)

**Always returns 200** unless server is completely unresponsive

**Recommended Check Interval**: Every 10 seconds

**No Authentication Required** - Public endpoint for orchestration systems`;
        security: never;
        responses: {
          /** Server is alive and responding */
          200: LivenessResponse;
        };
      };
    };
  };
}>;
