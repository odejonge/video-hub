import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// AuthRequest is now just Request with the global user property
export type AuthRequest = Request

export function auth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  try {
    const token = header.slice(7)
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    req.user = { id: payload.userId }
    next()
  } catch {
    res.status(401).json({ error: 'invalid_token' })
  }
}


