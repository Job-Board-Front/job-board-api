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

// Helpers
const locations = [
  'Remote',
  'Tunis, TN',
  'Sousse, TN',
  'Paris, FR',
  'London, UK',
];
const types = ['full-time', 'part-time', 'contract', 'internship'];
const levels = ['junior', 'mid', 'senior'];
const techs = [
  ['Node.js', 'NestJS', 'TypeScript'],
  ['React', 'Redux', 'Tailwind'],
  ['Python', 'Django', 'PostgreSQL'],
  ['Java', 'Spring Boot', 'AWS'],
  ['Flutter', 'Dart', 'Firebase'],
];

const generateKeywords = (str: string) => {
  return str
    .toLowerCase()
    .split(' ')
    .filter((w) => w.length > 1);
};

async function seed() {
  console.log('🚀 Starting Seed...');
  const batchLimit = 500;
  let batch = db.batch();
  let count = 0;

  // Track unique values for the metadata document
  const uniqueLocations = new Set<string>();
  const uniqueTechStacks = new Set<string>();

  for (let i = 1; i <= 50; i++) {
    const docRef = db.collection('jobs').doc();

    const techStack = techs[Math.floor(Math.random() * techs.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    const title = `${techStack[0]} Developer`;
    const company = `Tech Company ${i}`;

    uniqueLocations.add(location);
    techStack.forEach((t) => uniqueTechStacks.add(t));

    const job = {
      title,
      description: `We are looking for a passionate ${title} with experience in ${techStack.join(', ')}. Join us at ${company}.`,
      company,
      location,
      employmentType: types[Math.floor(Math.random() * types.length)],
      experienceLevel: levels[Math.floor(Math.random() * levels.length)],
      techStack,
      salaryRange: '$50k - $80k',
      // Generate keywords for our manual search
      keywords: [
        ...generateKeywords(title),
        ...generateKeywords(company),
        ...techStack.map((t) => t.toLowerCase()),
      ],
      isActive: true,
      source: 'seeded',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
      updatedAt: new Date(),
    };

    batch.set(docRef, job);
    count++;

    if (count >= batchLimit) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }

    // 🚀 Write the Metadata Document
    const metadataRef = db.collection('metadata').doc('job_filters');
    batch.set(
      metadataRef,
      {
        locations: Array.from(uniqueLocations),
        techStacks: Array.from(uniqueTechStacks),
      },
      { merge: true },
    );
  }

  if (count > 0) {
    await batch.commit();
  }

  console.log('✅ Seeded 50 jobs successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed', err);
  process.exit(1);
});
