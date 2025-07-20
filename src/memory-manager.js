import { TFile, TFolder, Notice } from 'obsidian';
import {
    getProjects,
    getNotesInFolder,
    sortFilesByDate,
    getTimeAgo,
    formatDate
} from './utils.js';
import { LLMExtractor } from './llm-extractor.js';

/**
 * Main handler for updating project-level memories
 * @param {App} app - Obsidian app instance
 * @param {Object} settings - Plugin settings
 * @param {string[]} excludeProjects - List of projects to exclude from updates
 */
export async function updateProjectMemories(app, settings, excludeProjects = []) {
    try {
        const projects = getProjects(app, settings.projectRoot);
        const journalNotes = getNotesInFolder(app, settings.journalFolder);

        // Filter out excluded projects
        const activeProjects = projects.filter(project =>
            !excludeProjects.includes(project.name)
        );

        for (const project of activeProjects) {
            await updateSingleProjectMemory(app, settings, project, journalNotes);
        }

        new Notice(`Updated memories for ${activeProjects.length} projects`);
    } catch (error) {
        console.error('Error updating project memories:', error);
        new Notice('Error updating project memories');
    }
}

/**
 * Update memory for a single project
 * @param {App} app - Obsidian app instance
 * @param {Object} settings - Plugin settings
 * @param {TFolder} project - Project folder
 * @param {TFile[]} journalNotes - All journal notes
 */
async function updateSingleProjectMemory(app, settings, project, journalNotes) {
    const projectName = project.name;

    // Find notes related to this project in journal
    const projectNotes = findProjectNotesInJournal(journalNotes, projectName);

    if (projectNotes.length === 0) {
        return; // No new notes for this project
    }

    // Sort notes by date
    const sortedNotes = sortFilesByDate(projectNotes);

    // Combine notes content for LLM processing
    const notesContent = await combineNotesContent(app, sortedNotes);

    // Initialize LLM extractor
    const extractor = new LLMExtractor(settings);

    // Extract insights from notes using LLM
    const insights = await extractor.extractInsights(notesContent);

    // Extract tasks/todos using LLM
    const tasks = await extractor.extractTasks(notesContent);

    // Determine project status using LLM
    const metadata = {
        totalNotes: sortedNotes.length,
        recentNotes: sortedNotes.filter(note => {
            const daysSinceModification = (Date.now() - note.stat.mtime) / (1000 * 60 * 60 * 24);
            return daysSinceModification <= 7;
        }).length,
        lastActivity: getTimeAgo(new Date(sortedNotes[0].stat.mtime))
    };
    const status = await extractor.determineProjectStatus(notesContent, metadata);

    // Update memory files
    await updateMemoryFiles(app, settings, projectName, { tasks, status, insights });
}

/**
 * Find notes in journal that mention the project
 * @param {TFile[]} journalNotes - All journal notes
 * @param {string} projectName - Name of the project
 * @returns {TFile[]} Notes related to the project
 */
function findProjectNotesInJournal(journalNotes, projectName) {
    return journalNotes.filter(note => {
        // Check if project name appears in the note content or tags
        // This is a simple implementation - you might want to enhance this
        return note.name.toLowerCase().includes(projectName.toLowerCase()) ||
            note.path.toLowerCase().includes(projectName.toLowerCase());
    });
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
 * Update memory files for a project
 * @param {App} app - Obsidian app instance
 * @param {Object} settings - Plugin settings
 * @param {string} projectName - Name of the project
 * @param {Object} data - Data to write (tasks, status, insights)
 */
async function updateMemoryFiles(app, settings, projectName, data) {
    const memoryPath = `${settings.memoryFolder}/projects/${projectName}`;
    const today = formatDate(new Date());

    // Ensure memory folder exists
    await ensureFolderExists(app, memoryPath);

    // Update tasks.md
    await updateMemoryFile(app, projectName, `${memoryPath}/tasks.md`, 'Tasks', data.tasks, today);

    // Update status.md
    await updateMemoryFile(app, projectName, `${memoryPath}/status.md`, 'Status', data.status, today);

    // Update insights.md
    await updateMemoryFile(app, projectName, `${memoryPath}/insights.md`, 'Insights', data.insights, today);
}

/**
 * Update a single memory file
 * @param {App} app - Obsidian app instance
 * @param {string} filePath - Path to the memory file
 * @param {string} title - Title for the section
 * @param {Object} data - Data to write
 * @param {string} today - Today's date
 */
async function updateMemoryFile(app, projectName, filePath, title, data, today) {
    let content = '';

    // Check if file exists and read existing content
    const existingFile = app.vault.getAbstractFileByPath(filePath);
    if (existingFile instanceof TFile) {
        content = await app.vault.read(existingFile);
    }

    // Add new section with today's date as H2
    const newSection = generateMemorySection(title, data, today);

    // Append new section to existing content
    const updatedContent = content + '\n\n' + newSection;

    // Write back to file
    if (existingFile) {
        await app.vault.modify(existingFile, updatedContent);
    } else {
        // Add Obsidian-style file properties (YAML frontmatter)
        const fileProperties = [
            '---',
            `project_name: ${projectName}`,
            `memory_type: ${title}`,
            '---',
            `# ${title}`,
            ''
        ].join('\n');
        const updatedContentWithFrontmatter = fileProperties + updatedContent;
        await app.vault.create(filePath, updatedContentWithFrontmatter);
    }
}

/**
 * Generate a memory section with H2 date heading
 * @param {string} title - Section title
 * @param {Object} data - Data to format
 * @param {string} today - Today's date
 * @returns {string} Formatted markdown section
 */
function generateMemorySection(title, data, today) {
    let section = `## ${today}\n\n`;

    if (title === 'Tasks') {
        if (data.explicit && data.explicit.length > 0) {
            section += '### Explicit Tasks\n\n';
            data.explicit.forEach(task => {
                const status = task.completed ? '✅' : '⏳';
                section += `- ${status} ${task.text} (from: ${task.source})\n`;
            });
            section += '\n';
        }

        if (data.implied && data.implied.length > 0) {
            section += '### Implied Tasks\n\n';
            data.implied.forEach(task => {
                section += `- 💭 ${task.text} (from: ${task.source})\n`;
            });
            section += '\n';
        }
    } else if (title === 'Status') {
        section += `### Project Status: ${data.status}\n\n`;
        section += `- **Progress:** ${data.progress}%\n`;
        section += `- **Last Activity:** ${data.lastActivity}\n`;
        section += `- **Total Notes:** ${data.totalNotes}\n`;
        section += `- **Recent Notes:** ${data.recentNotes}\n\n`;
    } else if (title === 'Insights') {
        if (data.blockers && data.blockers.length > 0) {
            section += '### Blockers\n\n';
            data.blockers.forEach(blocker => {
                section += `- 🚫 ${blocker.text} (from: ${blocker.source})\n`;
            });
            section += '\n';
        }

        if (data.bugs && data.bugs.length > 0) {
            section += '### Bugs/Issues\n\n';
            data.bugs.forEach(bug => {
                section += `- 🐛 ${bug.text} (from: ${bug.source})\n`;
            });
            section += '\n';
        }

        if (data.achievements && data.achievements.length > 0) {
            section += '### Achievements\n\n';
            data.achievements.forEach(achievement => {
                section += `- 🎉 ${achievement.text} (from: ${achievement.source})\n`;
            });
            section += '\n';
        }

        if (data.general && data.general.length > 0) {
            section += '### General Insights\n\n';
            data.general.forEach(insight => {
                section += `- 💡 ${insight.text} (from: ${insight.source})\n`;
            });
            section += '\n';
        }
    }

    return section;
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