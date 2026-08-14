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
// Entries are cached at module scope: startPageObserver re-runs this on every DOM mutation,
// and the page carries ~275 of them.
const TAG_LIST = '[data-component-part="update-tag-list"]';
const TAG = '[data-component-part="update-tag"]';

let changelog = null;

function ancestorsOf(element) {
  const chain = [];
  for (let node = element; node; node = node.parentElement) chain.push(node);
  return chain;
}

// Each day is the child of the shared timeline container holding one tag list. Deriving the
// container from two entries keeps this off Mintlify's class names without walking the tree
// once per entry.
function collectEntries(tagLists) {
  if (tagLists.length < 2) {
    return [...tagLists].map((list) => ({
      element: list.parentElement || list,
      tags: tagsOf(list),
    }));
  }

  const first = ancestorsOf(tagLists[0]);
  const last = new Set(ancestorsOf(tagLists[tagLists.length - 1]));
  const container = first.find((node) => last.has(node));

  return [...tagLists].map((list) => {
    let element = list;
    while (element.parentElement && element.parentElement !== container) {
      element = element.parentElement;
    }
    return { element, tags: tagsOf(list) };
  });
}

function tagsOf(list) {
  return [...list.querySelectorAll(TAG)].map((tag) => tag.textContent.trim());
}

function applyChangelogFilter() {
  for (const entry of changelog.entries) {
    const matches =
      changelog.active.size === 0 ||
      entry.tags.some((tag) => changelog.active.has(tag));
    entry.element.style.display = matches ? "" : "none";
  }

  for (const chip of document.querySelectorAll(TAG)) {
    chip.dataset.clActive = String(changelog.active.has(chip.textContent.trim()));
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

function enhanceChangelogPage() {
  const tagLists = document.querySelectorAll(TAG_LIST);
  if (!tagLists.length) return;

  if (!changelog || changelog.count !== tagLists.length) {
    changelog = {
      count: tagLists.length,
      entries: collectEntries(tagLists),
      active: new Set(
        (new URLSearchParams(window.location.search).get("tags") || "")
          .split(",")
          .filter(Boolean),
      ),
    };
  }

  for (const chip of document.querySelectorAll(TAG)) {
    if (chip.dataset.clBound === "true") continue;
    chip.dataset.clBound = "true";
    chip.setAttribute("role", "button");
    chip.setAttribute("tabindex", "0");

    const toggle = () => {
      const tag = chip.textContent.trim();
      if (changelog.active.has(tag)) {
        changelog.active.delete(tag);
      } else {
        changelog.active.add(tag);
      }
      applyChangelogFilter();
    };

    chip.addEventListener("click", toggle);
    chip.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggle();
    });
  }

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

  // Toggling a filter rewrites the query string, which fires this too — only a real page
  // change should discard the cached entries and the active filter.
  if (path !== lastPath) {
    changelog = null;
    lastPath = path;
  }

  if (path.includes("/references/api/get-quote-v2")) {
    startPageObserver(enhanceGetQuotePage);
  } else if (path.includes("/references/api/get-chains")) {
    startPageObserver(enhanceGetChainsPage);
  } else if (path.replace(/\/$/, "").endsWith("/changelog")) {
    startPageObserver(enhanceChangelogPage);
  }
}


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
