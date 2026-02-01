import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
dotenv.config();

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

const db = admin.firestore();

async function checkDatabase() {
  console.log('📊 Checking database contents...\n');

  try {
    // Check jobs collection
    const jobsSnapshot = await db.collection('jobs').get();
    console.log(`Total jobs: ${jobsSnapshot.size}`);
    
    // Show sample jobs
    console.log('\n📋 Sample jobs (first 5):');
    jobsSnapshot.docs.slice(0, 5).forEach((doc, index) => {
      const job = doc.data();
      console.log(`\n${index + 1}. ${job.title} at ${job.company}`);
      console.log(`   Location: ${job.location}`);
      console.log(`   Type: ${job.employmentType}`);
      console.log(`   Source: ${job.source}`);
      console.log(`   Created: ${job.createdAt?.toDate()}`);
    });

    // Count by source
    const sources = new Map<string, number>();
    jobsSnapshot.docs.forEach(doc => {
      const source = doc.data().source || 'unknown';
      sources.set(source, (sources.get(source) || 0) + 1);
    });

    console.log('\n📈 Jobs by source:');
    sources.forEach((count, source) => {
      console.log(`   ${source}: ${count}`);
    });

    // Check bookmarks collection
    const bookmarksSnapshot = await db.collection('bookmarks').get();
    console.log(`\n🔖 Total bookmarks: ${bookmarksSnapshot.size}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking database:', error);
    process.exit(1);
  }
}

checkDatabase();