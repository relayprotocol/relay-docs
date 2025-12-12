//Logic for prefilling vms
// Utility functions for playground inputs
function findInputByLabel(labelText) {
  const inputs = document.querySelectorAll("#api-playground-input");
  return Array.from(inputs).find((input) =>
    input.getAttribute("aria-label")?.includes(labelText)
  );
}

function findSelectByLabel(labelText) {
  const selects = document.querySelectorAll("select");
  return Array.from(selects).find((select) =>
    select.getAttribute("aria-label")?.includes(labelText)
  );
}

function setInputValue(input, value, delay = 0) {
  return new Promise((resolve) => {
    if (!input) {
      resolve(false);
      return;
    }
    input.value = value;
    const reactPropsKey = Object.keys(input).find((k) =>
      k.startsWith("__reactProps$")
    );
    if (reactPropsKey) {
      const reactProps = input[reactPropsKey];
      if (reactProps?.onChange) {
        reactProps.onChange({ target: input });
      }
    }
    setTimeout(() => resolve(true), delay);
  });
}

function createButton(icon, label, onClick) {
  const button = document.createElement("button");
  const iconElement = document.createElement("img");
  iconElement.src = icon;
  iconElement.alt = label;
  button.appendChild(iconElement);
  button.addEventListener("click", onClick);
  button.id = `${label.toLowerCase().replace(" ", "-")}-button`;
  return button;
}

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      const modal = document.querySelector(
        '[data-testid="api-playground-modal"]'
      );
      if (modal) {
        if (document.getElementById("custom-vm-quicksets")) {
          return;
        }
        const target = modal.querySelector(".grid.grid-cols-1");
        if (target) {
          const introHeading = document.createElement("h2");
          introHeading.textContent = "Explore Blockchain Ecosystems";
          introHeading.id = "custom-vm-quicksets-intro";

          const vmQuicksetsDiv = document.createElement("div");
          vmQuicksetsDiv.id = "custom-vm-quicksets";

          const evmButton = createButton(
            "https://assets.relay.link/icons/square/1/light.png",
            "Solana",
            async (e) => {
              try {
                e.target.disabled = true;
                const userInput = findInputByLabel("Enter user");
                const originChainIdInput = findInputByLabel(
                  "Enter originChainId"
                );
                const destinationChainIdInput = findInputByLabel(
                  "Enter destinationChainId"
                );
                const originCurrencyInput = findInputByLabel(
                  "Enter originCurrency"
                );
                const destinationCurrencyInput = findInputByLabel(
                  "Enter destinationCurrency"
                );
                const protocolVersionInput = findSelectByLabel(
                  "Select protocolVersion"
                );
                const amountInput = findInputByLabel("Enter amount");
                const recipientInput = findInputByLabel("Enter recipient");
                await setInputValue(
                  userInput,
                  "0x03508bb71268bba25ecacc8f620e01866650532c"
                );
                await setInputValue(originChainIdInput, 8453);
                await setInputValue(destinationChainIdInput, 10);
                await setInputValue(
                  originCurrencyInput,
                  "0x0000000000000000000000000000000000000000"
                );
                await setInputValue(
                  destinationCurrencyInput,
                  "0x0000000000000000000000000000000000000000"
                );
                await setInputValue(amountInput, "1000000000000000000");
                await setInputValue(
                  recipientInput,
                  "0x03508bb71268bba25ecacc8f620e01866650532c"
                );
                await setInputValue(protocolVersionInput, "preferV2");
              } catch (error) {
                console.error(error);
              } finally {
                e.target.disabled = false;
              }
            }
          );
          const solanaButton = createButton(
            "https://assets.relay.link/icons/square/792703809/light.png",
            "Solana",
            async (e) => {
              try {
                e.target.disabled = true;
                const userInput = findInputByLabel("Enter user");
                const originChainIdInput = findInputByLabel(
                  "Enter originChainId"
                );
                const destinationChainIdInput = findInputByLabel(
                  "Enter destinationChainId"
                );
                const originCurrencyInput = findInputByLabel(
                  "Enter originCurrency"
                );
                const destinationCurrencyInput = findInputByLabel(
                  "Enter destinationCurrency"
                );
                const amountInput = findInputByLabel("Enter amount");
                const recipientInput = findInputByLabel("Enter recipient");
                const protocolVersionInput = findSelectByLabel(
                  "Select protocolVersion"
                );
                await setInputValue(
                  userInput,
                  "CbKGgVKLJFb8bBrf58DnAkdryX6ubewVytn7X957YwNr"
                );
                await setInputValue(originChainIdInput, 792703809);
                await setInputValue(destinationChainIdInput, 8453);
                await setInputValue(
                  originCurrencyInput,
                  "11111111111111111111111111111111"
                );
                await setInputValue(
                  destinationCurrencyInput,
                  "0x0000000000000000000000000000000000000000"
                );
                await setInputValue(amountInput, "1000000000");
                await setInputValue(
                  recipientInput,
                  "0x03508bb71268bba25ecacc8f620e01866650532c"
                );
                await setInputValue(protocolVersionInput, "preferV2");
              } catch (error) {
                console.error(error);
              } finally {
                e.target.disabled = false;
              }
            }
          );
          const bitcoinButton = createButton(
            "https://assets.relay.link/icons/square/8253038/light.png",
            "Bitcoin",
            async (e) => {
              e.target.disabled = true;
              try {
                const userInput = findInputByLabel("Enter user");
                const originChainIdInput = findInputByLabel(
                  "Enter originChainId"
                );
                const destinationChainIdInput = findInputByLabel(
                  "Enter destinationChainId"
                );
                const originCurrencyInput = findInputByLabel(
                  "Enter originCurrency"
                );
                const destinationCurrencyInput = findInputByLabel(
                  "Enter destinationCurrency"
                );
                const amountInput = findInputByLabel("Enter amount");
                const recipientInput = findInputByLabel("Enter recipient");
                const protocolVersionInput = findSelectByLabel(
                  "Select protocolVersion"
                );
                await setInputValue(
                  userInput,
                  "bc1q4vxn43l44h30nkluqfxd9eckf45vr2awz38lwa"
                );
                await setInputValue(originChainIdInput, 8253038);
                await setInputValue(destinationChainIdInput, 8453);
                await setInputValue(
                  originCurrencyInput,
                  "bc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqmql8k8"
                );
                await setInputValue(
                  destinationCurrencyInput,
                  "0x0000000000000000000000000000000000000000"
                );
                await setInputValue(amountInput, "10000");
                await setInputValue(
                  recipientInput,
                  "0x03508bb71268bba25ecacc8f620e01866650532c"
                );
                await setInputValue(protocolVersionInput, "preferV2");
              } catch (error) {
                console.error(error);
              } finally {
                e.target.disabled = false;
              }
            }
          );
          const hyperliquidButton = createButton(
            "https://assets.relay.link/icons/square/1337/light.png",
            "Hyperliquid",
            async (e) => {
              e.target.disabled = true;
              try {
                const userInput = findInputByLabel("Enter user");
                const originChainIdInput = findInputByLabel(
                  "Enter originChainId"
                );
                const destinationChainIdInput = findInputByLabel(
                  "Enter destinationChainId"
                );
                const originCurrencyInput = findInputByLabel(
                  "Enter originCurrency"
                );
                const destinationCurrencyInput = findInputByLabel(
                  "Enter destinationCurrency"
                );
                const protocolVersionInput = findSelectByLabel(
                  "Select protocolVersion"
                );
                const amountInput = findInputByLabel("Enter amount");
                const recipientInput = findInputByLabel("Enter recipient");
                await setInputValue(
                  userInput,
                  "0x03508bb71268bba25ecacc8f620e01866650532c"
                );
                await setInputValue(originChainIdInput, 1337);
                await setInputValue(destinationChainIdInput, 8453);
                await setInputValue(
                  originCurrencyInput,
                  "0x00000000000000000000000000000000"
                );
                await setInputValue(
                  destinationCurrencyInput,
                  "0x0000000000000000000000000000000000000000"
                );
                await setInputValue(amountInput, "100000000");
                await setInputValue(
                  recipientInput,
                  "0x03508bb71268bba25ecacc8f620e01866650532c"
                );
                await setInputValue(protocolVersionInput, "preferV2");
              } catch (error) {
                console.error(error);
              } finally {
                e.target.disabled = false;
              }
            }
          );
          const tronButton = createButton(
            "https://assets.relay.link/icons/square/728126428/light.png",
            "Tron",
            async (e) => {
              e.target.disabled = true;
              try {
                const userInput = findInputByLabel("Enter user");
                const originChainIdInput = findInputByLabel(
                  "Enter originChainId"
                );
                const destinationChainIdInput = findInputByLabel(
                  "Enter destinationChainId"
                );
                const originCurrencyInput = findInputByLabel(
                  "Enter originCurrency"
                );
                const destinationCurrencyInput = findInputByLabel(
                  "Enter destinationCurrency"
                );
                const protocolVersionInput = findSelectByLabel(
                  "Select protocolVersion"
                );
                const amountInput = findInputByLabel("Enter amount");
                const recipientInput = findInputByLabel("Enter recipient");
                await setInputValue(
                  userInput,
                  "THa7BwoPfacfiELa63pbmm3g5PGKYmtJyt"
                );
                await setInputValue(originChainIdInput, 728126428);
                await setInputValue(destinationChainIdInput, 8453);
                await setInputValue(
                  originCurrencyInput,
                  "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
                );
                await setInputValue(
                  destinationCurrencyInput,
                  "0x0000000000000000000000000000000000000000"
                );
                await setInputValue(amountInput, "1000000");
                await setInputValue(
                  recipientInput,
                  "0x03508bb71268bba25ecacc8f620e01866650532c"
                );
                await setInputValue(protocolVersionInput, "preferV2");
              } catch (error) {
                console.error(error);
              } finally {
                e.target.disabled = false;
              }
            }
          );
          vmQuicksetsDiv.append(
            evmButton,
            solanaButton,
            bitcoinButton,
            hyperliquidButton,
            tronButton
          );
          target.parentNode.insertBefore(introHeading, target);
          target.parentNode.insertBefore(vmQuicksetsDiv, target);
        }
      }
    }
  }
}).observe(document.body, { childList: true, subtree: true });

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

function waitForElementId(elementId, callback) {
  const check = () => document.querySelector(elementId);

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

//Logic for detecting page changes
function onPageChange() {
  if (window.location.pathname.includes("/references/api/get-quote")) {
    waitForElementId("#body-trade-type", (bodyTradeType) => {
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
}

// Run on first page load
onPageChange();

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
