import { Request, Response, NextFunction } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

/**
 * A utility function to wrap async Express route handlers.
 * It catches any errors thrown in the async function and passes them
 * to the Express error handling middleware via `next(error)`.
 * This avoids the need for explicit try/catch blocks in every route handler.
 * @param fn The async route handler function.
 */
export const asyncHandler = (fn: AsyncRequestHandler) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
