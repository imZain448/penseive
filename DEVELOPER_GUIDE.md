# 🧠 Pensieve Developer Guide

> A comprehensive guide for developers contributing to the Pensieve Obsidian plugin.

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Development Setup](#development-setup)
5. [Code Style & Conventions](#code-style--conventions)
6. [Testing](#testing)
7. [Building & Deployment](#building--deployment)
8. [API Reference](#api-reference)
9. [Contributing Guidelines](#contributing-guidelines)
10. [Troubleshooting](#troubleshooting)

## 🏗️ Architecture Overview

Pensieve is built as a modular Obsidian plugin with the following architectural principles:

### Core Design Patterns

- **Modular Architecture**: Each major feature is contained in its own module
- **Event-Driven**: Uses Obsidian's event system for plugin lifecycle management
- **LLM-Agnostic**: Abstracted LLM interface supporting multiple providers
- **Memory-First**: All operations are designed around memory management and context preservation

### Data Flow

```
User Input → Plugin Commands → Feature Modules → LLM Extractor → File System
     ↑                                                              ↓
     └─────────────── Dashboard ←─── Memory Manager ←──────────────┘
```

### Key Components

1. **Main Plugin** (`main.jsx`): Entry point and plugin lifecycle management
2. **Memory Manager** (`memory-manager.js`): Project memory extraction and management
3. **Note Refiner** (`note-refiner.js`): Note cleaning and refinement pipeline
4. **Autologs Manager** (`autologs-manager.js`): Periodic summary generation
5. **LLM Extractor** (`llm-extractor.js`): Abstracted LLM interface
6. **Dashboard** (`dashboard.jsx`): Interactive UI for all features
7. **Scheduler** (`scheduler.js`): Automated task scheduling
8. **Settings** (`settings.jsx`): Configuration management

## 📁 Project Structure

```
pensieve/
├── src/                          # Source code
│   ├── main.jsx                  # Main plugin entry point
│   ├── settings.jsx              # Settings UI and configuration
│   ├── dashboard.jsx             # Interactive dashboard
│   ├── memory-manager.js         # Project memory management
│   ├── note-refiner.js           # Note refinement pipeline
│   ├── autologs-manager.js       # Autolog generation
│   ├── llm-extractor.js          # LLM interface abstraction
│   ├── scheduler.js              # Automated task scheduling
│   ├── prompts.js                # LLM prompt templates
│   └── utils.js                  # Utility functions
├── dist/                         # Built files (generated)
├── docs/                         # Documentation
├── manifest.json                 # Plugin manifest
├── package.json                  # Dependencies and scripts
└── README.md                     # User documentation
```

## 🔧 Core Components

### 1. Main Plugin (`main.jsx`)

The main plugin class that orchestrates all functionality:

```javascript
export default class PensievePlugin extends Plugin {
    async onload() {
        // Initialize settings
        // Register dashboard view
        // Initialize scheduler
        // Add commands
    }

    onunload() {
        // Cleanup resources
        // Stop scheduler
        // Unregister views
    }
}
```

**Key Responsibilities:**
- Plugin lifecycle management
- Settings loading/saving
- Command registration
- Dashboard view registration
- Scheduler initialization

### 2. Memory Manager (`memory-manager.js`)

Handles project memory extraction and management:

```javascript
export async function updateProjectMemories(app, settings, excludeProjects = []) {
    // Get all projects
    // Filter excluded projects
    // Update memory for each project
    // Generate insights, tasks, and status
}
```

**Key Features:**
- Project memory extraction from journal notes
- Task identification (explicit and implied)
- Insight categorization (blockers, bugs, achievements)
- Project status determination
- Memory file generation and updates

### 3. Note Refiner (`note-refiner.js`)

Manages the note refinement pipeline:

```javascript
export async function refineProjectNotes(app, settings, excludeProjects = []) {
    // Get project notes
    // Check checkpoint for processed notes
    // Batch notes by compression ratio
    // Process through LLM
    // Save refined notes
    // Update checkpoint
}
```

**Key Features:**
- Batch processing with compression ratios
- Checkpoint tracking to avoid reprocessing
- Memory integration for context
- Configurable output settings (tone, verbosity, emojification)
- Project tree generation

### 4. LLM Extractor (`llm-extractor.js`)

Abstracted interface for multiple LLM providers:

```javascript
export class LLMExtractor {
    constructor(settings) {
        this.settings = settings;
        this.tokenEstimates = { /* provider-specific limits */ };
    }

    async makeLLMCall(prompt, systemPrompt = '') {
        // Route to appropriate provider
        // Handle token limits
        // Process response
    }
}
```

**Supported Providers:**
- OpenAI (GPT-3.5, GPT-4, GPT-4 Turbo)
- Google Gemini (Gemini Pro, Gemini 1.5, Gemini 2.0)
- Ollama (Local models)

**Key Features:**
- Token estimation and chunking
- Provider-specific API handling
- Error handling and retry logic
- Response parsing and validation

### 5. Dashboard (`dashboard.jsx`)

Interactive UI for all plugin features:

```javascript
export class PensieveDashboardView extends ItemView {
    constructor(leaf, plugin) {
        this.currentView = 'autologs';
        this.selectedProject = null;
        this.selectedDate = new Date();
    }

    renderContent() {
        // Render appropriate view based on currentView
        // Handle user interactions
        // Update data displays
    }
}
```

**Key Features:**
- Dual-view interface (Autologs and Project Memories)
- Real-time data loading and display
- Interactive controls for all features
- Export functionality
- Custom analysis capabilities

### 6. Scheduler (`scheduler.js`)

Manages automated task execution:

```javascript
export class MemoryScheduler {
    constructor(plugin) {
        this.plugin = plugin;
        this.intervals = new Map();
    }

    start() {
        // Schedule tasks based on settings
        // Set up intervals for each feature
    }

    stop() {
        // Clear all intervals
        // Clean up resources
    }
}
```

**Scheduled Tasks:**
- Project memory updates
- Note refinement
- Autolog generation
- General memory updates (future)

## 🚀 Development Setup

### Prerequisites

- Node.js 16+ and npm
- Obsidian desktop app
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/pensieve.git
   cd pensieve
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the plugin:**
   ```bash
   npm run build
   ```

4. **Copy to Obsidian plugins folder:**
   ```bash
   npm run copy
   ```

### Development Workflow

1. **Make changes** to source files in `src/`
2. **Build** with `npm run build`
3. **Copy** to plugins folder with `npm run copy`
4. **Reload** the plugin in Obsidian
5. **Test** your changes

### Available Scripts

```bash
npm run build          # Build the plugin
npm run copy           # Copy to Obsidian plugins folder
npm run dev            # Build and copy in one command
npm test               # Run all tests
npm run test:memory    # Test memory management
npm run test:refinement # Test note refinement
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
```

## 📝 Code Style & Conventions

### JavaScript/JSX Conventions

- **ES6+ Features**: Use modern JavaScript features
- **Async/Await**: Prefer async/await over Promises
- **Arrow Functions**: Use for callbacks and short functions
- **Destructuring**: Use for object and array destructuring
- **Template Literals**: Use for string interpolation

### File Naming

- **Components**: PascalCase (e.g., `PensieveDashboardView`)
- **Utilities**: camelCase (e.g., `memory-manager.js`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `PENSIEVE_DASHBOARD_VIEW_TYPE`)

### Code Organization

```javascript
// 1. Imports (external libraries first)
import { Plugin, WorkspaceLeaf } from 'obsidian';

// 2. Internal imports
import { updateProjectMemories } from './memory-manager.js';

// 3. Constants
export const PENSIEVE_DASHBOARD_VIEW_TYPE = 'pensieve-dashboard';

// 4. Main class/function
export class PensieveDashboardView extends ItemView {
    // 4a. Constructor
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
    }

    // 4b. Public methods
    async onOpen() {
        // Implementation
    }

    // 4c. Private methods (prefixed with _)
    _renderContent() {
        // Implementation
    }
}

// 5. Helper functions
function helperFunction() {
    // Implementation
}
```

### Documentation

- **JSDoc**: Use JSDoc for all public methods and classes
- **Inline Comments**: Explain complex logic
- **README**: Keep user documentation updated
- **Code Comments**: Explain "why" not "what"

## 🧪 Testing

### Test Structure

```
test/
├── memory-manager.test.js
├── note-refiner.test.js
├── llm-extractor.test.js
├── dashboard.test.js
└── utils.test.js
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test memory-manager.test.js

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Examples

```javascript
describe('Memory Manager', () => {
    test('should extract tasks from notes', async () => {
        const mockNotes = [
            { name: 'note1.md', content: '- [ ] Task 1\n- [x] Task 2' }
        ];
        
        const result = await extractTasks(mockNotes);
        
        expect(result.explicit).toHaveLength(2);
        expect(result.explicit[0].text).toBe('Task 1');
        expect(result.explicit[0].completed).toBe(false);
    });
});
```

## 🔨 Building & Deployment

### Build Process

1. **ESBuild**: Uses ESBuild for fast bundling
2. **JSX Support**: Automatic JSX transformation
3. **External Dependencies**: Obsidian is marked as external
4. **Output**: CommonJS format for Obsidian compatibility

### Build Configuration

```javascript
// esbuild configuration
{
    entryPoints: ['src/main.jsx'],
    bundle: true,
    outfile: 'dist/main.js',
    format: 'cjs',
    jsx: 'automatic',
    external: ['obsidian']
}
```

### Deployment

1. **Version Update**: Update version in `manifest.json` and `package.json`
2. **Build**: Run `npm run build`
3. **Test**: Verify functionality in Obsidian
4. **Release**: Create GitHub release with built files

## 📚 API Reference

### Core Classes

#### PensievePlugin

Main plugin class extending Obsidian's Plugin.

**Methods:**
- `onload()`: Initialize plugin
- `onunload()`: Cleanup plugin
- `loadSettings()`: Load plugin settings
- `saveSettings()`: Save plugin settings

#### LLMExtractor

Abstracted LLM interface.

**Methods:**
- `extractTasks(notesContent)`: Extract tasks from notes
- `extractInsights(notesContent)`: Extract insights from notes
- `refineNotes(notesContent, memoryInsights, settings)`: Refine notes
- `generateAutolog(notesContent, cycleType, targetDate)`: Generate autolog

#### MemoryScheduler

Automated task scheduling.

**Methods:**
- `start()`: Start scheduler
- `stop()`: Stop scheduler
- `getStatus()`: Get scheduler status

### Utility Functions

#### File Operations

```javascript
// Get all projects
getProjects(app, projectRoot)

// Get notes in folder
getNotesInFolder(app, folderPath)

// Get notes recursively
getNotesRecursively(app, folderPath)

// Sort files by date
sortFilesByDate(files)
```

#### Date Utilities

```javascript
// Format date
formatDate(date)

// Get time ago
getTimeAgo(date)

// Sanitize filename
sanitizeFilename(filename)
```

### Settings Interface

```javascript
export const DEFAULT_SETTINGS = {
    journalFolder: "Journal",
    projectRoot: "Projects",
    memoryFolder: "Memory",
    cleanOutputFolder: "CleanNotes",
    llmProvider: "openai",
    apiKey: "",
    model: "",
    // ... more settings
};
```

## 🤝 Contributing Guidelines

### Before Contributing

1. **Check Issues**: Look for existing issues or discussions
2. **Discuss Changes**: Open a discussion for major changes
3. **Follow Style**: Adhere to code style and conventions
4. **Test Thoroughly**: Ensure your changes work correctly

### Pull Request Process

1. **Fork**: Fork the repository
2. **Branch**: Create a feature branch
3. **Develop**: Make your changes
4. **Test**: Run tests and verify functionality
5. **Document**: Update documentation if needed
6. **Submit**: Create a pull request

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass
- [ ] Manual testing completed
- [ ] No breaking changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors
```

### Code Review Process

1. **Automated Checks**: CI/CD pipeline runs tests
2. **Review**: At least one maintainer reviews
3. **Feedback**: Address any feedback
4. **Merge**: Once approved, changes are merged

## 🔧 Troubleshooting

### Common Development Issues

#### Build Errors

```bash
# Clear build cache
rm -rf dist/
npm run build

# Check for syntax errors
npm run lint

# Verify dependencies
npm install
```

#### Plugin Not Loading

1. **Check Console**: Open Developer Tools (F12) and check for errors
2. **Verify Path**: Ensure plugin is in correct Obsidian plugins folder
3. **Check Manifest**: Verify `manifest.json` is valid
4. **Reload Plugin**: Disable and re-enable the plugin

#### LLM Connection Issues

```javascript
// Test LLM connection
async function testConnection() {
    const extractor = new LLMExtractor(settings);
    try {
        const result = await extractor.makeLLMCall('test');
        console.log('Connection successful:', result);
    } catch (error) {
        console.error('Connection failed:', error);
    }
}
```

#### Memory Issues

1. **Check Token Limits**: Verify content isn't exceeding model limits
2. **Review Chunking**: Check if content is being split correctly
3. **Monitor API Usage**: Check API rate limits and quotas

### Debug Mode

Enable debug logging:

```javascript
// In main.jsx
const DEBUG = true;

if (DEBUG) {
    console.log('Pensieve Debug:', message);
}
```

### Performance Optimization

1. **Batch Processing**: Process notes in batches to avoid memory issues
2. **Caching**: Cache LLM responses where appropriate
3. **Lazy Loading**: Load data only when needed
4. **Debouncing**: Debounce user input to avoid excessive API calls

## 📞 Support & Resources

### Getting Help

- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas
- **Documentation**: Check this guide and README
- **Code Examples**: Look at existing code for patterns

### Useful Resources

- [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api)
- [Obsidian Plugin Development](https://marcus.se.net/obsidian-plugin-docs/)
- [ESBuild Documentation](https://esbuild.github.io/)
- [JavaScript Best Practices](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

---

**Happy coding! 🚀**

*Remember: Good code is like good writing - clear, concise, and well-documented.* 