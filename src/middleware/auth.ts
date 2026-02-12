import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/auth'

// Extend Express Request to include user info
export interface AuthRequest extends Request {
  user?: {
    userId: string
    role: string
  }
}

// Middleware: checks if user is logged in
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided. Please log in.' })
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = verifyToken(token)
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token. Please log in again.' })
    return
  }
}

// Middleware: checks if user has specific role
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'You do not have permission to access this.' })
      return
    }
    next()
  }
}