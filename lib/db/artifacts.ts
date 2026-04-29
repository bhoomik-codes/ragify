import { openDB, type IDBPDatabase } from 'idb';
import { type Artifact } from '../../types/blocks';

const DB_NAME = 'ragify-artifacts';
const DB_VERSION = 1;
const STORE_NAME = 'artifacts';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

export async function saveArtifact(artifact: Artifact): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, artifact);
}

export async function loadArtifacts(): Promise<Artifact[]> {
  const db = await getDb();
  return db.getAll(STORE_NAME);
}

export async function deleteArtifact(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}

export async function clearAllArtifacts(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_NAME);
}
