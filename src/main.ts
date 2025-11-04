import { App, Plugin, PluginSettingTab, Setting, loadMermaid } from "obsidian";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { icons } from "@iconify-json/logos";

// This global variable is defined by Vite. We declare it here for TypeScript.
declare const __LICENSE_TEXT__: string;

// --- Settings Interfaces ---
interface MermaidIconsSettings {
  loadingMethod: "js" | "css";
}

const DEFAULT_SETTINGS: MermaidIconsSettings = {
  loadingMethod: "css", // 'js' (SVG/JS) or 'css' (Webfont/CSS)
};

// --- Main Plugin Class ---
export default class MermaidIconsPlugin extends Plugin {
  settings: MermaidIconsSettings;
  styleEl: HTMLElement;

  async onload() {
    this.addSettingTab(new MermaidIconsSettingTab(this.app, this));
    const mermaid = await loadMermaid();
    mermaid.registerIconPacks([
      {
        name: icons.prefix,
        icons: icons,
      },
    ]);
  }

  onunload() {
    // Unload styles and attempt to clean up
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

// --- Setting Tab Class ---
class MermaidIconsSettingTab extends PluginSettingTab {
  plugin: MermaidIconsPlugin;

  constructor(app: App, plugin: MermaidIconsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();


    // --- License Information ---
    new Setting(containerEl).setName("Licenses").setHeading();
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
