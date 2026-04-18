import type { auth_user } from "./auth.types.js";

declare global {
  namespace Express {
    interface Request {
      auth_user?: auth_user;
    }
  }
}

export {};
