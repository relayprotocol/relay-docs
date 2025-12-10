const script = document.createElement("script");
script.src =
  "https://gist.githubusercontent.com/pedromcunha/76466a9b4f382d5d84c96b4ccd63558c/raw/ad158ec82f50be7716313376bf3486c8ed13666b/iframeResizer.min.js";
script.id = "iframeResizer";
document.head.appendChild(script);

async function loadPostHog() {
  const { posthog } = await import(
    "https://cdn.jsdelivr.net/npm/posthog-js@1.202.5/+esm"
  );

  posthog.init("phc_bidXwDZgxGlWqfNtx8fhLESozcfupLUETfYB306Apmc", {
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    mask_all_text: false,
    api_host: "https://api-p.relay.link",
  });

  return posthog;
}

loadPostHog();
