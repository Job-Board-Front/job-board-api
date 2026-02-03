import { Role } from '../roles/roles.enum';

export interface UserPayload {
  uid: string;
  email: string;
  roles: Role[];
}
