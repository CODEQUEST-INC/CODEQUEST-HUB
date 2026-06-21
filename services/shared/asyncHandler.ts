import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async Express route handler so rejected promises are passed to
 * next(err) instead of hanging the request forever. Express 4 does NOT do
 * this automatically — an unhandled rejection inside an async handler means
 * the client never gets a response (no error, no timeout, just a hang).
 *
 * Usage: router.get('/me', requireAuth, asyncHandler(getMyGroup))
 */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
