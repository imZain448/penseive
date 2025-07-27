import { ItemView, WorkspaceLeaf, Notice, TFolder, TFile, Modal, MarkdownRenderer } from 'obsidian';
import { generateAutolog, getRecentAutologs } from './autologs-manager.js';
import { updateProjectMemories } from './memory-manager.js';
import { LLMExtractor, RequestLimitExceededError } from './llm-extractor.js';
import { getProjects, handleRequestLimitError } from './utils.js';

/**
 * View type identifier for the dashboard
 */
export const PENSIEVE_DASHBOARD_VIEW_TYPE = 'pensieve-dashboard';

/**
 * Main dashboard view for Pensieve (appears in main editor area)
 */
export class PensieveDashboardView extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
        this.currentView = 'autologs'; // 'autologs' or 'project_memories'
        this.selectedProject = null;
        this.selectedDate = new Date();
        this.lastNCheckpoints = 5;
        this.lastNAutologs = 5;
        this.customPrompt = '';
        this.projectData = null;
        this.autologData = null;
    }

    getViewType() {
        return PENSIEVE_DASHBOARD_VIEW_TYPE;
    }

    getDisplayText() {
        return 'Pensieve Dashboard';
    }

    getIcon() {
        return 'brain';
    }

    async onOpen() {
        console.log('PensieveDashboardView onOpen called');
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('pensieve-dashboard');

        try {
            this.renderHeader();
            await this.renderContent();
            await this.loadInitialData();
        } catch (error) {
            console.error('Error rendering dashboard:', error);
            // Fallback content
            containerEl.createEl('h1', { text: 'Pensieve Dashboard' });
            containerEl.createEl('p', { text: 'Dashboard loaded successfully. If you see this, the dashboard is working but there might be an issue with the content rendering.' });
        }
    }

    async onClose() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.removeClass('pensieve-dashboard');
    }

    /**
     * Render the dashboard header with view selector
     */
    renderHeader() {
        console.log('Rendering header...');
        const header = this.containerEl.createDiv('pensieve-dashboard-header');

        // Title
        header.createEl('h2', { text: 'Pensieve Dashboard' });

        // View selector
        const viewSelector = header.createDiv('pensieve-view-selector');

        const autologsBtn = viewSelector.createEl('button', {
            text: 'Autologs',
            cls: this.currentView === 'autologs' ? 'active' : ''
        });
        autologsBtn.onclick = async () => {
            await this.switchView('autologs');
            this.updateButtonStates();
        };

        const projectMemoriesBtn = viewSelector.createEl('button', {
            text: 'Project Memories',
            cls: this.currentView === 'project_memories' ? 'active' : ''
        });
        projectMemoriesBtn.onclick = async () => {
            await this.switchView('project_memories');
            this.updateButtonStates();
        };
        console.log('Header rendered');
    }

    /**
     * Render the main content area
     */
    async renderContent() {
        console.log('Rendering content for view:', this.currentView);
        const content = this.containerEl.createDiv('pensieve-dashboard-content');

        if (this.currentView === 'autologs') {
            await this.renderAutologsView(content);
        } else {
            await this.renderProjectMemoriesView(content);
        }
        console.log('Content rendered');
    }

    /**
     * Update button states to reflect current view
     */
    updateButtonStates() {
        const autologsBtn = this.containerEl.querySelector('.pensieve-view-selector button:first-child');
        const projectMemoriesBtn = this.containerEl.querySelector('.pensieve-view-selector button:last-child');

        if (autologsBtn) {
            autologsBtn.classList.toggle('active', this.currentView === 'autologs');
        }
        if (projectMemoriesBtn) {
            projectMemoriesBtn.classList.toggle('active', this.currentView === 'project_memories');
        }
    }

    /**
     * Render autologs view
     */
    async renderAutologsView(container) {
        console.log('Rendering autologs view...');
        // Controls section
        const controls = container.createDiv('pensieve-controls');

        // Date selector
        const dateControl = controls.createDiv('pensieve-control-group');
        dateControl.createEl('label', { text: 'Select Date:' });
        const dateInput = dateControl.createEl('input', {
            type: 'date',
            value: this.formatDateForInput(this.selectedDate)
        });
        dateInput.onchange = (e) => {
            this.selectedDate = new Date(e.target.value);
            this.loadAutologData();
        };

        // Last N autologs control
        const lastNControl = controls.createDiv('pensieve-control-group');
        lastNControl.createEl('label', { text: 'Last N Autologs:' });
        const lastNInput = lastNControl.createEl('input', {
            type: 'number',
            value: this.lastNAutologs,
            min: 1,
            max: 20
        });
        lastNInput.onchange = (e) => {
            this.lastNAutologs = parseInt(e.target.value);
        };

        // Analyze button
        const analyzeBtn = controls.createEl('button', {
            text: 'Analyze Last N Logs',
            cls: 'pensieve-btn primary'
        });
        analyzeBtn.onclick = () => this.showAnalyzeModal();

        // Generate new autolog button
        const generateBtn = controls.createEl('button', {
            text: 'Generate New Autolog',
            cls: 'pensieve-btn secondary'
        });
        generateBtn.onclick = () => this.generateNewAutolog();

        // Results section
        this.autologResultsContainer = container.createDiv('pensieve-results');
        this.autologResultsContainer.addClass('pensieve-autolog-results');
        await this.renderAutologResults();
    }

    /**
     * Render project memories view
     */
    async renderProjectMemoriesView(container) {
        // Controls section
        const controls = container.createDiv('pensieve-controls');

        // Project selector
        const projectControl = controls.createDiv('pensieve-control-group');
        projectControl.createEl('label', { text: 'Select Project:' });
        this.projectSelect = projectControl.createEl('select');
        this.loadProjects();

        // Last N checkpoints control
        const lastNControl = controls.createDiv('pensieve-control-group');
        lastNControl.createEl('label', { text: 'Last N Checkpoints:' });
        const lastNInput = lastNControl.createEl('input', {
            type: 'number',
            value: this.lastNCheckpoints,
            min: 1,
            max: 20
        });
        lastNInput.onchange = (e) => {
            this.lastNCheckpoints = parseInt(e.target.value);
            if (this.selectedProject) {
                this.loadProjectData();
            }
        };

        // Search control
        const searchControl = controls.createDiv('pensieve-control-group');
        searchControl.createEl('label', { text: 'Search:' });
        const searchInput = searchControl.createEl('input', {
            type: 'text',
            placeholder: 'Search projects...'
        });
        searchInput.oninput = (e) => this.filterProjects(e.target.value);

        // Load button
        const loadBtn = controls.createEl('button', {
            text: 'Load Project Data',
            cls: 'pensieve-btn primary'
        });
        loadBtn.onclick = () => this.loadProjectData();

        // Results section
        this.projectResultsContainer = container.createDiv('pensieve-results');
        this.projectResultsContainer.addClass('pensieve-project-results');
        await this.renderProjectResults();
    }

    /**
     * Render autolog results
     */
    async renderAutologResults() {
        this.autologResultsContainer.empty();

        if (!this.autologData) {
            this.autologResultsContainer.createEl('p', {
                text: 'Select a date to view autolog data',
                cls: 'pensieve-placeholder'
            });
            return;
        }

        console.log('Autolog data:', this.autologData);

        // Summary section
        const summary = this.autologResultsContainer.createDiv('pensieve-summary');
        summary.createEl('h3', { text: 'Summary' });
        const summaryContent = summary.createEl('div', { cls: 'pensieve-content' });
        await MarkdownRenderer.render(this.app, this.autologData.summary || 'No summary available', summaryContent, '', this.plugin);

        // Three-panel layout
        const panels = this.autologResultsContainer.createDiv('pensieve-panels');

        // What was done panel
        const donePanel = panels.createDiv('pensieve-panel');
        donePanel.createEl('h3', { text: 'What Was Done' });
        const doneContent = donePanel.createEl('div', { cls: 'pensieve-content' });
        await MarkdownRenderer.render(this.app, this.autologData.completed || 'No completed tasks available', doneContent, '', this.plugin);
        this.ensureTextSelection(doneContent);

        // What wasn't done panel
        const notDonePanel = panels.createDiv('pensieve-panel');
        notDonePanel.createEl('h3', { text: 'What Was Not Done' });
        const notDoneContent = notDonePanel.createEl('div', { cls: 'pensieve-content' });
        await MarkdownRenderer.render(this.app, this.autologData.incomplete || 'No incomplete tasks available', notDoneContent, '', this.plugin);
        this.ensureTextSelection(notDoneContent);

        // Insights panel
        const insightsPanel = panels.createDiv('pensieve-panel');
        insightsPanel.createEl('h3', { text: 'Key Insights' });
        const insightsContent = insightsPanel.createEl('div', { cls: 'pensieve-content' });
        await MarkdownRenderer.render(this.app, this.autologData.insights || 'No insights available', insightsContent, '', this.plugin);
        this.ensureTextSelection(insightsContent);

        // Export insights button
        const exportBtn = insightsPanel.createEl('button', {
            text: 'Export Insights as Note',
            cls: 'pensieve-btn secondary'
        });
        exportBtn.onclick = () => this.exportInsightsAsNote();
    }

    /**
 * Render project results
 */
    async renderProjectResults() {
        this.projectResultsContainer.empty();

        if (!this.projectData) {
            this.projectResultsContainer.createEl('p', {
                text: 'Select a project and load data to view project memories',
                cls: 'pensieve-placeholder'
            });
            return;
        }

        // Project header
        const header = this.projectResultsContainer.createDiv('pensieve-project-header');
        header.createEl('h3', { text: this.selectedProject });

        // Top row: Status + Status Summary
        const topRow = this.projectResultsContainer.createDiv('pensieve-top-row');

        console.log('Project data:', this.projectData);

        // Status panel (left, larger)
        const statusPanel = topRow.createDiv('pensieve-panel pensieve-status-panel');
        statusPanel.createEl('h3', { text: 'Status' });
        const statusContent = statusPanel.createEl('div', { cls: 'pensieve-content' });
        await MarkdownRenderer.render(this.app, this.projectData.status, statusContent, '', this.plugin);
        this.ensureTextSelection(statusContent);

        // Status Summary panel (right, smaller)
        const statusSummaryPanel = topRow.createDiv('pensieve-panel pensieve-summary-panel');
        statusSummaryPanel.createEl('h3', { text: 'Status Summary' });
        const statusSummaryContent = statusSummaryPanel.createEl('div', { cls: 'pensieve-content' });
        await MarkdownRenderer.render(this.app, this.projectData.statusSummary, statusSummaryContent, '', this.plugin);
        this.ensureTextSelection(statusSummaryContent);

        // Bottom row: Tasks + Insights
        const bottomRow = this.projectResultsContainer.createDiv('pensieve-bottom-row');

        // Tasks panel (left)
        const tasksPanel = bottomRow.createDiv('pensieve-panel pensieve-tasks-panel');
        tasksPanel.createEl('h3', { text: 'Tasks' });
        const tasksContent = tasksPanel.createEl('div', { cls: 'pensieve-content' });
        await MarkdownRenderer.render(this.app, this.projectData.tasks, tasksContent, '', this.plugin);
        this.ensureTextSelection(tasksContent);

        // Insights panel (right)
        const insightsPanel = bottomRow.createDiv('pensieve-panel pensieve-insights-panel');
        insightsPanel.createEl('h3', { text: 'Insights' });
        const insightsContent = insightsPanel.createEl('div', { cls: 'pensieve-content' });
        await MarkdownRenderer.render(this.app, this.projectData.insights, insightsContent, '', this.plugin);
        this.ensureTextSelection(insightsContent);

        // Add individual export buttons for each checkpoint
        this.addInsightExportButtons(insightsPanel, this.projectData.insights);
    }

    /**
     * Switch between views
     */
    async switchView(view) {
        console.log('Switching to view:', view);
        this.currentView = view;

        // Clear only the content area, not the entire container
        const contentArea = this.containerEl.querySelector('.pensieve-dashboard-content');
        if (contentArea) {
            contentArea.remove();
        }

        // Re-render only the content, not the header
        await this.renderContent();
        await this.loadInitialData();
    }

    /**
     * Load initial data based on current view
     */
    async loadInitialData() {
        if (this.currentView === 'autologs') {
            await this.loadAutologData();
        } else {
            // Project memories will load when a project is selected
        }
    }

    /**
     * Load autolog data for selected date
     */
    async loadAutologData() {
        try {
            // Get autolog file for the selected date
            const autologsPath = `${this.plugin.settings.memoryFolder}/autologs`;
            const filename = this.generateAutologFilename('daily', this.selectedDate);
            const filePath = `${autologsPath}/${filename}`;

            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (file instanceof TFile) {
                const content = await this.app.vault.read(file);
                this.autologData = this.parseAutologContent(content);
            } else {
                this.autologData = null;
            }

            await this.renderAutologResults();
        } catch (error) {
            console.error('Error loading autolog data:', error);
            new Notice('Error loading autolog data');
        }
    }

    /**
     * Load projects for dropdown
     */
    loadProjects() {
        this.projectSelect.empty();

        const projects = getProjects(this.app, this.plugin.settings.projectRoot);

        // Add placeholder
        const placeholder = this.projectSelect.createEl('option', {
            text: 'Select a project...',
            value: ''
        });
        placeholder.disabled = true;
        placeholder.selected = true;

        // Add project options
        projects.forEach(project => {
            const option = this.projectSelect.createEl('option', {
                text: project.name,
                value: project.name
            });
        });

        this.projectSelect.onchange = (e) => {
            this.selectedProject = e.target.value || null;
        };
    }

    /**
     * Filter projects based on search input
     */
    filterProjects(searchTerm) {
        const options = this.projectSelect.querySelectorAll('option');
        options.forEach(option => {
            if (option.value === '') return; // Skip placeholder

            const matches = option.text.toLowerCase().includes(searchTerm.toLowerCase());
            option.style.display = matches ? '' : 'none';
        });
    }

    /**
     * Load project data
     */
    async loadProjectData() {
        if (!this.selectedProject) {
            new Notice('Please select a project first');
            return;
        }

        try {
            const projectPath = `${this.plugin.settings.projectRoot}/${this.selectedProject}`;
            const memoryPath = `${this.plugin.settings.memoryFolder}/projects/${this.selectedProject}`;

            // Load status, tasks, and insights files
            const statusFile = this.app.vault.getAbstractFileByPath(`${memoryPath}/status.md`);
            const tasksFile = this.app.vault.getAbstractFileByPath(`${memoryPath}/tasks.md`);
            const insightsFile = this.app.vault.getAbstractFileByPath(`${memoryPath}/insights.md`);

            // Parse files with checkpoint logic
            const statusContent = statusFile ? await this.app.vault.read(statusFile) : 'No status data available';
            const tasksContent = tasksFile ? await this.app.vault.read(tasksFile) : 'No tasks data available';
            const insightsContent = insightsFile ? await this.app.vault.read(insightsFile) : 'No insights data available';

            this.projectData = {
                status: this.parseLatestStatus(statusContent),
                statusSummary: this.parseLatestStatusSummary(statusContent),
                tasks: this.parseLastNCheckpoints(tasksContent, this.lastNCheckpoints),
                insights: this.parseLastNCheckpoints(insightsContent, this.lastNCheckpoints)
            };

            await this.renderProjectResults();
        } catch (error) {
            console.error('Error loading project data:', error);
            new Notice('Error loading project data');
        }
    }

    /**
     * Show analyze modal for last N autologs
     */
    showAnalyzeModal() {
        new AutologAnalyzeModal(this.app, this.plugin, this.lastNAutologs).open();
    }

    /**
     * Generate new autolog
     */
    async generateNewAutolog() {
        try {
            await generateAutolog(this.app, this.plugin.settings, 'daily', this.selectedDate);
            await this.loadAutologData();
            new Notice('New autolog generated successfully');
        } catch (error) {
            console.error('Error generating autolog:', error);
            new Notice('Error generating autolog');
        }
    }

    /**
     * Export insights as note
     */
    async exportInsightsAsNote() {
        if (!this.autologData?.insights) {
            new Notice('No insights to export');
            return;
        }

        try {
            const dateStr = this.formatDateForFilename(this.selectedDate);
            const filename = `Autolog Insights - ${dateStr}.md`;
            const content = `# Autolog Insights - ${dateStr}

${this.autologData.insights}

---
Generated from Pensieve Dashboard
Source: ${this.currentView}
Date: ${new Date().toISOString()}
`;

            await this.app.vault.create(filename, content);
            new Notice(`Insights exported as ${filename}`);
        } catch (error) {
            console.error('Error exporting insights:', error);
            new Notice('Error exporting insights');
        }
    }

    /**
     * Export project insights as note
     */
    async exportProjectInsightsAsNote() {
        if (!this.projectData?.insights) {
            new Notice('No insights to export');
            return;
        }

        try {
            const filename = `Project Insights - ${this.selectedProject}.md`;
            const content = `# Project Insights - ${this.selectedProject}

${this.projectData.insights}

---
Generated from Pensieve Dashboard
Project: ${this.selectedProject}
Date: ${new Date().toISOString()}
`;

            await this.app.vault.create(filename, content);
            new Notice(`Project insights exported as ${filename}`);
        } catch (error) {
            console.error('Error exporting project insights:', error);
            new Notice('Error exporting project insights');
        }
    }

    /**
     * Helper methods
     */
    formatDateForInput(date) {
        return date.toISOString().split('T')[0];
    }

    formatDateForFilename(date) {
        return date.toISOString().split('T')[0];
    }

    generateAutologFilename(cycleType, targetDate) {
        const date = new Date(targetDate);

        switch (cycleType) {
            case 'daily':
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-daily-autolog.md`;
            case 'weekly':
                const weekStart = this.getCycleStartDate('weekly', date);
                return `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate() + weekStart.getDay()) / 7)).padStart(2, '0')}-weekly-autolog.md`;
            case 'monthly':
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-monthly-autolog.md`;
            default:
                throw new Error(`Unknown cycle type: ${cycleType}`);
        }
    }

    getCycleStartDate(cycleType, targetDate) {
        const date = new Date(targetDate);

        switch (cycleType) {
            case 'daily':
                date.setHours(0, 0, 0, 0);
                return date;
            case 'weekly':
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

    parseAutologContent(content) {
        // Simple parsing of autolog content
        const sections = {
            summary: '',
            completed: '',
            incomplete: '',
            insights: ''
        };

        const lines = content.split('\n');
        let currentSection = '';

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('## Summary')) {
                currentSection = 'summary';
            } else if (trimmedLine.startsWith('## What Was Done')) {
                currentSection = 'completed';
            } else if (trimmedLine.startsWith('## What Was Not Done')) {
                currentSection = 'incomplete';
            } else if (trimmedLine.startsWith('## Key Insights')) {
                currentSection = 'insights';
            } else if (trimmedLine && currentSection) {
                sections[currentSection] += (sections[currentSection] ? '\n' : '') + line;
            }
        }

        return sections;
    }

    formatContent(content) {
        if (!content) return 'No content available';
        if (content.trim() === '') return 'No content available';

        // Convert markdown-style content to proper HTML
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }

    formatProjectStatus(content) {
        if (!content) return 'No status data available';
        return this.formatContent(content);
    }

    formatProjectTasks(content) {
        if (!content) return 'No tasks data available';
        return this.formatContent(content);
    }

    formatProjectInsights(content) {
        if (!content) return 'No insights data available';
        return this.formatContent(content);
    }

    formatProjectStatusSummary(content) {
        if (!content) return 'No status summary available';

        // Extract key status information for summary
        const lines = content.split('\n');
        const summary = [];

        for (const line of lines) {
            if (line.includes('Progress:') || line.includes('Status:') || line.includes('Last Activity:')) {
                summary.push(line.trim());
            }
        }

        return summary.length > 0 ? summary.join('<br>') : 'No summary data available';
    }

    /**
 * Parse latest status from content (ignores checkpoints, shows only latest)
 */
    parseLatestStatus(content) {
        if (!content) return 'No status data available';

        const lines = content.split('\n');
        let currentSection = '';
        let statusContent = '';
        let latestStatusContent = '';

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('## ')) {
                // Found a checkpoint, save previous status and start new one
                if (currentSection === 'status' && statusContent) {
                    latestStatusContent = statusContent;
                }
                currentSection = 'status';
                statusContent = '';
            } else if (trimmedLine.startsWith('### Status Summary')) {
                // Stop at status summary section
                break;
            } else if (currentSection === 'status' && trimmedLine) {
                statusContent += (statusContent ? '\n' : '') + line;
            }
        }

        // Get the last status content
        if (statusContent) {
            latestStatusContent = statusContent;
        }

        return latestStatusContent || 'No status data available';
    }

    /**
     * Parse latest status summary from content
     */
    parseLatestStatusSummary(content) {
        if (!content) return 'No status summary available';

        const lines = content.split('\n');
        let currentSection = '';
        let summaryContent = '';

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('### Status Summary')) {
                currentSection = 'summary';
            } else if (trimmedLine.startsWith('## ') && currentSection === 'summary') {
                // Found next checkpoint, stop
                break;
            } else if (currentSection === 'summary' && trimmedLine) {
                summaryContent += (summaryContent ? '\n' : '') + line;
            }
        }

        return summaryContent || 'No status summary available';
    }

    /**
     * Parse last N checkpoints from content
     */
    parseLastNCheckpoints(content, lastN) {
        if (!content) return 'No data available';

        const lines = content.split('\n');
        const checkpoints = [];
        let currentCheckpoint = null;
        let currentContent = '';

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('## ')) {
                // Save previous checkpoint if exists
                if (currentCheckpoint) {
                    checkpoints.push({
                        title: currentCheckpoint,
                        content: currentContent.trim()
                    });
                }

                // Start new checkpoint
                currentCheckpoint = trimmedLine.substring(3); // Remove '## '
                currentContent = '';
            } else if (currentCheckpoint && trimmedLine) {
                currentContent += (currentContent ? '\n' : '') + line;
            }
        }

        // Add the last checkpoint
        if (currentCheckpoint) {
            checkpoints.push({
                title: currentCheckpoint,
                content: currentContent.trim()
            });
        }

        // Return last N checkpoints
        const lastNCheckpoints = checkpoints.slice(-lastN);

        if (lastNCheckpoints.length === 0) {
            return 'No checkpoint data available';
        }

        // Format as markdown with H2 headings
        return lastNCheckpoints.map(checkpoint =>
            `## ${checkpoint.title}\n\n${checkpoint.content}`
        ).join('\n\n');
    }

    /**
     * Add individual export buttons for each insight checkpoint
     */
    addInsightExportButtons(insightsPanel, insightsContent) {
        if (!insightsContent || insightsContent === 'No data available') {
            return;
        }

        // Parse the insights content to find checkpoints
        const lines = insightsContent.split('\n');
        const checkpoints = [];
        let currentCheckpoint = null;
        let currentContent = '';

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('## ')) {
                // Save previous checkpoint if exists
                if (currentCheckpoint) {
                    checkpoints.push({
                        title: currentCheckpoint,
                        content: currentContent.trim()
                    });
                }

                // Start new checkpoint
                currentCheckpoint = trimmedLine.substring(3); // Remove '## '
                currentContent = '';
            } else if (currentCheckpoint && trimmedLine) {
                currentContent += (currentContent ? '\n' : '') + line;
            }
        }

        // Add the last checkpoint
        if (currentCheckpoint) {
            checkpoints.push({
                title: currentCheckpoint,
                content: currentContent.trim()
            });
        }

        // Create export buttons for each checkpoint
        if (checkpoints.length > 0) {
            const exportButtonsContainer = insightsPanel.createDiv('pensieve-export-buttons');
            exportButtonsContainer.createEl('h4', { text: 'Export Individual Insights:' });

            checkpoints.forEach((checkpoint, index) => {
                const exportBtn = exportButtonsContainer.createEl('button', {
                    text: `Export: ${checkpoint.title}`,
                    cls: 'pensieve-btn secondary'
                });
                exportBtn.onclick = () => this.exportIndividualInsight(checkpoint.title, checkpoint.content);
            });
        }
    }

    /**
     * Export individual insight checkpoint as note
     */
    async exportIndividualInsight(checkpointTitle, insightContent) {
        try {
            const filename = `Project Insight - ${this.selectedProject} - ${checkpointTitle}.md`;
            const content = `# Project Insight - ${this.selectedProject}

## ${checkpointTitle}

${insightContent}

---
Generated from Pensieve Dashboard
Project: ${this.selectedProject}
Checkpoint: ${checkpointTitle}
Date: ${new Date().toISOString()}
`;

            await this.app.vault.create(filename, content);
            new Notice(`Insight exported as ${filename}`);
        } catch (error) {
            console.error('Error exporting individual insight:', error);
            new Notice('Error exporting insight');
        }
    }

    /**
     * Ensure text selection works in rendered content
     */
    ensureTextSelection(element) {
        // Set user-select style on the element and all its children
        element.style.userSelect = 'text';
        element.style.webkitUserSelect = 'text';
        element.style.mozUserSelect = 'text';
        element.style.msUserSelect = 'text';

        // Also set on all child elements
        const allElements = element.querySelectorAll('*');
        allElements.forEach(el => {
            // Skip buttons, inputs, and checkboxes
            if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT' ||
                el.classList.contains('task-list-item-checkbox')) {
                return;
            }

            el.style.userSelect = 'text';
            el.style.webkitUserSelect = 'text';
            el.style.mozUserSelect = 'text';
            el.style.msUserSelect = 'text';

            // Fix text cropping issues
            el.style.overflow = 'visible';
            el.style.wordWrap = 'break-word';
            el.style.overflowWrap = 'break-word';
            el.style.boxSizing = 'border-box';

            // Ensure proper padding for list items
            if (el.tagName === 'LI' || el.classList.contains('task-list-item')) {
                el.style.paddingLeft = '0';
                el.style.marginLeft = '0';
            }
        });
    }
}

/**
 * Modal for analyzing last N autologs
 */
class AutologAnalyzeModal extends Modal {
    constructor(app, plugin, lastN) {
        super(app);
        this.plugin = plugin;
        this.lastN = lastN;
        this.customPrompt = '';
        this.analysisResult = null;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('pensieve-analyze-modal');

        contentEl.createEl('h2', { text: 'Analyze Last N Autologs' });

        // Custom prompt input
        const promptSection = contentEl.createDiv('pensieve-prompt-section');
        promptSection.createEl('label', { text: 'Custom Analysis Prompt:' });
        const promptTextarea = promptSection.createEl('textarea', {
            placeholder: 'Enter your custom prompt for analyzing the last N autologs...',
            value: this.customPrompt
        });
        promptTextarea.oninput = (e) => {
            this.customPrompt = e.target.value;
        };

        // Analyze button
        const analyzeBtn = contentEl.createEl('button', {
            text: 'Analyze',
            cls: 'pensieve-btn primary'
        });
        analyzeBtn.onclick = () => this.performAnalysis();

        // Results section
        this.resultsContainer = contentEl.createDiv('pensieve-results-section');
    }

    async performAnalysis() {
        if (!this.customPrompt.trim()) {
            new Notice('Please enter a custom prompt');
            return;
        }

        try {
            // Get last N autologs
            const autologs = getRecentAutologs(this.app, this.plugin.settings, 'daily', this.lastN);

            if (autologs.length === 0) {
                new Notice('No autologs found to analyze');
                return;
            }

            // Combine autolog content
            let combinedContent = '';
            for (const autolog of autologs) {
                const content = await this.app.vault.read(autolog);
                combinedContent += `\n\n--- ${autolog.name} ---\n${content}\n`;
            }

            // Use LLM to analyze
            const extractor = new LLMExtractor(this.plugin.settings);
            this.analysisResult = await extractor.analyzeAutologs(combinedContent, this.customPrompt);

            this.displayResults();
        } catch (error) {
            // Check if this is a request limit error
            if (handleRequestLimitError(error, 'Autolog Analysis')) {
                // Halt execution - close the modal
                this.close();
                return;
            }

            // For other errors, show normal error message
            console.error('Error performing analysis:', error);
            new Notice('Error performing analysis');
        }
    }

    displayResults() {
        this.resultsContainer.empty();

        if (!this.analysisResult) {
            this.resultsContainer.createEl('p', { text: 'No analysis results available' });
            return;
        }

        this.resultsContainer.createEl('h3', { text: 'Analysis Results' });
        this.resultsContainer.createEl('div', {
            html: this.analysisResult.replace(/\n/g, '<br>'),
            cls: 'pensieve-analysis-result'
        });

        // Export button
        const exportBtn = this.resultsContainer.createEl('button', {
            text: 'Export as Note',
            cls: 'pensieve-btn secondary'
        });
        exportBtn.onclick = () => this.exportAnalysis();
    }

    async exportAnalysis() {
        if (!this.analysisResult) {
            new Notice('No analysis to export');
            return;
        }

        try {
            const filename = `Autolog Analysis - ${new Date().toISOString().split('T')[0]}.md`;
            const content = `# Autolog Analysis

## Custom Prompt
${this.customPrompt}

## Analysis Results
${this.analysisResult}

---
Generated from Pensieve Dashboard
Date: ${new Date().toISOString()}
`;

            await this.app.vault.create(filename, content);
            new Notice(`Analysis exported as ${filename}`);
        } catch (error) {
            console.error('Error exporting analysis:', error);
            new Notice('Error exporting analysis');
        }
    }
} 