import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// ─── CREATE REVIEW ──────────────────────────────
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId
    const { bookingId, rating, comment } = req.body

    if (!bookingId || !rating) {
      res.status(400).json({ error: 'Booking ID and rating are required.' })
      return
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Rating must be between 1 and 5.' })
      return
    }

    // Check booking exists, belongs to user, and is completed
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' })
      return
    }
    if (booking.userId !== userId) {
      res.status(403).json({ error: 'You can only review your own bookings.' })
      return
    }
    if (booking.status !== 'COMPLETED') {
      res.status(400).json({ error: 'You can only review completed bookings.' })
      return
    }

    // Check if already reviewed
    const existingReview = await prisma.review.findUnique({ where: { bookingId } })
    if (existingReview) {
      res.status(400).json({ error: 'You have already reviewed this booking.' })
      return
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        bookingId,
        userId,
        panditId: booking.panditId,
        rating,
        comment: comment || null,
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    })

    // Update pandit's average rating
    const allReviews = await prisma.review.findMany({
      where: { panditId: booking.panditId },
      select: { rating: true },
    })
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length

    await prisma.pandit.update({
      where: { id: booking.panditId },
      data: {
        rating: Math.round(avgRating * 10) / 10,
        totalReviews: allReviews.length,
      },
    })

    res.status(201).json({ message: 'Review submitted!', review })
  } catch (error) {
    console.error('Create review error:', error)
    res.status(500).json({ error: 'Something went wrong.' })
  }
})

// ─── GET REVIEWS FOR A PANDIT ───────────────────
router.get('/pandit/:panditId', async (req, res): Promise<void> => {
  try {
    const { panditId } = req.params
    const reviews = await prisma.review.findMany({
      where: { panditId },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.status(200).json({ reviews })
  } catch (error) {
    console.error('Get reviews error:', error)
    res.status(500).json({ error: 'Something went wrong.' })
  }
})

export default router