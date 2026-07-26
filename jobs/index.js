import cron from 'node-cron';
import getSettings from '../utils/getSettings.js';
import logger from '../utils/logger.js';
import { calculateWeeklyAwards } from './weeklyAwards.js';
import { calculateMonthlyAwards } from './monthlyAwards.js';
import { cleanExpiredStories } from './storyCleanup.js';
import { refreshFeedRankings } from './feedRanking.js';
import { checkSubscriptions } from './checkSubscriptions.js';
import { createAutoBackup } from '../services/backupService.js';

const jobs = new Map();

const jobDefinitions = [
  { name: 'weeklyAwards', handler: calculateWeeklyAwards, defaultSchedule: '0 8 * * 1' },
  { name: 'monthlyAwards', handler: calculateMonthlyAwards, defaultSchedule: '0 8 1 * *' },
  { name: 'storyCleanup', handler: cleanExpiredStories, defaultSchedule: '0 * * * *' },
  { name: 'feedRanking', handler: refreshFeedRankings, defaultSchedule: '*/30 * * * *' },
  { name: 'checkSubscriptions', handler: checkSubscriptions, defaultSchedule: '0 8 * * *' },
  { name: 'autoBackup', handler: createAutoBackup, defaultSchedule: '0 3 * * *' },
];

const getSchedule = async (jobName, defaultSchedule) => {
  try {
    const settings = await getSettings();
    if (jobName === 'autoBackup') {
      const schedule = settings?.backups?.schedule;
      const time = settings?.backups?.time || '03:00';
      const [hour, minute] = time.split(':');
      if (schedule === 'manual') return null;
      if (schedule === 'weekly') return `${minute} ${hour} * * 0`;
      return `${minute} ${hour} * * *`;
    }
    return settings?.jobs?.[jobName] || defaultSchedule;
  } catch {
    return defaultSchedule;
  }
};

export const startAllJobs = async () => {
  for (const jobDef of jobDefinitions) {
    const schedule = await getSchedule(jobDef.name, jobDef.defaultSchedule);

    if (schedule === null) {
      logger.info(`Job skipped (disabled): ${jobDef.name}`);
      jobs.set(jobDef.name, { task: null, schedule: 'disabled', lastRun: null, lastStatus: null, lastDuration: null, lastError: null });
      continue;
    }

    if (!cron.validate(schedule)) {
      logger.error(`Invalid cron schedule for ${jobDef.name}: ${schedule}`);
      continue;
    }

    const task = cron.schedule(schedule, async () => {
      logger.info(`Job started: ${jobDef.name}`);
      const start = Date.now();
      try {
        await jobDef.handler();
        const duration = Date.now() - start;
        logger.info(`Job completed: ${jobDef.name} (${duration}ms)`);
        updateJobStatus(jobDef.name, 'success', null, duration);
      } catch (error) {
        logger.error(`Job failed: ${jobDef.name}`, error);
        updateJobStatus(jobDef.name, 'failed', error.message, Date.now() - start);
      }
    });

    jobs.set(jobDef.name, { task, schedule, lastRun: null, lastStatus: null, lastDuration: null, lastError: null });
    logger.info(`Job scheduled: ${jobDef.name} (${schedule})`);
  }

  logger.info(`${jobs.size} cron jobs processed`);
};

export const stopAllJobs = () => {
  for (const [name, job] of jobs) {
    if (job.task) {
      job.task.stop();
      logger.info(`Job stopped: ${name}`);
    }
  }
  jobs.clear();
};

export const stopJob = (jobName) => {
  const job = jobs.get(jobName);
  if (!job || !job.task) return false;
  job.task.stop();
  logger.info(`Job stopped: ${jobName}`);
  return true;
};

export const restartJob = async (jobName) => {
  const job = jobs.get(jobName);
  if (!job) return false;
  if (job.task) job.task.stop();

  const def = jobDefinitions.find(j => j.name === jobName);
  if (!def) return false;

  const schedule = await getSchedule(jobName, def.defaultSchedule);
  if (schedule === null) {
    jobs.set(jobName, { ...job, task: null, schedule: 'disabled' });
    return true;
  }

  const task = cron.schedule(schedule, async () => {
    await def.handler();
    updateJobStatus(jobName, 'success', null, 0);
  });

  jobs.set(jobName, { ...job, task, schedule });
  logger.info(`Job restarted: ${jobName} (${schedule})`);
  return true;
};

export const runJobManually = async (jobName) => {
  const def = jobDefinitions.find(j => j.name === jobName);
  if (!def) return { success: false, message: 'Job not found' };

  logger.info(`Job triggered manually: ${jobName}`);
  const start = Date.now();
  try {
    await def.handler();
    const duration = Date.now() - start;
    updateJobStatus(jobName, 'success', null, duration);
    return { success: true, duration };
  } catch (error) {
    updateJobStatus(jobName, 'failed', error.message, Date.now() - start);
    return { success: false, error: error.message };
  }
};

const updateJobStatus = (jobName, status, error, duration) => {
  const job = jobs.get(jobName);
  if (job) {
    job.lastRun = new Date();
    job.lastStatus = status;
    job.lastDuration = duration;
    job.lastError = error || null;
  }
};

export const getJobStatuses = () => {
  const result = {};
  for (const [name, job] of jobs) {
    result[name] = {
      schedule: job.schedule,
      lastRun: job.lastRun,
      lastStatus: job.lastStatus,
      lastDuration: job.lastDuration,
      lastError: job.lastError,
      running: job.task ? job.task.running : false,
    };
  }
  return result;
};