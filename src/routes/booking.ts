import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// ─── CREATE BOOKING ─────────────────────────────
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId
    const { panditId, serviceId, bookingDate, startTime, endTime, address, city, pincode, specialRequests, totalAmount } = req.body

    if (!panditId || !serviceId || !bookingDate || !startTime || !address || !city || !totalAmount) {
      res.status(400).json({ error: 'Missing required fields: panditId, serviceId, bookingDate, startTime, address, city, totalAmount.' })
      return
    }

    // Check pandit exists and is available
    const pandit = await prisma.pandit.findUnique({ where: { id: panditId } })
    if (!pandit || !pandit.isAvailable) {
      res.status(404).json({ error: 'Pandit not found or not available.' })
      return
    }

    // Check service exists
    const service = await prisma.service.findUnique({ where: { id: serviceId } })
    if (!service) {
      res.status(404).json({ error: 'Service not found.' })
      return
    }

    const booking = await prisma.booking.create({
      data: {
        userId,
        panditId,
        serviceId,
        bookingDate: new Date(bookingDate),
        startTime,
        endTime: endTime || null,
        address,
        city,
        pincode: pincode || null,
        specialRequests: specialRequests || null,
        totalAmount,
      },
      include: {
        pandit: { include: { user: { select: { firstName: true, lastName: true } } } },
        service: true,
      },
    })

    res.status(201).json({ message: 'Booking created!', booking })
  } catch (error) {
    console.error('Create booking error:', error)
    res.status(500).json({ error: 'Something went wrong.' })
  }
})

// ─── GET MY BOOKINGS ────────────────────────────
// Works for both families and pandits
router.get('/my', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId
    const role = req.user!.role

    let bookings

    if (role === 'PANDIT') {
      const pandit = await prisma.pandit.findUnique({ where: { userId } })
      if (!pandit) {
        res.status(404).json({ error: 'Pandit profile not found.' })
        return
      }
      bookings = await prisma.booking.findMany({
        where: { panditId: pandit.id },
        include: {
          user: { select: { firstName: true, lastName: true, email: true, phone: true } },
          service: true,
        },
        orderBy: { bookingDate: 'desc' },
      })
    } else {
      bookings = await prisma.booking.findMany({
        where: { userId },
        include: {
          pandit: { include: { user: { select: { firstName: true, lastName: true } } } },
          service: true,
        },
        orderBy: { bookingDate: 'desc' },
      })
    }

    res.status(200).json({ bookings })
  } catch (error) {
    console.error('Get bookings error:', error)
    res.status(500).json({ error: 'Something went wrong.' })
  }
})

// ─── UPDATE BOOKING STATUS ──────────────────────
// Pandit confirms or completes, either party cancels
router.patch('/:id/status', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { status, cancelReason } = req.body
    const userId = req.user!.userId

    const booking = await prisma.booking.findUnique({ where: { id } })
    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' })
      return
    }

    // Validate status transition
    const validStatuses = ['CONFIRMED', 'COMPLETED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status. Use CONFIRMED, COMPLETED, or CANCELLED.' })
      return
    }

    const updateData: any = { status }
    if (status === 'CANCELLED') {
      updateData.cancelledBy = userId
      updateData.cancelReason = cancelReason || null
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        pandit: { include: { user: { select: { firstName: true, lastName: true } } } },
        service: true,
      },
    })

    res.status(200).json({ message: `Booking ${status.toLowerCase()}!`, booking: updated })
  } catch (error) {
    console.error('Update booking error:', error)
    res.status(500).json({ error: 'Something went wrong.' })
  }
})

export default router