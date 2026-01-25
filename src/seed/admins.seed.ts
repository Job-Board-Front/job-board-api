import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

// 1. Load Environment Variables
dotenv.config();

// 2. Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const auth = admin.auth();
const db = admin.firestore();

// 3. Define Admins to Seed
const adminsToSeed = [
  {
    email: 'admin@gmail.com',
    password: '0123456789',
    displayName: 'Main Administrator',
  },
  {
    email: 'moderator@gmail.com',
    password: '0123456789',
    displayName: 'Content Moderator',
  },
];

async function seedAdmins() {
  console.log('🛡️ Starting Admin Seeding...');

  for (const adminData of adminsToSeed) {
    let uid: string;

    try {
      // A. Check if user already exists
      const existingUser = await auth.getUserByEmail(adminData.email);
      uid = existingUser.uid;
      console.log(
        `🔹 User ${adminData.email} already exists. Updating role...`,
      );
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // B. Create new user if not found
        const newUser = await auth.createUser({
          email: adminData.email,
          password: adminData.password,
          displayName: adminData.displayName,
          emailVerified: true, // Auto-verify admins
        });
        uid = newUser.uid;
        console.log(`✅ Created new user: ${adminData.email}`);
      } else {
        console.error('❌ Error checking user:', error);
        continue;
      }
    }

    // C. 🚨 CRITICAL: Assign the 'admin' Role (Custom Claim)
    // This is what your RolesGuard checks for.
    await auth.setCustomUserClaims(uid, {
      roles: ['admin'],
    });

    // D. (Optional) Create a User Document in Firestore for profile data
    // This helps if you list users in a dashboard
    await db
      .collection('users')
      .doc(uid)
      .set(
        {
          email: adminData.email,
          displayName: adminData.displayName,
          roles: ['admin'],
          updatedAt: new Date(),
        },
        { merge: true },
      );

    console.log(`👑 Admin privileges granted to: ${adminData.email}`);
  }

  console.log('🏁 Admin seeding complete!');
  process.exit(0);
}

seedAdmins().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
