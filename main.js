const { Plugin } = require('obsidian');
const { PensieveSettingTab, DEFAULT_SETTINGS } = require('./settings');

module.exports = class PensievePlugin extends Plugin {
    async onload() {
        await this.loadSettings();
        this.addSettingTab(new PensieveSettingTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}; 