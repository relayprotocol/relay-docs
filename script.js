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

//Load ms clarity
(function (c, l, a, r, i, t, y) {
  c[a] =
    c[a] ||
    function () {
      (c[a].q = c[a].q || []).push(arguments);
    };
  t = l.createElement(r);
  t.async = 1;
  t.src = "https://www.clarity.ms/tag/" + i;
  y = l.getElementsByTagName(r)[0];
  y.parentNode.insertBefore(t, y);
})(window, document, "clarity", "script", "ujoarm77s7");
