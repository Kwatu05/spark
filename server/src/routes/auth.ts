import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateTokens, verifyRefreshToken, revokeRefreshToken, hashPassword, verifyPassword } from '../lib/auth';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ ok: false, error: 'username and password required' });

  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }

    const tokens = await generateTokens(user);
    
    res.cookie('spark_session', '1', { httpOnly: true, sameSite: 'lax' });
    res.cookie('refresh_token', tokens.refreshToken, { httpOnly: true, sameSite: 'lax' });
    
    return res.json({ 
      ok: true, 
      userId: user.id,
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.post('/signup', async (req, res) => {
  const { fullName, username, email, password, age, acceptedTerms } = req.body ?? {};
  if (!fullName || !username || !email || !password || !age || age < 18 || !acceptedTerms) {
    return res.status(400).json({ ok: false, error: 'invalid signup payload' });
  }

  try {
    const hashedPassword = await hashPassword(password);
    
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        name: fullName,
        age,
        interests: JSON.stringify([]), // Empty interests array
      },
    });

    const tokens = await generateTokens(user);
    
    res.cookie('spark_session', '1', { httpOnly: true, sameSite: 'lax' });
    res.cookie('refresh_token', tokens.refreshToken, { httpOnly: true, sameSite: 'lax' });
    
    return res.json({ 
      ok: true, 
      next: 'onboarding',
      userId: user.id,
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ ok: false, error: 'Username or email already exists' });
    }
    console.error('Signup error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ ok: false, error: 'No refresh token' });
  }

  try {
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({ ok: false, error: 'Invalid refresh token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return res.status(401).json({ ok: false, error: 'User not found' });
    }

    // Revoke old refresh token
    await revokeRefreshToken(refreshToken);
    
    // Generate new tokens
    const tokens = await generateTokens(user);
    
    res.cookie('refresh_token', tokens.refreshToken, { httpOnly: true, sameSite: 'lax' });
    
    return res.json({ 
      ok: true, 
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  
  if (refreshToken) {
    try {
      await revokeRefreshToken(refreshToken);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
  
  res.clearCookie('spark_session');
  res.clearCookie('refresh_token');
  return res.json({ ok: true });
});

router.get('/session', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
      },
    });

    if (!user) {
      return res.status(401).json({ ok: false, error: 'User not found' });
    }

    return res.json({ 
      ok: true, 
      authenticated: true, 
      userId: user.id,
      user 
    });
  } catch (error) {
    console.error('Session error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

export default router;


