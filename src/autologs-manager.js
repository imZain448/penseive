import { TFile, TFolder, Notice } from 'obsidian';
import {
    getNotesInFolder,
    sortFilesByDate,
    formatDate,
    getTimeAgo
} from './utils.js';
import { LLMExtractor } from './llm-extractor.js';

/**
 * Main handler for generating autologs (general memory summaries)
 * @param {App} app - Obsidian app instance
 * @param {Object} settings - Plugin settings
 * @param {string} cycleType - Type of cycle ('daily', 'weekly', 'monthly')
 * @param {Date} targetDate - Target date for the log (defaults to today)
 */
export async function generateAutolog(app, settings, cycleType = 'daily', targetDate = new Date()) {
    try {
        console.log(`Generating ${cycleType} autolog for ${formatDate(targetDate)}`);

        // Get all journal notes
        const journalNotes = getNotesInFolder(app, settings.journalFolder);

        if (journalNotes.length === 0) {
            new Notice('No journal notes found for autolog generation');
            return;
        }

        // Filter notes by cycle and date
        const relevantNotes = filterNotesByCycle(journalNotes, cycleType, targetDate);

        if (relevantNotes.length === 0) {
            new Notice(`No notes found for ${cycleType} cycle ending ${formatDate(targetDate)}`);
            return;
        }

        // Sort notes by date
        const sortedNotes = sortFilesByDate(relevantNotes);

        // Combine notes content for LLM processing
        const notesContent = await combineNotesContent(app, sortedNotes);

        // Initialize LLM extractor
        const extractor = new LLMExtractor(settings);

        // Generate autolog summary using LLM
        const autologData = await extractor.generateAutolog(notesContent, cycleType, targetDate);

        // Create autolog file
        await createAutologFile(app, settings, cycleType, targetDate, autologData, relevantNotes);

        new Notice(`Generated ${cycleType} autolog with ${relevantNotes.length} notes`);
    } catch (error) {
        console.error('Error generating autolog:', error);
        new Notice('Error generating autolog');
    }
}

/**
 * Filter notes by cycle type and target date
 * @param {TFile[]} notes - Array of notes to filter
 * @param {string} cycleType - Type of cycle ('daily', 'weekly', 'monthly')
 * @param {Date} targetDate - Target date for the cycle
 * @returns {TFile[]} Filtered notes within the cycle
 */
function filterNotesByCycle(notes, cycleType, targetDate) {
    const cycleStart = getCycleStartDate(cycleType, targetDate);
    const cycleEnd = getCycleEndDate(cycleType, targetDate);

    return notes.filter(note => {
        const noteDate = new Date(note.stat.mtime);
        return noteDate >= cycleStart && noteDate <= cycleEnd;
    });
}

/**
 * Get the start date of a cycle
 * @param {string} cycleType - Type of cycle ('daily', 'weekly', 'monthly')
 * @param {Date} targetDate - Target date
 * @returns {Date} Start date of the cycle
 */
function getCycleStartDate(cycleType, targetDate) {
    const date = new Date(targetDate);

    switch (cycleType) {
        case 'daily':
            date.setHours(0, 0, 0, 0);
            return date;
        case 'weekly':
            // Start of week (Sunday)
            const dayOfWeek = date.getDay();
            date.setDate(date.getDate() - dayOfWeek);
            date.setHours(0, 0, 0, 0);
            return date;
        case 'monthly':
            date.setDate(1);
            date.setHours(0, 0, 0, 0);
            return date;
        default:
            throw new Error(`Unknown cycle type: ${cycleType}`);
    }
}

/**
 * Get the end date of a cycle
 * @param {string} cycleType - Type of cycle ('daily', 'weekly', 'monthly')
 * @param {Date} targetDate - Target date
 * @returns {Date} End date of the cycle
 */
function getCycleEndDate(cycleType, targetDate) {
    const date = new Date(targetDate);

    switch (cycleType) {
        case 'daily':
            date.setHours(23, 59, 59, 999);
            return date;
        case 'weekly':
            // End of week (Saturday)
            const dayOfWeek = date.getDay();
            date.setDate(date.getDate() + (6 - dayOfWeek));
            date.setHours(23, 59, 59, 999);
            return date;
        case 'monthly':
            date.setMonth(date.getMonth() + 1, 0); // Last day of month
            date.setHours(23, 59, 59, 999);
            return date;
        default:
            throw new Error(`Unknown cycle type: ${cycleType}`);
    }
}

/**
 * Combine notes content into a single string for LLM processing
 * @param {App} app - Obsidian app instance
 * @param {TFile[]} notes - Notes to combine
 * @returns {Promise<string>} Combined content
 */
async function combineNotesContent(app, notes) {
    let combinedContent = '';

    for (const note of notes) {
        try {
            const content = await app.vault.read(note);
            const noteDate = formatDate(new Date(note.stat.mtime));
            combinedContent += `\n\n--- ${note.name} (${noteDate}) ---\n${content}\n`;
        } catch (error) {
            console.error(`Error reading note ${note.name}:`, error);
        }
    }

    return combinedContent;
}

/**
 * Create autolog file with summary data
 * @param {App} app - Obsidian app instance
 * @param {Object} settings - Plugin settings
 * @param {string} cycleType - Type of cycle
 * @param {Date} targetDate - Target date
 * @param {Object} autologData - Data from LLM processing
 * @param {TFile[]} sourceNotes - Notes used to generate the autolog
 */
async function createAutologFile(app, settings, cycleType, targetDate, autologData, sourceNotes) {
    const autologsPath = `${settings.memoryFolder}/autologs`;

    // Ensure autologs folder exists
    await ensureFolderExists(app, autologsPath);

    // Generate filename based on cycle type and date
    const filename = generateAutologFilename(cycleType, targetDate);
    const filePath = `${autologsPath}/${filename}`;

    // Create file content
    const content = generateAutologContent(cycleType, targetDate, autologData, sourceNotes);

    // Check if file exists
    const existingFile = app.vault.getAbstractFileByPath(filePath);

    if (existingFile instanceof TFile) {
        await app.vault.modify(existingFile, content);
    } else {
        await app.vault.create(filePath, content);
    }
}

/**
 * Generate filename for autolog based on cycle type and date
 * @param {string} cycleType - Type of cycle
 * @param {Date} targetDate - Target date
 * @returns {string} Filename
 */
function generateAutologFilename(cycleType, targetDate) {
    const date = new Date(targetDate);

    switch (cycleType) {
        case 'daily':
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-daily-autolog.md`;
        case 'weekly':
            const weekStart = getCycleStartDate('weekly', date);
            return `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate() + weekStart.getDay()) / 7)).padStart(2, '0')}-weekly-autolog.md`;
        case 'monthly':
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-monthly-autolog.md`;
        default:
            throw new Error(`Unknown cycle type: ${cycleType}`);
    }
}

/**
 * Generate content for autolog file
 * @param {string} cycleType - Type of cycle
 * @param {Date} targetDate - Target date
 * @param {Object} autologData - Data from LLM processing
 * @param {TFile[]} sourceNotes - Notes used to generate the autolog
 * @returns {string} Formatted markdown content
 */
function generateAutologContent(cycleType, targetDate, autologData, sourceNotes) {
    const cycleStart = getCycleStartDate(cycleType, targetDate);
    const cycleEnd = getCycleEndDate(cycleType, targetDate);

    // Create frontmatter
    const frontmatter = [
        '---',
        `cycle_type: ${cycleType}`,
        `cycle_start: ${cycleStart.toISOString()}`,
        `cycle_end: ${cycleEnd.toISOString()}`,
        `generated_at: ${new Date().toISOString()}`,
        `source_notes_count: ${sourceNotes.length}`,
        `source_notes: [${sourceNotes.map(note => `"${note.path}"`).join(', ')}]`,
        '---'
    ].join('\n');

    // Create content
    const content = [
        `# ${cycleType.charAt(0).toUpperCase() + cycleType.slice(1)} Autolog`,
        '',
        `**Period:** ${formatDate(cycleStart)} - ${formatDate(cycleEnd)}`,
        `**Notes Processed:** ${sourceNotes.length}`,
        `**Generated:** ${formatDate(new Date())}`,
        '',
        '## Summary',
        '',
        autologData.summary || 'No summary available',
        '',
        '## What Was Done',
        '',
        autologData.completed || 'No completed tasks identified',
        '',
        '## What Was Not Done',
        '',
        autologData.incomplete || 'No incomplete tasks identified',
        '',
        '## Key Insights',
        '',
        autologData.insights || 'No insights available',
        '',
        '## Source Notes',
        '',
        ...sourceNotes.map(note => {
            const noteDate = formatDate(new Date(note.stat.mtime));
            return `- [[${note.path}|${note.name}]] (${noteDate})`;
        }),
        ''
    ].join('\n');

    return frontmatter + '\n\n' + content;
}

/**
 * Ensure a folder exists, create if it doesn't
 * @param {App} app - Obsidian app instance
 * @param {string} folderPath - Path to ensure exists
 */
async function ensureFolderExists(app, folderPath) {
    const folder = app.vault.getAbstractFileByPath(folderPath);
    if (!folder) {
        await app.vault.createFolder(folderPath);
    }
}

/**
 * Get recent autologs
 * @param {App} app - Obsidian app instance
 * @param {Object} settings - Plugin settings
 * @param {string} cycleType - Type of cycle to look for
 * @param {number} limit - Maximum number of autologs to return
 * @returns {TFile[]} Array of recent autolog files
 */
export function getRecentAutologs(app, settings, cycleType = 'daily', limit = 10) {
    const autologsPath = `${settings.memoryFolder}/autologs`;
    const autologsFolder = app.vault.getAbstractFileByPath(autologsPath);

    if (!autologsFolder || !(autologsFolder instanceof TFolder)) {
        return [];
    }

    const autologFiles = autologsFolder.children
        .filter(child => child instanceof TFile &&
            child.extension === 'md' &&
            child.name.includes(`${cycleType}-autolog`))
        .sort((a, b) => b.stat.mtime - a.stat.mtime)
        .slice(0, limit);

    return autologFiles;
} 