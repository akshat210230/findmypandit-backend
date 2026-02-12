import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { hashPassword, comparePassword, generateToken } from '../utils/auth'

const router = Router()

// ─── REGISTER ────────────────────────────────────
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ error: 'Email, password, first name, and last name are required.' })
      return
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      res.status(400).json({ error: 'An account with this email already exists.' })
      return
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone: phone || null,
        role: role === 'PANDIT' ? 'PANDIT' : 'FAMILY',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    })

    // Generate token
    const token = generateToken(user.id, user.role)

    res.status(201).json({
      message: 'Account created successfully!',
      user,
      token,
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
})

// ─── LOGIN ───────────────────────────────────────
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body

    // Validate
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' })
      return
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' })
      return
    }

    // Check password
    const isMatch = await comparePassword(password, user.passwordHash)
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' })
      return
    }

    // Check if account is active
    if (!user.isActive) {
      res.status(403).json({ error: 'Your account has been deactivated.' })
      return
    }

    // Generate token
    const token = generateToken(user.id, user.role)

    res.status(200).json({
      message: 'Login successful!',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
})

export default router