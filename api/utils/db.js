import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

let client;
let db;

/**
 * Connect to MongoDB database
 * Uses MONGODB_URI from environment variables
 */
export async function connectToDatabase() {
  if (db) return db;
  
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db('rwa_learning');
    console.log('✅ Connected to MongoDB successfully');
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Save or update user in database
 * @param {Object} userData - User data object
 * @returns {Promise<Object>} Saved user data
 */
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

/**
 * Get user by mobile number
 * @param {string} mobile - User's mobile number
 * @returns {Promise<Object|null>} User object or null
 */
export async function getUserByMobile(mobile) {
  const db = await connectToDatabase();
  return db.collection('users').findOne({ mobile });
}

/**
 * Get user by JWT token
 * @param {string} token - JWT token
 * @returns {Promise<Object|null>} User object or null
 */
export async function getUserByToken(token) {
  const db = await connectToDatabase();
  return db.collection('users').findOne({ token });
}

/**
 * Get all users from database
 * @returns {Promise<Array>} Array of user objects
 */
export async function getAllUsers() {
  const db = await connectToDatabase();
  return db.collection('users').find({}).toArray();
}

/**
 * Update user's purchased batches
 * @param {string} mobile - User's mobile number
 * @param {Array} batches - Array of batch objects
 * @returns {Promise<void>}
 */
export async function updateUserBatches(mobile, batches) {
  const db = await connectToDatabase();
  await db.collection('users').updateOne(
    { mobile },
    { $set: { purchased_batches: batches, last_updated: new Date() } }
  );
}

/**
 * Update user's token
 * @param {string} mobile - User's mobile number
 * @param {string} token - New JWT token
 * @returns {Promise<void>}
 */
export async function updateUserToken(mobile, token) {
  const db = await connectToDatabase();
  await db.collection('users').updateOne(
    { mobile },
    { $set: { token, token_updated: new Date() } }
  );
}

/**
 * Log user login activity
 * @param {string} mobile - User's mobile number
 * @param {string} method - Login method (mobile, token, web)
 * @param {string} status - Login status (success, failed)
 * @returns {Promise<void>}
 */
export async function logLoginActivity(mobile, method, status) {
  const db = await connectToDatabase();
  await db.collection('login_logs').insertOne({
    mobile,
    method,
    status,
    timestamp: new Date(),
    ip: 'proxy-server'
  });
}

/**
 * Verify admin credentials
 * @param {string} username - Admin username
 * @param {string} password - Admin password
 * @returns {Promise<boolean>} True if valid, false otherwise
 */
export async function verifyAdmin(username, password) {
  return username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD;
}

/**
 * Create a new user manually (by admin)
 * @param {string} mobile - User's mobile number
 * @param {string} password - User's password
 * @param {string} token - Optional JWT token
 * @param {string} apiBase - API base URL
 * @returns {Promise<Object>} Created user object
 */
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

/**
 * Delete a user from database
 * @param {string} mobile - User's mobile number
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteUser(mobile) {
  const db = await connectToDatabase();
  const result = await db.collection('users').deleteOne({ mobile });
  return result.deletedCount > 0;
}

/**
 * Get user statistics
 * @returns {Promise<Object>} Statistics object
 */
export async function getUserStats() {
  const db = await connectToDatabase();
  const users = db.collection('users');
  const logs = db.collection('login_logs');
  
  const totalUsers = await users.countDocuments();
  const usersWithTokens = await users.countDocuments({ token: { $ne: null, $ne: '' } });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayLogins = await logs.countDocuments({ 
    timestamp: { $gte: today },
    status: 'success'
  });
  
  // Get all purchased batches across users
  const allUsers = await users.find({}).toArray();
  const allBatches = new Set();
  allUsers.forEach(user => {
    (user.purchased_batches || []).forEach(batch => {
      allBatches.add(batch.batch_id);
    });
  });
  
  return {
    total_users: totalUsers,
    users_with_tokens: usersWithTokens,
    total_batches: allBatches.size,
    today_logins: todayLogins,
    last_updated: new Date()
  };
}

/**
 * Get login history for a specific user
 * @param {string} mobile - User's mobile number
 * @param {number} limit - Number of records to return
 * @returns {Promise<Array>} Array of login records
 */
export async function getUserLoginHistory(mobile, limit = 10) {
  const db = await connectToDatabase();
  return db.collection('login_logs')
    .find({ mobile })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Update user's last login time and increment login count
 * @param {string} mobile - User's mobile number
 * @returns {Promise<void>}
 */
export async function updateLastLogin(mobile) {
  const db = await connectToDatabase();
  await db.collection('users').updateOne(
    { mobile },
    { 
      $set: { last_login: new Date() },
      $inc: { login_count: 1 }
    }
  );
}

/**
 * Check if user exists
 * @param {string} mobile - User's mobile number
 * @returns {Promise<boolean>} True if exists
 */
export async function userExists(mobile) {
  const db = await connectToDatabase();
  const user = await db.collection('users').findOne({ mobile }, { projection: { _id: 1 } });
  return user !== null;
}

/**
 * Get all batches across all users (merged view)
 * @returns {Promise<Object>} Merged batches object
 */
export async function getAllMergedBatches() {
  const db = await connectToDatabase();
  const users = await db.collection('users').find({}).toArray();
  
  const mergedBatches = {};
  
  users.forEach(user => {
    (user.purchased_batches || []).forEach(batch => {
      const batchId = batch.batch_id;
      
      if (!mergedBatches[batchId]) {
        mergedBatches[batchId] = {
          batch_id: batchId,
          batch_name: batch.batch_name,
          thumbnail: batch.thumbnail,
          total_users: 0,
          users: []
        };
      }
      
      mergedBatches[batchId].total_users++;
      mergedBatches[batchId].users.push({
        mobile: user.mobile,
        user_id: user.user_id,
        purchase_date: batch.purchase_date
      });
    });
  });
  
  return mergedBatches;
}

/**
 * Close database connection (useful for cleanup)
 * @returns {Promise<void>}
 */
export async function closeDatabaseConnection() {
  if (client) {
    await client.close();
    db = null;
    client = null;
    console.log('🔌 MongoDB connection closed');
  }
}