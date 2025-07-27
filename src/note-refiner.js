import { TFile, TFolder, Notice } from 'obsidian';
import {
    getProjects,
    getNotesRecursively,
    sortFilesByDate,
    formatDate,
    getTimeAgo,
    sanitizeFilename,
    executeCommandWithErrorHandling
} from './utils.js';
import { LLMExtractor } from './llm-extractor.js';

/**
 * Main handler for note refinement
 * @param {App} app - Obsidian app instance
 * @param {Object} settings - Plugin settings
 * @param {string[]} excludeProjects - List of projects to exclude from refinement
 */
export async function refineProjectNotes(app, settings, excludeProjects = []) {
    return await executeCommandWithErrorHandling(
        async () => {
            const projects = getProjects(app, settings.projectRoot);

            // Filter out excluded projects
            const activeProjects = projects.filter(project =>
                !excludeProjects.includes(project.name)
            );

            for (const project of activeProjects) {
                await refineSingleProjectNotes(app, settings, project);
            }

            new Notice(`Refined notes for ${activeProjects.length} projects`);
        },
        'Refine Project Notes'
    );
}

/**
 * Refine notes for a single project
 * @param {App} app - Obsidian app instance
 * @param {Object} settings - Plugin settings
 * @param {TFolder} project - Project folder
 */
async function refineSingleProjectNotes(app, settings, project) {
    const projectName = project.name;
    const cleanOutputPath = `${settings.cleanOutputFolder}/${projectName}`;

    // Ensure clean output folder exists
    await ensureFolderExists(app, cleanOutputPath);

    // Get checkpoint file to track processed notes
    // This ensures we don't reprocess notes that have already been refined
    const checkpointPath = `${cleanOutputPath}/checkpoint.md`;
    const checkpoint = await loadCheckpoint(app, checkpointPath);

    // Get all notes in the project
    const projectNotes = getNotesRecursively(app, project.path);

    // Filter out already processed notes from checkpoint
    const unprocessedNotes = projectNotes.filter(note =>
        !checkpoint.processedNotes.includes(note.path)
    );

    if (unprocessedNotes.length === 0) {
        return; // No new notes to process
    }

    // Sort notes by date
    const sortedNotes = sortFilesByDate(unprocessedNotes);

    // Get recent memory insights if available
    const memoryInsights = await getRecentMemoryInsights(app, settings, projectName);

    // Initialize LLM extractor
    const extractor = new LLMExtractor(settings);

    // Process notes in batches based on compression ratio
    const batchSize = calculateBatchSize(sortedNotes.length, settings.noteRefinementCompressionRatio);
    const batches = createBatches(sortedNotes, batchSize);

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchNotes = await combineNotesContent(app, batch);

        // Refine the batch using LLM
        const refinedNotes = await extractor.refineNotes(
            batchNotes,
            memoryInsights,
            {
                ...settings.noteRefinementSettings,
                compressionRatio: settings.noteRefinementCompressionRatio
            }
        );

        // Save refined notes
        await saveRefinedNotes(app, cleanOutputPath, refinedNotes, i + 1);

        // Update checkpoint with newly processed notes
        checkpoint.processedNotes.push(...batch.map(note => note.path));
        checkpoint.lastProcessedDate = formatDate(new Date());
        checkpoint.lastMemoryUsed = memoryInsights.lastUsed || checkpoint.lastMemoryUsed;
    }

    // Update project tree
    await updateProjectTree(app, cleanOutputPath, {
        inputNotes: unprocessedNotes.map(note => note.name),
        outputNotes: batches.length,
        date: formatDate(new Date())
    });

    // Save checkpoint
    await saveCheckpoint(app, checkpointPath, checkpoint);
}

/**
 * Load checkpoint file to track processed notes
 * @param {App} app - Obsidian app instance
 * @param {string} checkpointPath - Path to checkpoint file
 * @returns {Object} Checkpoint data
 */
async function loadCheckpoint(app, checkpointPath) {
    const checkpointFile = app.vault.getAbstractFileByPath(checkpointPath);

    if (checkpointFile instanceof TFile) {
        try {
            const content = await app.vault.read(checkpointFile);
            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

            if (frontmatterMatch) {
                const frontmatterStr = frontmatterMatch[1];
                const checkpoint = {};

                frontmatterStr.split('\n').forEach(line => {
                    const colonIndex = line.indexOf(':');
                    if (colonIndex > 0) {
                        const key = line.substring(0, colonIndex).trim();
                        const value = line.substring(colonIndex + 1).trim();

                        if (key === 'processedNotes') {
                            checkpoint[key] = value ? value.split(',').map(p => p.trim()) : [];
                        } else {
                            checkpoint[key] = value;
                        }
                    }
                });

                return checkpoint;
            }
        } catch (error) {
            console.error('Error reading checkpoint:', error);
        }
    }

    // Return default checkpoint if file doesn't exist or is invalid
    return {
        processedNotes: [],
        lastProcessedDate: '',
        lastMemoryUsed: ''
    };
}

/**
 * Save checkpoint file
 * @param {App} app - Obsidian app instance
 * @param {string} checkpointPath - Path to checkpoint file
 * @param {Object} checkpoint - Checkpoint data
 */
async function saveCheckpoint(app, checkpointPath, checkpoint) {
    const frontmatter = [
        '---',
        `processedNotes: ${checkpoint.processedNotes.join(', ')}`,
        `lastProcessedDate: ${checkpoint.lastProcessedDate}`,
        `lastMemoryUsed: ${checkpoint.lastMemoryUsed}`,
        '---',
        '# Checkpoint',
        '',
        'This file tracks which notes have been processed by the note refinement system.',
        '',
        `**Last Processed:** ${checkpoint.lastProcessedDate}`,
        `**Last Memory Used:** ${checkpoint.lastMemoryUsed}`,
        `**Total Processed Notes:** ${checkpoint.processedNotes.length}`
    ].join('\n');

    const checkpointFile = app.vault.getAbstractFileByPath(checkpointPath);

    if (checkpointFile instanceof TFile) {
        await app.vault.modify(checkpointFile, frontmatter);
    } else {
        await app.vault.create(checkpointPath, frontmatter);
    }
}

/**
 * Get recent memory insights for a project
 * @param {App} app - Obsidian app instance
 * @param {Object} settings - Plugin settings
 * @param {string} projectName - Name of the project
 * @returns {Object} Memory insights and metadata
 */
async function getRecentMemoryInsights(app, settings, projectName) {
    const memoryPath = `${settings.memoryFolder}/projects/${projectName}`;
    const insightsFile = app.vault.getAbstractFileByPath(`${memoryPath}/insights.md`);

    if (!insightsFile || !(insightsFile instanceof TFile)) {
        return { insights: '', lastUsed: '' };
    }

    try {
        const content = await app.vault.read(insightsFile);

        // Extract the most recent insights (last H2 section)
        const sections = content.split(/(?=^## )/m);
        const lastSection = sections[sections.length - 1];

        if (lastSection) {
            const dateMatch = lastSection.match(/^## (.+)$/m);
            const date = dateMatch ? dateMatch[1] : '';

            return {
                insights: lastSection,
                lastUsed: date
            };
        }

        return { insights: content, lastUsed: '' };
    } catch (error) {
        console.error('Error reading memory insights:', error);
        return { insights: '', lastUsed: '' };
    }
}

/**
 * Calculate batch size based on compression ratio
 * @param {number} totalNotes - Total number of notes
 * @param {number} compressionRatio - Target compression ratio (output/input)
 * @returns {number} Batch size
 */
function calculateBatchSize(totalNotes, compressionRatio) {
    // Default to processing 10 notes at a time if compression ratio is not set
    if (!compressionRatio || compressionRatio <= 0) {
        return Math.min(10, totalNotes);
    }

    // Calculate how many notes should be processed together to achieve the ratio
    const batchSize = Math.max(1, Math.round(1 / compressionRatio));
    return Math.min(batchSize, totalNotes);
}

/**
 * Create batches of notes
 * @param {TFile[]} notes - Array of notes
 * @param {number} batchSize - Size of each batch
 * @returns {TFile[][]} Array of batches
 */
function createBatches(notes, batchSize) {
    const batches = [];
    for (let i = 0; i < notes.length; i += batchSize) {
        batches.push(notes.slice(i, i + batchSize));
    }
    return batches;
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
            combinedContent += `\n\n--- ${note.name} ---\n${content}\n`;
        } catch (error) {
            console.error(`Error reading note ${note.name}:`, error);
        }
    }

    return combinedContent;
}

/**
 * Save refined notes to the clean output folder
 * @param {App} app - Obsidian app instance
 * @param {string} cleanOutputPath - Path to clean output folder
 * @param {Object[]} refinedNotes - Array of refined notes
 * @param {number} batchNumber - Batch number for naming
 */
async function saveRefinedNotes(app, cleanOutputPath, refinedNotes, batchNumber) {
    for (let i = 0; i < refinedNotes.length; i++) {
        const note = refinedNotes[i];
        let fileName = `${sanitizeFilename(note.title)}.md`;
        let filePath = `${cleanOutputPath}/${fileName}`;

        // Handle duplicate filenames by adding a number suffix
        let counter = 1;
        while (app.vault.getAbstractFileByPath(filePath)) {
            const baseName = sanitizeFilename(note.title);
            fileName = `${baseName}-${counter}.md`;
            filePath = `${cleanOutputPath}/${fileName}`;
            counter++;
        }

        const content = [
            '---',
            `title: ${note.title}`,
            `type: refined-note`,
            `batch: ${batchNumber}`,
            `created: ${formatDate(new Date())}`,
            '---',
            '',
            note.content
        ].join('\n');

        await app.vault.create(filePath, content);
    }
}

/**
 * Update project tree to track refinement history
 * @param {App} app - Obsidian app instance
 * @param {string} cleanOutputPath - Path to clean output folder
 * @param {Object} refinementData - Data about the refinement
 */
async function updateProjectTree(app, cleanOutputPath, refinementData) {
    const treePath = `${cleanOutputPath}/project-tree.md`;
    const treeFile = app.vault.getAbstractFileByPath(treePath);

    let content = '';
    if (treeFile instanceof TFile) {
        content = await app.vault.read(treeFile);
    } else {
        content = [
            '---',
            'type: project-tree',
            '---',
            '# Project Refinement History',
            '',
            'This file tracks the history of note refinement for this project.',
            ''
        ].join('\n');
    }

    const newEntry = [
        `## ${refinementData.date}`,
        '',
        '### Input Notes',
        ...refinementData.inputNotes.map(note => `- ${note}`),
        '',
        '### Output Notes',
        `- Generated ${refinementData.outputNotes} refined note(s)`,
        ''
    ].join('\n');

    const updatedContent = content + '\n' + newEntry;

    if (treeFile instanceof TFile) {
        await app.vault.modify(treeFile, updatedContent);
    } else {
        await app.vault.create(treePath, updatedContent);
    }
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