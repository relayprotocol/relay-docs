// ---- GLOBAL STATE -------------------------
let pageObserver = null;

const addLearnMore = (
  targetId,
  href,
  linkText,
  learnMoreId,
  direction = "after"
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
      "learn-more-trade-type"
    );

    addLearnMore(
      "body-app-fees",
      "/features/app-fees",
      "Learn more about app fees",
      "learn-more-app-fees"
    );

    addLearnMore(
      "response-fees",
      "/references/api/api_core_concepts/fees",
      "Learn more about fees",
      "learn-more-fees",
      "before"
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
      "before"
    );
  });
}

// ---- MAIN NAVIGATION HANDLER --------------

function onPageChange() {
  const path = window.location.pathname;

  // Stop any existing watchers
  if (pageObserver) {
    pageObserver.disconnect();
    pageObserver = null;
  }

  // GET QUOTE
  if (path.includes("/references/api/get-quote-v2")) {
    startPageObserver(enhanceGetQuotePage);

    // GET CHAINS
  } else if (path.includes("/references/api/get-chains")) {
    startPageObserver(enhanceGetChainsPage);
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
