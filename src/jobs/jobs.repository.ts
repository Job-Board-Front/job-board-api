import { Injectable } from '@nestjs/common';
import { Job } from './entities/job.entity';
import { JobQueryDto } from './dto/job-query.dto';
import { DocumentData, Query } from 'firebase-admin/firestore';
import { FirebaseService } from 'src/firebase/firebase.service';
import { FirestoreRepository } from 'src/firebase/firestore.repository';

@Injectable()
export class JobsRepository extends FirestoreRepository<Job> {
  constructor(firebaseService: FirebaseService) {
    super(firebaseService.firestore, 'jobs');
  }

  /**
   * Custom FindAll with Filters and Cursor Pagination
   */
  async findAllWithFilters(queryDto: JobQueryDto) {
    const {
      limit = 10,
      cursor,
      search,
      location,
      employmentType,
      experienceLevel,
    } = queryDto;

    // Explicitly type the query as Query<DocumentData>
    let query: Query<DocumentData> = this.collection.where(
      'isActive',
      '==',
      true,
    );

    // 1. Keyword Search
      if (search) {
    const keywords = search.toLowerCase().split(' ').filter(k => k.length > 0);
    
    if (keywords.length === 1) {
      // Single keyword
      query = query.where('keywords', 'array-contains', keywords[0]);
    } else if (keywords.length > 1) {
      // Multiple keywords (max 10)
      query = query.where('keywords', 'array-contains-any', keywords.slice(0, 10));
    }
  }


    // 2. Exact Filters
    if (location) query = query.where('location', '==', location);
    if (employmentType)
      query = query.where('employmentType', '==', employmentType);
    if (experienceLevel)
      query = query.where('experienceLevel', '==', experienceLevel);

    // 3. Sorting
    // Note: If you have filters + sort, you need composite indexes.
    query = query.orderBy('createdAt', 'desc');

    // 4. Cursor Pagination
    if (cursor) {
      const cursorDoc = await this.collection.doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.limit(limit).get();

    // mapDoc is now correctly typed from the base class
    const data = snapshot.docs.map((doc) => this.mapDoc(doc));

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const nextCursor = lastDoc ? lastDoc.id : null;

    return { data, nextCursor };
  }
}
