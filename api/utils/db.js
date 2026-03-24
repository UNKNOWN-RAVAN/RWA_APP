import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

let client;
let db;

export async function connectToDatabase() {
  if (db) return db;
  
  try {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db('rwa_learning');
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export async function saveUser(userData) {
  const db = await connectToDatabase();
  const users = db.collection('users');
  
  await users.updateOne(
    { mobile: userData.mobile },
    { $set: userData },
    { upsert: true }
  );
  
  return userData;
}

export async function getUserByMobile(mobile) {
  const db = await connectToDatabase();
  return db.collection('users').findOne({ mobile });
}

export async function getUserByToken(token) {
  const db = await connectToDatabase();
  return db.collection('users').findOne({ token });
}

export async function getAllUsers() {
  const db = await connectToDatabase();
  return db.collection('users').find({}).toArray();
}

export async function updateUserBatches(mobile, batches) {
  const db = await connectToDatabase();
  await db.collection('users').updateOne(
    { mobile },
    { $set: { purchased_batches: batches, last_updated: new Date() } }
  );
}

export async function updateUserToken(mobile, token) {
  const db = await connectToDatabase();
  await db.collection('users').updateOne(
    { mobile },
    { $set: { token, token_updated: new Date() } }
  );
}

export async function logLoginActivity(mobile, method, status) {
  const db = await connectToDatabase();
  await db.collection('login_logs').insertOne({
    mobile,
    method,
    status,
    timestamp: new Date()
  });
}

export async function verifyAdmin(username, password) {
  return username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD;
}

export async function createUser(mobile, password, token, apiBase) {
  const db = await connectToDatabase();
  const users = db.collection('users');
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const userData = {
    mobile,
    password: hashedPassword,
    token: token || null,
    user_id: mobile,
    api_base: apiBase,
    purchased_batches: [],
    last_login: null,
    login_count: 0,
    created_at: new Date(),
    created_by_admin: true
  };
  
  await users.updateOne(
    { mobile },
    { $set: userData },
    { upsert: true }
  );
  
  return userData;
}