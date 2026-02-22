import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { OAuth2Client } from 'google-auth-library';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
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

// Google Login
router.post('/google', async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential } = req.body;
    if (!credential) {
      res.status(400).json({ error: 'Google credential is required' });
      return;
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
      res.status(400).json({ error: 'Invalid Google token' });
      return;
    }

    const { email, given_name, family_name, picture, sub } = payload;

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const dummyHash = await hashPassword(Math.random().toString(36));
      user = await prisma.user.create({
        data: {
          email,
          firstName: given_name || 'User',
          lastName: family_name || '',
          passwordHash: dummyHash,
          role: 'FAMILY',
          phone: null,
          googleId: sub,
          avatar: picture || null,
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { email },
        data: { googleId: sub, avatar: picture || undefined },
      });
    }

    const token = generateToken(user.id, user.role);

    res.json({
      token,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});
export default router