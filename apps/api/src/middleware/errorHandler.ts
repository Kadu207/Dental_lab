import type { Request, Response, NextFunction } from "express";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error("[dental-lab-api]", err);
  const msg = err instanceof Error ? err.message : "Erro interno";
  if (res.headersSent) return;
  res.status(500).json({ erro: msg, code: "INTERNAL_ERROR" });
}

/** Wrap async route handlers to forward errors to errorHandler */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
