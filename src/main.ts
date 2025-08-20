import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import "@fortawesome/fontawesome-free/css/all.min.css";
import * as LICENSES from "../LICENSES.json";

// This global variable is defined by Vite. We declare it here for TypeScript.
declare const __LICENSE_TEXT__: string;

// --- Settings Interfaces ---
interface MyPluginSettings {
  loadingMethod: "js" | "css";
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  loadingMethod: "css", // 'js' (SVG/JS) or 'css' (Webfont/CSS)
};

// --- Main Plugin Class ---
export default class MermaidIconsPlugin extends Plugin {
  settings: MyPluginSettings;
  styleEl: HTMLElement;

  async onload() {
    this.addSettingTab(new MyPluginSettingTab(this.app, this));
  }

  onunload() {
    // Unload styles and attempt to clean up
    console.log("Unloading Font Awesome Plugin");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

// --- Setting Tab Class ---
class MyPluginSettingTab extends PluginSettingTab {
  plugin: MermaidIconsPlugin;

  constructor(app: App, plugin: MermaidIconsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h1", { text: "Mermaid Icons Settings" });

    // --- License Information ---
    containerEl.createEl("h3", { text: "Licenses" });
    containerEl.createEl("p", {
      text: "This plugin uses the following third-party libraries:",
    });

    const licensesEl = containerEl.createEl("textarea", {
      attr: {
        readonly: true,
        rows: 15,
        style:
          "width: 100%; font-family: monospace; font-size: 12px; resize: vertical;",
      },
    });
    licensesEl.setText(__LICENSE_TEXT__);
  }
}
