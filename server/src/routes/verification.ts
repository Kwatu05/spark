import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Submit verification request
router.post('/submit', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { selfieUrl, idDocumentUrl, socialLinks } = req.body;

    // Check if user already has a pending verification request
    const existingRequest = await prisma.verificationRequest.findFirst({
      where: {
        userId,
        status: 'PENDING'
      }
    });

    if (existingRequest) {
      return res.status(400).json({ 
        ok: false, 
        error: 'You already have a pending verification request' 
      });
    }

    // Check if user is already verified
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isVerified: true }
    });

    if (user?.isVerified) {
      return res.status(400).json({ 
        ok: false, 
        error: 'You are already verified' 
      });
    }

    // Create verification request
    const verificationRequest = await prisma.verificationRequest.create({
      data: {
        userId,
        selfieUrl,
        idDocumentUrl,
        socialLinks: socialLinks ? JSON.stringify(socialLinks) : null,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({ 
      ok: true, 
      verificationRequest,
      message: 'Verification request submitted successfully. Our team will review it within 24-48 hours.'
    });
  } catch (error) {
    console.error('Verification submission error:', error);
    res.status(500).json({ ok: false, error: 'Failed to submit verification request' });
  }
});

// Get user's verification status
router.get('/status', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        isVerified: true,
        verificationRequests: {
          orderBy: { submittedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            submittedAt: true,
            reviewedAt: true,
            rejectionReason: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    const latestRequest = user.verificationRequests[0];

    res.json({
      ok: true,
      isVerified: user.isVerified,
      latestRequest: latestRequest || null,
      canSubmitNew: !user.isVerified && (!latestRequest || latestRequest.status === 'REJECTED')
    });
  } catch (error) {
    console.error('Verification status error:', error);
    res.status(500).json({ ok: false, error: 'Failed to get verification status' });
  }
});

// Get verification request details (for user to view their submission)
router.get('/request/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const verificationRequest = await prisma.verificationRequest.findFirst({
      where: {
        id,
        userId // Ensure user can only view their own requests
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!verificationRequest) {
      return res.status(404).json({ ok: false, error: 'Verification request not found' });
    }

    res.json({ ok: true, verificationRequest });
  } catch (error) {
    console.error('Get verification request error:', error);
    res.status(500).json({ ok: false, error: 'Failed to get verification request' });
  }
});

export default router;
