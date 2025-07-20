/**
 * Test script for autologs functionality
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
                        },
                        {
                            name: '2024-01-17.md',
                            path: 'Journal/2024-01-17.md',
                            extension: 'md',
                            stat: { mtime: new Date('2024-01-17T09:15:00').getTime() }
                        }
                    ]
                };
            }
            if (path === 'Memory/autologs') {
                return {
                    name: 'autologs',
                    path: 'Memory/autologs',
                    children: []
                };
            }
            return null;
        },
        read: async (file) => {
            // Mock journal note content
            if (file.name === '2024-01-15.md') {
                return `# Journal Entry - January 15, 2024

## Today's Tasks
- [x] Review project requirements
- [ ] Set up development environment
- [x] Create initial project structure

## Notes
Started working on the new project. The requirements look clear and achievable.

## Ideas
- Consider using TypeScript for better type safety
- Need to research the best UI framework for this project`;
            }
            if (file.name === '2024-01-16.md') {
                return `# Journal Entry - January 16, 2024

## Today's Tasks
- [x] Set up development environment
- [x] Install necessary dependencies
- [ ] Write initial tests
- [x] Create basic project structure

## Progress
Made good progress on the development setup. The environment is now ready for development.

## Issues
- Had some trouble with the testing framework setup
- Need to resolve dependency conflicts`;
            }
            if (file.name === '2024-01-17.md') {
                return `# Journal Entry - January 17, 2024

## Today's Tasks
- [x] Write initial tests
- [ ] Start implementing core features
- [x] Fix dependency conflicts
- [ ] Review code with team

## Achievements
Successfully resolved the dependency issues and wrote comprehensive tests.

## Next Steps
- Begin core feature implementation
- Schedule code review session`;
            }
            return '';
        },
        create: async (path, content) => {
            console.log(`Creating autolog file: ${path}`);
            console.log(`Content preview: ${content.substring(0, 200)}...`);
        },
        createFolder: async (path) => {
            console.log(`Creating folder: ${path}`);
        },
        modify: async (file, content) => {
            console.log(`Modifying file: ${file.path}`);
            console.log(`Content preview: ${content.substring(0, 200)}...`);
        }
    }
};

// Mock settings
const mockSettings = {
    journalFolder: 'Journal',
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

// Mock LLM extractor for testing
class MockLLMExtractor {
    constructor(settings) {
        this.settings = settings;
    }

    async generateAutolog(notesContent, cycleType, targetDate) {
        console.log('Mock LLM processing autolog...');
        console.log(`Cycle type: ${cycleType}`);
        console.log(`Target date: ${targetDate.toLocaleDateString()}`);
        console.log(`Input content length: ${notesContent.length} characters`);

        // Return mock autolog data
        return {
            summary: `This ${cycleType} was productive with focus on project setup and development. Made significant progress on environment configuration and initial testing.`,
            completed: `- Set up development environment
- Created project structure
- Installed dependencies
- Wrote initial tests
- Fixed dependency conflicts`,
            incomplete: `- Complete core feature implementation
- Review code with team
- Finalize project documentation`,
            insights: `- Development environment setup took longer than expected
- Testing framework integration was challenging but successful
- Good progress on project foundation
- Team collaboration will be important for next phase`
        };
    }
}

// Test the autolog functionality
async function testAutologs() {
    console.log('Testing Autologs Feature...\n');

    try {
        // Import the autologs manager
        const { generateAutolog } = await import('./src/autologs-manager.js');

        // Mock the LLM extractor
        const originalLLMExtractor = await import('./src/llm-extractor.js');
        originalLLMExtractor.LLMExtractor = MockLLMExtractor;

        // Test daily autolog
        console.log('Testing daily autolog generation...');
        await generateAutolog(mockApp, mockSettings, 'daily', new Date('2024-01-17'));

        // Test weekly autolog
        console.log('\nTesting weekly autolog generation...');
        await generateAutolog(mockApp, mockSettings, 'weekly', new Date('2024-01-17'));

        // Test monthly autolog
        console.log('\nTesting monthly autolog generation...');
        await generateAutolog(mockApp, mockSettings, 'monthly', new Date('2024-01-17'));

        console.log('\n✅ Autologs test completed successfully!');
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test if this file is executed directly
if (typeof window === 'undefined') {
    testAutologs();
}

module.exports = { testAutologs, mockApp, mockSettings }; 