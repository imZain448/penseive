import { Plugin, WorkspaceLeaf } from 'obsidian';
import { PensieveSettingTab, DEFAULT_SETTINGS } from './settings.jsx';
import { updateProjectMemories } from './memory-manager.js';
import { refineProjectNotes } from './note-refiner.js';
import { generateAutolog } from './autologs-manager.js';
import { PensieveDashboardView, PENSIEVE_DASHBOARD_VIEW_TYPE } from './dashboard.jsx';
import { MemoryScheduler } from './scheduler.js';

export default class PensievePlugin extends Plugin {
    async onload() {
        await this.loadSettings();
        this.addSettingTab(new PensieveSettingTab(this.app, this));

        // Load dashboard styles
        this.loadStyles();

        // Register dashboard view
        this.registerDashboardView();

        // Initialize scheduler
        this.scheduler = new MemoryScheduler(this);

        // Add commands
        this.addCommands();

        // Start scheduler if auto-updates are enabled
        if (this.settings.autoUpdateProjectMemories || this.settings.autoRefineNotes || this.settings.autoGenerateAutologs) {
            this.scheduler.start();
        }
    }

    onunload() {
        // Stop scheduler when plugin is disabled
        if (this.scheduler) {
            this.scheduler.stop();
        }

        // Unregister dashboard view
        this.app.workspace.detachLeavesOfType(PENSIEVE_DASHBOARD_VIEW_TYPE);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);

        // Restart scheduler with new settings
        if (this.scheduler) {
            this.scheduler.stop();
            if (this.settings.autoUpdateProjectMemories || this.settings.autoRefineNotes || this.settings.autoGenerateAutologs) {
                this.scheduler.start();
            }
        }
    }

    loadStyles() {
        // Add dashboard styles to the document
        const styleEl = document.createElement('style');
        styleEl.textContent = `
            /* Pensieve Dashboard Styles */
            .pensieve-dashboard {
                width: 100%;
                height: 100%;
                padding: 20px;
                overflow-y: auto;
            }

            .pensieve-dashboard-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid var(--background-modifier-border);
                background: var(--background-primary);
            }

            .pensieve-dashboard-header h2 {
                margin: 0;
                color: var(--text-normal);
            }

            .pensieve-view-selector {
                display: flex;
                gap: 10px;
            }

            .pensieve-view-selector button {
                padding: 8px 16px;
                border: 1px solid var(--background-modifier-border);
                background: var(--background-secondary);
                color: var(--text-normal);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .pensieve-view-selector button:hover {
                background: var(--background-modifier-hover);
            }

            .pensieve-view-selector button.active {
                background: var(--interactive-accent);
                color: var(--text-on-accent);
                border-color: var(--interactive-accent);
            }

            .pensieve-dashboard-content {
                padding: 0;
                height: calc(100% - 80px);
                overflow-y: auto;
            }

            .pensieve-controls {
                display: flex;
                flex-wrap: wrap;
                gap: 20px;
                margin-bottom: 30px;
                padding: 20px;
                background: var(--background-secondary);
                border-radius: 8px;
                border: 1px solid var(--background-modifier-border);
            }

            .pensieve-control-group {
                display: flex;
                flex-direction: column;
                gap: 5px;
                min-width: 150px;
            }

            .pensieve-control-group label {
                font-weight: 600;
                color: var(--text-normal);
                font-size: 14px;
            }

            .pensieve-control-group input,
            .pensieve-control-group select {
                padding: 8px 12px;
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                background: var(--background-primary);
                color: var(--text-normal);
                font-size: 14px;
            }

            .pensieve-control-group input:focus,
            .pensieve-control-group select:focus {
                outline: none;
                border-color: var(--interactive-accent);
                box-shadow: 0 0 0 2px var(--interactive-accent-hover);
            }

            .pensieve-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
                margin: 5px;
            }

            .pensieve-btn.primary {
                background: var(--interactive-accent);
                color: var(--text-on-accent);
            }

            .pensieve-btn.primary:hover {
                background: var(--interactive-accent-hover);
            }

            .pensieve-btn.secondary {
                background: var(--background-modifier-border);
                color: var(--text-normal);
            }

            .pensieve-btn.secondary:hover {
                background: var(--background-modifier-hover);
            }

            .pensieve-results {
                flex: 1;
            }

            .pensieve-placeholder {
                text-align: center;
                color: var(--text-muted);
                font-style: italic;
                padding: 40px;
            }

            .pensieve-summary {
                margin-bottom: 30px;
                padding: 20px;
                background: var(--background-secondary);
                border-radius: 8px;
                border: 1px solid var(--background-modifier-border);
            }

            .pensieve-summary h3 {
                margin: 0 0 15px 0;
                color: var(--text-normal);
            }

            .pensieve-summary p {
                margin: 0;
                line-height: 1.6;
                color: var(--text-normal);
            }

            /* Top Row: Status + Status Summary */
            .pensieve-top-row {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 15px;
                margin-bottom: 10px;
                min-height: 300px;
                flex: 1;
            }

            /* Bottom Row: Tasks + Insights */
            .pensieve-bottom-row {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 15px;
                min-height: 400px;
                flex: 1;
            }

            .pensieve-panels {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 15px;
                flex: 1;
                min-height: 400px;
            }

            .pensieve-panel {
                background: var(--background-secondary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 8px;
                padding: 15px;
                overflow-y: auto;
                position: relative;
                min-height: 200px;
                display: flex;
                flex-direction: column;
            }

            .pensieve-panel h3 {
                margin: 0 0 10px 0;
                color: var(--text-normal);
                font-size: 16px;
                font-weight: 600;
                border-bottom: 2px solid var(--interactive-accent);
                padding-bottom: 8px;
                flex-shrink: 0;
            }

            .pensieve-content {
                line-height: 1.6;
                color: var(--text-normal);
                flex: 1;
                overflow-y: auto;
            }

            .pensieve-content ul {
                margin: 10px 0;
                padding-left: 20px;
            }

            .pensieve-content li {
                margin: 5px 0;
            }

            .pensieve-project-header {
                margin-bottom: 8px;
                padding: 12px;
                background: var(--background-secondary);
                border-radius: 8px;
                border: 1px solid var(--background-modifier-border);
            }

            .pensieve-project-header h3 {
                margin: 0;
                color: var(--text-normal);
                font-size: 18px;
            }

            .pensieve-analyze-modal {
                width: 90vw;
                max-width: 800px;
                height: 80vh;
                max-height: 600px;
            }

            .pensieve-prompt-section {
                margin-bottom: 20px;
            }

            .pensieve-prompt-section label {
                display: block;
                margin-bottom: 10px;
                font-weight: 600;
                color: var(--text-normal);
            }

            .pensieve-prompt-section textarea {
                width: 100%;
                height: 120px;
                padding: 12px;
                border: 1px solid var(--background-modifier-border);
                border-radius: 6px;
                background: var(--background-primary);
                color: var(--text-normal);
                font-family: var(--font-monospace);
                font-size: 14px;
                resize: vertical;
            }

            .pensieve-prompt-section textarea:focus {
                outline: none;
                border-color: var(--interactive-accent);
                box-shadow: 0 0 0 2px var(--interactive-accent-hover);
            }

            .pensieve-results-section {
                margin-top: 20px;
                padding: 20px;
                background: var(--background-secondary);
                border-radius: 8px;
                border: 1px solid var(--background-modifier-border);
                max-height: 300px;
                overflow-y: auto;
            }

            .pensieve-analysis-result {
                line-height: 1.6;
                color: var(--text-normal);
                white-space: pre-wrap;
            }

            @media (max-width: 768px) {
                .pensieve-dashboard {
                    width: 100%;
                    height: 100%;
                    padding: 10px;
                }

                .pensieve-top-row {
                    grid-template-columns: 1fr;
                    height: auto;
                }

                .pensieve-bottom-row {
                    grid-template-columns: 1fr;
                    height: auto;
                }

                .pensieve-panels {
                    grid-template-columns: 1fr;
                    height: auto;
                }

                .pensieve-controls {
                    flex-direction: column;
                    gap: 15px;
                }

                .pensieve-control-group {
                    min-width: auto;
                }

                .pensieve-dashboard-header {
                    flex-direction: column;
                    gap: 15px;
                    align-items: stretch;
                }

                .pensieve-view-selector {
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(styleEl);
    }

    addCommands() {
        // Command to manually update project memories
        this.addCommand({
            id: 'update-project-memories',
            name: 'Update Project Memories',
            callback: async () => {
                await updateProjectMemories(this.app, this.settings);
            }
        });

        // Command to update memories for specific project
        this.addCommand({
            id: 'update-specific-project-memories',
            name: 'Update Memories for Specific Project',
            callback: async () => {
                // TODO: Add UI to select specific project
                await updateProjectMemories(this.app, this.settings);
            }
        });

        // Command to show scheduler status
        this.addCommand({
            id: 'show-scheduler-status',
            name: 'Show Memory Update Status',
            callback: () => {
                const status = this.scheduler.getStatus();
                console.log('Scheduler Status:', status);
                // TODO: Show status in a modal or notice
            }
        });

        // Command to manually refine project notes
        this.addCommand({
            id: 'refine-project-notes',
            name: 'Refine Project Notes',
            callback: async () => {
                await refineProjectNotes(this.app, this.settings);
            }
        });

        // Command to refine notes for specific project
        this.addCommand({
            id: 'refine-specific-project-notes',
            name: 'Refine Notes for Specific Project',
            callback: async () => {
                // TODO: Add UI to select specific project
                await refineProjectNotes(this.app, this.settings);
            }
        });

        // Command to generate daily autolog
        this.addCommand({
            id: 'generate-daily-autolog',
            name: 'Generate Daily Autolog',
            callback: async () => {
                await generateAutolog(this.app, this.settings, 'daily');
            }
        });

        // Command to generate weekly autolog
        this.addCommand({
            id: 'generate-weekly-autolog',
            name: 'Generate Weekly Autolog',
            callback: async () => {
                await generateAutolog(this.app, this.settings, 'weekly');
            }
        });

        // Command to generate monthly autolog
        this.addCommand({
            id: 'generate-monthly-autolog',
            name: 'Generate Monthly Autolog',
            callback: async () => {
                await generateAutolog(this.app, this.settings, 'monthly');
            }
        });

        // Command to generate autolog for specific date
        this.addCommand({
            id: 'generate-autolog-for-date',
            name: 'Generate Autolog for Specific Date',
            callback: async () => {
                // TODO: Add UI to select date and cycle type
                await generateAutolog(this.app, this.settings, 'daily');
            }
        });

        // Command to open dashboard
        this.addCommand({
            id: 'open-pensieve-dashboard',
            name: 'Open Pensieve Dashboard',
            callback: () => {
                this.activateView();
            }
        });
    }

    /**
     * Register the dashboard view
     */
    registerDashboardView() {
        this.registerView(
            PENSIEVE_DASHBOARD_VIEW_TYPE,
            (leaf) => new PensieveDashboardView(leaf, this)
        );
    }

    /**
     * Activate the dashboard view
     */
    async activateView() {
        const { workspace } = this.app;

        let leaf = workspace.getLeavesOfType(PENSIEVE_DASHBOARD_VIEW_TYPE)[0];

        if (!leaf) {
            // Try to open in the main editor area
            const activeLeaf = workspace.activeLeaf;
            if (activeLeaf && activeLeaf.view.getViewType() === 'markdown') {
                // Replace the current markdown view with dashboard
                await activeLeaf.setViewState({
                    type: PENSIEVE_DASHBOARD_VIEW_TYPE,
                    active: true,
                });
                leaf = activeLeaf;
            } else {
                // Fallback: create a new leaf in the main area
                leaf = workspace.getLeaf('tab');
                await leaf.setViewState({
                    type: PENSIEVE_DASHBOARD_VIEW_TYPE,
                    active: true,
                });
            }
        }

        workspace.revealLeaf(leaf);
    }
} 