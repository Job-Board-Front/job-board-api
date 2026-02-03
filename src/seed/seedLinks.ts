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
  
  admin.firestore().settings({ ignoreUndefinedProperties: true });
}

const db = admin.firestore();

// Liste de liens de soumission réalistes (LinkedIn, sites carrières, emails)
const submissionLinks = [
  // LinkedIn Easy Apply
  'https://www.linkedin.com/jobs/view/apply/123456789',
  'https://www.linkedin.com/jobs/view/987654321/apply',
  'https://www.linkedin.com/jobs/collections/recommended/?currentJobId=456789123',

  // Sites carrières d'entreprises
  'https://www.keejob.com/',
  'https://www.optioncarriere.tn/',
  'https://apply.innovate.io/developer-position',
  'https://recruitment.digitalfirm.com/candidate/apply',

  // Plateformes de recrutement
  'https://www.welcometothejungle.com/companies',
  'https://www.glassdoor.com/Job/application',
  'https://www.indeed.com/applystart',

  // Sites avec référence
  'https://www.company.com/careers?ref=jobboard123',
  'https://jobs.example.com/apply?source=tech_jobs_portal',
];

// Génère un lien aléatoire
const getRandomSubmissionLink = () => {
  const randomIndex = Math.floor(Math.random() * submissionLinks.length);
  return submissionLinks[randomIndex];
};

async function addSubmissionLinksToJobs() {
  console.log('🚀 Adding submission links to existing jobs...\n');

  try {
    const snapshot = await db.collection('jobs').get();
    console.log(`Found ${snapshot.size} jobs to update\n`);

    const batch = db.batch();
    let operationCount = 0;
    let updatedCount = 0;
    const batchSize = 500;

    snapshot.forEach((doc) => {
      const docRef = db.collection('jobs').doc(doc.id);
      const jobData = doc.data();

      const submissionLink = getRandomSubmissionLink();

      batch.update(docRef, {
        submissionLink,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(), // Optionnel
      });

      updatedCount++;
      operationCount++;

      if (operationCount >= batchSize) {
        batch.commit();
        operationCount = 0;
        console.log(`  ✅ ${updatedCount} jobs updated so far...`);
      }
    });

    // Commit final
    if (operationCount > 0) {
      await batch.commit();
    }

    console.log(
      `\n🎉 Successfully added submission links to ${updatedCount} jobs!`,
    );

    process.exit(0);
  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

addSubmissionLinksToJobs().catch((err) => {
  console.error('Update failed', err);
  process.exit(1);
});
