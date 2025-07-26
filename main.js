var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.jsx
var main_exports = {};
__export(main_exports, {
  default: () => PensievePlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian8 = require("obsidian");

// src/settings.jsx
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  journalFolder: "Journal",
  projectRoot: "Projects",
  memoryFolder: "Memory",
  cleanOutputFolder: "CleanNotes",
  llmProvider: "openai",
  // openai, gemini, ollama
  apiKey: "",
  model: "",
  testResult: "",
  modelList: [],
  // Scheduler settings
  autoUpdateProjectMemories: false,
  projectMemoryUpdateInterval: "daily",
  autoUpdateGeneralMemories: false,
  generalMemoryUpdateInterval: "weekly",
  autoRefineNotes: false,
  noteRefinementInterval: "daily",
  excludeProjects: [],
  // Note refinement settings
  noteRefinementCompressionRatio: 0.3,
  // Default: 3 input notes = 1 output note
  noteRefinementSettings: {
    verbosity: "concise",
    // concise, detailed, comprehensive
    tone: "professional",
    // professional, storytelling, sarcastic
    emojification: false
  },
  // Autolog settings
  autoGenerateAutologs: false,
  autologGenerationInterval: "daily",
  autologCycleType: "daily",
  // daily, weekly, monthly
  autologSettings: {
    includeIncompleteTasks: true,
    includeInsights: true,
    includeSourceNotes: true
  }
};
var PROVIDERS = [
  { label: "OpenAI", value: "openai" },
  { label: "Gemini", value: "gemini" },
  { label: "Anthropic", value: "anthropic" },
  { label: "Ollama (Local)", value: "ollama" }
];
async function fetchModels(provider, apiKey) {
  try {
    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });
      if (!res.ok) throw new Error(`OpenAI: ${res.status} ${res.statusText}`);
      const data = await res.json();
      return data.data.map((m) => m.id).sort();
    } else if (provider === "gemini") {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!res.ok) throw new Error(`Gemini: ${res.status} ${res.statusText}`);
      const data = await res.json();
      return (data.models || []).map((m) => m.name).sort();
    } else if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        }
      });
      if (!res.ok) throw new Error(`Anthropic: ${res.status} ${res.statusText}`);
      const data = await res.json();
      return data.data.map((m) => m.id).sort();
    } else if (provider === "ollama") {
      const res = await fetch("http://localhost:11434/api/tags");
      if (!res.ok) throw new Error(`Ollama: ${res.status} ${res.statusText}`);
      const data = await res.json();
      return (data.models || []).map((m) => m.name).sort();
    }
    return [];
  } catch (e) {
    return { error: e.message };
  }
}
async function testApiKey(provider, apiKey, model, plugin) {
  try {
    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });
      if (res.ok) return "OpenAI: Success!";
      return `OpenAI: ${res.status} ${res.statusText}`;
    } else if (provider === "gemini") {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (res.ok) return "Gemini: Success!";
      return `Gemini: ${res.status} ${res.statusText}`;
    } else if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        }
      });
      if (res.ok) return "Anthropic: Success!";
      return `Anthropic: ${res.status} ${res.statusText}`;
    } else if (provider === "ollama") {
      const res = await fetch("http://localhost:11434/api/tags");
      if (res.ok) return "Ollama: Success!";
      return `Ollama: ${res.status} ${res.statusText}`;
    }
    return "Unknown provider";
  } catch (e) {
    return `Error: ${e.message}`;
  }
}
function getAllFolderPaths(app) {
  return app.vault.getAllLoadedFiles().filter((f) => f instanceof import_obsidian.TFolder).map((f) => f.path).sort();
}
var PensieveSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.modelListCache = {};
    this.loadingModels = false;
    this.modelError = null;
  }
  async onProviderOrKeyChange() {
    const { llmProvider, apiKey } = this.plugin.settings;
    this.loadingModels = true;
    this.modelError = null;
    this.plugin.settings.modelList = [];
    this.display();
    const cacheKey = `${llmProvider}:${apiKey}`;
    if (this.modelListCache[cacheKey]) {
      this.plugin.settings.modelList = this.modelListCache[cacheKey];
      this.loadingModels = false;
      if (this.plugin.settings.modelList.length > 0) {
        this.plugin.settings.model = this.plugin.settings.modelList[0];
      }
      await this.plugin.saveSettings();
      this.display();
      return;
    }
    const result = await fetchModels(llmProvider, apiKey);
    if (Array.isArray(result)) {
      this.modelListCache[cacheKey] = result;
      this.plugin.settings.modelList = result;
      this.loadingModels = false;
      if (result.length > 0) {
        this.plugin.settings.model = result[0];
      }
      await this.plugin.saveSettings();
    } else {
      this.modelError = result.error;
      this.loadingModels = false;
    }
    this.display();
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Pensieve Settings" });
    const folderPaths = getAllFolderPaths(this.app);
    new import_obsidian.Setting(containerEl).setName("Journal Folder").setDesc("Folder for daily notes/journals").addDropdown((drop) => {
      folderPaths.forEach((path) => drop.addOption(path, path));
      drop.setValue(this.plugin.settings.journalFolder);
      drop.onChange(async (value) => {
        this.plugin.settings.journalFolder = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Project Root Folder").setDesc("Root folder for all projects").addDropdown((drop) => {
      folderPaths.forEach((path) => drop.addOption(path, path));
      drop.setValue(this.plugin.settings.projectRoot);
      drop.onChange(async (value) => {
        this.plugin.settings.projectRoot = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Memory Folder Name").setDesc("Folder for storing memory/checkpoints").addDropdown((drop) => {
      folderPaths.forEach((path) => drop.addOption(path, path));
      drop.setValue(this.plugin.settings.memoryFolder);
      drop.onChange(async (value) => {
        this.plugin.settings.memoryFolder = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Clean Output Folder").setDesc("Folder for refined/public notes").addDropdown((drop) => {
      folderPaths.forEach((path) => drop.addOption(path, path));
      drop.setValue(this.plugin.settings.cleanOutputFolder);
      drop.onChange(async (value) => {
        this.plugin.settings.cleanOutputFolder = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("LLM Provider").setDesc("Choose your language model provider.").addDropdown((drop) => {
      PROVIDERS.forEach((p) => drop.addOption(p.value, p.label));
      drop.setValue(this.plugin.settings.llmProvider);
      drop.onChange(async (value) => {
        this.plugin.settings.llmProvider = value;
        this.plugin.settings.model = "";
        this.plugin.settings.modelList = [];
        await this.plugin.saveSettings();
        this.onProviderOrKeyChange();
      });
    });
    if (["openai", "gemini", "anthropic"].includes(this.plugin.settings.llmProvider)) {
      new import_obsidian.Setting(containerEl).setName("API Key").setDesc(`Enter your ${this.plugin.settings.llmProvider === "openai" ? "OpenAI" : this.plugin.settings.llmProvider === "gemini" ? "Gemini" : "Anthropic"} API key`).addText((text) => {
        text.setPlaceholder(this.plugin.settings.llmProvider === "anthropic" ? "sk-ant-..." : "sk-...");
        text.setValue(this.plugin.settings.apiKey);
        text.inputEl.type = "password";
        text.onChange(async (value) => {
          this.plugin.settings.apiKey = value;
          await this.plugin.saveSettings();
          this.onProviderOrKeyChange();
        });
      });
    }
    if (this.loadingModels) {
      new import_obsidian.Setting(containerEl).setName("Model").setDesc("Loading models...");
    } else if (this.modelError) {
      new import_obsidian.Setting(containerEl).setName("Model").setDesc(`Error: ${this.modelError}`);
    } else if (this.plugin.settings.modelList && this.plugin.settings.modelList.length > 0) {
      new import_obsidian.Setting(containerEl).setName("Model").setDesc("Choose the model to use.").addDropdown((drop) => {
        this.plugin.settings.modelList.forEach((m) => drop.addOption(m, m));
        drop.setValue(this.plugin.settings.model);
        drop.onChange(async (value) => {
          this.plugin.settings.model = value;
          await this.plugin.saveSettings();
        });
      });
    } else {
      new import_obsidian.Setting(containerEl).setName("Model").setDesc("No models found. Please check your provider/API key.");
    }
    new import_obsidian.Setting(containerEl).setName("Test API Key/Connection").setDesc("Test your provider credentials or local server.").addButton((btn) => {
      btn.setButtonText("Test");
      btn.onClick(async () => {
        const { llmProvider, apiKey, model } = this.plugin.settings;
        this.plugin.settings.testResult = "Testing...";
        this.display();
        const result = await testApiKey(llmProvider, apiKey, model, this.plugin);
        this.plugin.settings.testResult = result;
        await this.plugin.saveSettings();
        new import_obsidian.Notice(result);
        this.display();
      });
    });
    if (this.plugin.settings.testResult) {
      const resultDiv = containerEl.createDiv();
      resultDiv.setText(this.plugin.settings.testResult);
    }
    containerEl.createEl("h3", { text: "Automatic Updates" });
    new import_obsidian.Setting(containerEl).setName("Auto-update Project Memories").setDesc("Automatically update project memories at regular intervals").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoUpdateProjectMemories).onChange(async (value) => {
      this.plugin.settings.autoUpdateProjectMemories = value;
      await this.plugin.saveSettings();
    }));
    if (this.plugin.settings.autoUpdateProjectMemories) {
      new import_obsidian.Setting(containerEl).setName("Project Memory Update Interval").setDesc("How often to update project memories").addDropdown((drop) => {
        drop.addOption("hourly", "Hourly");
        drop.addOption("daily", "Daily");
        drop.addOption("weekly", "Weekly");
        drop.addOption("monthly", "Monthly");
        drop.setValue(this.plugin.settings.projectMemoryUpdateInterval);
        drop.onChange(async (value) => {
          this.plugin.settings.projectMemoryUpdateInterval = value;
          await this.plugin.saveSettings();
        });
      });
    }
    new import_obsidian.Setting(containerEl).setName("Exclude Projects").setDesc("Projects to exclude from automatic updates (comma-separated)").addText((text) => text.setPlaceholder("project1, project2, project3").setValue(this.plugin.settings.excludeProjects.join(", ")).onChange(async (value) => {
      this.plugin.settings.excludeProjects = value.split(",").map((p) => p.trim()).filter((p) => p.length > 0);
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Auto-update General Memories").setDesc("Automatically update general memories (coming soon)").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoUpdateGeneralMemories).setDisabled(true).onChange(async (value) => {
      this.plugin.settings.autoUpdateGeneralMemories = value;
      await this.plugin.saveSettings();
    }));
    if (this.plugin.settings.autoUpdateGeneralMemories) {
      new import_obsidian.Setting(containerEl).setName("General Memory Update Interval").setDesc("How often to update general memories").addDropdown((drop) => {
        drop.addOption("hourly", "Hourly");
        drop.addOption("daily", "Daily");
        drop.addOption("weekly", "Weekly");
        drop.addOption("monthly", "Monthly");
        drop.setValue(this.plugin.settings.generalMemoryUpdateInterval);
        drop.onChange(async (value) => {
          this.plugin.settings.generalMemoryUpdateInterval = value;
          await this.plugin.saveSettings();
        });
      });
    }
    new import_obsidian.Setting(containerEl).setName("Auto-refine Notes").setDesc("Automatically refine notes for sharing").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoRefineNotes).onChange(async (value) => {
      this.plugin.settings.autoRefineNotes = value;
      await this.plugin.saveSettings();
    }));
    if (this.plugin.settings.autoRefineNotes) {
      new import_obsidian.Setting(containerEl).setName("Note Refinement Interval").setDesc("How often to refine notes").addDropdown((drop) => {
        drop.addOption("hourly", "Hourly");
        drop.addOption("daily", "Daily");
        drop.addOption("weekly", "Weekly");
        drop.addOption("monthly", "Monthly");
        drop.setValue(this.plugin.settings.noteRefinementInterval);
        drop.onChange(async (value) => {
          this.plugin.settings.noteRefinementInterval = value;
          await this.plugin.saveSettings();
        });
      });
    }
    containerEl.createEl("h3", { text: "Note Refinement Settings" });
    new import_obsidian.Setting(containerEl).setName("Compression Ratio").setDesc("How many input notes to compress into one output note (e.g., 0.3 = 3 input notes = 1 output note)").addSlider((slider) => slider.setLimits(0.1, 1, 0.1).setValue(this.plugin.settings.noteRefinementCompressionRatio).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.noteRefinementCompressionRatio = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Verbosity").setDesc("How detailed the refined notes should be").addDropdown((drop) => {
      drop.addOption("concise", "Concise");
      drop.addOption("detailed", "Detailed");
      drop.addOption("comprehensive", "Comprehensive");
      drop.setValue(this.plugin.settings.noteRefinementSettings.verbosity);
      drop.onChange(async (value) => {
        this.plugin.settings.noteRefinementSettings.verbosity = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Tone").setDesc("The writing style for refined notes").addDropdown((drop) => {
      drop.addOption("professional", "Professional");
      drop.addOption("storytelling", "Storytelling");
      drop.addOption("sarcastic", "Sarcastic");
      drop.setValue(this.plugin.settings.noteRefinementSettings.tone);
      drop.onChange(async (value) => {
        this.plugin.settings.noteRefinementSettings.tone = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Emojification").setDesc("Use emojis in refined notes").addToggle((toggle) => toggle.setValue(this.plugin.settings.noteRefinementSettings.emojification).onChange(async (value) => {
      this.plugin.settings.noteRefinementSettings.emojification = value;
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("h3", { text: "Autolog Settings" });
    new import_obsidian.Setting(containerEl).setName("Auto-generate Autologs").setDesc("Automatically generate daily/weekly/monthly summaries").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoGenerateAutologs).onChange(async (value) => {
      this.plugin.settings.autoGenerateAutologs = value;
      await this.plugin.saveSettings();
    }));
    if (this.plugin.settings.autoGenerateAutologs) {
      new import_obsidian.Setting(containerEl).setName("Autolog Generation Interval").setDesc("How often to generate autologs").addDropdown((drop) => {
        drop.addOption("daily", "Daily");
        drop.addOption("weekly", "Weekly");
        drop.addOption("monthly", "Monthly");
        drop.setValue(this.plugin.settings.autologGenerationInterval);
        drop.onChange(async (value) => {
          this.plugin.settings.autologGenerationInterval = value;
          await this.plugin.saveSettings();
        });
      });
    }
    new import_obsidian.Setting(containerEl).setName("Default Autolog Cycle Type").setDesc("Default cycle type for manual autolog generation").addDropdown((drop) => {
      drop.addOption("daily", "Daily");
      drop.addOption("weekly", "Weekly");
      drop.addOption("monthly", "Monthly");
      drop.setValue(this.plugin.settings.autologCycleType);
      drop.onChange(async (value) => {
        this.plugin.settings.autologCycleType = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Include Incomplete Tasks").setDesc("Include incomplete/pending tasks in autologs").addToggle((toggle) => toggle.setValue(this.plugin.settings.autologSettings.includeIncompleteTasks).onChange(async (value) => {
      this.plugin.settings.autologSettings.includeIncompleteTasks = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Include Insights").setDesc("Include productivity insights and patterns in autologs").addToggle((toggle) => toggle.setValue(this.plugin.settings.autologSettings.includeInsights).onChange(async (value) => {
      this.plugin.settings.autologSettings.includeInsights = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Include Source Notes").setDesc("Include links to source notes in autologs").addToggle((toggle) => toggle.setValue(this.plugin.settings.autologSettings.includeSourceNotes).onChange(async (value) => {
      this.plugin.settings.autologSettings.includeSourceNotes = value;
      await this.plugin.saveSettings();
    }));
  }
};

// src/memory-manager.js
var import_obsidian4 = require("obsidian");

// src/utils.js
var import_obsidian2 = require("obsidian");
function sortFilesByDate(files) {
  return files.sort((a, b) => b.stat.mtime - a.stat.mtime);
}
function getProjects(app, projectRoot) {
  const rootFolder = app.vault.getAbstractFileByPath(projectRoot);
  if (!rootFolder || !(rootFolder instanceof import_obsidian2.TFolder)) {
    return [];
  }
  return rootFolder.children.filter((child) => child instanceof import_obsidian2.TFolder).sort((a, b) => a.name.localeCompare(b.name));
}
function getNotesInFolder(app, folderPath) {
  const folder = app.vault.getAbstractFileByPath(folderPath);
  if (!folder || !(folder instanceof import_obsidian2.TFolder)) {
    return [];
  }
  return folder.children.filter((child) => child instanceof import_obsidian2.TFile && child.extension === "md").sort((a, b) => b.stat.mtime - a.stat.mtime);
}
function getNotesRecursively(app, folderPath) {
  const folder = app.vault.getAbstractFileByPath(folderPath);
  if (!folder || !(folder instanceof import_obsidian2.TFolder)) {
    return [];
  }
  const notes = [];
  function traverseFolder(currentFolder) {
    for (const child of currentFolder.children) {
      if (child instanceof import_obsidian2.TFile && child.extension === "md") {
        notes.push(child);
      } else if (child instanceof import_obsidian2.TFolder) {
        traverseFolder(child);
      }
    }
  }
  traverseFolder(folder);
  return notes.sort((a, b) => b.stat.mtime - a.stat.mtime);
}
function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function getTimeAgo(date) {
  const now = /* @__PURE__ */ new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1e3 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1e3 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1e3 * 60));
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  } else {
    return "Just now";
  }
}
function sanitizeFilename(filename) {
  return filename.replace(/[<>:"/\\|?*]/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

// src/llm-extractor.js
var import_obsidian3 = require("obsidian");

// src/prompts.js
var PROMPTS = {
  tasks: {
    system: `You are an expert at identifying tasks and todos from project notes. Extract tasks in the following format:

EXPLICIT TASKS: these are the tasks that are explicitly mentioned in the notes

IMPLIED TASKS: these are the tasks that are implied or can be inferred from the notes but not mentioned explicitly

Format for tasks
**EXPLICIT TASKS**:
- [ ] Task description (from: source_note)
- [x] Completed task description (from: source_note)

**IMPLIED TASKS**:
- [ ] Task description (from: source_note)
- [x] Completed task description (from: source_note)

Only include tasks that are clearly actionable. For explicit tasks, preserve the checkbox format if present. For implied tasks, look for mentions of future work, things that need to be done, or planned activities.`,
    user: (chunk, chunkIndex, totalChunks) => `Extract tasks from the following project notes (part ${chunkIndex + 1}/${totalChunks}):

${chunk}`
  },
  insights: {
    system: `You are an expert at identifying insights from project notes. Extract insights in the following format:

BLOCKERS:
- Blocker description (from: source_note)

BUGS/ISSUES:
- Bug or issue description (from: source_note)

ACHIEVEMENTS:
- Achievement or completion description (from: source_note)

GENERAL INSIGHTS:
- General insight or observation (from: source_note)

Focus on actionable insights that could help with project management and decision-making.`,
    user: (chunk, chunkIndex, totalChunks) => `Extract insights from the following project notes (part ${chunkIndex + 1}/${totalChunks}):

${chunk}`
  },
  status: {
    system: `You are an expert at analyzing project status and progress. Based on the project notes, determine the current status and provide insights in the following format:

STATUS: [active/stalled/near-completion/inactive]
PROGRESS: [0-100]%
LAST_ACTIVITY: [description of recent activity]
NOTES: [additional observations about project health]
SUMMARY: [summary of the project status]

Consider factors like:
- Recent activity and engagement
- summarize all the project notes in a concise format that give a clear idea what's going on 
    with the project
- Task completion patterns
- Mentioned blockers or issues
- Overall project momentum`,
    user: (chunk, metadata) => `Analyze the project status from these notes (most recent activity):

${chunk}

Additional metadata:
- Total notes: ${metadata.totalNotes}
- Recent notes (last 7 days): ${metadata.recentNotes}
- Latest activity: ${metadata.lastActivity}`
  },
  refineNotes: {
    system: `You are an expert at refining and cleaning up project notes. Your task is to take raw, potentially messy notes and transform them into clean, well-structured, and meaningful content.

Your output should be in the following JSON format:
[
  {
    "title": "Descriptive title for the refined note",
    "content": "The refined content in markdown format"
  }
]

Guidelines for refinement:
1. **Structure**: Organize content logically with clear headings and sections
2. **Clarity**: Remove redundant information and clarify ambiguous statements
3. **Internal Linking**: Create meaningful internal links using Obsidian's [[wiki-link]] format
4. **Conciseness**: Eliminate unnecessary verbosity while preserving important information
5. **Tone**: Match the specified tone (professional, storytelling, or sarcastic)
6. **Emojification**: Use emojis appropriately based on the emojification setting
7. **Compression**: Aim for the specified compression ratio while maintaining quality

The refined notes should be:
- Self-contained and understandable
- Well-organized with clear sections
- Rich in internal links for navigation
- Appropriate for sharing or documentation purposes
- Free of personal notes, TODOs, and temporary content`,
    user: (notesContent, memoryInsights, settings) => {
      const toneInstructions = {
        professional: "Use a formal, business-like tone suitable for professional documentation.",
        storytelling: "Use a narrative, engaging tone that tells a story about the project.",
        sarcastic: "Use a witty, slightly sarcastic tone while maintaining professionalism."
      };
      const emojiInstructions = settings.emojification ? "Use relevant emojis to enhance readability and visual appeal." : "Do not use emojis in the refined content.";
      const verbosityInstructions = {
        concise: "Keep content concise and to the point.",
        detailed: "Provide detailed explanations and context.",
        comprehensive: "Include comprehensive coverage with examples and explanations."
      };
      return `Refine the following project notes into clean, well-structured content:

**Notes to Refine:**
${notesContent}

**Recent Memory Insights:**
${memoryInsights.insights || "No recent insights available"}

**Refinement Settings:**
- Tone: ${toneInstructions[settings.tone] || toneInstructions.professional}
- Emojification: ${emojiInstructions}
- Verbosity: ${verbosityInstructions[settings.verbosity] || verbosityInstructions.concise}
- Target Compression: ${settings.compressionRatio || 0.3} (output/input ratio)

Please create refined notes that are clean, well-structured, and maintain internal linking.`;
    }
  },
  autolog: {
    system: `You are an expert at creating holistic summaries of daily, weekly, or monthly activities from journal notes. Your task is to analyze the notes and create a comprehensive overview of what was accomplished and what wasn't.

Your output should be in the following format:

SUMMARY:
[Provide a concise overview of the period, highlighting the main themes, activities, and overall productivity]

COMPLETED:
[List all tasks, activities, or goals that were successfully completed during this period]

INCOMPLETE:
[List all tasks, activities, or goals that were mentioned but not completed, or that are still pending]

INSIGHTS:
[Provide key insights about productivity patterns, challenges, achievements, or observations from this period]

Guidelines:
1. **Focus on actionable items**: Identify what was done vs what wasn't done
2. **Be comprehensive**: Cover all major activities mentioned in the notes
3. **Provide context**: Explain the significance of completed and incomplete items
4. **Identify patterns**: Look for productivity trends, blockers, or achievements
5. **Be objective**: Present information factually without judgment
6. **Use clear language**: Make the summary easy to understand and actionable`,
    user: (notesContent, cycleType, targetDate) => {
      const cycleInstructions = {
        daily: "This is a daily summary. Focus on the specific day's activities and immediate tasks.",
        weekly: "This is a weekly summary. Look for patterns across the week and broader project progress.",
        monthly: "This is a monthly summary. Focus on major milestones, trends, and long-term progress."
      };
      return `Create a ${cycleType} autolog summary for ${targetDate.toLocaleDateString()}:

**Journal Notes:**
${notesContent}

**Instructions:**
${cycleInstructions[cycleType] || cycleInstructions.daily}

Please analyze these notes and provide a comprehensive summary of what was accomplished and what remains to be done.`;
    }
  }
};
function getPrompt(type, params = {}) {
  const promptSet = PROMPTS[type];
  if (!promptSet) {
    throw new Error(`Unknown prompt type: ${type}`);
  }
  return {
    system: promptSet.system,
    user: typeof promptSet.user === "function" ? promptSet.user(...Object.values(params)) : promptSet.user
  };
}

// src/llm-extractor.js
var LLMExtractor = class {
  constructor(settings) {
    this.settings = settings;
    this.tokenEstimates = {
      openai: { "gpt-3.5": 4096, "gpt-4": 8192, "gpt-4-turbo": 128e3 },
      gemini: { "gemini-pro": 32768, "gemini-1.5": 1048576, "gemini-2.0": 32768 },
      anthropic: { "claude-3": 2e5, "claude-3.5": 2e5, "claude-2": 1e5 },
      ollama: { llama2: 4096, mistral: 8192, phi3: 8192 }
      // Default estimates
    };
  }
  /**
  * Get context window size for current model
  * @returns {number} Context window size in tokens
  */
  getContextWindow() {
    const { llmProvider, model } = this.settings;
    const providerTokens = this.tokenEstimates[llmProvider] || {};
    for (const [prefix, tokens] of Object.entries(providerTokens)) {
      if (model.startsWith(prefix)) {
        return tokens;
      }
    }
    return 4096;
  }
  /**
   * Estimate tokens in text (rough approximation)
   * @param {string} text - Text to estimate
   * @returns {number} Estimated token count
   */
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }
  /**
   * Split content into chunks that fit within token limit
   * @param {string} content - Content to split
   * @param {number} maxTokens - Maximum tokens per chunk
   * @returns {string[]} Array of content chunks
   */
  splitContent(content, maxTokens) {
    const chunks = [];
    const lines = content.split("\n");
    let currentChunk = "";
    let currentTokens = 0;
    for (const line of lines) {
      const lineTokens = this.estimateTokens(line + "\n");
      if (currentTokens + lineTokens > maxTokens && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = line + "\n";
        currentTokens = lineTokens;
      } else {
        currentChunk += line + "\n";
        currentTokens += lineTokens;
      }
    }
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    return chunks;
  }
  /**
   * Make LLM API call
   * @param {string} prompt - Prompt to send
   * @param {string} systemPrompt - System prompt
   * @returns {Promise<string>} LLM response
   */
  async makeLLMCall(prompt, systemPrompt = "") {
    const { llmProvider, apiKey, model } = this.settings;
    try {
      if (llmProvider === "openai") {
        return await this.callOpenAI(prompt, systemPrompt);
      } else if (llmProvider === "gemini") {
        return await this.callGemini(prompt, systemPrompt);
      } else if (llmProvider === "anthropic") {
        return await this.callAnthropic(prompt, systemPrompt);
      } else if (llmProvider === "ollama") {
        return await this.callOllama(prompt, systemPrompt);
      } else {
        throw new Error(`Unsupported provider: ${llmProvider}`);
      }
    } catch (error) {
      console.error("LLM call failed:", error);
      throw error;
    }
  }
  /**
   * Call OpenAI API
   * @param {string} prompt - User prompt
   * @param {string} systemPrompt - System prompt
   * @returns {Promise<string>} Response
   */
  async callOpenAI(prompt, systemPrompt) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.settings.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.settings.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1e3
      })
    });
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.choices[0].message.content;
  }
  /**
   * Call Gemini API
   * @param {string} prompt - User prompt
   * @param {string} systemPrompt - System prompt
   * @returns {Promise<string>} Response
   */
  async callGemini(prompt, systemPrompt) {
    const fullPrompt = systemPrompt ? `${systemPrompt}

${prompt}` : prompt;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${this.settings.model}:generateContent?key=${this.settings.apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: fullPrompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1e3
        }
      })
    });
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }
  /**
   * Call Anthropic API
   * @param {string} prompt - User prompt
   * @param {string} systemPrompt - System prompt
   * @returns {Promise<string>} Response
   */
  async callAnthropic(prompt, systemPrompt) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.settings.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.settings.model,
        max_tokens: 1e3,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        system: systemPrompt
      })
    });
    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.content[0].text;
  }
  /**
   * Call Ollama API
   * @param {string} prompt - User prompt
   * @param {string} systemPrompt - System prompt
   * @returns {Promise<string>} Response
   */
  async callOllama(prompt, systemPrompt) {
    const fullPrompt = systemPrompt ? `${systemPrompt}

${prompt}` : prompt;
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.settings.model,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 1e3
        }
      })
    });
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.response;
  }
  /**
  * Extract tasks from notes using LLM
  * @param {string} notesContent - Combined notes content
  * @returns {Promise<Object>} Extracted tasks
  */
  async extractTasks(notesContent) {
    const maxTokens = Math.floor(this.getContextWindow() * 0.5);
    const chunks = this.splitContent(notesContent, maxTokens);
    const allTasks = {
      explicit: [],
      implied: []
    };
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const { system, user } = getPrompt("tasks", [chunk, i, chunks.length]);
      try {
        const response = await this.makeLLMCall(user, system);
        const parsedTasks = this.parseTaskResponse(response);
        allTasks.explicit.push(...parsedTasks.explicit);
        allTasks.implied.push(...parsedTasks.implied);
      } catch (error) {
        console.error(`Error extracting tasks from chunk ${i + 1}:`, error);
      }
    }
    return allTasks;
  }
  /**
  * Extract insights from notes using LLM
  * @param {string} notesContent - Combined notes content
  * @returns {Promise<Object>} Extracted insights
  */
  async extractInsights(notesContent) {
    const maxTokens = Math.floor(this.getContextWindow() * 0.5);
    const chunks = this.splitContent(notesContent, maxTokens);
    const allInsights = {
      blockers: [],
      bugs: [],
      achievements: [],
      general: []
    };
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const { system, user } = getPrompt("insights", [chunk, i, chunks.length]);
      try {
        const response = await this.makeLLMCall(user, system);
        const parsedInsights = this.parseInsightResponse(response);
        allInsights.blockers.push(...parsedInsights.blockers);
        allInsights.bugs.push(...parsedInsights.bugs);
        allInsights.achievements.push(...parsedInsights.achievements);
        allInsights.general.push(...parsedInsights.general);
      } catch (error) {
        console.error(`Error extracting insights from chunk ${i + 1}:`, error);
      }
    }
    return allInsights;
  }
  /**
  * Determine project status using LLM
  * @param {string} notesContent - Combined notes content
  * @param {Object} metadata - Additional metadata (note count, dates, etc.)
  * @returns {Promise<Object>} Project status
  */
  async determineProjectStatus(notesContent, metadata) {
    const maxTokens = Math.floor(this.getContextWindow() * 0.5);
    const chunks = this.splitContent(notesContent, maxTokens);
    const chunk = chunks[0];
    const { system, user } = getPrompt("status", [chunk, metadata]);
    try {
      const response = await this.makeLLMCall(user, system);
      return this.parseStatusResponse(response, metadata);
    } catch (error) {
      console.error("Error determining project status:", error);
      return {
        status: "active",
        progress: Math.min(100, metadata.recentNotes / Math.max(1, metadata.totalNotes) * 100),
        lastActivity: metadata.lastActivity,
        totalNotes: metadata.totalNotes,
        recentNotes: metadata.recentNotes
      };
    }
  }
  /**
   * Parse task extraction response
   * @param {string} response - LLM response
   * @returns {Object} Parsed tasks
   */
  parseTaskResponse(response) {
    const tasks = { explicit: [], implied: [] };
    const lines = response.split("\n");
    let currentSection = "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("EXPLICIT TASKS:")) {
        currentSection = "explicit";
      } else if (trimmed.startsWith("IMPLIED TASKS:")) {
        currentSection = "implied";
      } else if (trimmed.startsWith("-") && currentSection) {
        const taskText = trimmed.substring(1).trim();
        const task = {
          text: taskText,
          completed: taskText.includes("[x]") || taskText.includes("[X]"),
          source: "LLM extracted"
        };
        if (currentSection === "explicit") {
          tasks.explicit.push(task);
        } else {
          tasks.implied.push(task);
        }
      }
    }
    return tasks;
  }
  /**
   * Parse insight extraction response
   * @param {string} response - LLM response
   * @returns {Object} Parsed insights
   */
  parseInsightResponse(response) {
    const insights = { blockers: [], bugs: [], achievements: [], general: [] };
    const lines = response.split("\n");
    let currentSection = "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("BLOCKERS:")) {
        currentSection = "blockers";
      } else if (trimmed.startsWith("BUGS/ISSUES:")) {
        currentSection = "bugs";
      } else if (trimmed.startsWith("ACHIEVEMENTS:")) {
        currentSection = "achievements";
      } else if (trimmed.startsWith("GENERAL INSIGHTS:")) {
        currentSection = "general";
      } else if (trimmed.startsWith("-") && currentSection) {
        const insight = {
          text: trimmed.substring(1).trim(),
          source: "LLM extracted"
        };
        insights[currentSection].push(insight);
      }
    }
    return insights;
  }
  /**
   * Parse status determination response
   * @param {string} response - LLM response
   * @param {Object} metadata - Original metadata
   * @returns {Object} Parsed status
   */
  parseStatusResponse(response, metadata) {
    const status = {
      status: "active",
      progress: 50,
      lastActivity: metadata.lastActivity,
      totalNotes: metadata.totalNotes,
      recentNotes: metadata.recentNotes
    };
    const lines = response.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("STATUS:")) {
        const statusMatch = trimmed.match(/STATUS:\s*(\w+)/i);
        if (statusMatch) {
          status.status = statusMatch[1].toLowerCase();
        }
      } else if (trimmed.startsWith("PROGRESS:")) {
        const progressMatch = trimmed.match(/PROGRESS:\s*(\d+)%/);
        if (progressMatch) {
          status.progress = parseInt(progressMatch[1]);
        }
      } else if (trimmed.startsWith("LAST_ACTIVITY:")) {
        const activityMatch = trimmed.match(/LAST_ACTIVITY:\s*(.+)/);
        if (activityMatch) {
          status.lastActivity = activityMatch[1].trim();
        }
      }
    }
    return status;
  }
  /**
   * Refine notes using LLM
   * @param {string} notesContent - Combined notes content
   * @param {Object} memoryInsights - Recent memory insights
   * @param {Object} settings - Refinement settings
   * @returns {Promise<Object[]>} Array of refined notes
   */
  async refineNotes(notesContent, memoryInsights, settings) {
    const maxTokens = Math.floor(this.getContextWindow() * 0.7);
    const chunks = this.splitContent(notesContent, maxTokens);
    const allRefinedNotes = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const { system, user } = getPrompt("refineNotes", [chunk, memoryInsights, settings]);
      try {
        const response = await this.makeLLMCall(user, system);
        const parsedNotes = this.parseRefineResponse(response);
        allRefinedNotes.push(...parsedNotes);
      } catch (error) {
        console.error(`Error refining notes from chunk ${i + 1}:`, error);
        allRefinedNotes.push({
          title: `Refined Notes - Chunk ${i + 1}`,
          content: `# Refined Notes

${chunk}`
        });
      }
    }
    return allRefinedNotes;
  }
  /**
   * Parse note refinement response
   * @param {string} response - LLM response
   * @returns {Object[]} Array of refined notes
   */
  parseRefineResponse(response) {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.map((note) => ({
            title: note.title || "Untitled Note",
            content: note.content || ""
          }));
        }
      }
      const notes = [];
      const sections = response.split(/(?=^# )/m);
      for (const section of sections) {
        if (section.trim()) {
          const titleMatch = section.match(/^# (.+)$/m);
          const title = titleMatch ? titleMatch[1].trim() : "Untitled Note";
          const content = section.replace(/^# .+$/m, "").trim();
          if (content) {
            notes.push({ title, content });
          }
        }
      }
      return notes.length > 0 ? notes : [{ title: "Refined Notes", content: response }];
    } catch (error) {
      console.error("Error parsing refine response:", error);
      return [{ title: "Refined Notes", content: response }];
    }
  }
  /**
   * Generate autolog summary using LLM
   * @param {string} notesContent - Combined notes content
   * @param {string} cycleType - Type of cycle ('daily', 'weekly', 'monthly')
   * @param {Date} targetDate - Target date for the cycle
   * @returns {Promise<Object>} Autolog data
   */
  async generateAutolog(notesContent, cycleType, targetDate) {
    const maxTokens = Math.floor(this.getContextWindow() * 0.7);
    const chunks = this.splitContent(notesContent, maxTokens);
    const allAutologData = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const { system, user } = getPrompt("autolog", [chunk, cycleType, targetDate]);
      try {
        const response = await this.makeLLMCall(user, system);
        const parsedData = this.parseAutologResponse(response);
        allAutologData.push(parsedData);
      } catch (error) {
        console.error(`Error generating autolog from chunk ${i + 1}:`, error);
        allAutologData.push({
          summary: `Processed notes from chunk ${i + 1}`,
          completed: "No completed tasks identified",
          incomplete: "No incomplete tasks identified",
          insights: "No insights available"
        });
      }
    }
    return this.combineAutologData(allAutologData);
  }
  /**
   * Parse autolog response
   * @param {string} response - LLM response
   * @returns {Object} Parsed autolog data
   */
  parseAutologResponse(response) {
    const autologData = {
      summary: "",
      completed: "",
      incomplete: "",
      insights: ""
    };
    const lines = response.split("\n");
    let currentSection = "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("SUMMARY:")) {
        currentSection = "summary";
      } else if (trimmed.startsWith("COMPLETED:")) {
        currentSection = "completed";
      } else if (trimmed.startsWith("INCOMPLETE:")) {
        currentSection = "incomplete";
      } else if (trimmed.startsWith("INSIGHTS:")) {
        currentSection = "insights";
      } else if (trimmed.length > 0 && currentSection) {
        if (currentSection === "summary") {
          autologData.summary += (autologData.summary ? "\n" : "") + trimmed;
        } else if (currentSection === "completed") {
          autologData.completed += (autologData.completed ? "\n" : "") + trimmed;
        } else if (currentSection === "incomplete") {
          autologData.incomplete += (autologData.incomplete ? "\n" : "") + trimmed;
        } else if (currentSection === "insights") {
          autologData.insights += (autologData.insights ? "\n" : "") + trimmed;
        }
      }
    }
    return autologData;
  }
  /**
   * Combine multiple autolog data objects into one
   * @param {Object[]} autologDataArray - Array of autolog data objects
   * @returns {Object} Combined autolog data
   */
  combineAutologData(autologDataArray) {
    const combined = {
      summary: "",
      completed: "",
      incomplete: "",
      insights: ""
    };
    for (const data of autologDataArray) {
      if (data.summary) {
        combined.summary += (combined.summary ? "\n\n" : "") + data.summary;
      }
      if (data.completed) {
        combined.completed += (combined.completed ? "\n\n" : "") + data.completed;
      }
      if (data.incomplete) {
        combined.incomplete += (combined.incomplete ? "\n\n" : "") + data.incomplete;
      }
      if (data.insights) {
        combined.insights += (combined.insights ? "\n\n" : "") + data.insights;
      }
    }
    return combined;
  }
  /**
   * Analyze multiple autologs with custom prompt
   * @param {string} autologsContent - Combined content of multiple autologs
   * @param {string} customPrompt - Custom prompt for analysis
   * @returns {Promise<string>} Analysis result
   */
  async analyzeAutologs(autologsContent, customPrompt) {
    const maxTokens = Math.floor(this.getContextWindow() * 0.7);
    const chunks = this.splitContent(autologsContent, maxTokens);
    const allAnalysisResults = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const systemPrompt = `You are an expert at analyzing patterns and trends from multiple autolog entries. Your task is to provide insights based on the custom prompt provided by the user.

Guidelines:
1. **Focus on patterns**: Look for recurring themes, trends, and patterns across the autologs
2. **Provide actionable insights**: Give specific, actionable recommendations
3. **Be comprehensive**: Cover all aspects mentioned in the custom prompt
4. **Use clear language**: Make the analysis easy to understand
5. **Be objective**: Present information factually without judgment`;
      const userPrompt = `Custom Analysis Request: ${customPrompt}

Autolog Content (Part ${i + 1}/${chunks.length}):
${chunk}

Please analyze this content according to the custom prompt and provide detailed insights.`;
      try {
        const response = await this.makeLLMCall(userPrompt, systemPrompt);
        allAnalysisResults.push(response);
      } catch (error) {
        console.error(`Error analyzing autolog chunk ${i + 1}:`, error);
        allAnalysisResults.push(`Error analyzing chunk ${i + 1}: ${error.message}`);
      }
    }
    return allAnalysisResults.join("\n\n---\n\n");
  }
};

// src/memory-manager.js
async function updateProjectMemories(app, settings, excludeProjects = []) {
  try {
    const projects = getProjects(app, settings.projectRoot);
    const journalNotes = getNotesInFolder(app, settings.journalFolder);
    const activeProjects = projects.filter(
      (project) => !excludeProjects.includes(project.name)
    );
    for (const project of activeProjects) {
      await updateSingleProjectMemory(app, settings, project, journalNotes);
    }
    new import_obsidian4.Notice(`Updated memories for ${activeProjects.length} projects`);
  } catch (error) {
    console.error("Error updating project memories:", error);
    new import_obsidian4.Notice("Error updating project memories");
  }
}
async function updateSingleProjectMemory(app, settings, project, journalNotes) {
  const projectName = project.name;
  const projectNotes = findProjectNotesInJournal(journalNotes, projectName);
  if (projectNotes.length === 0) {
    return;
  }
  const sortedNotes = sortFilesByDate(projectNotes);
  const notesContent = await combineNotesContent(app, sortedNotes);
  const extractor = new LLMExtractor(settings);
  const insights = await extractor.extractInsights(notesContent);
  const tasks = await extractor.extractTasks(notesContent);
  const metadata = {
    totalNotes: sortedNotes.length,
    recentNotes: sortedNotes.filter((note) => {
      const daysSinceModification = (Date.now() - note.stat.mtime) / (1e3 * 60 * 60 * 24);
      return daysSinceModification <= 7;
    }).length,
    lastActivity: getTimeAgo(new Date(sortedNotes[0].stat.mtime))
  };
  const status = await extractor.determineProjectStatus(notesContent, metadata);
  await updateMemoryFiles(app, settings, projectName, { tasks, status, insights });
}
function findProjectNotesInJournal(journalNotes, projectName) {
  return journalNotes.filter((note) => {
    return note.name.toLowerCase().includes(projectName.toLowerCase()) || note.path.toLowerCase().includes(projectName.toLowerCase());
  });
}
async function combineNotesContent(app, notes) {
  let combinedContent = "";
  for (const note of notes) {
    try {
      const content = await app.vault.read(note);
      combinedContent += `

--- ${note.name} ---
${content}
`;
    } catch (error) {
      console.error(`Error reading note ${note.name}:`, error);
    }
  }
  return combinedContent;
}
async function updateMemoryFiles(app, settings, projectName, data) {
  const memoryPath = `${settings.memoryFolder}/projects/${projectName}`;
  const today = formatDate(/* @__PURE__ */ new Date());
  await ensureFolderExists(app, memoryPath);
  await updateMemoryFile(app, projectName, `${memoryPath}/tasks.md`, "Tasks", data.tasks, today);
  await updateMemoryFile(app, projectName, `${memoryPath}/status.md`, "Status", data.status, today);
  await updateMemoryFile(app, projectName, `${memoryPath}/insights.md`, "Insights", data.insights, today);
}
async function updateMemoryFile(app, projectName, filePath, title, data, today) {
  let content = "";
  const existingFile = app.vault.getAbstractFileByPath(filePath);
  if (existingFile instanceof import_obsidian4.TFile) {
    content = await app.vault.read(existingFile);
  }
  const newSection = generateMemorySection(title, data, today);
  const updatedContent = content + "\n\n" + newSection;
  if (existingFile) {
    await app.vault.modify(existingFile, updatedContent);
  } else {
    const fileProperties = [
      "---",
      `project_name: ${projectName}`,
      `memory_type: ${title}`,
      "---",
      `# ${title}`,
      ""
    ].join("\n");
    const updatedContentWithFrontmatter = fileProperties + updatedContent;
    await app.vault.create(filePath, updatedContentWithFrontmatter);
  }
}
function generateMemorySection(title, data, today) {
  let section = `## ${today}

`;
  if (title === "Tasks") {
    if (data.explicit && data.explicit.length > 0) {
      section += "### Explicit Tasks\n\n";
      data.explicit.forEach((task) => {
        const status = task.completed ? "\u2705" : "\u23F3";
        section += `- ${status} ${task.text} (from: ${task.source})
`;
      });
      section += "\n";
    }
    if (data.implied && data.implied.length > 0) {
      section += "### Implied Tasks\n\n";
      data.implied.forEach((task) => {
        section += `- \u{1F4AD} ${task.text} (from: ${task.source})
`;
      });
      section += "\n";
    }
  } else if (title === "Status") {
    section += `### Project Status: ${data.status}

`;
    section += `- **Progress:** ${data.progress}%
`;
    section += `- **Last Activity:** ${data.lastActivity}
`;
    section += `- **Total Notes:** ${data.totalNotes}
`;
    section += `- **Recent Notes:** ${data.recentNotes}

`;
  } else if (title === "Insights") {
    if (data.blockers && data.blockers.length > 0) {
      section += "### Blockers\n\n";
      data.blockers.forEach((blocker) => {
        section += `- \u{1F6AB} ${blocker.text} (from: ${blocker.source})
`;
      });
      section += "\n";
    }
    if (data.bugs && data.bugs.length > 0) {
      section += "### Bugs/Issues\n\n";
      data.bugs.forEach((bug) => {
        section += `- \u{1F41B} ${bug.text} (from: ${bug.source})
`;
      });
      section += "\n";
    }
    if (data.achievements && data.achievements.length > 0) {
      section += "### Achievements\n\n";
      data.achievements.forEach((achievement) => {
        section += `- \u{1F389} ${achievement.text} (from: ${achievement.source})
`;
      });
      section += "\n";
    }
    if (data.general && data.general.length > 0) {
      section += "### General Insights\n\n";
      data.general.forEach((insight) => {
        section += `- \u{1F4A1} ${insight.text} (from: ${insight.source})
`;
      });
      section += "\n";
    }
  }
  return section;
}
async function ensureFolderExists(app, folderPath) {
  const folder = app.vault.getAbstractFileByPath(folderPath);
  if (!folder) {
    await app.vault.createFolder(folderPath);
  }
}

// src/note-refiner.js
var import_obsidian5 = require("obsidian");
async function refineProjectNotes(app, settings, excludeProjects = []) {
  try {
    const projects = getProjects(app, settings.projectRoot);
    const activeProjects = projects.filter(
      (project) => !excludeProjects.includes(project.name)
    );
    for (const project of activeProjects) {
      await refineSingleProjectNotes(app, settings, project);
    }
    new import_obsidian5.Notice(`Refined notes for ${activeProjects.length} projects`);
  } catch (error) {
    console.error("Error refining project notes:", error);
    new import_obsidian5.Notice("Error refining project notes");
  }
}
async function refineSingleProjectNotes(app, settings, project) {
  const projectName = project.name;
  const cleanOutputPath = `${settings.cleanOutputFolder}/${projectName}`;
  await ensureFolderExists2(app, cleanOutputPath);
  const checkpointPath = `${cleanOutputPath}/checkpoint.md`;
  const checkpoint = await loadCheckpoint(app, checkpointPath);
  const projectNotes = getNotesRecursively(app, project.path);
  const unprocessedNotes = projectNotes.filter(
    (note) => !checkpoint.processedNotes.includes(note.path)
  );
  if (unprocessedNotes.length === 0) {
    return;
  }
  const sortedNotes = sortFilesByDate(unprocessedNotes);
  const memoryInsights = await getRecentMemoryInsights(app, settings, projectName);
  const extractor = new LLMExtractor(settings);
  const batchSize = calculateBatchSize(sortedNotes.length, settings.noteRefinementCompressionRatio);
  const batches = createBatches(sortedNotes, batchSize);
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchNotes = await combineNotesContent2(app, batch);
    const refinedNotes = await extractor.refineNotes(
      batchNotes,
      memoryInsights,
      {
        ...settings.noteRefinementSettings,
        compressionRatio: settings.noteRefinementCompressionRatio
      }
    );
    await saveRefinedNotes(app, cleanOutputPath, refinedNotes, i + 1);
    checkpoint.processedNotes.push(...batch.map((note) => note.path));
    checkpoint.lastProcessedDate = formatDate(/* @__PURE__ */ new Date());
    checkpoint.lastMemoryUsed = memoryInsights.lastUsed || checkpoint.lastMemoryUsed;
  }
  await updateProjectTree(app, cleanOutputPath, {
    inputNotes: unprocessedNotes.map((note) => note.name),
    outputNotes: batches.length,
    date: formatDate(/* @__PURE__ */ new Date())
  });
  await saveCheckpoint(app, checkpointPath, checkpoint);
}
async function loadCheckpoint(app, checkpointPath) {
  const checkpointFile = app.vault.getAbstractFileByPath(checkpointPath);
  if (checkpointFile instanceof import_obsidian5.TFile) {
    try {
      const content = await app.vault.read(checkpointFile);
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const frontmatterStr = frontmatterMatch[1];
        const checkpoint = {};
        frontmatterStr.split("\n").forEach((line) => {
          const colonIndex = line.indexOf(":");
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();
            if (key === "processedNotes") {
              checkpoint[key] = value ? value.split(",").map((p) => p.trim()) : [];
            } else {
              checkpoint[key] = value;
            }
          }
        });
        return checkpoint;
      }
    } catch (error) {
      console.error("Error reading checkpoint:", error);
    }
  }
  return {
    processedNotes: [],
    lastProcessedDate: "",
    lastMemoryUsed: ""
  };
}
async function saveCheckpoint(app, checkpointPath, checkpoint) {
  const frontmatter = [
    "---",
    `processedNotes: ${checkpoint.processedNotes.join(", ")}`,
    `lastProcessedDate: ${checkpoint.lastProcessedDate}`,
    `lastMemoryUsed: ${checkpoint.lastMemoryUsed}`,
    "---",
    "# Checkpoint",
    "",
    "This file tracks which notes have been processed by the note refinement system.",
    "",
    `**Last Processed:** ${checkpoint.lastProcessedDate}`,
    `**Last Memory Used:** ${checkpoint.lastMemoryUsed}`,
    `**Total Processed Notes:** ${checkpoint.processedNotes.length}`
  ].join("\n");
  const checkpointFile = app.vault.getAbstractFileByPath(checkpointPath);
  if (checkpointFile instanceof import_obsidian5.TFile) {
    await app.vault.modify(checkpointFile, frontmatter);
  } else {
    await app.vault.create(checkpointPath, frontmatter);
  }
}
async function getRecentMemoryInsights(app, settings, projectName) {
  const memoryPath = `${settings.memoryFolder}/projects/${projectName}`;
  const insightsFile = app.vault.getAbstractFileByPath(`${memoryPath}/insights.md`);
  if (!insightsFile || !(insightsFile instanceof import_obsidian5.TFile)) {
    return { insights: "", lastUsed: "" };
  }
  try {
    const content = await app.vault.read(insightsFile);
    const sections = content.split(/(?=^## )/m);
    const lastSection = sections[sections.length - 1];
    if (lastSection) {
      const dateMatch = lastSection.match(/^## (.+)$/m);
      const date = dateMatch ? dateMatch[1] : "";
      return {
        insights: lastSection,
        lastUsed: date
      };
    }
    return { insights: content, lastUsed: "" };
  } catch (error) {
    console.error("Error reading memory insights:", error);
    return { insights: "", lastUsed: "" };
  }
}
function calculateBatchSize(totalNotes, compressionRatio) {
  if (!compressionRatio || compressionRatio <= 0) {
    return Math.min(10, totalNotes);
  }
  const batchSize = Math.max(1, Math.round(1 / compressionRatio));
  return Math.min(batchSize, totalNotes);
}
function createBatches(notes, batchSize) {
  const batches = [];
  for (let i = 0; i < notes.length; i += batchSize) {
    batches.push(notes.slice(i, i + batchSize));
  }
  return batches;
}
async function combineNotesContent2(app, notes) {
  let combinedContent = "";
  for (const note of notes) {
    try {
      const content = await app.vault.read(note);
      combinedContent += `

--- ${note.name} ---
${content}
`;
    } catch (error) {
      console.error(`Error reading note ${note.name}:`, error);
    }
  }
  return combinedContent;
}
async function saveRefinedNotes(app, cleanOutputPath, refinedNotes, batchNumber) {
  for (let i = 0; i < refinedNotes.length; i++) {
    const note = refinedNotes[i];
    let fileName = `${sanitizeFilename(note.title)}.md`;
    let filePath = `${cleanOutputPath}/${fileName}`;
    let counter = 1;
    while (app.vault.getAbstractFileByPath(filePath)) {
      const baseName = sanitizeFilename(note.title);
      fileName = `${baseName}-${counter}.md`;
      filePath = `${cleanOutputPath}/${fileName}`;
      counter++;
    }
    const content = [
      "---",
      `title: ${note.title}`,
      `type: refined-note`,
      `batch: ${batchNumber}`,
      `created: ${formatDate(/* @__PURE__ */ new Date())}`,
      "---",
      "",
      note.content
    ].join("\n");
    await app.vault.create(filePath, content);
  }
}
async function updateProjectTree(app, cleanOutputPath, refinementData) {
  const treePath = `${cleanOutputPath}/project-tree.md`;
  const treeFile = app.vault.getAbstractFileByPath(treePath);
  let content = "";
  if (treeFile instanceof import_obsidian5.TFile) {
    content = await app.vault.read(treeFile);
  } else {
    content = [
      "---",
      "type: project-tree",
      "---",
      "# Project Refinement History",
      "",
      "This file tracks the history of note refinement for this project.",
      ""
    ].join("\n");
  }
  const newEntry = [
    `## ${refinementData.date}`,
    "",
    "### Input Notes",
    ...refinementData.inputNotes.map((note) => `- ${note}`),
    "",
    "### Output Notes",
    `- Generated ${refinementData.outputNotes} refined note(s)`,
    ""
  ].join("\n");
  const updatedContent = content + "\n" + newEntry;
  if (treeFile instanceof import_obsidian5.TFile) {
    await app.vault.modify(treeFile, updatedContent);
  } else {
    await app.vault.create(treePath, updatedContent);
  }
}
async function ensureFolderExists2(app, folderPath) {
  const folder = app.vault.getAbstractFileByPath(folderPath);
  if (!folder) {
    await app.vault.createFolder(folderPath);
  }
}

// src/autologs-manager.js
var import_obsidian6 = require("obsidian");
async function generateAutolog(app, settings, cycleType = "daily", targetDate = /* @__PURE__ */ new Date()) {
  try {
    console.log(`Generating ${cycleType} autolog for ${formatDate(targetDate)}`);
    const journalNotes = getNotesInFolder(app, settings.journalFolder);
    if (journalNotes.length === 0) {
      new import_obsidian6.Notice("No journal notes found for autolog generation");
      return;
    }
    const relevantNotes = filterNotesByCycle(journalNotes, cycleType, targetDate);
    if (relevantNotes.length === 0) {
      new import_obsidian6.Notice(`No notes found for ${cycleType} cycle ending ${formatDate(targetDate)}`);
      return;
    }
    const sortedNotes = sortFilesByDate(relevantNotes);
    const notesContent = await combineNotesContent3(app, sortedNotes);
    const extractor = new LLMExtractor(settings);
    const autologData = await extractor.generateAutolog(notesContent, cycleType, targetDate);
    await createAutologFile(app, settings, cycleType, targetDate, autologData, relevantNotes);
    new import_obsidian6.Notice(`Generated ${cycleType} autolog with ${relevantNotes.length} notes`);
  } catch (error) {
    console.error("Error generating autolog:", error);
    new import_obsidian6.Notice("Error generating autolog");
  }
}
function filterNotesByCycle(notes, cycleType, targetDate) {
  const cycleStart = getCycleStartDate(cycleType, targetDate);
  const cycleEnd = getCycleEndDate(cycleType, targetDate);
  return notes.filter((note) => {
    const noteDate = new Date(note.stat.mtime);
    return noteDate >= cycleStart && noteDate <= cycleEnd;
  });
}
function getCycleStartDate(cycleType, targetDate) {
  const date = new Date(targetDate);
  switch (cycleType) {
    case "daily":
      date.setHours(0, 0, 0, 0);
      return date;
    case "weekly":
      const dayOfWeek = date.getDay();
      date.setDate(date.getDate() - dayOfWeek);
      date.setHours(0, 0, 0, 0);
      return date;
    case "monthly":
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      return date;
    default:
      throw new Error(`Unknown cycle type: ${cycleType}`);
  }
}
function getCycleEndDate(cycleType, targetDate) {
  const date = new Date(targetDate);
  switch (cycleType) {
    case "daily":
      date.setHours(23, 59, 59, 999);
      return date;
    case "weekly":
      const dayOfWeek = date.getDay();
      date.setDate(date.getDate() + (6 - dayOfWeek));
      date.setHours(23, 59, 59, 999);
      return date;
    case "monthly":
      date.setMonth(date.getMonth() + 1, 0);
      date.setHours(23, 59, 59, 999);
      return date;
    default:
      throw new Error(`Unknown cycle type: ${cycleType}`);
  }
}
async function combineNotesContent3(app, notes) {
  let combinedContent = "";
  for (const note of notes) {
    try {
      const content = await app.vault.read(note);
      const noteDate = formatDate(new Date(note.stat.mtime));
      combinedContent += `

--- ${note.name} (${noteDate}) ---
${content}
`;
    } catch (error) {
      console.error(`Error reading note ${note.name}:`, error);
    }
  }
  return combinedContent;
}
async function createAutologFile(app, settings, cycleType, targetDate, autologData, sourceNotes) {
  const autologsPath = `${settings.memoryFolder}/autologs`;
  await ensureFolderExists3(app, autologsPath);
  const filename = generateAutologFilename(cycleType, targetDate);
  const filePath = `${autologsPath}/${filename}`;
  const content = generateAutologContent(cycleType, targetDate, autologData, sourceNotes);
  const existingFile = app.vault.getAbstractFileByPath(filePath);
  if (existingFile instanceof import_obsidian6.TFile) {
    await app.vault.modify(existingFile, content);
  } else {
    await app.vault.create(filePath, content);
  }
}
function generateAutologFilename(cycleType, targetDate) {
  const date = new Date(targetDate);
  switch (cycleType) {
    case "daily":
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}-daily-autolog.md`;
    case "weekly":
      const weekStart = getCycleStartDate("weekly", date);
      return `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate() + weekStart.getDay()) / 7)).padStart(2, "0")}-weekly-autolog.md`;
    case "monthly":
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-monthly-autolog.md`;
    default:
      throw new Error(`Unknown cycle type: ${cycleType}`);
  }
}
function generateAutologContent(cycleType, targetDate, autologData, sourceNotes) {
  const cycleStart = getCycleStartDate(cycleType, targetDate);
  const cycleEnd = getCycleEndDate(cycleType, targetDate);
  const frontmatter = [
    "---",
    `cycle_type: ${cycleType}`,
    `cycle_start: ${cycleStart.toISOString()}`,
    `cycle_end: ${cycleEnd.toISOString()}`,
    `generated_at: ${(/* @__PURE__ */ new Date()).toISOString()}`,
    `source_notes_count: ${sourceNotes.length}`,
    `source_notes: [${sourceNotes.map((note) => `"${note.path}"`).join(", ")}]`,
    "---"
  ].join("\n");
  const content = [
    `# ${cycleType.charAt(0).toUpperCase() + cycleType.slice(1)} Autolog`,
    "",
    `**Period:** ${formatDate(cycleStart)} - ${formatDate(cycleEnd)}`,
    `**Notes Processed:** ${sourceNotes.length}`,
    `**Generated:** ${formatDate(/* @__PURE__ */ new Date())}`,
    "",
    "## Summary",
    "",
    autologData.summary || "No summary available",
    "",
    "## What Was Done",
    "",
    autologData.completed || "No completed tasks identified",
    "",
    "## What Was Not Done",
    "",
    autologData.incomplete || "No incomplete tasks identified",
    "",
    "## Key Insights",
    "",
    autologData.insights || "No insights available",
    "",
    "## Source Notes",
    "",
    ...sourceNotes.map((note) => {
      const noteDate = formatDate(new Date(note.stat.mtime));
      return `- [[${note.path}|${note.name}]] (${noteDate})`;
    }),
    ""
  ].join("\n");
  return frontmatter + "\n\n" + content;
}
async function ensureFolderExists3(app, folderPath) {
  const folder = app.vault.getAbstractFileByPath(folderPath);
  if (!folder) {
    await app.vault.createFolder(folderPath);
  }
}
function getRecentAutologs(app, settings, cycleType = "daily", limit = 10) {
  const autologsPath = `${settings.memoryFolder}/autologs`;
  const autologsFolder = app.vault.getAbstractFileByPath(autologsPath);
  if (!autologsFolder || !(autologsFolder instanceof import_obsidian6.TFolder)) {
    return [];
  }
  const autologFiles = autologsFolder.children.filter((child) => child instanceof import_obsidian6.TFile && child.extension === "md" && child.name.includes(`${cycleType}-autolog`)).sort((a, b) => b.stat.mtime - a.stat.mtime).slice(0, limit);
  return autologFiles;
}

// src/dashboard.jsx
var import_obsidian7 = require("obsidian");
var PENSIEVE_DASHBOARD_VIEW_TYPE = "pensieve-dashboard";
var PensieveDashboardView = class extends import_obsidian7.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.currentView = "autologs";
    this.selectedProject = null;
    this.selectedDate = /* @__PURE__ */ new Date();
    this.lastNCheckpoints = 5;
    this.lastNAutologs = 5;
    this.customPrompt = "";
    this.projectData = null;
    this.autologData = null;
  }
  getViewType() {
    return PENSIEVE_DASHBOARD_VIEW_TYPE;
  }
  getDisplayText() {
    return "Pensieve Dashboard";
  }
  getIcon() {
    return "brain";
  }
  async onOpen() {
    console.log("PensieveDashboardView onOpen called");
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("pensieve-dashboard");
    try {
      this.renderHeader();
      await this.renderContent();
      await this.loadInitialData();
    } catch (error) {
      console.error("Error rendering dashboard:", error);
      containerEl.createEl("h1", { text: "Pensieve Dashboard" });
      containerEl.createEl("p", { text: "Dashboard loaded successfully. If you see this, the dashboard is working but there might be an issue with the content rendering." });
    }
  }
  async onClose() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.removeClass("pensieve-dashboard");
  }
  /**
   * Render the dashboard header with view selector
   */
  renderHeader() {
    console.log("Rendering header...");
    const header = this.containerEl.createDiv("pensieve-dashboard-header");
    header.createEl("h2", { text: "Pensieve Dashboard" });
    const viewSelector = header.createDiv("pensieve-view-selector");
    const autologsBtn = viewSelector.createEl("button", {
      text: "Autologs",
      cls: this.currentView === "autologs" ? "active" : ""
    });
    autologsBtn.onclick = async () => {
      await this.switchView("autologs");
      this.updateButtonStates();
    };
    const projectMemoriesBtn = viewSelector.createEl("button", {
      text: "Project Memories",
      cls: this.currentView === "project_memories" ? "active" : ""
    });
    projectMemoriesBtn.onclick = async () => {
      await this.switchView("project_memories");
      this.updateButtonStates();
    };
    console.log("Header rendered");
  }
  /**
   * Render the main content area
   */
  async renderContent() {
    console.log("Rendering content for view:", this.currentView);
    const content = this.containerEl.createDiv("pensieve-dashboard-content");
    if (this.currentView === "autologs") {
      await this.renderAutologsView(content);
    } else {
      await this.renderProjectMemoriesView(content);
    }
    console.log("Content rendered");
  }
  /**
   * Update button states to reflect current view
   */
  updateButtonStates() {
    const autologsBtn = this.containerEl.querySelector(".pensieve-view-selector button:first-child");
    const projectMemoriesBtn = this.containerEl.querySelector(".pensieve-view-selector button:last-child");
    if (autologsBtn) {
      autologsBtn.classList.toggle("active", this.currentView === "autologs");
    }
    if (projectMemoriesBtn) {
      projectMemoriesBtn.classList.toggle("active", this.currentView === "project_memories");
    }
  }
  /**
   * Render autologs view
   */
  async renderAutologsView(container) {
    console.log("Rendering autologs view...");
    const controls = container.createDiv("pensieve-controls");
    const dateControl = controls.createDiv("pensieve-control-group");
    dateControl.createEl("label", { text: "Select Date:" });
    const dateInput = dateControl.createEl("input", {
      type: "date",
      value: this.formatDateForInput(this.selectedDate)
    });
    dateInput.onchange = (e) => {
      this.selectedDate = new Date(e.target.value);
      this.loadAutologData();
    };
    const lastNControl = controls.createDiv("pensieve-control-group");
    lastNControl.createEl("label", { text: "Last N Autologs:" });
    const lastNInput = lastNControl.createEl("input", {
      type: "number",
      value: this.lastNAutologs,
      min: 1,
      max: 20
    });
    lastNInput.onchange = (e) => {
      this.lastNAutologs = parseInt(e.target.value);
    };
    const analyzeBtn = controls.createEl("button", {
      text: "Analyze Last N Logs",
      cls: "pensieve-btn primary"
    });
    analyzeBtn.onclick = () => this.showAnalyzeModal();
    const generateBtn = controls.createEl("button", {
      text: "Generate New Autolog",
      cls: "pensieve-btn secondary"
    });
    generateBtn.onclick = () => this.generateNewAutolog();
    this.autologResultsContainer = container.createDiv("pensieve-results");
    this.autologResultsContainer.addClass("pensieve-autolog-results");
    await this.renderAutologResults();
  }
  /**
   * Render project memories view
   */
  async renderProjectMemoriesView(container) {
    const controls = container.createDiv("pensieve-controls");
    const projectControl = controls.createDiv("pensieve-control-group");
    projectControl.createEl("label", { text: "Select Project:" });
    this.projectSelect = projectControl.createEl("select");
    this.loadProjects();
    const lastNControl = controls.createDiv("pensieve-control-group");
    lastNControl.createEl("label", { text: "Last N Checkpoints:" });
    const lastNInput = lastNControl.createEl("input", {
      type: "number",
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
    const searchControl = controls.createDiv("pensieve-control-group");
    searchControl.createEl("label", { text: "Search:" });
    const searchInput = searchControl.createEl("input", {
      type: "text",
      placeholder: "Search projects..."
    });
    searchInput.oninput = (e) => this.filterProjects(e.target.value);
    const loadBtn = controls.createEl("button", {
      text: "Load Project Data",
      cls: "pensieve-btn primary"
    });
    loadBtn.onclick = () => this.loadProjectData();
    this.projectResultsContainer = container.createDiv("pensieve-results");
    this.projectResultsContainer.addClass("pensieve-project-results");
    await this.renderProjectResults();
  }
  /**
   * Render autolog results
   */
  async renderAutologResults() {
    this.autologResultsContainer.empty();
    if (!this.autologData) {
      this.autologResultsContainer.createEl("p", {
        text: "Select a date to view autolog data",
        cls: "pensieve-placeholder"
      });
      return;
    }
    console.log("Autolog data:", this.autologData);
    const summary = this.autologResultsContainer.createDiv("pensieve-summary");
    summary.createEl("h3", { text: "Summary" });
    const summaryContent = summary.createEl("div", { cls: "pensieve-content" });
    await import_obsidian7.MarkdownRenderer.render(this.app, this.autologData.summary || "No summary available", summaryContent, "", this.plugin);
    const panels = this.autologResultsContainer.createDiv("pensieve-panels");
    const donePanel = panels.createDiv("pensieve-panel");
    donePanel.createEl("h3", { text: "What Was Done" });
    const doneContent = donePanel.createEl("div", { cls: "pensieve-content" });
    await import_obsidian7.MarkdownRenderer.render(this.app, this.autologData.completed || "No completed tasks available", doneContent, "", this.plugin);
    this.ensureTextSelection(doneContent);
    const notDonePanel = panels.createDiv("pensieve-panel");
    notDonePanel.createEl("h3", { text: "What Was Not Done" });
    const notDoneContent = notDonePanel.createEl("div", { cls: "pensieve-content" });
    await import_obsidian7.MarkdownRenderer.render(this.app, this.autologData.incomplete || "No incomplete tasks available", notDoneContent, "", this.plugin);
    this.ensureTextSelection(notDoneContent);
    const insightsPanel = panels.createDiv("pensieve-panel");
    insightsPanel.createEl("h3", { text: "Key Insights" });
    const insightsContent = insightsPanel.createEl("div", { cls: "pensieve-content" });
    await import_obsidian7.MarkdownRenderer.render(this.app, this.autologData.insights || "No insights available", insightsContent, "", this.plugin);
    this.ensureTextSelection(insightsContent);
    const exportBtn = insightsPanel.createEl("button", {
      text: "Export Insights as Note",
      cls: "pensieve-btn secondary"
    });
    exportBtn.onclick = () => this.exportInsightsAsNote();
  }
  /**
  * Render project results
  */
  async renderProjectResults() {
    this.projectResultsContainer.empty();
    if (!this.projectData) {
      this.projectResultsContainer.createEl("p", {
        text: "Select a project and load data to view project memories",
        cls: "pensieve-placeholder"
      });
      return;
    }
    const header = this.projectResultsContainer.createDiv("pensieve-project-header");
    header.createEl("h3", { text: this.selectedProject });
    const topRow = this.projectResultsContainer.createDiv("pensieve-top-row");
    console.log("Project data:", this.projectData);
    const statusPanel = topRow.createDiv("pensieve-panel pensieve-status-panel");
    statusPanel.createEl("h3", { text: "Status" });
    const statusContent = statusPanel.createEl("div", { cls: "pensieve-content" });
    await import_obsidian7.MarkdownRenderer.render(this.app, this.projectData.status, statusContent, "", this.plugin);
    this.ensureTextSelection(statusContent);
    const statusSummaryPanel = topRow.createDiv("pensieve-panel pensieve-summary-panel");
    statusSummaryPanel.createEl("h3", { text: "Status Summary" });
    const statusSummaryContent = statusSummaryPanel.createEl("div", { cls: "pensieve-content" });
    await import_obsidian7.MarkdownRenderer.render(this.app, this.projectData.statusSummary, statusSummaryContent, "", this.plugin);
    this.ensureTextSelection(statusSummaryContent);
    const bottomRow = this.projectResultsContainer.createDiv("pensieve-bottom-row");
    const tasksPanel = bottomRow.createDiv("pensieve-panel pensieve-tasks-panel");
    tasksPanel.createEl("h3", { text: "Tasks" });
    const tasksContent = tasksPanel.createEl("div", { cls: "pensieve-content" });
    await import_obsidian7.MarkdownRenderer.render(this.app, this.projectData.tasks, tasksContent, "", this.plugin);
    this.ensureTextSelection(tasksContent);
    const insightsPanel = bottomRow.createDiv("pensieve-panel pensieve-insights-panel");
    insightsPanel.createEl("h3", { text: "Insights" });
    const insightsContent = insightsPanel.createEl("div", { cls: "pensieve-content" });
    await import_obsidian7.MarkdownRenderer.render(this.app, this.projectData.insights, insightsContent, "", this.plugin);
    this.ensureTextSelection(insightsContent);
    this.addInsightExportButtons(insightsPanel, this.projectData.insights);
  }
  /**
   * Switch between views
   */
  async switchView(view) {
    console.log("Switching to view:", view);
    this.currentView = view;
    const contentArea = this.containerEl.querySelector(".pensieve-dashboard-content");
    if (contentArea) {
      contentArea.remove();
    }
    await this.renderContent();
    await this.loadInitialData();
  }
  /**
   * Load initial data based on current view
   */
  async loadInitialData() {
    if (this.currentView === "autologs") {
      await this.loadAutologData();
    } else {
    }
  }
  /**
   * Load autolog data for selected date
   */
  async loadAutologData() {
    try {
      const autologsPath = `${this.plugin.settings.memoryFolder}/autologs`;
      const filename = this.generateAutologFilename("daily", this.selectedDate);
      const filePath = `${autologsPath}/${filename}`;
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (file instanceof import_obsidian7.TFile) {
        const content = await this.app.vault.read(file);
        this.autologData = this.parseAutologContent(content);
      } else {
        this.autologData = null;
      }
      await this.renderAutologResults();
    } catch (error) {
      console.error("Error loading autolog data:", error);
      new import_obsidian7.Notice("Error loading autolog data");
    }
  }
  /**
   * Load projects for dropdown
   */
  loadProjects() {
    this.projectSelect.empty();
    const projects = getProjects(this.app, this.plugin.settings.projectRoot);
    const placeholder = this.projectSelect.createEl("option", {
      text: "Select a project...",
      value: ""
    });
    placeholder.disabled = true;
    placeholder.selected = true;
    projects.forEach((project) => {
      const option = this.projectSelect.createEl("option", {
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
    const options = this.projectSelect.querySelectorAll("option");
    options.forEach((option) => {
      if (option.value === "") return;
      const matches = option.text.toLowerCase().includes(searchTerm.toLowerCase());
      option.style.display = matches ? "" : "none";
    });
  }
  /**
   * Load project data
   */
  async loadProjectData() {
    if (!this.selectedProject) {
      new import_obsidian7.Notice("Please select a project first");
      return;
    }
    try {
      const projectPath = `${this.plugin.settings.projectRoot}/${this.selectedProject}`;
      const memoryPath = `${this.plugin.settings.memoryFolder}/projects/${this.selectedProject}`;
      const statusFile = this.app.vault.getAbstractFileByPath(`${memoryPath}/status.md`);
      const tasksFile = this.app.vault.getAbstractFileByPath(`${memoryPath}/tasks.md`);
      const insightsFile = this.app.vault.getAbstractFileByPath(`${memoryPath}/insights.md`);
      const statusContent = statusFile ? await this.app.vault.read(statusFile) : "No status data available";
      const tasksContent = tasksFile ? await this.app.vault.read(tasksFile) : "No tasks data available";
      const insightsContent = insightsFile ? await this.app.vault.read(insightsFile) : "No insights data available";
      this.projectData = {
        status: this.parseLatestStatus(statusContent),
        statusSummary: this.parseLatestStatusSummary(statusContent),
        tasks: this.parseLastNCheckpoints(tasksContent, this.lastNCheckpoints),
        insights: this.parseLastNCheckpoints(insightsContent, this.lastNCheckpoints)
      };
      await this.renderProjectResults();
    } catch (error) {
      console.error("Error loading project data:", error);
      new import_obsidian7.Notice("Error loading project data");
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
      await generateAutolog(this.app, this.plugin.settings, "daily", this.selectedDate);
      await this.loadAutologData();
      new import_obsidian7.Notice("New autolog generated successfully");
    } catch (error) {
      console.error("Error generating autolog:", error);
      new import_obsidian7.Notice("Error generating autolog");
    }
  }
  /**
   * Export insights as note
   */
  async exportInsightsAsNote() {
    if (!this.autologData?.insights) {
      new import_obsidian7.Notice("No insights to export");
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
Date: ${(/* @__PURE__ */ new Date()).toISOString()}
`;
      await this.app.vault.create(filename, content);
      new import_obsidian7.Notice(`Insights exported as ${filename}`);
    } catch (error) {
      console.error("Error exporting insights:", error);
      new import_obsidian7.Notice("Error exporting insights");
    }
  }
  /**
   * Export project insights as note
   */
  async exportProjectInsightsAsNote() {
    if (!this.projectData?.insights) {
      new import_obsidian7.Notice("No insights to export");
      return;
    }
    try {
      const filename = `Project Insights - ${this.selectedProject}.md`;
      const content = `# Project Insights - ${this.selectedProject}

${this.projectData.insights}

---
Generated from Pensieve Dashboard
Project: ${this.selectedProject}
Date: ${(/* @__PURE__ */ new Date()).toISOString()}
`;
      await this.app.vault.create(filename, content);
      new import_obsidian7.Notice(`Project insights exported as ${filename}`);
    } catch (error) {
      console.error("Error exporting project insights:", error);
      new import_obsidian7.Notice("Error exporting project insights");
    }
  }
  /**
   * Helper methods
   */
  formatDateForInput(date) {
    return date.toISOString().split("T")[0];
  }
  formatDateForFilename(date) {
    return date.toISOString().split("T")[0];
  }
  generateAutologFilename(cycleType, targetDate) {
    const date = new Date(targetDate);
    switch (cycleType) {
      case "daily":
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}-daily-autolog.md`;
      case "weekly":
        const weekStart = this.getCycleStartDate("weekly", date);
        return `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate() + weekStart.getDay()) / 7)).padStart(2, "0")}-weekly-autolog.md`;
      case "monthly":
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-monthly-autolog.md`;
      default:
        throw new Error(`Unknown cycle type: ${cycleType}`);
    }
  }
  getCycleStartDate(cycleType, targetDate) {
    const date = new Date(targetDate);
    switch (cycleType) {
      case "daily":
        date.setHours(0, 0, 0, 0);
        return date;
      case "weekly":
        const dayOfWeek = date.getDay();
        date.setDate(date.getDate() - dayOfWeek);
        date.setHours(0, 0, 0, 0);
        return date;
      case "monthly":
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        return date;
      default:
        throw new Error(`Unknown cycle type: ${cycleType}`);
    }
  }
  parseAutologContent(content) {
    const sections = {
      summary: "",
      completed: "",
      incomplete: "",
      insights: ""
    };
    const lines = content.split("\n");
    let currentSection = "";
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("## Summary")) {
        currentSection = "summary";
      } else if (trimmedLine.startsWith("## What Was Done")) {
        currentSection = "completed";
      } else if (trimmedLine.startsWith("## What Was Not Done")) {
        currentSection = "incomplete";
      } else if (trimmedLine.startsWith("## Key Insights")) {
        currentSection = "insights";
      } else if (trimmedLine && currentSection) {
        sections[currentSection] += (sections[currentSection] ? "\n" : "") + line;
      }
    }
    return sections;
  }
  formatContent(content) {
    if (!content) return "No content available";
    if (content.trim() === "") return "No content available";
    return content.replace(/\n/g, "<br>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>").replace(/`(.*?)`/g, "<code>$1</code>");
  }
  formatProjectStatus(content) {
    if (!content) return "No status data available";
    return this.formatContent(content);
  }
  formatProjectTasks(content) {
    if (!content) return "No tasks data available";
    return this.formatContent(content);
  }
  formatProjectInsights(content) {
    if (!content) return "No insights data available";
    return this.formatContent(content);
  }
  formatProjectStatusSummary(content) {
    if (!content) return "No status summary available";
    const lines = content.split("\n");
    const summary = [];
    for (const line of lines) {
      if (line.includes("Progress:") || line.includes("Status:") || line.includes("Last Activity:")) {
        summary.push(line.trim());
      }
    }
    return summary.length > 0 ? summary.join("<br>") : "No summary data available";
  }
  /**
  * Parse latest status from content (ignores checkpoints, shows only latest)
  */
  parseLatestStatus(content) {
    if (!content) return "No status data available";
    const lines = content.split("\n");
    let currentSection = "";
    let statusContent = "";
    let latestStatusContent = "";
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("## ")) {
        if (currentSection === "status" && statusContent) {
          latestStatusContent = statusContent;
        }
        currentSection = "status";
        statusContent = "";
      } else if (trimmedLine.startsWith("### Status Summary")) {
        break;
      } else if (currentSection === "status" && trimmedLine) {
        statusContent += (statusContent ? "\n" : "") + line;
      }
    }
    if (statusContent) {
      latestStatusContent = statusContent;
    }
    return latestStatusContent || "No status data available";
  }
  /**
   * Parse latest status summary from content
   */
  parseLatestStatusSummary(content) {
    if (!content) return "No status summary available";
    const lines = content.split("\n");
    let currentSection = "";
    let summaryContent = "";
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("### Status Summary")) {
        currentSection = "summary";
      } else if (trimmedLine.startsWith("## ") && currentSection === "summary") {
        break;
      } else if (currentSection === "summary" && trimmedLine) {
        summaryContent += (summaryContent ? "\n" : "") + line;
      }
    }
    return summaryContent || "No status summary available";
  }
  /**
   * Parse last N checkpoints from content
   */
  parseLastNCheckpoints(content, lastN) {
    if (!content) return "No data available";
    const lines = content.split("\n");
    const checkpoints = [];
    let currentCheckpoint = null;
    let currentContent = "";
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("## ")) {
        if (currentCheckpoint) {
          checkpoints.push({
            title: currentCheckpoint,
            content: currentContent.trim()
          });
        }
        currentCheckpoint = trimmedLine.substring(3);
        currentContent = "";
      } else if (currentCheckpoint && trimmedLine) {
        currentContent += (currentContent ? "\n" : "") + line;
      }
    }
    if (currentCheckpoint) {
      checkpoints.push({
        title: currentCheckpoint,
        content: currentContent.trim()
      });
    }
    const lastNCheckpoints = checkpoints.slice(-lastN);
    if (lastNCheckpoints.length === 0) {
      return "No checkpoint data available";
    }
    return lastNCheckpoints.map(
      (checkpoint) => `## ${checkpoint.title}

${checkpoint.content}`
    ).join("\n\n");
  }
  /**
   * Add individual export buttons for each insight checkpoint
   */
  addInsightExportButtons(insightsPanel, insightsContent) {
    if (!insightsContent || insightsContent === "No data available") {
      return;
    }
    const lines = insightsContent.split("\n");
    const checkpoints = [];
    let currentCheckpoint = null;
    let currentContent = "";
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("## ")) {
        if (currentCheckpoint) {
          checkpoints.push({
            title: currentCheckpoint,
            content: currentContent.trim()
          });
        }
        currentCheckpoint = trimmedLine.substring(3);
        currentContent = "";
      } else if (currentCheckpoint && trimmedLine) {
        currentContent += (currentContent ? "\n" : "") + line;
      }
    }
    if (currentCheckpoint) {
      checkpoints.push({
        title: currentCheckpoint,
        content: currentContent.trim()
      });
    }
    if (checkpoints.length > 0) {
      const exportButtonsContainer = insightsPanel.createDiv("pensieve-export-buttons");
      exportButtonsContainer.createEl("h4", { text: "Export Individual Insights:" });
      checkpoints.forEach((checkpoint, index) => {
        const exportBtn = exportButtonsContainer.createEl("button", {
          text: `Export: ${checkpoint.title}`,
          cls: "pensieve-btn secondary"
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
Date: ${(/* @__PURE__ */ new Date()).toISOString()}
`;
      await this.app.vault.create(filename, content);
      new import_obsidian7.Notice(`Insight exported as ${filename}`);
    } catch (error) {
      console.error("Error exporting individual insight:", error);
      new import_obsidian7.Notice("Error exporting insight");
    }
  }
  /**
   * Ensure text selection works in rendered content
   */
  ensureTextSelection(element) {
    element.style.userSelect = "text";
    element.style.webkitUserSelect = "text";
    element.style.mozUserSelect = "text";
    element.style.msUserSelect = "text";
    const allElements = element.querySelectorAll("*");
    allElements.forEach((el) => {
      if (el.tagName === "BUTTON" || el.tagName === "INPUT" || el.tagName === "SELECT" || el.classList.contains("task-list-item-checkbox")) {
        return;
      }
      el.style.userSelect = "text";
      el.style.webkitUserSelect = "text";
      el.style.mozUserSelect = "text";
      el.style.msUserSelect = "text";
    });
  }
};
var AutologAnalyzeModal = class extends import_obsidian7.Modal {
  constructor(app, plugin, lastN) {
    super(app);
    this.plugin = plugin;
    this.lastN = lastN;
    this.customPrompt = "";
    this.analysisResult = null;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("pensieve-analyze-modal");
    contentEl.createEl("h2", { text: "Analyze Last N Autologs" });
    const promptSection = contentEl.createDiv("pensieve-prompt-section");
    promptSection.createEl("label", { text: "Custom Analysis Prompt:" });
    const promptTextarea = promptSection.createEl("textarea", {
      placeholder: "Enter your custom prompt for analyzing the last N autologs...",
      value: this.customPrompt
    });
    promptTextarea.oninput = (e) => {
      this.customPrompt = e.target.value;
    };
    const analyzeBtn = contentEl.createEl("button", {
      text: "Analyze",
      cls: "pensieve-btn primary"
    });
    analyzeBtn.onclick = () => this.performAnalysis();
    this.resultsContainer = contentEl.createDiv("pensieve-results-section");
  }
  async performAnalysis() {
    if (!this.customPrompt.trim()) {
      new import_obsidian7.Notice("Please enter a custom prompt");
      return;
    }
    try {
      const autologs = getRecentAutologs(this.app, this.plugin.settings, "daily", this.lastN);
      if (autologs.length === 0) {
        new import_obsidian7.Notice("No autologs found to analyze");
        return;
      }
      let combinedContent = "";
      for (const autolog of autologs) {
        const content = await this.app.vault.read(autolog);
        combinedContent += `

--- ${autolog.name} ---
${content}
`;
      }
      const extractor = new LLMExtractor(this.plugin.settings);
      this.analysisResult = await extractor.analyzeAutologs(combinedContent, this.customPrompt);
      this.displayResults();
    } catch (error) {
      console.error("Error performing analysis:", error);
      new import_obsidian7.Notice("Error performing analysis");
    }
  }
  displayResults() {
    this.resultsContainer.empty();
    if (!this.analysisResult) {
      this.resultsContainer.createEl("p", { text: "No analysis results available" });
      return;
    }
    this.resultsContainer.createEl("h3", { text: "Analysis Results" });
    this.resultsContainer.createEl("div", {
      html: this.analysisResult.replace(/\n/g, "<br>"),
      cls: "pensieve-analysis-result"
    });
    const exportBtn = this.resultsContainer.createEl("button", {
      text: "Export as Note",
      cls: "pensieve-btn secondary"
    });
    exportBtn.onclick = () => this.exportAnalysis();
  }
  async exportAnalysis() {
    if (!this.analysisResult) {
      new import_obsidian7.Notice("No analysis to export");
      return;
    }
    try {
      const filename = `Autolog Analysis - ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.md`;
      const content = `# Autolog Analysis

## Custom Prompt
${this.customPrompt}

## Analysis Results
${this.analysisResult}

---
Generated from Pensieve Dashboard
Date: ${(/* @__PURE__ */ new Date()).toISOString()}
`;
      await this.app.vault.create(filename, content);
      new import_obsidian7.Notice(`Analysis exported as ${filename}`);
    } catch (error) {
      console.error("Error exporting analysis:", error);
      new import_obsidian7.Notice("Error exporting analysis");
    }
  }
};

// src/scheduler.js
var MemoryScheduler = class {
  constructor(plugin) {
    this.plugin = plugin;
    this.intervals = /* @__PURE__ */ new Map();
    this.isRunning = false;
  }
  /**
   * Start the scheduler with current settings
   */
  start() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    this.scheduleUpdates();
  }
  /**
   * Stop the scheduler
   */
  stop() {
    this.isRunning = false;
    for (const intervalId of this.intervals.values()) {
      clearInterval(intervalId);
    }
    this.intervals.clear();
  }
  /**
   * Schedule updates based on settings
   */
  scheduleUpdates() {
    const { settings } = this.plugin;
    this.stop();
    if (settings.autoUpdateProjectMemories) {
      const intervalMs = this.getIntervalMs(settings.projectMemoryUpdateInterval);
      const intervalId = setInterval(() => {
        this.runProjectMemoryUpdate();
      }, intervalMs);
      this.intervals.set("projectMemories", intervalId);
    }
    if (settings.autoUpdateGeneralMemories) {
      const intervalMs = this.getIntervalMs(settings.generalMemoryUpdateInterval);
      const intervalId = setInterval(() => {
        this.runGeneralMemoryUpdate();
      }, intervalMs);
      this.intervals.set("generalMemories", intervalId);
    }
    if (settings.autoRefineNotes) {
      const intervalMs = this.getIntervalMs(settings.noteRefinementInterval);
      const intervalId = setInterval(() => {
        this.runNoteRefinement();
      }, intervalMs);
      this.intervals.set("noteRefinement", intervalId);
    }
    if (settings.autoGenerateAutologs) {
      const intervalMs = this.getIntervalMs(settings.autologGenerationInterval);
      const intervalId = setInterval(() => {
        this.runAutologGeneration();
      }, intervalMs);
      this.intervals.set("autologGeneration", intervalId);
    }
  }
  /**
   * Convert interval setting to milliseconds
   * @param {string} interval - Interval setting (e.g., 'daily', 'weekly', 'hourly')
   * @returns {number} Milliseconds
   */
  getIntervalMs(interval) {
    switch (interval) {
      case "hourly":
        return 60 * 60 * 1e3;
      // 1 hour
      case "daily":
        return 24 * 60 * 60 * 1e3;
      // 24 hours
      case "weekly":
        return 7 * 24 * 60 * 60 * 1e3;
      // 7 days
      case "monthly":
        return 30 * 24 * 60 * 60 * 1e3;
      // 30 days
      default:
        return 24 * 60 * 60 * 1e3;
    }
  }
  /**
   * Run project memory update
   */
  async runProjectMemoryUpdate() {
    try {
      const { app, settings } = this.plugin;
      const excludeProjects = settings.excludeProjects || [];
      await updateProjectMemories(app, settings, excludeProjects);
      console.log("Scheduled project memory update completed");
    } catch (error) {
      console.error("Error in scheduled project memory update:", error);
    }
  }
  /**
   * Run general memory update (placeholder for future implementation)
   */
  async runGeneralMemoryUpdate() {
    try {
      console.log("Scheduled general memory update completed");
    } catch (error) {
      console.error("Error in scheduled general memory update:", error);
    }
  }
  /**
   * Run note refinement
   */
  async runNoteRefinement() {
    try {
      const { app, settings } = this.plugin;
      const excludeProjects = settings.excludeProjects || [];
      await refineProjectNotes(app, settings, excludeProjects);
      console.log("Scheduled note refinement completed");
    } catch (error) {
      console.error("Error in scheduled note refinement:", error);
    }
  }
  /**
   * Run autolog generation
   */
  async runAutologGeneration() {
    try {
      const { app, settings } = this.plugin;
      const cycleType = settings.autologCycleType || "daily";
      await generateAutolog(app, settings, cycleType);
      console.log("Scheduled autolog generation completed");
    } catch (error) {
      console.error("Error in scheduled autolog generation:", error);
    }
  }
  /**
   * Get scheduler status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeIntervals: Array.from(this.intervals.keys()),
      nextUpdateTimes: this.getNextUpdateTimes()
    };
  }
  /**
   * Get next update times for each scheduled task
   * @returns {Object} Next update times
   */
  getNextUpdateTimes() {
    const times = {};
    const now = Date.now();
    for (const [task, intervalId] of this.intervals) {
      const intervalMs = this.getIntervalMs(this.plugin.settings[`${task}UpdateInterval`]);
      times[task] = new Date(now + intervalMs);
    }
    return times;
  }
};

// src/main.jsx
var PensievePlugin = class extends import_obsidian8.Plugin {
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new PensieveSettingTab(this.app, this));
    this.loadStyles();
    this.registerDashboardView();
    this.scheduler = new MemoryScheduler(this);
    this.addCommands();
    if (this.settings.autoUpdateProjectMemories || this.settings.autoRefineNotes || this.settings.autoGenerateAutologs) {
      this.scheduler.start();
    }
  }
  onunload() {
    if (this.scheduler) {
      this.scheduler.stop();
    }
    this.app.workspace.detachLeavesOfType(PENSIEVE_DASHBOARD_VIEW_TYPE);
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
    if (this.scheduler) {
      this.scheduler.stop();
      if (this.settings.autoUpdateProjectMemories || this.settings.autoRefineNotes || this.settings.autoGenerateAutologs) {
        this.scheduler.start();
      }
    }
  }
  loadStyles() {
    const styleEl = document.createElement("style");
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
    this.addCommand({
      id: "update-project-memories",
      name: "Update Project Memories",
      callback: async () => {
        await updateProjectMemories(this.app, this.settings);
      }
    });
    this.addCommand({
      id: "update-specific-project-memories",
      name: "Update Memories for Specific Project",
      callback: async () => {
        await updateProjectMemories(this.app, this.settings);
      }
    });
    this.addCommand({
      id: "show-scheduler-status",
      name: "Show Memory Update Status",
      callback: () => {
        const status = this.scheduler.getStatus();
        console.log("Scheduler Status:", status);
      }
    });
    this.addCommand({
      id: "refine-project-notes",
      name: "Refine Project Notes",
      callback: async () => {
        await refineProjectNotes(this.app, this.settings);
      }
    });
    this.addCommand({
      id: "refine-specific-project-notes",
      name: "Refine Notes for Specific Project",
      callback: async () => {
        await refineProjectNotes(this.app, this.settings);
      }
    });
    this.addCommand({
      id: "generate-daily-autolog",
      name: "Generate Daily Autolog",
      callback: async () => {
        await generateAutolog(this.app, this.settings, "daily");
      }
    });
    this.addCommand({
      id: "generate-weekly-autolog",
      name: "Generate Weekly Autolog",
      callback: async () => {
        await generateAutolog(this.app, this.settings, "weekly");
      }
    });
    this.addCommand({
      id: "generate-monthly-autolog",
      name: "Generate Monthly Autolog",
      callback: async () => {
        await generateAutolog(this.app, this.settings, "monthly");
      }
    });
    this.addCommand({
      id: "generate-autolog-for-date",
      name: "Generate Autolog for Specific Date",
      callback: async () => {
        await generateAutolog(this.app, this.settings, "daily");
      }
    });
    this.addCommand({
      id: "open-pensieve-dashboard",
      name: "Open Pensieve Dashboard",
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
      const activeLeaf = workspace.activeLeaf;
      if (activeLeaf && activeLeaf.view.getViewType() === "markdown") {
        await activeLeaf.setViewState({
          type: PENSIEVE_DASHBOARD_VIEW_TYPE,
          active: true
        });
        leaf = activeLeaf;
      } else {
        leaf = workspace.getLeaf("tab");
        await leaf.setViewState({
          type: PENSIEVE_DASHBOARD_VIEW_TYPE,
          active: true
        });
      }
    }
    workspace.revealLeaf(leaf);
  }
};
