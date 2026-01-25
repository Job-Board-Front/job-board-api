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

// Logos colorés génériques pour entreprises tech (style moderne)
const modernTechLogos = [
  // Logos avec formes géométriques et couleurs vives
  'https://img.icons8.com/fluency/96/000000/cloud.png', // Nuage bleu
  'https://img.icons8.com/color/96/000000/code.png', // Code coloré
  'https://img.icons8.com/color/96/000000/data-configuration.png', // Data
  'https://img.icons8.com/color/96/000000/artificial-intelligence.png', // IA
  'https://img.icons8.com/color/96/000000/blockchain-technology.png', // Blockchain

  // Logos d'applications/plateformes
  'https://img.icons8.com/color/96/000000/web-design.png', // Web design
  'https://img.icons8.com/color/96/000000/mobile-app.png', // Mobile
  'https://img.icons8.com/color/96/000000/api.png', // API
  'https://img.icons8.com/color/96/000000/database.png', // Database
  'https://img.icons8.com/color/96/000000/server.png', // Server

  // Logos abstraits modernes
  'https://img.icons8.com/color/96/000000/hexagon.png', // Hexagone
  'https://img.icons8.com/color/96/000000/circle.png', // Cercle coloré
  'https://img.icons8.com/color/96/000000/diamond.png', // Diamant
  'https://img.icons8.com/color/96/000000/triangle.png', // Triangle
  'https://img.icons8.com/color/96/000000/star.png', // Étoile

  // Émoticônes colorées professionnelles
  'https://img.icons8.com/color/96/000000/rocket.png', // Fusée
  'https://img.icons8.com/color/96/000000/lightbulb.png', // Ampoule
  'https://img.icons8.com/color/96/000000/gears.png', // Engrenages
  'https://img.icons8.com/color/96/000000/network.png', // Réseau
  'https://img.icons8.com/color/96/000000/innovation.png', // Innovation
];

const LOGOS_LIST = modernTechLogos;

// Fonction pour obtenir un logo aléatoire
const getRandomLogo = () => {
  const randomIndex = Math.floor(Math.random() * LOGOS_LIST.length);
  return LOGOS_LIST[randomIndex];
};

async function addLogoToJobs() {
  console.log('🚀 Adding modern colored logos to existing jobs...');
  console.log(`Using ${LOGOS_LIST.length} professional generic logos\n`);

  try {
    const snapshot = await db.collection('jobs').get();
    console.log(`Found ${snapshot.size} jobs to update`);

    // Affiche un échantillon de logos
    console.log('🎨 Sample logos available:');
    const sampleLogos = LOGOS_LIST.slice(0, 5);
    sampleLogos.forEach((logo, index) => {
      console.log(`  ${index + 1}. ${logo}`);
    });
    console.log('');

    let updatedCount = 0;
    const batch = db.batch();
    const batchSize = 500;
    let batchCount = 0;

    snapshot.forEach((doc) => {
      const docRef = db.collection('jobs').doc(doc.id);
      const jobData = doc.data();

      const logoUrl = getRandomLogo();

      batch.update(docRef, { logoUrl });
      updatedCount++;
      batchCount++;

      if (batchCount >= batchSize) {
        batch.commit();
        batchCount = 0;
        console.log(`  Committed ${updatedCount} jobs so far...`);
      }
    });

    // Commit final
    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`\n✅ Successfully updated ${updatedCount} jobs!`);
    console.log('\n📊 Logos assignés par catégorie (exemple):');

    // Exemple de statistiques
    const sampleJobs = snapshot.docs.slice(0, 10);
    sampleJobs.forEach((doc, i) => {
      const job = doc.data();
      console.log(
        `  ${i + 1}. ${job.title || 'Sans titre'}: ${job.logoUrl?.split('/').pop() || 'Logo'}`,
      );
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

addLogoToJobs().catch((err) => {
  console.error('Update failed', err);
  process.exit(1);
});
