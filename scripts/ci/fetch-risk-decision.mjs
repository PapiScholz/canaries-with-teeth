import fs from 'fs';
import path from 'path';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID;
const gateDate = process.env.GATE_DATE;
if (!projectId || !gateDate) {
  console.error('FIREBASE_PROJECT_ID and GATE_DATE are required');
  process.exit(1);
}

initializeApp({ projectId, credential: applicationDefault() });
const db = getFirestore();

async function main() {
  try {
    const docRef = db.collection('risk_forecast').doc(gateDate);
    const doc = await docRef.get();
    if (!doc.exists || !doc.data()) throw new Error('Risk forecast missing');
    const data = doc.data();
    fs.mkdirSync(path.dirname('artifacts/gating/risk.json'), { recursive: true });
    fs.writeFileSync('artifacts/gating/risk.json', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to fetch risk decision:', e.message);
    process.exit(1);
  }
}

main();
