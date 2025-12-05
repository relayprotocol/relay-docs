const script = document.createElement("script");
script.src =
  "https://gist.githubusercontent.com/pedromcunha/76466a9b4f382d5d84c96b4ccd63558c/raw/ad158ec82f50be7716313376bf3486c8ed13666b/iframeResizer.min.js";
script.id = "iframeResizer";
document.head.appendChild(script);

// Utility functions for playground inputs
function findInputByLabel(labelText) {
  const inputs = document.querySelectorAll("#api-playground-input");
  return Array.from(inputs).find((input) =>
    input.getAttribute("aria-label")?.includes(labelText)
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
              } catch (error) {
                console.error(error);
              } finally {
                e.target.disabled = false;
              }
            }
          );
          vmQuicksetsDiv.append(evmButton, solanaButton, bitcoinButton);
          target.parentNode.insertBefore(introHeading, target);
          target.parentNode.insertBefore(vmQuicksetsDiv, target);
        }
      }
    }
  }
}).observe(document.body, { childList: true, subtree: true });
