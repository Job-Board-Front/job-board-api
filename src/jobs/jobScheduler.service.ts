import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { JobsService } from './jobs.service';
import { EmploymentType, ExperienceLevel } from './entities/job.entity';

interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  location: string;
  tags: string[];
  created_at: number;
}

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo: string;
  category: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary: string;
  description: string;
}

interface FindworkJob {
  id: string;
  role: string;
  company_name: string;
  employment_type: string;
  location: string | null;
  remote: boolean;
  url: string;
  text: string;
  date_posted: string;
  keywords: string[];
}

@Injectable()
export class JobsSchedulerService {
  private readonly logger = new Logger(JobsSchedulerService.name);
  private existingExternalIds: Set<string> = new Set();

  constructor(private readonly jobsService: JobsService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleJobFetching() {
    this.logger.log('Starting job fetching cycle...');

    // Load existing external IDs from database
    await this.loadExistingExternalIds();

    await Promise.all([
      this.fetchArbeitnowJobs(),
      this.fetchRemotiveJobs(),
      this.fetchFindworkJobs(),
    ]);

    this.logger.log('Job fetching cycle completed');
  }

  private async loadExistingExternalIds() {
    try {
      const allJobs = await this.jobsService.findAll({ limit: 10000 });
      this.existingExternalIds.clear();
      
      allJobs.data.forEach(job => {
        if (job.externalId) {
          this.existingExternalIds.add(job.externalId);
        }
      });
      
      this.logger.log(`📦 Loaded ${this.existingExternalIds.size} external job IDs`);
    } catch (error) {
      this.logger.error('Error loading external IDs:', error.message);
    }
  }

  /*@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleJobCleanup() {
    this.logger.log('Starting daily job cleanup...');

    try {
      // Fetch all jobs from external APIs
      const [arbeitnowJobs, remotiveJobs, findworkJobs] = await Promise.all([
        this.fetchAllArbeitnowJobs(),
        this.fetchAllRemotiveJobs(),
        this.fetchAllFindworkJobs(),
      ]);

      // Create a set of all active external IDs
      const activeExternalIds = new Set<string>();

      arbeitnowJobs.forEach(job => {
        activeExternalIds.add(`arbeitnow-${job.slug}`);
      });

      remotiveJobs.forEach(job => {
        activeExternalIds.add(`remotive-${job.id}`);
      });

      findworkJobs.forEach(job => {
        activeExternalIds.add(`findwork-${job.id}`);
      });

      // Get all jobs from database
      const dbJobs = await this.jobsService.findAll({ limit: 10000 });

      let deletedCount = 0;

      // Check each database job against active external IDs
      for (const dbJob of dbJobs.data) {
        // Only check jobs from external APIs (skip manual and seeded jobs)
        if (dbJob.externalId && !activeExternalIds.has(dbJob.externalId)) {
          this.logger.log(`Deleting stale job: ${dbJob.title} at ${dbJob.company} (${dbJob.externalId})`);
          await this.jobsService.remove(dbJob.id);
          deletedCount++;
        }
      }

      this.logger.log(`Job cleanup completed. Deleted ${deletedCount} stale jobs.`);
    } catch (error) {
      this.logger.error('Error during job cleanup:', error.message);
    }
  }

  private async fetchAllArbeitnowJobs(): Promise<ArbeitnowJob[]> {
    try {
      const response = await axios.get('https://arbeitnow.com/api/job-board-api');
      return response.data.data || [];
    } catch (error) {
      this.logger.error('Error fetching Arbeitnow jobs for cleanup:', error.message);
      return [];
    }
  }

  private async fetchAllRemotiveJobs(): Promise<RemotiveJob[]> {
    try {
      const response = await axios.get('https://remotive.com/api/remote-jobs');
      return response.data.jobs || [];
    } catch (error) {
      this.logger.error('Error fetching Remotive jobs for cleanup:', error.message);
      return [];
    }
  }

  private async fetchAllFindworkJobs(): Promise<FindworkJob[]> {
    try {
      const response = await axios.get('https://findwork.dev/api/jobs/', {
        headers: {
          'Authorization': 'Token 6de73d0573f037530a13758cf1d77303fc3e2541'
        }
      });
      return response.data.results || [];
    } catch (error) {
      this.logger.error('Error fetching Findwork jobs for cleanup:', error.message);
      return [];
    }
  }*/

  private async fetchArbeitnowJobs() {
    try {
      const response = await axios.get('https://arbeitnow.com/api/job-board-api');
      const jobs: ArbeitnowJob[] = response.data.data;

      for (const job of jobs) {
        const externalId = `arbeitnow-${job.slug}`;
        
        // Skip if already exists in database
        if (this.existingExternalIds.has(externalId)) {
            this.logger.log(`already exists`);
          continue;
        }

        await this.createJob({
          externalId,
          title: job.title,
          description: this.stripHtml(job.description),
          company: job.company_name,
          location: job.remote ? 'Remote' : job.location || 'Unknown',
          employmentType: this.mapEmploymentType(job.tags),
          experienceLevel: this.extractExperienceLevel(job.description),
          techStack: job.tags.filter(tag => tag.toLowerCase() !== 'remote'),
          submissionLink: `https://www.arbeitnow.com/jobs/${job.slug}`,
          source: 'arbeitnow',
        });

        // Add to in-memory cache
        this.existingExternalIds.add(externalId);
      }

      this.logger.log(`Processed ${jobs.length} jobs from Arbeitnow`);
    } catch (error) {
      this.logger.error('Error fetching Arbeitnow jobs:', error.message);
    }
  }

  private async fetchRemotiveJobs() {
    try {
      const response = await axios.get('https://remotive.com/api/remote-jobs');
      const jobs: RemotiveJob[] = response.data.jobs;

      for (const job of jobs) {
        const externalId = `remotive-${job.id}`;
        
        if (this.existingExternalIds.has(externalId)) {
          continue;
        }

        await this.createJob({
          externalId,
          title: job.title,
          description: this.stripHtml(job.description),
          company: job.company_name,
          location: job.candidate_required_location || 'Remote',
          employmentType: this.mapEmploymentType([job.job_type]),
          experienceLevel: this.extractExperienceLevel(job.description),
          techStack: job.tags || [],
          salaryRange: job.salary || undefined,
          logoUrl: job.company_logo || undefined,
          submissionLink: job.url,
          source: 'remotive',
        });

        this.existingExternalIds.add(externalId);
      }

      this.logger.log(`Processed ${jobs.length} jobs from Remotive`);
    } catch (error) {
      this.logger.error('Error fetching Remotive jobs:', error.message);
    }
  }

  private async fetchFindworkJobs() {
    try {
      const response = await axios.get('https://findwork.dev/api/jobs/', {
        headers: {
          'Authorization': 'Token 6de73d0573f037530a13758cf1d77303fc3e2541'
        }
      });
      const jobs: FindworkJob[] = response.data.results;

      for (const job of jobs) {
        const externalId = `findwork-${job.id}`;
        
        if (this.existingExternalIds.has(externalId)) {
          continue;
        }

        await this.createJob({
          externalId,
          title: job.role,
          description: this.stripHtml(job.text),
          company: job.company_name,
          location: job.remote ? 'Remote' : (job.location || 'Unknown'),
          employmentType: this.mapEmploymentType([job.employment_type]),
          experienceLevel: this.extractExperienceLevel(job.text),
          techStack: job.keywords || [],
          submissionLink: job.url,
          source: 'findwork',
        });

        this.existingExternalIds.add(externalId);
      }

      this.logger.log(`Processed ${jobs.length} jobs from Findwork`);
    } catch (error) {
      this.logger.error('Error fetching Findwork jobs:', error.message);
    }
  }

    private async createJob(jobData: any) {
    try {
      this.logger.log(`✅ Creating NEW job: "${jobData.title}" at ${jobData.company} from ${jobData.source} (${jobData.externalId})`);
      
      // Remove undefined fields before sending to Firestore
      const cleanJobData = Object.fromEntries(
        Object.entries({
          externalId: jobData.externalId,
          title: jobData.title,
          description: jobData.description,
          company: jobData.company,
          location: jobData.location,
          employmentType: jobData.employmentType,
          experienceLevel: jobData.experienceLevel,
          salaryRange: jobData.salaryRange,
          techStack: jobData.techStack,
          logoUrl: jobData.logoUrl,
          submissionLink: jobData.submissionLink,
          source: jobData.source,
        }).filter(([_, value]) => value !== undefined)
      );
      
      await this.jobsService.create(cleanJobData as any);
      
      this.logger.log(`✨ Successfully created: "${jobData.title}" at ${jobData.company}`);
    } catch (error) {
      this.logger.error(`❌ Error creating job "${jobData.title}": ${error.message}`);
      this.logger.error(error.stack);
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  private mapEmploymentType(tags: string[]): EmploymentType {
    const tagString = tags.join(' ').toLowerCase();

    if (tagString.includes('full') || tagString.includes('full-time') || tagString.includes('full time')) {
      return EmploymentType.FULL_TIME;
    }
    if (tagString.includes('part') || tagString.includes('part-time') || tagString.includes('part time')) {
      return EmploymentType.PART_TIME;
    }
    if (tagString.includes('contract')) {
      return EmploymentType.CONTRACT;
    }
    if (tagString.includes('intern')) {
      return EmploymentType.INTERNSHIP;
    }

    return EmploymentType.FULL_TIME;
  }

  private extractExperienceLevel(description: string): ExperienceLevel {
    const lowerDesc = description.toLowerCase();

    if (lowerDesc.includes('senior') || lowerDesc.includes('lead') || lowerDesc.includes('principal')) {
      return ExperienceLevel.SENIOR;
    }
    if (lowerDesc.includes('junior') || lowerDesc.includes('entry') || lowerDesc.includes('graduate')) {
      return ExperienceLevel.JUNIOR;
    }

    return ExperienceLevel.MID;
  }
}