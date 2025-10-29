/**
 * Prometheus metrics for monitoring
 */

import client from 'prom-client';

// Register to store all metrics
export const register = new client.Registry();

// Default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// HTTP request duration histogram
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// HTTP request counter
export const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Database query duration
export const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

// Database query counter
export const dbQueryCounter = new client.Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'model', 'status'],
  registers: [register],
});

// Active sessions gauge
export const activeSessions = new client.Gauge({
  name: 'active_sessions',
  help: 'Number of active user sessions',
  registers: [register],
});

// Cache hit/miss counter
export const cacheCounter = new client.Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

// Error counter
export const errorCounter = new client.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'severity'],
  registers: [register],
});

// Tenant counter
export const tenantGauge = new client.Gauge({
  name: 'tenants_total',
  help: 'Total number of tenants',
  registers: [register],
});

// Active users gauge
export const activeUsersGauge = new client.Gauge({
  name: 'active_users_total',
  help: 'Total number of active users',
  registers: [register],
});

// Tickets created counter
export const ticketsCreatedCounter = new client.Counter({
  name: 'tickets_created_total',
  help: 'Total number of tickets created',
  labelNames: ['tenant_id', 'status', 'priority'],
  registers: [register],
});

// Tickets resolved counter
export const ticketsResolvedCounter = new client.Counter({
  name: 'tickets_resolved_total',
  help: 'Total number of tickets resolved',
  labelNames: ['tenant_id'],
  registers: [register],
});

// Subscription counter
export const subscriptionGauge = new client.Gauge({
  name: 'subscriptions_by_plan',
  help: 'Number of subscriptions by plan type',
  labelNames: ['plan'],
  registers: [register],
});

// API rate limit counter
export const rateLimitCounter = new client.Counter({
  name: 'rate_limit_exceeded_total',
  help: 'Total number of rate limit exceeded events',
  labelNames: ['endpoint', 'tenant_id'],
  registers: [register],
});

