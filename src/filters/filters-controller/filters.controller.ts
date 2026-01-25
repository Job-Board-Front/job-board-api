import { Controller, Get } from '@nestjs/common';
import { FiltersService } from '../filters.service';
import { EmploymentType, ExperienceLevel } from 'src/jobs/entities/job.entity';

@Controller('filters')
export class FiltersController {
  constructor(private readonly filtersService: FiltersService) {}

  @Get()
  async getFilters(): Promise<{
    locations: string[];
    techStacks: string[];
    employmentTypes: EmploymentType[];
    experienceLevels: ExperienceLevel[];
  }> {
    return await this.filtersService.getFilters();
  }
}
