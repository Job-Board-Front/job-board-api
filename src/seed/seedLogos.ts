import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
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

// Dossier local avec des logos déjà uploadés
const LOCAL_LOGOS_PATH = path.join(__dirname, '..','..', 'uploads', 'job-logos');

// Lire tous les fichiers du dossier
const localLogos = fs.readdirSync(LOCAL_LOGOS_PATH).filter(f => /\.(png|jpg|jpeg)$/i.test(f));

const getRandomLocalLogo = () => {
  const randomIndex = Math.floor(Math.random() * localLogos.length);
  return `${localLogos[randomIndex]}`;
};

async function seedLogosForJobs() {
  console.log('🚀 Seeding logos for 10 jobs from local uploads...');

  try {
    const snapshot = await db.collection('jobs').get();
    console.log(`Found ${snapshot.size} jobs to update`);

    const batch = db.batch();

    snapshot.forEach((doc) => {
      const docRef = db.collection('jobs').doc(doc.id);
      const logoUrl = getRandomLocalLogo();
      batch.update(docRef, { logoUrl });
      console.log(`  ${doc.id} -> ${logoUrl}`);
    });

    await batch.commit();
    console.log('✅ Successfully updated 10 jobs with local logos!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

seedLogosForJobs();
