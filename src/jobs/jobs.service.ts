import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobsRepository } from './jobs.repository';
import { CreateJobDto } from './dto/create-job.dto';
import { JobQueryDto } from './dto/job-query.dto';
import { Job } from './entities/job.entity';
import { UpdateJobDto } from './dto/update-job.dto';
import { Role } from 'src/auth/roles/roles.enum';
import { UserPayload } from 'src/auth/interfaces/user-payload.interface';
import { FiltersService } from 'src/filters/filters.service';

@Injectable()
export class JobsService {
  constructor(
    private readonly jobsRepository: JobsRepository,
    private readonly filtersService: FiltersService,
  ) {}

  async create(createJobDto: CreateJobDto, user: UserPayload): Promise<string> {
    const rawInputs = [
      createJobDto.title,
      createJobDto.company,
      ...createJobDto.techStack,
    ];

    // 1. Generate Clean Keywords (For Frontend)
    const keywords = this.generateDisplayKeywords(rawInputs);

    // 2. Generate Search Index (For Backend Querying)
    const searchIndex = this.generateSearchIndex(rawInputs);

    const jobData: Job = {
      ...createJobDto,
      keywords, // <--- Clean words
      searchIndex, // <--- Prefixes
      createdBy: user.uid,
      isActive: true,
      source: 'manual',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    const jobId = await this.jobsRepository.create(jobData);

    this.filtersService
      .updateFilters(createJobDto.location, createJobDto.techStack)
      .catch((err) => console.error('Failed to update filters metadata', err));

    return jobId;
  }

  async findAll(query: JobQueryDto) {
    // If the user searches for "nest", and our DB contains "nes", "nest", "nestjs"
    // The query 'array-contains' "nest" will match the document.
    return this.jobsRepository.findAllWithFilters(query);
  }

  async findOne(id: string) {
    return this.jobsRepository.findById(id);
  }

  async findManyByIds(ids: string[]) {
    return this.jobsRepository.findManyByIds(ids);
  }

  async remove(id: string, user: UserPayload) {
    const job = await this.jobsRepository.findById(id);

    const isAdmin = user.roles.includes(Role.ADMIN);
    const isOwner = job.createdBy === user.uid;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You can only delete your own jobs');
    }

    await this.jobsRepository.delete(id);
  }

  async update(
    id: string,
    updateJobDto: UpdateJobDto,
    user: UserPayload,
  ): Promise<Job> {
    const existingJob = await this.findOne(id);

    // Allow if Admin OR if Owner
    const isAdmin = user.roles.includes(Role.ADMIN);
    const isOwner = existingJob.createdBy === user.uid;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You can only update your own jobs');
    }

    if (!existingJob) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    const keywords = existingJob.keywords;

    // Regenerate keywords if critical fields change
    if (updateJobDto.title || updateJobDto.company || updateJobDto.techStack) {
      const rawInputs = [
        updateJobDto.title || existingJob.title,
        updateJobDto.company || existingJob.company,
        ...(updateJobDto.techStack || existingJob.techStack),
      ];

      // Regenerate both
      updateJobDto.keywords = this.generateDisplayKeywords(rawInputs);
      const searchIndex = this.generateSearchIndex(rawInputs); // Save this to a var

      // Pass searchIndex to repo update...
      await this.jobsRepository.update(id, { ...updateJobDto, searchIndex });
    }

    const updatedData: Partial<Job> = {
      ...updateJobDto,
      keywords,
      updatedAt: new Date(),
    };

    await this.jobsRepository.update(id, updatedData);
    const updatedJob = await this.findOne(id);

    // Sync filters logic
    if (updateJobDto.techStack) {
      if (!updateJobDto.location) {
        this.filtersService
          .updateFilters(existingJob.location, updateJobDto.techStack)
          .catch((err) =>
            console.error('Failed to update filters metadata', err),
          );
      } else if (
        updateJobDto.location &&
        updateJobDto.location !== existingJob.location
      ) {
        this.filtersService
          .updateFilters(updateJobDto.location, updateJobDto.techStack)
          .catch((err) =>
            console.error('Failed to update filters metadata', err),
          );
      }
    }
    return updatedJob;
  }

  async updateLogo(jobId: string, logoUrl: string) {
    const job = await this.findOne(jobId);
    if (!job) throw new NotFoundException('Job not found');

    await this.jobsRepository.update(jobId, {
      logoUrl,
      updatedAt: new Date(),
    });
    return logoUrl;
  }

  async getLogoUrl(jobId: string): Promise<string | null> {
    const job = await this.findOne(jobId);
    if (!job) throw new NotFoundException('Job not found');
    return job.logoUrl || null;
  }

  // 🟢 CLEAN: Keeps whole words only (e.g., "React", "Developer")
  private generateDisplayKeywords(inputs: string[]): string[] {
    const set = new Set<string>();
    inputs.forEach((input) => {
      if (!input) return;
      // Split by space/comma, remove symbols, keep case or lowercase based on preference
      const words = input.split(/[\s,/]+/);
      words.forEach((w) => {
        const clean = w.replace(/[^\w\s]/gi, ''); // Remove emojis
        if (clean.length > 1) set.add(clean);
      });
    });
    return Array.from(set);
  }

  // 🔴 MESSY: Generates prefixes (e.g., "r", "re", "rea")
  private generateSearchIndex(inputs: string[]): string[] {
    const set = new Set<string>();
    inputs.forEach((input) => {
      if (!input) return;
      // Sanitize to lowercase for search
      const cleanInput = input.toLowerCase().replace(/[^\w\s]/gi, '');
      const words = cleanInput.split(/[\s]+/);

      words.forEach((word) => {
        if (word.length > 30) return;
        // Generate prefixes
        let prefix = '';
        for (let i = 0; i < word.length; i++) {
          prefix += word[i];
          set.add(prefix);
        }
      });
    });
    return Array.from(set).slice(0, 4000);
  }
}
