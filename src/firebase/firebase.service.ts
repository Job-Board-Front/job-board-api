import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  constructor(private readonly configService: ConfigService) {
    // 🚀 Initialize immediately in constructor, not onModuleInit
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
          clientEmail: this.configService.get<string>('FIREBASE_CLIENT_EMAIL'),
          privateKey: this.configService
            .get<string>('FIREBASE_PRIVATE_KEY')
            ?.replace(/\\n/g, '\n'),
        }),
      });
      
      // Enable ignoreUndefinedProperties to handle undefined values in Firestore
      admin.firestore().settings({ ignoreUndefinedProperties: true });
    }
  }

  get firestore() {
    return admin.firestore();
  }

  get auth() {
    return admin.auth();
  }
}
