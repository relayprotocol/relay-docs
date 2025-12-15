// Load Posthog
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
