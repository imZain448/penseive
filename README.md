# 🧠 Pensieve - Context-Aware Memory for Obsidian

> **Pensieve** is a smart memory assistant for Obsidian that helps you **never lose track of your thoughts, projects, or ideas**. It continuously distills your raw notes, journals, and project logs into concise, structured summaries — and helps you pick up right where you left off, even after a long break.

Whether you're researching, coding, or writing, Pensieve captures your **mental context**, highlights key insights, and transforms rough notes into **clean, shareable ideas** using the LLM of your choice — including local models.

Stay organized without slowing down. Let your notes think with you.

## ✨ Features

### 🧭 **Smart Memory Management**
- **Project Memory Tracking**: Each project gets its own memory system with tasks, insights, and status tracking
- **Context-Aware Summaries**: Automatically extracts key information from your notes using AI
- **Memory Checkpoints**: Never lose track of where you left off on any project

### 🧹 **Note Refinement Pipeline**
- **Clean Note Generation**: Transform messy notes into well-structured, shareable content
- **Configurable Output**: Control tone, verbosity, and formatting
- **Batch Processing**: Process multiple notes efficiently with compression ratios
- **Internal Linking**: Automatic generation of Obsidian wiki-links

### 📊 **Interactive Dashboard**
- **Project Overview**: Visual status of all your projects at a glance
- **Memory Insights**: View recent insights, tasks, and blockers
- **Autolog Analysis**: Analyze patterns across your daily/weekly/monthly activities
- **Real-time Updates**: See memory updates as they happen

### 🤖 **Multi-LLM Support**
- **OpenAI**: GPT-3.5, GPT-4, GPT-4 Turbo
- **Google Gemini**: Gemini Pro, Gemini 1.5, Gemini 2.0
- **Local Models**: Ollama integration for privacy-focused users
- **Custom Endpoints**: Support for any compatible API

### ⚡ **Automation & Scheduling**
- **Automatic Updates**: Set intervals for memory updates, note refinement, and autolog generation
- **Smart Filtering**: Exclude specific projects from automation
- **Background Processing**: Runs without interrupting your workflow

## 🚀 Quick Start

### 1. Installation

1. **Manual Installation**:
   - Download the latest release
   - Extract to your Obsidian plugins folder: `{vault}/.obsidian/plugins/pensieve/`
   - Enable the plugin in Obsidian settings

2. **From Obsidian Community Plugins** (Coming Soon):
   - Open Obsidian Settings → Community Plugins
   - Search for "Pensieve"
   - Install and enable

### 2. Initial Setup

1. **Configure Folders**:
   - Set your **Journal Folder** (where daily notes are stored)
   - Set your **Project Root** (where all project folders are located)
   - Set your **Memory Folder** (where memory files will be stored)
   - Set your **Clean Output Folder** (where refined notes will be saved)

2. **Configure LLM Provider**:
   - Choose your preferred LLM provider (OpenAI, Gemini, or Ollama)
   - Enter your API key (if required)
   - Select your preferred model

3. **Enable Features**:
   - Toggle automatic memory updates
   - Configure note refinement settings
   - Set up autolog generation

### 3. First Run

1. **Open the Dashboard**:
   - Use the command palette: `Pensieve: Open Dashboard`
   - Or click the brain icon in the ribbon

2. **Generate Initial Memories**:
   - Use the dashboard to run your first memory update
   - Review the generated insights and tasks

3. **Refine Your Notes**:
   - Run note refinement on a project
   - Check the output in your Clean Output folder

## 📁 Folder Structure

Pensieve creates the following structure in your vault:

```
Your Vault/
├── Journal/                    # Your daily notes
├── Projects/                   # Your project folders
│   ├── Project1/
│   ├── Project2/
│   └── ...
├── Memory/                     # Generated memory files
│   ├── projects/
│   │   ├── Project1/
│   │   │   ├── tasks.md
│   │   │   ├── status.md
│   │   │   └── insights.md
│   │   └── Project2/
│   └── autologs/
│       ├── 2024-12-15-daily-autolog.md
│       └── ...
└── CleanNotes/                 # Refined notes
    ├── Project1/
    │   ├── introduction.md
    │   ├── checkpoint.md
    │   └── project-tree.md
    └── Project2/
```

## 🎯 Use Cases

### 🧑‍💻 **For Developers**
- Track project progress across multiple repositories
- Maintain context when switching between projects
- Generate clean documentation from development notes
- Identify blockers and technical debt

### 📚 **For Researchers**
- Organize research notes and findings
- Track progress across multiple research threads
- Generate summaries for papers and presentations
- Maintain context across long research cycles

### ✍️ **For Writers**
- Organize writing projects and drafts
- Track ideas and inspiration
- Generate clean versions for sharing
- Maintain context across multiple writing projects

### 🎓 **For Students**
- Organize study notes and research
- Track progress on assignments and projects
- Generate summaries for revision
- Maintain context across courses

## ⚙️ Configuration

### LLM Provider Settings

#### OpenAI
- **API Key**: Your OpenAI API key
- **Model**: GPT-3.5-turbo, GPT-4, GPT-4-turbo-preview
- **Rate Limits**: Respects OpenAI's rate limits

#### Google Gemini
- **API Key**: Your Google AI API key
- **Model**: Gemini Pro, Gemini 1.5, Gemini 2.0
- **Features**: Supports longer context windows

#### Ollama (Local)
- **URL**: Defaults to `http://localhost:11434`
- **Model**: Any model available in your Ollama installation
- **Privacy**: All processing happens locally

### Note Refinement Settings

- **Compression Ratio**: How many input notes to compress into one output (0.3 = 3:1)
- **Verbosity**: Concise, Detailed, or Comprehensive output
- **Tone**: Professional, Storytelling, or Sarcastic
- **Emojification**: Enable/disable emojis in output

### Automation Settings

- **Auto-update Project Memories**: Daily, weekly, or monthly
- **Auto-refine Notes**: Automatic note refinement
- **Auto-generate Autologs**: Daily, weekly, or monthly summaries
- **Exclude Projects**: Skip specific projects from automation

## 🎮 Commands

### Core Commands
- `Pensieve: Open Dashboard` - Open the main dashboard
- `Pensieve: Update Project Memories` - Update memories for all projects
- `Pensieve: Refine Project Notes` - Refine notes for all projects
- `Pensieve: Generate Autolog` - Generate a new autolog

### Project-Specific Commands
- `Pensieve: Update Memory for Specific Project` - Update memory for one project
- `Pensieve: Refine Notes for Specific Project` - Refine notes for one project
- `Pensieve: Show Project Context` - Show recent context for a project

### Utility Commands
- `Pensieve: Export Insights as Note` - Export dashboard insights to a note
- `Pensieve: Test LLM Connection` - Test your LLM provider connection

## 📊 Dashboard Guide

### Autologs View
- **Date Selector**: Choose a specific date to view autologs
- **Last N Autologs**: Analyze patterns across multiple autologs
- **Generate New**: Create a new autolog for any date
- **Analyze**: Use custom prompts to analyze autolog patterns

### Project Memories View
- **Project Selector**: Choose which project to view
- **Last N Checkpoints**: View recent memory updates
- **Search**: Filter projects by name
- **Load Data**: Refresh project memory data

### Dashboard Panels
- **Status**: Current project status and progress
- **Tasks**: Active and completed tasks
- **Insights**: Recent insights, blockers, and achievements
- **Summary**: High-level project overview

## 🔧 Troubleshooting

### Common Issues

#### LLM Connection Problems
- **Check API Key**: Verify your API key is correct
- **Check Model**: Ensure the model name is valid
- **Check Network**: Verify internet connection for cloud providers
- **Check Ollama**: Ensure Ollama is running for local models

#### No Notes Processed
- **Check Folders**: Verify folder paths in settings
- **Check File Types**: Ensure notes are markdown files
- **Check Permissions**: Verify Obsidian has access to your vault

#### Poor Quality Output
- **Adjust Settings**: Try different verbosity or tone settings
- **Check Input**: Ensure source notes have sufficient content
- **Try Different Model**: Some models work better for specific tasks

#### Memory Not Updating
- **Check Automation**: Verify automatic updates are enabled
- **Check Exclusions**: Ensure projects aren't in the exclude list
- **Check Scheduler**: Verify the scheduler is running

### Getting Help

1. **Check the Logs**: Open Developer Tools (F12) and check the console
2. **Review Settings**: Double-check all configuration settings
3. **Test Manually**: Try running commands manually to isolate issues
4. **Report Issues**: Create an issue on GitHub with detailed information

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Build the plugin: `npm run build`
4. Copy to your Obsidian plugins folder: `npm run copy`

### Testing
- Run tests: `npm test`
- Test specific features: `npm run test:memory`, `npm run test:refinement`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Obsidian Team** for the amazing platform
- **OpenAI, Google, and Ollama** for their LLM services
- **Community Contributors** for feedback and improvements

## 📞 Support

- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas
- **Documentation**: Check the [Developer Guide](DEVELOPER_GUIDE.md) for technical details

---

**Made with ❤️ for the Obsidian community**

*Pensieve - Because your thoughts deserve to be remembered.* 