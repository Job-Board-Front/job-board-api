import { Injectable, NotFoundException } from '@nestjs/common';
import { JobsRepository } from './jobs.repository';
import { CreateJobDto } from './dto/create-job.dto';
import { JobQueryDto } from './dto/job-query.dto';
import { Job } from './entities/job.entity';
import { UpdateJobDto } from './dto/update-job.dto';
import { FiltersService } from 'src/filters/filters.service';

@Injectable()
export class JobsService {
  constructor(
    private readonly jobsRepository: JobsRepository,
    private readonly filtersService: FiltersService,
  ) {}

  async create(createJobDto: CreateJobDto): Promise<string> {
    // 🔍 Improved Keyword Generation for Partial Matching
    const keywords = this.generateKeywords([
      createJobDto.title,
      createJobDto.company,
      ...createJobDto.techStack,
    ]);

    const jobData: Job = {
      ...createJobDto,
      keywords, // Now contains ["n", "ne", "nes", "nest", "nestj", "nestjs"...]
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

  async remove(id: string) {
    return this.jobsRepository.delete(id);
  }

  async update(id: string, updateJobDto: UpdateJobDto): Promise<Job> {
    const existingJob = await this.findOne(id);
    if (!existingJob) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    let keywords = existingJob.keywords;

    // Regenerate keywords if critical fields change
    if (updateJobDto.title || updateJobDto.company || updateJobDto.techStack) {
      const title = updateJobDto.title || existingJob.title;
      const company = updateJobDto.company || existingJob.company;
      const techStack = updateJobDto.techStack || existingJob.techStack;

      // 🔍 Regenerates prefixes based on new data
      keywords = this.generateKeywords([title, company, ...techStack]);
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

  // ---------------------------------------------------------
  // 🧠 THE CORE LOGIC CHANGE
  // ---------------------------------------------------------
  private generateKeywords(inputs: string[]): string[] {
    const set = new Set<string>();

    inputs.forEach((input) => {
      if (!input) return;

      // 1. Clean string and split into words
      // "NestJS Developer" -> ["nestjs", "developer"]
      const words = input.toLowerCase().split(/[\s,/]+/);

      words.forEach((word) => {
        // 2. Generate all prefixes for each word (Edge-N-Grams)
        // Word: "react"
        // Adds: "r", "re", "rea", "reac", "react"
        let currentPrefix = '';
        for (let i = 0; i < word.length; i++) {
          currentPrefix += word[i];
          set.add(currentPrefix);
        }
      });
    });

    // Result for "React": ["r", "re", "rea", "reac", "react"]
    return Array.from(set);
  }
}
