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
  id?: string;
  title: string;
  description: string;
  company: string;
  location: string;
  externalId?: string;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  salaryRange?: string;
  techStack: string[];
  keywords: string[];
  source: 'seeded' | 'manual' | 'arbeitnow' | 'remotive' | 'findwork'; // Update this
  isActive: boolean;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
  logoUrl?: string;
  submissionLink?: string;
}