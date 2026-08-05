import { API_BASE_URL } from '../config';

// Render's free tier spins each service down after ~15 min idle; the next
// request then pays a 10-60s cold-start cost. Firing these the moment the
// app launches — in parallel, fire-and-forget, routed through the gateway
// so it doesn't need to know any other service's URL — gives every service
// a head start waking up before the user actually taps into a screen that
// needs it. This doesn't eliminate the wait, just moves most of it earlier.
const WARMUP_PATHS = [
  '/health',
  '/api/auth/health',
  '/api/groups/health',
  '/api/proposals/health',
  '/api/tasks/health',
  '/api/judging/health',
  '/api/showcase/health',
  '/api/payments/health',
];

export function warmUpBackend(): void {
  for (const path of WARMUP_PATHS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    fetch(`${API_BASE_URL}${path}`, { signal: controller.signal })
      .catch(() => {})
      .finally(() => clearTimeout(timeout));
  }
}
