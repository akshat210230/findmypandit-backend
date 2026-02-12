import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'findmypandit-secret-key-change-in-production'
const JWT_EXPIRES_IN = '7d'

// Hash a password before saving to database
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

// Compare password with hash during login
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}

// Generate JWT token after successful login/register
export const generateToken = (userId: string, role: string): string => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

// Verify and decode JWT token
export const verifyToken = (token: string): { userId: string; role: string } => {
  return jwt.verify(token, JWT_SECRET) as { userId: string; role: string }
}