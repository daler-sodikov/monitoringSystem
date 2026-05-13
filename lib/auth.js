import { getDb } from './mongodb';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

export async function createToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) return null;
    
    const payload = await verifyToken(token);
    if (!payload) return null;
    
    const db = await getDb();
    const { ObjectId } = require('mongodb');
    return await db.collection('users').findOne(
      { _id: new ObjectId(payload.userId) },
      { projection: { password: 0 } }
    );
  } catch (error) {
    return null;
  }
}

export function requireAuth(allowedRoles = []) {
  return async function(handler) {
    return async function(request, ...args) {
      const user = await getCurrentUser();
      
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      
      request.user = user;
      return handler(request, ...args);
    };
  };
}
