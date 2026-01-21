import {
  CollectionReference,
  DocumentSnapshot,
  Firestore,
  QueryDocumentSnapshot,
  Timestamp,
  DocumentData,
} from 'firebase-admin/firestore';
import { NotFoundException } from '@nestjs/common';

export abstract class FirestoreRepository<T extends { id?: string }> {
  // We use CollectionReference<DocumentData> to avoid type conflicts
  // between Entity Dates and Firestore Timestamps
  protected readonly collection: CollectionReference<DocumentData>;

  constructor(
    protected readonly firestore: Firestore,
    protected readonly collectionName: string,
  ) {
    this.collection = firestore.collection(collectionName);
  }

  // --- CRUD Operations ---

  async create(data: Omit<T, 'id'>): Promise<string> {
    const timestamp = new Date();
    // We explicitly cast to DocumentData or any to bypass the specific
    // constraints of WithFieldValue<T> since we are handling dates manually
    const docRef = await this.collection.add({
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp,
    } as unknown as DocumentData);

    return docRef.id;
  }

  async findAll(): Promise<T[]> {
    const snapshot = await this.collection.get();
    return snapshot.docs.map((doc) => this.mapDoc(doc));
  }

  async findById(id: string): Promise<T> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(
        `Document ${this.collectionName}/${id} not found`,
      );
    }
    // We know doc exists here, so strict mapping is safe
    return this.mapDoc(doc);
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    await docRef.update({
      ...data,
      updatedAt: new Date(),
    } as unknown as DocumentData);
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }

  // --- Helpers ---

  /**
   * Transforms Firestore document to Plain Object (T)
   * Converts Firestore Timestamps to JS Dates
   */
  protected mapDoc(
    doc: DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>,
  ): T {
    const data = doc.data();

    if (!data) {
      throw new Error(`Document data is undefined for ID: ${doc.id}`);
    }

    const result: any = { id: doc.id };

    for (const [key, value] of Object.entries(data as Record<string, any>)) {
 
      if (value instanceof Timestamp) {
        result[key] = value.toDate();
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }
}
