import { Router, Request, Response } from 'express'
import Razorpay from 'razorpay'
import crypto from 'crypto'
import { authenticateToken } from '../middleware/auth'

const router = Router()

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

// Create order
router.post('/create-order', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, bookingId } = req.body

    if (!amount || !bookingId) {
      res.status(400).json({ error: 'Amount and bookingId required' })
      return
    }

    const order = await razorpay.orders.create({
      amount: amount * 100, // Razorpay expects paise
      currency: 'INR',
      receipt: `booking_${bookingId}`,
      notes: { bookingId }
    })

    res.json({ orderId: order.id, amount: order.amount, currency: order.currency })
  } catch (error) {
    console.error('Razorpay order error:', error)
    res.status(500).json({ error: 'Failed to create payment order' })
  }
})

// Verify payment
router.post('/verify', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body

    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      res.status(400).json({ error: 'Invalid payment signature' })
      return
    }

    res.json({ success: true, paymentId: razorpay_payment_id })
  } catch (error) {
    console.error('Payment verification error:', error)
    res.status(500).json({ error: 'Payment verification failed' })
  }
})

export default router