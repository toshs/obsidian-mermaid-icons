import { App, Plugin, PluginSettingTab, Setting, loadMermaid } from "obsidian";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { icons as logos } from "@iconify-json/logos";
import { icons as lucide } from "@iconify-json/lucide";
import Fuse from "fuse.js";

// This global variable is defined by Vite. We declare it here for TypeScript.
declare const __LICENSE_TEXT__: string;

const IconPacks = [
  {
    name: logos.prefix,
    icons: logos,
  },
  {
    name: lucide.prefix,
    icons: lucide,
  },
];

// --- Main Plugin Class ---
export default class MermaidIconsPlugin extends Plugin {
  styleEl: HTMLElement;

  async onload() {
    this.addSettingTab(new MermaidIconsSettingTab(this.app, this));
    const mermaid = await loadMermaid();
    mermaid.registerIconPacks(IconPacks);
  }

  onunload() {
    // Unload styles and attempt to clean up
  }
}

// --- Setting Tab Class ---
class MermaidIconsSettingTab extends PluginSettingTab {
  plugin: MermaidIconsPlugin;
  private allIcons: Array<{ prefix: string; name: string }> = [];
  private filteredIcons: Array<{ prefix: string; name: string }> = [];
  private batchSize = 50;
  private currentLimit = 50;
  private iconsContainer: HTMLElement | null = null;
  private loadMoreButton: HTMLButtonElement | null = null;
  private searchDebounceTimer: number | null = null;
  private fuse: Fuse<{ prefix: string; name: string }> | null = null;

  constructor(app: App, plugin: MermaidIconsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.allIcons = this.getAllIcons();
    this.filteredIcons = this.allIcons;
    this.fuse = new Fuse(this.allIcons, {
      keys: ["name", "prefix"],
      threshold: 0.4,
    });
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Supported icons")
      .setHeading()
      .addText((text) =>
        text.setPlaceholder("Filter icons...").onChange((value) => {
          if (this.searchDebounceTimer) {
            window.clearTimeout(this.searchDebounceTimer);
          }
          this.searchDebounceTimer = window.setTimeout(() => {
            this.handleSearch(value);
          }, 300);
        })
      );

    // Container for the grid
    this.iconsContainer = containerEl.createDiv("icons-grid-container");
    this.iconsContainer.style.display = "grid";
    this.iconsContainer.style.gridTemplateColumns =
      "repeat(auto-fill, minmax(100px, 1fr))";
    this.iconsContainer.style.gap = "10px";
    this.iconsContainer.style.maxHeight = "60vh";
    this.iconsContainer.style.overflowY = "auto";
    this.iconsContainer.style.padding = "10px";
    this.iconsContainer.style.border =
      "1px solid var(--background-modifier-border)";
    this.iconsContainer.style.borderRadius = "4px";

    // Load More Button
    const btnContainer = containerEl.createDiv();
    btnContainer.style.textAlign = "center";
    btnContainer.style.marginTop = "10px";

    this.loadMoreButton = btnContainer.createEl("button", {
      text: "Load More",
    });
    this.loadMoreButton.onclick = () => {
      this.currentLimit += this.batchSize;
      this.renderIcons(false);
    };

    // Initial Render
    this.currentLimit = this.batchSize;
    this.renderIcons(true);

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

  getAllIcons() {
    const allIcons: Array<{ prefix: string; name: string }> = [];
    IconPacks.forEach((pack) => {
      Object.keys(pack.icons.icons).forEach((iconName) => {
        allIcons.push({ prefix: pack.name, name: iconName });
      });
    });
    return allIcons;
  }

  handleSearch(filter: string) {
    if (!filter) {
      this.filteredIcons = this.allIcons;
    } else {
      const results = this.fuse?.search(filter);
      this.filteredIcons = results ? results.map((r) => r.item) : [];
    }
    this.currentLimit = this.batchSize;
    this.renderIcons(true);
  }

  // Find the raw icon data (body/width/height) from the IconPacks by prefix/name
  getIconData(prefix: string, name: string) {
    const pack = IconPacks.find((p) => p.name === prefix);
    if (!pack) return null;
    // The Iconify JSON packs store icons under `icons` property
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const icon = (pack.icons as any).icons?.[name];
    return icon ?? null;
  }

  renderIcons(reset: boolean) {
    if (!this.iconsContainer) return;

    if (reset) {
      this.iconsContainer.empty();
    }

    const iconsToShow = this.filteredIcons.slice(
      reset ? 0 : this.iconsContainer.childElementCount,
      this.currentLimit
    );

    iconsToShow.forEach((icon) => {
      const card = this.iconsContainer!.createDiv("icon-card");
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.alignItems = "center";
      card.style.padding = "10px";
      card.style.border = "1px solid var(--background-modifier-border)";
      card.style.borderRadius = "4px";
      card.style.backgroundColor = "var(--background-primary)";
      card.style.fontSize = "0.8em";
      card.style.textAlign = "center";

      // Icon Wrapper
      const iconWrapper = card.createDiv();
      iconWrapper.style.marginBottom = "8px";
      iconWrapper.style.width = "32px";
      iconWrapper.style.height = "32px";
      iconWrapper.style.display = "flex";
      iconWrapper.style.alignItems = "center";
      iconWrapper.style.justifyContent = "center";

      const iconData = this.getIconData(icon.prefix, icon.name);
      if (iconData && iconData.body) {
        let w = iconData.width;
        let h = iconData.height;

        if (!w && !h) {
          w = 256;
          h = 256;
        } else if (!w) {
          w = h;
        } else if (!h) {
          h = w;
        }

        const viewBox = `0 0 ${w} ${h}`;
        // Force 32x32 display size
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="32" height="32" preserveAspectRatio="xMidYMid meet" style="width:32px; height:32px; display:block;">${iconData.body}</svg>`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (iconWrapper as any).innerHTML = svg;
      } else {
        iconWrapper.setText("?");
      }

      // Name
      const nameSpan = card.createSpan();
      nameSpan.setText(icon.name);
      nameSpan.style.fontWeight = "bold";
      nameSpan.style.wordBreak = "break-all"; // handle long names

      // Prefix
      const prefixSpan = card.createSpan();
      prefixSpan.setText(icon.prefix);
      prefixSpan.style.fontSize = "0.8em";
      prefixSpan.style.color = "var(--text-muted)";
      prefixSpan.style.marginTop = "4px";

      card.title = `${icon.prefix}:${icon.name}`;
    });

    // Update Load More Button visibility
    if (this.loadMoreButton) {
      if (this.currentLimit >= this.filteredIcons.length) {
        this.loadMoreButton.style.display = "none";
      } else {
        this.loadMoreButton.style.display = "inline-block";
      }
    }
  }
}
