import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest, authorize } from '../middleware/auth'

const router = Router()

// ─── CREATE PANDIT PROFILE ───────────────────────
// After registering as PANDIT role, they fill out their profile
router.post('/profile', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId

    // Check if user exists and is a PANDIT
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'PANDIT') {
      res.status(403).json({ error: 'Only pandit accounts can create a pandit profile.' })
      return
    }

    // Check if profile already exists
    const existing = await prisma.pandit.findUnique({ where: { userId } })
    if (existing) {
      res.status(400).json({ error: 'Pandit profile already exists. Use PUT to update.' })
      return
    }

    const { bio, experienceYears, languages, specializations, priceMin, priceMax, city, state, pincode } = req.body

    if (!city || !state) {
      res.status(400).json({ error: 'City and state are required.' })
      return
    }

    const pandit = await prisma.pandit.create({
      data: {
        userId,
        bio: bio || null,
        experienceYears: experienceYears || 0,
        languages: languages || [],
        specializations: specializations || [],
        priceMin: priceMin || 0,
        priceMax: priceMax || 0,
        city,
        state,
        pincode: pincode || null,
      },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    })

    res.status(201).json({ message: 'Pandit profile created!', pandit })
  } catch (error) {
    console.error('Create pandit error:', error)
    res.status(500).json({ error: 'Something went wrong.' })
  }
})

// ─── UPDATE PANDIT PROFILE ──────────────────────
router.put('/profile', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId

    const pandit = await prisma.pandit.findUnique({ where: { userId } })
    if (!pandit) {
      res.status(404).json({ error: 'Pandit profile not found.' })
      return
    }

    const { bio, experienceYears, languages, specializations, priceMin, priceMax, city, state, pincode, isAvailable } = req.body

    const updated = await prisma.pandit.update({
      where: { userId },
      data: {
        ...(bio !== undefined && { bio }),
        ...(experienceYears !== undefined && { experienceYears }),
        ...(languages !== undefined && { languages }),
        ...(specializations !== undefined && { specializations }),
        ...(priceMin !== undefined && { priceMin }),
        ...(priceMax !== undefined && { priceMax }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(pincode !== undefined && { pincode }),
        ...(isAvailable !== undefined && { isAvailable }),
      },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    })

    res.status(200).json({ message: 'Profile updated!', pandit: updated })
  } catch (error) {
    console.error('Update pandit error:', error)
    res.status(500).json({ error: 'Something went wrong.' })
  }
})

// ─── SEARCH PANDITS ─────────────────────────────
// Public route — families search for pandits

// ─── GET MY PANDIT PROFILE ──────────────────────
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pandit = await prisma.pandit.findUnique({
     where: { userId: req.user!.userId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
        services: { include: { service: true } },
        reviews: {
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!pandit) {
      res.status(404).json({ error: 'Pandit profile not found.' })
      return
    }

    res.status(200).json({ pandit })
  } catch (error) {
    console.error('Get my profile error:', error)
    res.status(500).json({ error: 'Something went wrong.' })
  }
})

router.get('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const { city, service, language, minPrice, maxPrice, page = '1', limit = '10' } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    // Build filter
    const where: any = { isAvailable: true }

    if (city) where.city = { equals: city as string, mode: 'insensitive' }
    if (language) where.languages = { has: language as string }
    if (minPrice) where.priceMin = { gte: parseInt(minPrice as string) }
    if (maxPrice) where.priceMax = { lte: parseInt(maxPrice as string) }

    // If filtering by service name
    if (service) {
      where.services = {
        some: {
          service: { name: { equals: service as string, mode: 'insensitive' } },
        },
      }
    }

    const [pandits, total] = await Promise.all([
      prisma.pandit.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { rating: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true, avatarUrl: true } },
          services: { include: { service: true } },
        },
      }),
      prisma.pandit.count({ where }),
    ])

    res.status(200).json({
      pandits,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error('Search error:', error)
    res.status(500).json({ error: 'Something went wrong.' })
  }
})

// ─── GET SINGLE PANDIT ──────────────────────────
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const pandit = await prisma.pandit.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true, email: true } },
        services: { include: { service: true } },
        reviews: {
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        availability: true,
      },
    })

    if (!pandit) {
      res.status(404).json({ error: 'Pandit not found.' })
      return
    }

    res.status(200).json({ pandit })
  } catch (error) {
    console.error('Get pandit error:', error)
    res.status(500).json({ error: 'Something went wrong.' })
  }
})

export default router