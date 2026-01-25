import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { EmploymentType, ExperienceLevel } from '../jobs/entities/job.entity';
import { FieldValue } from 'firebase-admin/firestore';
import { log } from 'console';

@Injectable()
export class FiltersService {
  constructor(private readonly firebase: FirebaseService) {}

  private get docRef() {
    return this.firebase.firestore.collection('metadata').doc('job_filters');
  }

  /**
   * Returns all available filters for the Frontend
   */
  async getFilters() {
    const doc = await this.docRef.get();
    const data = doc.exists ? doc.data() : {};
    log(this.firebase.firestore.collection('metadata').doc('job_filters'));
    return {
      // 1. Static Enums (Always in sync with Backend code)
      employmentTypes: Object.values(EmploymentType),
      experienceLevels: Object.values(ExperienceLevel),

      // 2. Dynamic Data (From DB Aggregation)
      locations: ((data?.locations as string[]) || []).sort(),
      techStacks: ((data?.techStacks as string[]) || []).sort(),
    };
  }

  /**
   * Called whenever a new job is created to ensure filters are up to date
   */
  async updateFilters(location: string, techStack: string[]) {
    // Firestore arrayUnion only adds UNIQUE values (deduplication is automatic)
    await this.docRef.set(
      {
        locations: FieldValue.arrayUnion(location),
        techStacks: FieldValue.arrayUnion(...techStack),
      },
      { merge: true }, // Create if doesn't exist, update if it does
    );
  }
}
