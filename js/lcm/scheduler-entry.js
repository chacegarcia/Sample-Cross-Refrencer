/**
 * Job scheduler bootstrap (GitHub Pages–safe).
 * - Resolves job-scheduler.js via import.meta.url (not document base URL).
 * - Runs after DOM ready; logs failures instead of failing silently.
 */

async function bootScheduler() {
  try {
    const href = new URL("./job-scheduler.js", import.meta.url).href;
    const { initJobSchedulerPanel } = await import(href);
    initJobSchedulerPanel();
  } catch (e) {
    console.error("[LCM scheduler] failed to load or init:", e);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void bootScheduler());
} else {
  void bootScheduler();
}
