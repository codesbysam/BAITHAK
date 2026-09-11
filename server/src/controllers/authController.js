const bcrypt = require('bcrypt');
const { UserStore: User, RefreshTokenStore: RefreshToken } = require('../models/storeAdapter');
const {
  hashToken,
  generateAccessToken,
  generateRefreshToken,
} = require('../services/tokenService');

const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function setRefreshTokenCookie(res, token) {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SEVEN_DAYS_MS,
    path: '/api/v1/auth',
  });
}

function clearRefreshTokenCookie(res) {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
  });
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
    });

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS);

    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    setRefreshTokenCookie(res, rawRefreshToken);

    return res.status(201).json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      accessToken,
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS);

    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    setRefreshTokenCookie(res, rawRefreshToken);

    return res.status(200).json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      accessToken,
    });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const rawRefreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME];
    if (!rawRefreshToken) {
      return res.status(401).json({ error: 'Refresh token not provided' });
    }

    const tokenHash = hashToken(rawRefreshToken);
    const storedToken = await RefreshToken.findOne({ tokenHash });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(storedToken.userId);
    if (!user) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ error: 'User not found' });
    }

    // Token rotation: delete old refresh token
    await RefreshToken.deleteOne({ _id: storedToken._id });

    // Issue new tokens
    const newAccessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    const newRawRefreshToken = generateRefreshToken();
    const newTokenHash = hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + SEVEN_DAYS_MS);

    await RefreshToken.create({
      userId: user._id,
      tokenHash: newTokenHash,
      expiresAt: newExpiresAt,
    });

    setRefreshTokenCookie(res, newRawRefreshToken);

    return res.status(200).json({
      accessToken: newAccessToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const rawRefreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME];
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await RefreshToken.deleteOne({ tokenHash });
    }

    clearRefreshTokenCookie(res);
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
};
