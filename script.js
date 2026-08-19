// ---- GLOBAL STATE -------------------------
let pageObserver = null;
let lastPath = null;

const addLearnMore = (
  targetId,
  href,
  linkText,
  learnMoreId,
  direction = "after",
) => {
  const bodyTarget = document.getElementById(targetId);
  const learnMoreTarget = document.getElementById(learnMoreId);
  if (
    !learnMoreTarget &&
    bodyTarget &&
    bodyTarget.nextSibling &&
    bodyTarget.nextSibling.children &&
    bodyTarget.nextSibling.children[0]
  ) {
    const descriptionEl = bodyTarget.nextSibling.children[0];
    const a = document.createElement("a");
    if (direction === "before") {
      descriptionEl.before(a);
    } else {
      descriptionEl.after(a);
    }
    a.id = learnMoreId;
    a.href = href;
    a.target = "_blank";
    a.textContent = linkText;
    a.classList.add("prose-sm");
  }
};

function waitForElementId(elementId, text, callback) {
  const check = () => {
    const element = document.querySelector(elementId);
    return element && text
      ? element && element.textContent.includes(text)
      : element;
  };

  // If it's already there, run immediately
  if (check()) {
    callback(check());
    return;
  }

  // Otherwise observe DOM mutations
  const observer = new MutationObserver(() => {
    const el = check();
    if (el) {
      observer.disconnect();
      callback(el);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Safely reruns logic on DOM change
function startPageObserver(onDomChange) {
  // Kill old observer (if any)
  if (pageObserver) {
    pageObserver.disconnect();
  }

  pageObserver = new MutationObserver(() => {
    onDomChange();
  });

  pageObserver.observe(document.body, {
    subtree: true,
    childList: true,
  });

  // Run once immediately
  onDomChange();
}

// ---- PAGE LOGIC ---------------------------

function enhanceGetQuotePage() {
  waitForElementId("#body-trade-type", undefined, () => {
    addLearnMore(
      "body-trade-type",
      "/references/api/api_core_concepts/trade-types",
      "Learn more about trade types",
      "learn-more-trade-type",
    );

    addLearnMore(
      "body-app-fees",
      "/features/app-fees",
      "Learn more about app fees",
      "learn-more-app-fees",
    );

    addLearnMore(
      "body-topup-gas",
      "/features/gas-top-up",
      "Learn more about topping up gas",
      "learn-more-topup-gas",
    );

    addLearnMore(
      "response-fees",
      "/references/api/api_core_concepts/fees",
      "Learn more about fees - [DEPRECATED]",
      "learn-more-fees",
      "before",
    );
  });
}

function enhanceGetChainsPage() {
  waitForElementId("#response-chains-token-support", undefined, () => {
    addLearnMore(
      "response-chains-token-support",
      "/references/api/api_resources/supported-routes#step-1:-check-token-support-level",
      "Learn more about token support",
      "learn-more-token-support",
      "before",
    );
  });
}

// Mintlify's own changelog filters live in the table of contents, which `mode: "center"`
// hides. Instead, the tags it renders under each date become the filter control: click one
// to narrow to that product line, click it again to clear.
//
// Filtering reaches inside a day too: a date that survives the filter still hides the
// sections and entries that belong to other product lines.
//
// Entries are cached at module scope: startPageObserver re-runs this on every DOM mutation,
// and the page carries ~270 of them.
const TAG_LIST = '[data-component-part="update-tag-list"]';
const TAG = '[data-component-part="update-tag"]';
const CONTENT = '[data-component-part="update-content"]';

// Order the global filter bar follows; mirrors TAG_ORDER in scripts/build-changelog.mjs.
const TAG_ORDER = ["API", "RelayKit", "SDK", "UI Kit", "Hooks", "Adapters", "App"];

// A package name followed by a version is an attribution. Anchoring on the version keeps
// prose that merely mentions "the SDK" from being read as one.
const ATTRIBUTION = /\b(SDK|UI Kit|Hooks|[A-Z][A-Za-z]* adapter) \d+\.\d+\.\d+/g;

let changelog = null;

function ancestorsOf(element) {
  const chain = [];
  for (let node = element; node; node = node.parentElement) chain.push(node);
  return chain;
}

// Each day is the child of the shared timeline container holding one tag list. Deriving the
// container from two entries keeps this off Mintlify's class names without walking the tree
// once per entry.
function timelineContainer(tagLists) {
  const first = ancestorsOf(tagLists[0]);
  const last = new Set(ancestorsOf(tagLists[tagLists.length - 1]));
  return first.find((node) => last.has(node));
}

function collectEntries(tagLists, container) {
  return [...tagLists].map((list) => {
    let element = list;
    // Climbing without a container to stop at would run to <html>, and hiding that blanks
    // the page — so fall back to filtering nothing.
    if (container && container !== list && container.contains(list)) {
      while (element.parentElement && element.parentElement !== container) {
        element = element.parentElement;
      }
    }
    return { element, tags: tagsOf(list), sections: collectSections(element) };
  });
}

function tagsOf(list) {
  return [...list.querySelectorAll(TAG)].map((tag) => tag.textContent.trim());
}

function sectionTags(name) {
  if (name === "API") return ["API"];
  if (name === "App") return ["App"];
  return [];
}

function tagsFromText(text) {
  const tags = new Set();
  for (const match of text.matchAll(ATTRIBUTION)) {
    tags.add(/ adapter$/.test(match[1]) ? "Adapters" : match[1]);
  }
  return [...tags];
}

// A day's content is a flat sequence of siblings: an h3 per section, then a bolded lead and
// a list per group of entries. A RelayKit lead naming packages tags the whole group; a lead
// naming a change type does not, so those groups are tagged per list item instead.
function collectSections(dayElement) {
  const content = dayElement.querySelector(CONTENT);
  if (!content) return [];

  const sections = [];
  let section = null;
  let pending = null;

  for (const child of content.children) {
    if (child.tagName === "H3") {
      section = {
        element: child,
        name: child.textContent.replace(/\u200b/g, "").trim(),
        groups: []
      };
      sections.push(section);
      pending = null;
      continue;
    }
    if (!section) continue;

    if (child.tagName === "UL") {
      const items = [...child.children].map((item) => ({
        element: item,
        tags: tagsFromText(item.textContent)
      }));
      if (pending) {
        pending.list = child;
        pending.items = items;
      } else {
        section.groups.push({ header: null, list: child, items, tags: sectionTags(section.name) });
      }
      pending = null;
      continue;
    }

    const tags = section.name === "RelayKit" ? tagsFromText(child.textContent) : sectionTags(section.name);
    pending = { header: child, list: null, items: [], tags: tags.length > 0 ? tags : null };
    section.groups.push(pending);
  }

  return sections;
}

// No filter, or nothing to go on, means visible: the filter narrows, it never guesses.
function matchesTags(tags) {
  if (changelog.active.size === 0) return true;
  if (!tags || tags.length === 0) return true;
  return tags.some((tag) => changelog.active.has(tag));
}

function applyChangelogFilter() {
  for (const entry of changelog.entries) {
    entry.element.style.display = matchesTags(entry.tags) ? "" : "none";

    for (const section of entry.sections) {
      let sectionVisible = false;

      for (const group of section.groups) {
        let groupVisible;
        if (group.tags) {
          groupVisible = matchesTags(group.tags);
          for (const item of group.items) item.element.style.display = "";
        } else {
          groupVisible = false;
          for (const item of group.items) {
            const itemVisible = matchesTags(item.tags);
            item.element.style.display = itemVisible ? "" : "none";
            groupVisible = groupVisible || itemVisible;
          }
        }

        if (group.header) group.header.style.display = groupVisible ? "" : "none";
        if (group.list) group.list.style.display = groupVisible ? "" : "none";
        sectionVisible = sectionVisible || groupVisible;
      }

      section.element.style.display = sectionVisible ? "" : "none";
    }
  }

  for (const chip of document.querySelectorAll(`${TAG}, [data-cl-tag]`)) {
    const isActive = changelog.active.has(chip.textContent.trim());
    chip.dataset.clActive = String(isActive);
    // The active state is otherwise only conveyed by colour.
    chip.setAttribute("aria-pressed", String(isActive));
  }

  for (const clear of document.querySelectorAll("[data-cl-clear]")) {
    const none = changelog.active.size === 0;
    clear.dataset.clActive = String(none);
    clear.setAttribute("aria-pressed", String(none));
  }

  const url = new URL(window.location.href);
  if (changelog.active.size) {
    url.searchParams.set("tags", [...changelog.active].join(","));
  } else {
    url.searchParams.delete("tags");
  }
  // replaceState is patched to emit mintlify:navigation — only call it on a real change.
  if (url.toString() !== window.location.href) {
    history.replaceState(null, "", url);
  }
}

// The query string is the source of truth for which filters are on, so a shared link, a
// back/forward step, and a click on the Changelog tab all land on the filter they name.
function activeTagsFromUrl() {
  return new Set(
    (new URLSearchParams(window.location.search).get("tags") || "")
      .split(",")
      .filter(Boolean),
  );
}

function bindChip(chip, tag) {
  if (chip.dataset.clBound === "true") return;
  chip.dataset.clBound = "true";
  chip.setAttribute("role", "button");
  chip.setAttribute("tabindex", "0");

  const activate = () => {
    if (tag === null) {
      changelog.active.clear();
    } else if (changelog.active.has(tag)) {
      changelog.active.delete(tag);
    } else {
      changelog.active.add(tag);
    }
    applyChangelogFilter();
  };

  chip.addEventListener("click", activate);
  chip.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    activate();
  });
}

// A copy of the chips at the top of the page, sticky, so the filter stays reachable instead
// of only existing on whichever date happens to carry the tag you want.
function buildFilterBar(container) {
  const existing = document.querySelector("[data-cl-filter-bar]");
  if (existing && existing.isConnected) return existing;

  const present = new Set(changelog.entries.flatMap((entry) => entry.tags));
  const tags = TAG_ORDER.filter((tag) => present.has(tag));
  if (tags.length < 2) return null;

  const bar = document.createElement("div");
  bar.setAttribute("data-cl-filter-bar", "");
  // Mintlify's own sticky elements use these classes for the page background.
  bar.className = "bg-background-light dark:bg-background-dark";

  const clear = document.createElement("button");
  clear.type = "button";
  clear.setAttribute("data-cl-clear", "");
  clear.textContent = "All";
  bar.appendChild(clear);
  bindChip(clear, null);

  for (const tag of tags) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.setAttribute("data-cl-tag", tag);
    chip.textContent = tag;
    bar.appendChild(chip);
    bindChip(chip, tag);
  }

  container.parentElement.insertBefore(bar, container);
  positionFilterBar(bar);
  return bar;
}

// The navbar is fixed on small screens and sticky on large ones; either way the bar has to
// clear its height, and Mintlify exposes no variable carrying it.
function positionFilterBar(bar) {
  const navbar = document.getElementById("navbar");
  const navHeight = navbar ? Math.round(navbar.getBoundingClientRect().height) : 0;
  if (navHeight > 0) bar.style.setProperty("--cl-sticky-top", `${navHeight}px`);

  // Each day's date column is sticky at Mintlify's --scroll-mt, the same offset the bar
  // occupies, so it would park behind the bar. style.css adds this height to that offset in
  // calc(), which keeps their value and its unit intact.
  const parent = bar.parentElement;
  const barHeight = Math.round(bar.getBoundingClientRect().height);
  if (parent && barHeight > 0) parent.style.setProperty("--cl-bar-height", `${barHeight + 8}px`);
}

function enhanceChangelogPage() {
  const tagLists = document.querySelectorAll(TAG_LIST);
  // Below two entries there is no timeline container to derive and nothing worth filtering.
  if (tagLists.length < 2) return;

  // A re-mount can swap every node while leaving the count intact, which would leave the
  // cache pointing at detached elements and filtering silently doing nothing.
  if (
    !changelog ||
    changelog.count !== tagLists.length ||
    !changelog.entries[0].element.isConnected
  ) {
    changelog = {
      count: tagLists.length,
      container: timelineContainer(tagLists),
      entries: collectEntries(tagLists, timelineContainer(tagLists)),
      active: activeTagsFromUrl(),
    };
  }

  if (changelog.container && changelog.container.parentElement) {
    buildFilterBar(changelog.container);
  }

  for (const chip of document.querySelectorAll(TAG)) bindChip(chip, chip.textContent.trim());

  applyChangelogFilter();
}

// ---- MAIN NAVIGATION HANDLER --------------

function onPageChange() {
  const path = window.location.pathname;

  // Stop any existing watchers
  if (pageObserver) {
    pageObserver.disconnect();
    pageObserver = null;
  }

  // Toggling a filter rewrites the query string, which fires this too, so only a real page
  // change discards the cached entries. A query-only change still has to be honoured: the
  // URL decides which filters are on, or a shared link and back/forward would both be
  // overwritten by whatever was last clicked.
  if (path !== lastPath) {
    changelog = null;
    lastPath = path;
  } else if (changelog) {
    changelog.active = activeTagsFromUrl();
  }

  if (path.includes("/references/api/get-quote-v2")) {
    startPageObserver(enhanceGetQuotePage);
  } else if (path.includes("/references/api/get-chains")) {
    startPageObserver(enhanceGetChainsPage);
  } else if (path.replace(/\/$/, "").endsWith("/changelog")) {
    startPageObserver(enhanceChangelogPage);
  }
}


window.addEventListener("resize", () => {
  const bar = document.querySelector("[data-cl-filter-bar]");
  if (bar && bar.isConnected) positionFilterBar(bar);
});

// Run on first page load
onPageChange();

// ---- NAVIGATION PATCHING --------------

(function () {
  // Patch pushState
  const pushState = history.pushState;
  history.pushState = function () {
    const ret = pushState.apply(this, arguments);
    window.dispatchEvent(new Event("mintlify:navigation"));
    return ret;
  };

  // Patch replaceState
  const replaceState = history.replaceState;
  history.replaceState = function () {
    const ret = replaceState.apply(this, arguments);
    window.dispatchEvent(new Event("mintlify:navigation"));
    return ret;
  };

  // Back/forward navigation
  window.addEventListener("popstate", () => {
    window.dispatchEvent(new Event("mintlify:navigation"));
  });
})();

// Listen for any navigation event
window.addEventListener("mintlify:navigation", onPageChange);
