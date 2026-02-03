import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { EmploymentType, ExperienceLevel } from '../entities/job.entity';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  company: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsEnum(EmploymentType)
  employmentType: EmploymentType;

  @IsEnum(ExperienceLevel)
  experienceLevel: ExperienceLevel;

  @IsOptional()
  @IsString()
  salaryRange?: string;

  @IsArray()
  @IsString({ each: true })
  techStack: string[];

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsString()
  submissionLink?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}
