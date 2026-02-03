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
db.settings({ ignoreUndefinedProperties: true });

// ---------------------------------------------------------
// 🛠 Helpers
// ---------------------------------------------------------

// 🟢 CLEAN: Keeps whole words only (For Frontend)
const generateDisplayKeywords = (inputs: any[]): string[] => {
  const set = new Set<string>();
  inputs.forEach((input) => {
    if (!input || typeof input !== 'string') return;
    const cleanInput = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const words = cleanInput.split(/[\s,/]+/);
    words.forEach((w) => {
      // Remove symbols/emojis, keep alphanumeric
      const clean = w.replace(/[^\w\s-]/gi, '');
      if (clean.length > 1) set.add(clean);
    });
  });
  return Array.from(set);
};

// 🔴 MESSY: Generates prefixes (For Backend Search)
const generateSearchIndex = (inputs: any[]): string[] => {
  const set = new Set<string>();
  inputs.forEach((input) => {
    if (!input || typeof input !== 'string') return;

    // Normalize & Sanitize
    const cleanInput = input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/gi, '')
      .toLowerCase();

    const words = cleanInput.split(/[\s]+/);

    words.forEach((word) => {
      if (word.length === 0 || word.length > 30) return;
      let prefix = '';
      for (let i = 0; i < word.length; i++) {
        prefix += word[i];
        set.add(prefix);
      }
    });
  });

  const result = Array.from(set);
  return result.length > 4000 ? result.slice(0, 4000) : result;
};

// ---------------------------------------------------------
// 🚀 Migration Logic
// ---------------------------------------------------------
async function migrate() {
  console.log('🔄 Separating Keywords (Frontend) & Search Index (Backend)...');

  // Use a collection group or specific collection
  const jobsRef = db.collection('jobs');
  const snapshot = await jobsRef.get();

  if (snapshot.empty) {
    console.log('⚠️ No jobs found.');
    process.exit(0);
  }

  console.log(`📊 Found ${snapshot.size} jobs to process.`);

  let batch = db.batch();
  let count = 0;
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    const title = data.title ? String(data.title) : '';
    const company = data.company ? String(data.company) : '';
    const techStack = Array.isArray(data.techStack) ? data.techStack : [];

    // Gather all text sources
    const rawInputs = [title, company, ...techStack];

    // Generate fields
    const cleanKeywords = generateDisplayKeywords(rawInputs);
    const searchIndex = generateSearchIndex(rawInputs);

    batch.update(doc.ref, {
      keywords: cleanKeywords, // For Frontend
      searchIndex: searchIndex, // For Backend Search
      updatedAt: admin.firestore.Timestamp.now(),
    });

    count++;
    batchCount++;

    // 🚨 THE FIX: Commit and RE-CREATE the batch
    if (batchCount >= 300) {
      await batch.commit();
      console.log(`✅ Saved batch of ${batchCount} docs (Total: ${count})`);

      // Reset for next loop
      batch = db.batch(); // <--- Create a NEW batch instance
      batchCount = 0;
    }
  }

  // Commit any remaining docs
  if (batchCount > 0) {
    await batch.commit();
    console.log(`✅ Saved final batch of ${batchCount} docs.`);
  }

  console.log('🏁 Migration Complete!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Migration Error:', err);
  process.exit(1);
});
