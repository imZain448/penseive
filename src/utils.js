import { TFile, TFolder } from 'obsidian';

/**
 * Sort files by modification date (newest first)
 * @param {TFile[]} files - Array of files to sort
 * @returns {TFile[]} Sorted array of files
 */
export function sortFilesByDate(files) {
    return files.sort((a, b) => b.stat.mtime - a.stat.mtime);
}

/**
 * Sort files by creation date (newest first)
 * @param {TFile[]} files - Array of files to sort
 * @returns {TFile[]} Sorted array of files
 */
export function sortFilesByCreationDate(files) {
    return files.sort((a, b) => b.stat.ctime - a.stat.ctime);
}

/**
 * Get all projects (subfolders) within the project root folder
 * @param {App} app - Obsidian app instance
 * @param {string} projectRoot - Path to project root folder
 * @returns {TFolder[]} Array of project folders
 */
export function getProjects(app, projectRoot) {
    const rootFolder = app.vault.getAbstractFileByPath(projectRoot);
    if (!rootFolder || !(rootFolder instanceof TFolder)) {
        return [];
    }

    return rootFolder.children
        .filter(child => child instanceof TFolder)
        .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get all notes within a specific folder
 * @param {App} app - Obsidian app instance
 * @param {string} folderPath - Path to folder
 * @returns {TFile[]} Array of markdown files in the folder
 */
export function getNotesInFolder(app, folderPath) {
    const folder = app.vault.getAbstractFileByPath(folderPath);
    if (!folder || !(folder instanceof TFolder)) {
        return [];
    }

    return folder.children
        .filter(child => child instanceof TFile && child.extension === 'md')
        .sort((a, b) => b.stat.mtime - a.stat.mtime);
}

/**
 * Get all notes recursively within a folder and its subfolders
 * @param {App} app - Obsidian app instance
 * @param {string} folderPath - Path to folder
 * @returns {TFile[]} Array of markdown files in the folder and subfolders
 */
export function getNotesRecursively(app, folderPath) {
    const folder = app.vault.getAbstractFileByPath(folderPath);
    if (!folder || !(folder instanceof TFolder)) {
        return [];
    }

    const notes = [];

    function traverseFolder(currentFolder) {
        for (const child of currentFolder.children) {
            if (child instanceof TFile && child.extension === 'md') {
                notes.push(child);
            } else if (child instanceof TFolder) {
                traverseFolder(child);
            }
        }
    }

    traverseFolder(folder);
    return notes.sort((a, b) => b.stat.mtime - a.stat.mtime);
}

/**
 * Get notes modified within a specific time period
 * @param {TFile[]} files - Array of files to filter
 * @param {number} days - Number of days to look back
 * @returns {TFile[]} Array of files modified within the period
 */
export function getRecentNotes(files, days = 7) {
    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);
    return files.filter(file => file.stat.mtime > cutoffDate);
}

/**
 * Get notes that haven't been modified for a while
 * @param {TFile[]} files - Array of files to filter
 * @param {number} days - Number of days to consider "inactive"
 * @returns {TFile[]} Array of inactive files
 */
export function getInactiveNotes(files, days = 30) {
    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);
    return files.filter(file => file.stat.mtime < cutoffDate);
}

/**
 * Extract frontmatter from a file
 * @param {TFile} file - File to extract frontmatter from
 * @returns {Object|null} Frontmatter object or null if not found
 */
export async function getFrontmatter(app, file) {
    try {
        const content = await app.vault.read(file);
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (frontmatterMatch) {
            const frontmatterStr = frontmatterMatch[1];
            // Simple YAML parsing (you might want to use a proper YAML parser)
            const frontmatter = {};
            frontmatterStr.split('\n').forEach(line => {
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.substring(0, colonIndex).trim();
                    const value = line.substring(colonIndex + 1).trim();
                    frontmatter[key] = value;
                }
            });
            return frontmatter;
        }
        return null;
    } catch (error) {
        console.error('Error reading frontmatter:', error);
        return null;
    }
}

/**
 * Get the project folder that contains a specific file
 * @param {App} app - Obsidian app instance
 * @param {TFile} file - File to find project for
 * @param {string} projectRoot - Path to project root folder
 * @returns {TFolder|null} Project folder or null if not found
 */
export function getProjectForFile(app, file, projectRoot) {
    const projects = getProjects(app, projectRoot);
    const filePath = file.path;

    for (const project of projects) {
        if (filePath.startsWith(project.path + '/')) {
            return project;
        }
    }

    return null;
}

/**
 * Check if a file is within a specific folder
 * @param {TFile} file - File to check
 * @param {string} folderPath - Path to folder
 * @returns {boolean} True if file is in the folder
 */
export function isFileInFolder(file, folderPath) {
    return file.path.startsWith(folderPath + '/') || file.path === folderPath;
}

/**
 * Get the relative path of a file within a folder
 * @param {TFile} file - File to get relative path for
 * @param {string} folderPath - Base folder path
 * @returns {string} Relative path
 */
export function getRelativePath(file, folderPath) {
    if (file.path === folderPath) {
        return file.name;
    }
    return file.path.substring(folderPath.length + 1);
}

/**
 * Format a date for display
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Get the time difference between now and a date in human-readable format
 * @param {Date} date - Date to compare
 * @returns {string} Human-readable time difference
 */
export function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
        return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
        return 'Just now';
    }
}

/**
 * Sanitize filename for safe file creation
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(filename) {
    return filename
        .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
        .toLowerCase();
}

/**
 * Extract links from markdown content
 * @param {string} content - Markdown content
 * @returns {string[]} Array of link texts
 */
export function extractLinks(content) {
    const linkRegex = /\[\[([^\]]+)\]\]/g;
    const links = [];
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
        links.push(match[1]);
    }

    return links;
}

/**
 * Generate internal links for a list of concepts
 * @param {string[]} concepts - Array of concept names
 * @returns {string} Markdown formatted links
 */
export function generateInternalLinks(concepts) {
    return concepts.map(concept => `[[${concept}]]`).join(', ');
} 