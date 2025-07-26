const { PluginSettingTab, Setting } = require('obsidian');

const DEFAULT_SETTINGS = {
    journalFolder: "Journal",
    projectRoot: "Projects",
    memoryFolder: "Memory",
    cleanOutputFolder: "CleanNotes"
};

class PensieveSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl("h2", { text: "Pensieve Settings" });

        new Setting(containerEl)
            .setName("Journal Folder")
            .setDesc("Folder for daily notes/journals")
            .addText(text => text
                .setPlaceholder("Journal")
                .setValue(this.plugin.settings.journalFolder)
                .onChange(async (value) => {
                    this.plugin.settings.journalFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Project Root Folder")
            .setDesc("Root folder for all projects")
            .addText(text => text
                .setPlaceholder("Projects")
                .setValue(this.plugin.settings.projectRoot)
                .onChange(async (value) => {
                    this.plugin.settings.projectRoot = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Memory Folder Name")
            .setDesc("Folder for storing memory/checkpoints")
            .addText(text => text
                .setPlaceholder("Memory")
                .setValue(this.plugin.settings.memoryFolder)
                .onChange(async (value) => {
                    this.plugin.settings.memoryFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Clean Output Folder")
            .setDesc("Folder for refined/public notes")
            .addText(text => text
                .setPlaceholder("CleanNotes")
                .setValue(this.plugin.settings.cleanOutputFolder)
                .onChange(async (value) => {
                    this.plugin.settings.cleanOutputFolder = value;
                    await this.plugin.saveSettings();
                }));
    }
}

module.exports = {
    PensieveSettingTab,
    DEFAULT_SETTINGS
}; 