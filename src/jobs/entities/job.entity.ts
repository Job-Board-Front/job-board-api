export enum EmploymentType {
  FULL_TIME = 'full-time',
  PART_TIME = 'part-time',
  CONTRACT = 'contract',
  INTERNSHIP = 'internship',
}

export enum ExperienceLevel {
  JUNIOR = 'junior',
  MID = 'mid',
  SENIOR = 'senior',
}

export class Job {
  id?: string; // Optional because it's not present when creating
  title: string;
  description: string;
  company: string;
  location: string;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  salaryRange?: string;
  techStack: string[];
  keywords: string[];
  source: 'seeded' | 'manual';
  isActive: boolean;
  expiresAt: Date;
  createdAt?: Date; // Optional on creation (handled by repo)
  updatedAt?: Date; // Optional on creation
  logoUrl?: string;
  submissionLink?: string;
  createdBy: string;
}
