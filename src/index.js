export default {
  async fetch(request, env) {

    const cors = {
      "Access-Control-Allow-Origin": "https://chacegarcia.github.io",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    if (request.method === "OPTIONS")
      return new Response(null, { headers: cors });

    if (request.method === "POST") {

      const auth = request.headers.get("Authorization") || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      if (!token)
        return new Response("Missing Microsoft token", { status: 401, headers: cors });

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));

        if (payload.tid !== env.ALLOWED_TENANT)
          return new Response("Wrong tenant", { status: 401, headers: cors });

      } catch {
        return new Response("Invalid token", { status: 401, headers: cors });
      }

      // continue to GitHub commit logic here
      return await handleGitHubUpdate(request, env, cors);
    }

    return new Response("db-updater running");
  }
};


    // ---- Parse incoming JSON ----
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400, headers: cors });
    }

    const owner = env.GITHUB_OWNER;
    const repo = env.GITHUB_REPO;
    const path = env.GITHUB_PATH;

    if (!env.GITHUB_TOKEN || !owner || !repo || !path) {
      return new Response("Missing GitHub env vars", { status: 500, headers: cors });
    }

    // ---- Get existing file (to read SHA) ----
    const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const ghHeaders = {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent": "cf-worker",
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json"
    };

    const currentRes = await fetch(apiBase, { headers: ghHeaders });
    if (!currentRes.ok) {
      const t = await currentRes.text().catch(() => "");
      return new Response(`Failed to read current file: ${t}`, { status: 500, headers: cors });
    }
    const current = await currentRes.json();

    // ---- Write updated content ----
    // Ensure the JSON has some consistent metadata
    const payload = {
      version: body.version ?? 1,
      updatedAt: new Date().toISOString(),
      foamRows: body.foamRows ?? body.rows?.foamRows ?? [],
      geoRows: body.geoRows ?? body.rows?.geoRows ?? [],
      woolRows: body.woolRows ?? body.rows?.woolRows ?? [],
      stackRows: body.stackRows ?? body.rows?.stackRows ?? []
    };

    const contentStr = JSON.stringify(payload, null, 2);
    const contentBase64 = btoa(unescape(encodeURIComponent(contentStr))); // ok in Worker runtime

    const putRes = await fetch(apiBase, {
      method: "PUT",
      headers: ghHeaders,
      body: JSON.stringify({
        message: "Update db/data.json from tool",
        content: contentBase64,
        sha: current.sha
      })
    });

    if (!putRes.ok) {
      const t = await putRes.text().catch(() => "");
      return new Response(`Failed to update file: ${t}`, { status: 500, headers: cors });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "content-type": "application/json" }
    });
  }
};
