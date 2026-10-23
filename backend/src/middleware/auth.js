import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from '../utils/http.js';

export const signAdminToken = (admin) =>
  jwt.sign({ sub: admin.id, email: admin.email, role: 'admin' }, config.jwtSecret, { expiresIn: '12h', issuer: 'cliffcamps' });

export function requireAdmin(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Login required'));
  try {
    const payload = jwt.verify(token, config.jwtSecret, { issuer: 'cliffcamps' });
    if (payload.role !== 'admin') throw new Error('not admin');
    req.admin = payload;
    next();
  } catch {
    next(new HttpError(401, 'Session expired - please log in again'));
  }
}
