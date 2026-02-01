import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EmploymentType, ExperienceLevel } from '../entities/job.entity';

export class JobQueryDto {
  @IsOptional()
  @IsString()
  search?: string; // Keyword search

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  employmentType?: EmploymentType;

  @IsOptional()
  @IsString()
  experienceLevel?: ExperienceLevel;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  cursor?: string; // The ID of the last document from the previous page
}
