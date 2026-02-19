export default {
  async fetch(request, env) {
    return new Response("Worker is deployed ✅", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};
