// src/types/express.d.ts
import 'express';

declare global {
  namespace Express {
    interface User {
      id: number;
      isAdmin: boolean;
    }
  }
}
