import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export const protectAdmin = async (req, res, next) => {
  const token = req.cookies?.adminToken;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(503).json({ success: false, message: 'Admin authentication is not configured.' });
    const payload = jwt.verify(token, secret);
    const result = await pool.query(
      'SELECT id, email, name FROM admins WHERE id = $1',
      [payload.id],
    );
    const admin = result.rows[0];
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session.' });
    }
    req.admin = admin;
    return next();
  } catch (error) {
    if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') return next(error);
    return res.status(401).json({ success: false, message: 'Invalid or expired session.' });
  }
};
