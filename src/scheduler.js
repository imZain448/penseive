import { updateProjectMemories } from './memory-manager.js';
import { refineProjectNotes } from './note-refiner.js';
import { generateAutolog } from './autologs-manager.js';

/**
 * Scheduler for automatic memory updates
 */
export class MemoryScheduler {
    constructor(plugin) {
        this.plugin = plugin;
        this.intervals = new Map(); // Store interval IDs
        this.isRunning = false;
    }

    /**
     * Start the scheduler with current settings
     */
    start() {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;
        this.scheduleUpdates();
    }

    /**
     * Stop the scheduler
     */
    stop() {
        this.isRunning = false;

        // Clear all intervals
        for (const intervalId of this.intervals.values()) {
            clearInterval(intervalId);
        }
        this.intervals.clear();
    }

    /**
     * Schedule updates based on settings
     */
    scheduleUpdates() {
        const { settings } = this.plugin;

        // Clear existing intervals
        this.stop();

        // Schedule project memory updates
        if (settings.autoUpdateProjectMemories) {
            const intervalMs = this.getIntervalMs(settings.projectMemoryUpdateInterval);
            const intervalId = setInterval(() => {
                this.runProjectMemoryUpdate();
            }, intervalMs);

            this.intervals.set('projectMemories', intervalId);
        }

        // Schedule general memory updates (future)
        if (settings.autoUpdateGeneralMemories) {
            const intervalMs = this.getIntervalMs(settings.generalMemoryUpdateInterval);
            const intervalId = setInterval(() => {
                this.runGeneralMemoryUpdate();
            }, intervalMs);

            this.intervals.set('generalMemories', intervalId);
        }

        // Schedule note refinement (future)
        if (settings.autoRefineNotes) {
            const intervalMs = this.getIntervalMs(settings.noteRefinementInterval);
            const intervalId = setInterval(() => {
                this.runNoteRefinement();
            }, intervalMs);

            this.intervals.set('noteRefinement', intervalId);
        }

        // Schedule autolog generation
        if (settings.autoGenerateAutologs) {
            const intervalMs = this.getIntervalMs(settings.autologGenerationInterval);
            const intervalId = setInterval(() => {
                this.runAutologGeneration();
            }, intervalMs);

            this.intervals.set('autologGeneration', intervalId);
        }
    }

    /**
     * Convert interval setting to milliseconds
     * @param {string} interval - Interval setting (e.g., 'daily', 'weekly', 'hourly')
     * @returns {number} Milliseconds
     */
    getIntervalMs(interval) {
        switch (interval) {
            case 'hourly':
                return 60 * 60 * 1000; // 1 hour
            case 'daily':
                return 24 * 60 * 60 * 1000; // 24 hours
            case 'weekly':
                return 7 * 24 * 60 * 60 * 1000; // 7 days
            case 'monthly':
                return 30 * 24 * 60 * 60 * 1000; // 30 days
            default:
                return 24 * 60 * 60 * 1000; // Default to daily
        }
    }

    /**
     * Run project memory update
     */
    async runProjectMemoryUpdate() {
        try {
            const { app, settings } = this.plugin;
            const excludeProjects = settings.excludeProjects || [];

            await updateProjectMemories(app, settings, excludeProjects);

            console.log('Scheduled project memory update completed');
        } catch (error) {
            console.error('Error in scheduled project memory update:', error);
        }
    }

    /**
     * Run general memory update (placeholder for future implementation)
     */
    async runGeneralMemoryUpdate() {
        try {
            // TODO: Implement general memory updates
            console.log('Scheduled general memory update completed');
        } catch (error) {
            console.error('Error in scheduled general memory update:', error);
        }
    }

    /**
     * Run note refinement
     */
    async runNoteRefinement() {
        try {
            const { app, settings } = this.plugin;
            const excludeProjects = settings.excludeProjects || [];

            await refineProjectNotes(app, settings, excludeProjects);

            console.log('Scheduled note refinement completed');
        } catch (error) {
            console.error('Error in scheduled note refinement:', error);
        }
    }

    /**
     * Run autolog generation
     */
    async runAutologGeneration() {
        try {
            const { app, settings } = this.plugin;
            const cycleType = settings.autologCycleType || 'daily';

            await generateAutolog(app, settings, cycleType);

            console.log('Scheduled autolog generation completed');
        } catch (error) {
            console.error('Error in scheduled autolog generation:', error);
        }
    }

    /**
     * Get scheduler status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            activeIntervals: Array.from(this.intervals.keys()),
            nextUpdateTimes: this.getNextUpdateTimes()
        };
    }

    /**
     * Get next update times for each scheduled task
     * @returns {Object} Next update times
     */
    getNextUpdateTimes() {
        const times = {};
        const now = Date.now();

        for (const [task, intervalId] of this.intervals) {
            // This is a simplified approach - in a real implementation,
            // you'd want to track the actual next update time
            const intervalMs = this.getIntervalMs(this.plugin.settings[`${task}UpdateInterval`]);
            times[task] = new Date(now + intervalMs);
        }

        return times;
    }
} 