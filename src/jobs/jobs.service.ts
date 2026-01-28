import { Injectable, NotFoundException } from '@nestjs/common';
import { JobsRepository } from './jobs.repository';
import { CreateJobDto } from './dto/create-job.dto';
import { JobQueryDto } from './dto/job-query.dto';
import { Job } from './entities/job.entity';
import { UpdateJobDto } from './dto/update-job.dto';

@Injectable()
export class JobsService {
  constructor(private readonly jobsRepository: JobsRepository) {}

  async create(createJobDto: CreateJobDto): Promise<string> {
    // Generate simple keywords for search (Free tier alternative to Algolia)
    const keywords = this.generateKeywords([
      createJobDto.title,
      createJobDto.company,
      ...createJobDto.techStack,
    ]);

    const jobData: Job = {
      ...createJobDto,
      keywords,
      isActive: true,
      source: 'manual',
      // Expires in 30 days
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    return this.jobsRepository.create(jobData);
  }

  async findAll(query: JobQueryDto) {
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

  // --- Helper: Search Tokenizer ---
  private generateKeywords(inputs: string[]): string[] {
    const set = new Set<string>();

    inputs.forEach((input) => {
      if (!input) return;
      // Split by space, comma, or slash
      const words = input.toLowerCase().split(/[\s,\/]+/);
      words.forEach((w) => {
        if (w.length > 1) set.add(w); // Ignore single chars
      });
    });

    return Array.from(set);
  }
  async update(id: string, updateJobDto: UpdateJobDto): Promise<Job> {
    const existingJob = await this.findOne(id);
    if (!existingJob) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    let keywords = existingJob.keywords;

    if (updateJobDto.title || updateJobDto.company || updateJobDto.techStack) {
      const title = updateJobDto.title || existingJob.title;
      const company = updateJobDto.company || existingJob.company;
      const techStack = updateJobDto.techStack || existingJob.techStack;

      keywords = this.generateKeywords([title, company, ...techStack]);
    }

    const updatedData: Partial<Job> = {
      ...updateJobDto,
      keywords,
      updatedAt: new Date(),
    };

    await this.jobsRepository.update(id, updatedData);
    const updatedJob = await this.findOne(id);
    return updatedJob;
  }

  async updateLogo(jobId: string, logoUrl: string) {
    const job = await this.findOne(jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    await this.jobsRepository.update(jobId, {
      logoUrl,
      updatedAt: new Date(),
    });

    return logoUrl;
  }
  async getLogoUrl(jobId: string): Promise<string | null> {
    const job = await this.findOne(jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    if (!job.logoUrl) return null;

    return job.logoUrl;
  }
}
