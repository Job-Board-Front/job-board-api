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
// 🧠 Logic: Sanitized Keyword Generation
// ---------------------------------------------------------
const generateKeywords = (inputs: any[]): string[] => {
  const set = new Set<string>();

  inputs.forEach((input) => {
    if (!input || typeof input !== 'string') return;

    // 🧹 SANITIZATION STEP (The Fix)
    // 1. Normalize: "é" -> "e" + accent
    // 2. Remove Accents
    // 3. Remove Emojis & Symbols: Keep only a-z, 0-9, and whitespace
    const cleanInput = input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^\w\s]/gi, '') // 🚨 REMOVES EMOJIS (🇩🇪), symbols, punctuation
      .toLowerCase();

    // Split words
    const words = cleanInput.split(/[\s]+/);

    words.forEach((word) => {
      // SAFETY: Skip empty or super long words
      if (word.length === 0 || word.length > 30) return;

      // Generate prefixes
      let currentPrefix = '';
      for (let i = 0; i < word.length; i++) {
        currentPrefix += word[i];
        set.add(currentPrefix);
      }
    });
  });

  // SAFETY: Truncate massive arrays
  const result = Array.from(set);
  if (result.length > 4000) {
    return result.slice(0, 4000);
  }
  return result;
};

// ---------------------------------------------------------
// 🛠 Helper: Process Single Document (Fallback)
// ---------------------------------------------------------
async function processDoc(doc: admin.firestore.QueryDocumentSnapshot) {
  const data = doc.data();

  const title = data.title ? String(data.title) : '';
  const company = data.company ? String(data.company) : '';

  const techStackRaw = Array.isArray(data.techStack) ? data.techStack : [];
  const techStack = techStackRaw.filter(
    (item: any) => typeof item === 'string',
  );

  const newKeywords = generateKeywords([title, company, ...techStack]);

  try {
    await doc.ref.update({
      keywords: newKeywords,
      updatedAt: admin.firestore.Timestamp.now(),
    });
  } catch (error) {
    console.error(`❌ FAILED PERMANENTLY on Document ID: ${doc.id}`);
    console.error(`   Data Title: ${title}`);
    console.error(`   Error:`, error);
  }
}

// ---------------------------------------------------------
// 🚀 Main Migration Function
// ---------------------------------------------------------
async function updateJobKeywords() {
  console.log('🔄 Starting Keyword Migration (Sanitized Mode)...');

  const jobsRef = db.collection('jobs');
  const snapshot = await jobsRef.get();

  if (snapshot.empty) {
    console.log('⚠️ No jobs found.');
    process.exit(0);
  }

  console.log(`📊 Found ${snapshot.size} jobs.`);

  const BATCH_SIZE = 300;
  let batch = db.batch();
  let batchDocs: admin.firestore.QueryDocumentSnapshot[] = [];
  let totalUpdated = 0;

  for (let i = 0; i < snapshot.docs.length; i++) {
    const doc = snapshot.docs[i];
    const data = doc.data();

    // Prepare Data
    const title = data.title ? String(data.title) : '';
    const company = data.company ? String(data.company) : '';
    const techStackRaw = Array.isArray(data.techStack) ? data.techStack : [];
    const techStack = techStackRaw.filter(
      (item: any) => typeof item === 'string',
    );

    const newKeywords = generateKeywords([title, company, ...techStack]);

    // Add to Batch
    batch.update(doc.ref, {
      keywords: newKeywords,
      updatedAt: admin.firestore.Timestamp.now(),
    });
    batchDocs.push(doc);

    // Commit if batch is full OR if it's the last item
    if (batchDocs.length >= BATCH_SIZE || i === snapshot.docs.length - 1) {
      try {
        await batch.commit();
        totalUpdated += batchDocs.length;
        console.log(`✅ Committed batch of ${batchDocs.length} jobs.`);
      } catch (err) {
        console.error(
          `⚠️ Batch failed! Retrying ${batchDocs.length} docs individually...`,
        );
        // Retry individually to save the valid ones
        for (const badDoc of batchDocs) {
          await processDoc(badDoc);
        }
      }
      // Reset
      batch = db.batch();
      batchDocs = [];
    }
  }

  console.log(`🏁 Migration complete. Processed ${totalUpdated} jobs.`);
  process.exit(0);
}

updateJobKeywords().catch((err) => {
  console.error('❌ Fatal Script Error:', err);
  process.exit(1);
});
