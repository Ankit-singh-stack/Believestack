import jwt from 'jsonwebtoken';
import { getCollection } from '../config/db.js';
import { readId } from '../utils/validation.js';

export const protectAdmin = async (req, res, next) => {
  const token = req.cookies?.adminToken;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(503).json({ success: false, message: 'Admin authentication is not configured.' });
    const payload = jwt.verify(token, secret);
    if (typeof payload.id !== 'string' || !/^[a-f\d]{24}$/i.test(payload.id)) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session.' });
    }
    const admin = await getCollection('admins').findOne(
      { _id: readId(payload.id) },
      { projection: { email: 1, name: 1 } },
    );
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session.' });
    }
    req.admin = { id: admin._id.toString(), email: admin.email, name: admin.name };
    return next();
  } catch (error) {
    if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') return next(error);
    return res.status(401).json({ success: false, message: 'Invalid or expired session.' });
  }
};
