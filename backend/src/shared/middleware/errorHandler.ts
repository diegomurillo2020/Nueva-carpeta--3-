import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppErrors";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.code, message: err.message });
    return;
  }
  if ((err as any).code === "P2002") {
    const fields = (err as any).meta?.target ?? "unknown fields";
    res.status(409).json({ error: "CONFLICT", message: `Unique constraint violation on: ${fields}.` });
    return;
  }
  if ((err as any).code === "P2025") {
    res.status(404).json({ error: "NOT_FOUND", message: "Record not found." });
    return;
  }
  if ((err as any).name === "ZodError") {
    res.status(400).json({ error: "VALIDATION_ERROR", message: err.message });
    return;
  }
  console.error("[Unhandled Error]", err);
  res.status(500).json({ error: "INTERNAL_ERROR", message: "An unexpected error occurred." });
}