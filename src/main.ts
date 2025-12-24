import {
  App,
  Plugin,
  PluginSettingTab,
  Setting,
  loadMermaid,
  FuzzySuggestModal,
  Editor,
  MarkdownView,
} from "obsidian";
import "../styles.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { icons as logos } from "@iconify-json/logos";
import { icons as lucide } from "@iconify-json/lucide";
import Fuse from "fuse.js";

// This global variable is defined by Vite. We declare it here for TypeScript.
declare const __LICENSE_TEXT__: string;

interface IconifyIcon {
  body: string;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
}

interface IconifyJSON {
  prefix: string;
  icons: Record<string, IconifyIcon>;
  width?: number;
  height?: number;
}

interface Mermaid {
  registerIconPacks: (packs: { name: string; icons: unknown }[]) => void;
}

const IconPacks: Array<{ name: string; icons: IconifyJSON }> = [
  {
    name: logos.prefix,
    icons: logos as unknown as IconifyJSON,
  },
  {
    name: lucide.prefix,
    icons: lucide as unknown as IconifyJSON,
  },
];

// --- Main Plugin Class ---
export default class MermaidIconsPlugin extends Plugin {
  styleEl: HTMLElement;

  async onload() {
    this.addSettingTab(new MermaidIconsSettingTab(this.app, this));
    const mermaid = (await loadMermaid()) as Mermaid;
    mermaid.registerIconPacks(IconPacks);

    // Register markdown post processor for icon preview
    this.registerMarkdownPostProcessor((element, _context) => {
      const codeBlocks = element.querySelectorAll("code");
      codeBlocks.forEach((code) => {
        const text = code.textContent || "";
        const matches = text.matchAll(/(logos|lucide):([\w-]+)/g);
        for (const match of matches) {
          const prefix = match[1];
          const name = match[2];
          const iconData = this.getIconData(prefix, name);
          if (iconData && iconData.body) {
            let w = iconData.width;
            let h = iconData.height;

            if (!w && !h) {
              w = 32;
              h = 32;
            } else if (!w) {
              w = h;
            } else if (!h) {
              h = w;
            }

            const left = iconData.left ?? 0;
            const top = iconData.top ?? 0;
            const viewBox = `${left} ${top} ${w} ${h}`;

            const iconSpan = document.createElement("span");
            iconSpan.addClass("mermaid-icon-preview-inline");

            const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="16" height="16" preserveAspectRatio="xMidYMid meet" style="width:16px; height:16px; display:block;">${iconData.body}</svg>`;
            // eslint-disable-next-line @microsoft/sdl/no-inner-html
            iconSpan.innerHTML = svg;

            code.parentNode?.insertBefore(iconSpan, code);
          }
        }
      });
    });

    this.addCommand({
      id: "insert-mermaid-icon",
      name: "Insert Mermaid icon",
      // eslint-disable-next-line obsidianmd/commands/no-default-hotkeys
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: "m",
        },
      ],
      editorCallback: (editor: Editor, _view: MarkdownView) => {
        new IconModal(this.app, this, (iconStr) => {
          editor.replaceSelection(iconStr);
        }).open();
      },
    });
  }

  onunload() {
    // Unload styles and attempt to clean up
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

  // Find the raw icon data (body/width/height) from the IconPacks by prefix/name
  getIconData(prefix: string, name: string) {
    const pack = IconPacks.find((p) => p.name === prefix);
    if (!pack) return null;
    // The Iconify JSON packs store icons under `icons` property
    const icon = pack.icons.icons?.[name];
    if (!icon) return null;

    // Resolve dimensions: Icon > Pack Default > Fallback (shouldn't happen if packs are well-formed)
    const packIcons = pack.icons;
    const width = icon.width ?? packIcons.width ?? 0;
    const height = icon.height ?? packIcons.height ?? 0;

    return {
      ...icon,
      width,
      height,
    };
  }
}

// --- Icon Modal Class ---
class IconModal extends FuzzySuggestModal<{ prefix: string; name: string }> {
  plugin: MermaidIconsPlugin;
  onChoose: (result: string) => void;

  constructor(
    app: App,
    plugin: MermaidIconsPlugin,
    onChoose: (result: string) => void,
  ) {
    super(app);
    this.plugin = plugin;
    this.onChoose = onChoose;
    this.setPlaceholder("Search icons...");
  }

  getItems(): { prefix: string; name: string }[] {
    return this.plugin.getAllIcons();
  }

  getItemText(item: { prefix: string; name: string }): string {
    return `${item.prefix}:${item.name}`;
  }

  renderSuggestion(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    item: { item: { prefix: string; name: string }; match: any },
    el: HTMLElement,
  ) {
    super.renderSuggestion(item, el);

    // Extract the text/highlight elements created by super.renderSuggestion
    const textContent = [];
    while (el.firstChild) {
      textContent.push(el.firstChild);
      el.removeChild(el.firstChild);
    }

    el.addClass("mermaid-icon-suggestion");

    // Create a container for the icon preview
    const iconContainer = el.createDiv("mermaid-icon-suggestion-icon");

    // Create a container for the text
    const textContainer = el.createDiv("mermaid-icon-suggestion-text");

    // Re-append text nodes
    textContent.forEach((node) => textContainer.appendChild(node));

    const iconData = this.plugin.getIconData(item.item.prefix, item.item.name);
    if (iconData && iconData.body) {
      let w = iconData.width;
      let h = iconData.height;

      // Fallback logic if still 0 (though pack defaults should cover this)
      if (!w && !h) {
        w = 32;
        h = 32;
      } else if (!w) {
        w = h;
      } else if (!h) {
        h = w;
      }

      const left = iconData.left ?? 0;
      const top = iconData.top ?? 0;
      const viewBox = `${left} ${top} ${w} ${h}`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="32" height="32" preserveAspectRatio="xMidYMid meet" style="width:32px; height:32px; display:block;">${iconData.body}</svg>`;
      // eslint-disable-next-line @microsoft/sdl/no-inner-html
      iconContainer.innerHTML = svg;
    }
  }

  onChooseItem(
    item: { prefix: string; name: string },
    _evt: MouseEvent | KeyboardEvent,
  ): void {
    this.onChoose(`${item.prefix}:${item.name}`);
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
  private searchInput: HTMLInputElement | null = null; // Keep track of search input
  private selectedPack = "all";

  constructor(app: App, plugin: MermaidIconsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.refreshIconList();
  }

  refreshIconList() {
    this.allIcons = this.plugin.getAllIcons();
    this.filteredIcons = this.allIcons;
    this.fuse = new Fuse(this.allIcons, {
      keys: ["name", "prefix"],
      threshold: 0.4,
    });
    // Re-apply search if exists
    if (this.searchInput && this.searchInput.value) {
      this.handleSearch(this.searchInput.value);
    } else {
      this.filteredIcons = this.allIcons;
      this.currentLimit = this.batchSize;
      this.renderIcons(true);
    }
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Supported icons")
      .setHeading()
      .addDropdown((dropdown) => {
        dropdown.addOption("all", "All");
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        IconPacks.forEach((pack) => dropdown.addOption(pack.name, pack.name));
        dropdown.setValue(this.selectedPack);
        dropdown.onChange((value) => {
          this.selectedPack = value;
          this.handleSearch(this.searchInput?.value || "");
        });
      })
      .addText((text) => {
        this.searchInput = text.inputEl;
        text.setPlaceholder("Filter icons...").onChange((value) => {
          if (this.searchDebounceTimer) {
            window.clearTimeout(this.searchDebounceTimer);
          }
          this.searchDebounceTimer = window.setTimeout(() => {
            this.handleSearch(value);
          }, 300);
        });
      });

    // Container for the grid
    this.iconsContainer = containerEl.createDiv("icons-grid-container");

    // Load More Button
    const btnContainer = containerEl.createDiv();
    btnContainer.setCssProps({ "text-align": "center", "margin-top": "10px" });

    this.loadMoreButton = btnContainer.createEl("button", {
      text: "Load more",
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

  handleSearch(filter: string) {
    let results = this.allIcons;

    if (filter) {
      const fuseResults = this.fuse?.search(filter);
      results = fuseResults ? fuseResults.map((r) => r.item) : [];
    }

    if (this.selectedPack !== "all") {
      results = results.filter((icon) => icon.prefix === this.selectedPack);
    }

    this.filteredIcons = results;
    this.currentLimit = this.batchSize;
    this.renderIcons(true);
  }

  renderIcons(reset: boolean) {
    if (!this.iconsContainer) return;

    if (reset) {
      this.iconsContainer.empty();
    }

    const iconsToShow = this.filteredIcons.slice(
      reset ? 0 : this.iconsContainer.childElementCount,
      this.currentLimit,
    );

    iconsToShow.forEach((icon) => {
      const card = this.iconsContainer!.createDiv("icon-card");

      // Icon Wrapper
      const iconWrapper = card.createDiv("icon-wrapper");

      const iconData = this.plugin.getIconData(icon.prefix, icon.name);
      if (iconData && iconData.body) {
        let w = iconData.width;
        let h = iconData.height;

        if (!w && !h) {
          w = 32;
          h = 32;
        } else if (!w) {
          w = h;
        } else if (!h) {
          h = w;
        }

        const left = iconData.left ?? 0;
        const top = iconData.top ?? 0;
        const viewBox = `${left} ${top} ${w} ${h}`;
        // Force 32x32 display size
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="32" height="32" preserveAspectRatio="xMidYMid meet" style="width:32px; height:32px; display:block;">${iconData.body}</svg>`;
        // eslint-disable-next-line @microsoft/sdl/no-inner-html
        iconWrapper.innerHTML = svg;
      } else {
        iconWrapper.setText("?");
      }

      // Name
      const nameSpan = card.createSpan("icon-name");
      nameSpan.setText(icon.name);

      // Prefix
      const prefixSpan = card.createSpan("icon-prefix");
      prefixSpan.setText(icon.prefix);

      card.title = `${icon.prefix}:${icon.name}`;
    });

    // Update Load More Button visibility
    if (this.loadMoreButton) {
      if (this.currentLimit >= this.filteredIcons.length) {
        this.loadMoreButton.setCssProps({ display: "none" });
      } else {
        this.loadMoreButton.setCssProps({ display: "inline-block" });
      }
    }
  }
}
