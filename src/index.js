export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      return new Response("db-updater is deployed ✅", {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    return new Response("Use POST", { status: 405 });
  },
};
