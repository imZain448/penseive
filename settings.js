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

// src/settings.jsx
var settings_exports = {};
__export(settings_exports, {
  DEFAULT_SETTINGS: () => DEFAULT_SETTINGS,
  PensieveSettingTab: () => PensieveSettingTab
});
module.exports = __toCommonJS(settings_exports);
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
