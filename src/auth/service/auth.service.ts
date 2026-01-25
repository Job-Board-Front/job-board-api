import { Injectable, BadRequestException } from '@nestjs/common';
import { Role } from '../roles/roles.enum';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class AuthService {
  constructor(private readonly firebase: FirebaseService) {}

  /**
   * Assigns a role to a user.
   * WARNING: For 'admin' role, you should probably manually check a database whitelist
   * or a secret key to prevent anyone from becoming admin.
   */
  async assignRole(uid: string, role: Role) {
    if (!Object.values(Role).includes(role)) {
      throw new BadRequestException('Invalid role');
    }

    try {
      // 1. Set Custom User Claims on Firebase
      // Note: We use an array for roles to allow future multi-role support
      await this.firebase.auth.setCustomUserClaims(uid, { roles: [role] });

      // 2. (Optional) Sync with a Users collection in Firestore if you keep user profiles there
      await this.firebase.firestore
        .collection('users')
        .doc(uid)
        .set({ role, updatedAt: new Date() }, { merge: true });

      return { message: `Role ${role} assigned to user ${uid}` };
    } catch (error) {
      throw new BadRequestException('Failed to assign role: ' + error.message);
    }
  }
}
