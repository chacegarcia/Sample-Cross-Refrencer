export default {
  async fetch(request, env) {

    const cors = {
      "Access-Control-Allow-Origin": "https://chacegarcia.github.io",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    // -----------------------------
    // Only POST is allowed to update DB
    // -----------------------------
    if (request.method !== "POST") {
      return new Response("db-updater running", { headers: cors });
    }

    // -----------------------------
    // 1) Require Microsoft ID token
    // -----------------------------
    const auth = request.headers.get("Authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return new Response("Missing Microsoft login", { status: 401, headers: cors });
    }

    let payload;
    try {
      payload = JSON.parse(atob(token.split(".")[1]));
    } catch {
      return new Response("Invalid login token", { status: 401, headers: cors });
    }

    // -----------------------------
    // 2) Tenant restriction (THE SECURITY)
    // -----------------------------
    if (payload.tid !== env.ALLOWED_TENANT) {
      return new Response("Wrong tenant", { status: 403, headers: cors });
    }
    
    const email = String(payload.preferred_username || payload.upn || payload.email || "").toLowerCase();
    if (email !== "chace_garcia@lakecountrymfg.com") {
      return new Response("Not allowed", { status: 403, headers: cors });
    }

    // -----------------------------
    // 3) Read incoming DB JSON
    // -----------------------------
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response("Bad JSON", { status: 400, headers: cors });
    }

    const content = JSON.stringify(body, null, 2);
    const encoded = btoa(unescape(encodeURIComponent(content)));

    const apiBase = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${env.GITHUB_PATH}`;

    // -----------------------------
    // 4) Get current file SHA
    // -----------------------------
    let sha = null;
    const existing = await fetch(apiBase, {
      headers: {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "User-Agent": "db-updater"
      }
    });

    if (existing.status === 200) {
      const json = await existing.json();
      sha = json.sha;
    }

    // -----------------------------
    // 5) Commit update to GitHub
    // -----------------------------
    const commitRes = await fetch(apiBase, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent": "db-updater"
      },
      body: JSON.stringify({
        message: "Update DB from Excel sync",
        content: encoded,
        sha
      })
    });

    if (!commitRes.ok) {
      const txt = await commitRes.text();
      return new Response(txt, { status: 500, headers: cors });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  }
};
