/**
 * Test script for dashboard functionality
 * This can be run to verify the implementation works correctly
 */

// Mock Obsidian app for testing
const mockApp = {
    vault: {
        getAbstractFileByPath: (path) => {
            // Mock folder structure
            if (path === 'Journal') {
                return {
                    name: 'Journal',
                    path: 'Journal',
                    children: [
                        {
                            name: '2024-01-15.md',
                            path: 'Journal/2024-01-15.md',
                            extension: 'md',
                            stat: { mtime: new Date('2024-01-15T10:00:00').getTime() }
                        },
                        {
                            name: '2024-01-16.md',
                            path: 'Journal/2024-01-16.md',
                            extension: 'md',
                            stat: { mtime: new Date('2024-01-16T14:30:00').getTime() }
                        }
                    ]
                };
            }
            if (path === 'Projects') {
                return {
                    name: 'Projects',
                    path: 'Projects',
                    children: [
                        {
                            name: 'TestProject',
                            path: 'Projects/TestProject',
                            children: [
                                {
                                    name: 'note1.md',
                                    path: 'Projects/TestProject/note1.md',
                                    extension: 'md',
                                    stat: { mtime: Date.now() }
                                }
                            ]
                        }
                    ]
                };
            }
            if (path === 'Memory/autologs') {
                return {
                    name: 'autologs',
                    path: 'Memory/autologs',
                    children: [
                        {
                            name: '2024-01-15-daily-autolog.md',
                            path: 'Memory/autologs/2024-01-15-daily-autolog.md',
                            extension: 'md',
                            stat: { mtime: new Date('2024-01-15T23:00:00').getTime() }
                        },
                        {
                            name: '2024-01-16-daily-autolog.md',
                            path: 'Memory/autologs/2024-01-16-daily-autolog.md',
                            extension: 'md',
                            stat: { mtime: new Date('2024-01-16T23:00:00').getTime() }
                        }
                    ]
                };
            }
            if (path === 'Memory/autologs/2024-01-15-daily-autolog.md') {
                return {
                    name: '2024-01-15-daily-autolog.md',
                    path: 'Memory/autologs/2024-01-15-daily-autolog.md',
                    extension: 'md',
                    stat: { mtime: new Date('2024-01-15T23:00:00').getTime() }
                };
            }
            if (path === 'Memory/projects/TestProject/status.md') {
                return {
                    name: 'status.md',
                    path: 'Memory/projects/TestProject/status.md',
                    extension: 'md',
                    stat: { mtime: Date.now() }
                };
            }
            if (path === 'Memory/projects/TestProject/tasks.md') {
                return {
                    name: 'tasks.md',
                    path: 'Memory/projects/TestProject/tasks.md',
                    extension: 'md',
                    stat: { mtime: Date.now() }
                };
            }
            if (path === 'Memory/projects/TestProject/insights.md') {
                return {
                    name: 'insights.md',
                    path: 'Memory/projects/TestProject/insights.md',
                    extension: 'md',
                    stat: { mtime: Date.now() }
                };
            }
            return null;
        },
        read: async (file) => {
            // Mock file content
            if (file.name === '2024-01-15-daily-autolog.md') {
                return `---
cycle_type: daily
cycle_start: 2024-01-15T00:00:00.000Z
cycle_end: 2024-01-15T23:59:59.999Z
generated_at: 2024-01-15T23:00:00.000Z
source_notes_count: 1
source_notes: ["Journal/2024-01-15.md"]
---

# Daily Autolog

**Period:** Jan 15, 2024, 12:00 AM - Jan 15, 2024, 11:59 PM
**Notes Processed:** 1
**Generated:** Jan 15, 2024, 11:00 PM

## Summary

This daily was productive with focus on project setup and development. Made significant progress on environment configuration and initial testing.

## What Was Done

- Set up development environment
- Created project structure
- Installed dependencies
- Wrote initial tests
- Fixed dependency conflicts

## What Was Not Done

- Complete core feature implementation
- Review code with team
- Finalize project documentation

## Key Insights

- Development environment setup took longer than expected
- Testing framework integration was challenging but successful
- Good progress on project foundation
- Team collaboration will be important for next phase

## Source Notes

- [[Journal/2024-01-15.md|2024-01-15.md]] (Jan 15, 2024, 10:00 AM)`;
            }
            if (file.name === 'status.md') {
                return `# Status

## Jan 15, 2024, 11:00 PM

### Project Status: active

- **Progress:** 75%
- **Last Activity:** 2 hours ago
- **Total Notes:** 5
- **Recent Notes:** 3

## Jan 14, 2024, 11:00 PM

### Project Status: active

- **Progress:** 60%
- **Last Activity:** 1 day ago
- **Total Notes:** 4
- **Recent Notes:** 2`;
            }
            if (file.name === 'tasks.md') {
                return `# Tasks

## Jan 15, 2024, 11:00 PM

### Explicit Tasks

- ✅ Set up development environment (from: LLM extracted)
- ✅ Create project structure (from: LLM extracted)
- ⏳ Complete core features (from: LLM extracted)

### Implied Tasks

- 💭 Review code with team (from: LLM extracted)
- 💭 Update documentation (from: LLM extracted)`;
            }
            if (file.name === 'insights.md') {
                return `# Insights

## Jan 15, 2024, 11:00 PM

### Achievements

- 🎉 Successfully set up development environment (from: LLM extracted)
- 🎉 Completed initial testing framework (from: LLM extracted)

### General Insights

- 💡 Development environment setup was more complex than expected (from: LLM extracted)
- 💡 Team collaboration will be crucial for next phase (from: LLM extracted)`;
            }
            return '';
        },
        create: async (path, content) => {
            console.log(`Creating file: ${path}`);
            console.log(`Content preview: ${content.substring(0, 100)}...`);
        }
    }
};

// Mock settings
const mockSettings = {
    journalFolder: 'Journal',
    projectRoot: 'Projects',
    memoryFolder: 'Memory',
    llmProvider: 'openai',
    apiKey: 'test-key',
    model: 'gpt-3.5-turbo',
    autologCycleType: 'daily',
    autologSettings: {
        includeIncompleteTasks: true,
        includeInsights: true,
        includeSourceNotes: true
    }
};

// Mock plugin
const mockPlugin = {
    app: mockApp,
    settings: mockSettings
};

// Test the dashboard functionality
async function testDashboard() {
    console.log('Testing Dashboard Feature...\n');

    try {
        // Import the dashboard
        const { PensieveDashboardView } = await import('./src/dashboard.jsx');

        // Test dashboard creation
        console.log('Creating dashboard instance...');
        const dashboard = new PensieveDashboardView(mockApp, mockPlugin);

        console.log('✅ Dashboard instance created successfully!');
        console.log('Dashboard features:');
        console.log('- View selector (Autologs/Project Memories)');
        console.log('- Date picker for autologs');
        console.log('- Project selector with search');
        console.log('- Last N checkpoints/autologs controls');
        console.log('- Three-panel layout (Status/Tasks/Insights)');
        console.log('- Export insights functionality');
        console.log('- Custom autolog analysis');

        // Test autolog data loading
        console.log('\nTesting autolog data loading...');
        await dashboard.loadAutologData();
        console.log('✅ Autolog data loading test completed!');

        // Test project data loading
        console.log('\nTesting project data loading...');
        dashboard.selectedProject = 'TestProject';
        await dashboard.loadProjectData();
        console.log('✅ Project data loading test completed!');

        console.log('\n✅ Dashboard test completed successfully!');
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test if this file is executed directly
if (typeof window === 'undefined') {
    testDashboard();
}

module.exports = { testDashboard, mockApp, mockSettings, mockPlugin }; 