---
name: X data access for Daily Scan
description: How this project gets live X (Twitter) post data, and why the Replit X connector is not used
---

The Daily Scan feature gets live X posts via **xAI Grok's `x_search` built-in tool** (POST https://api.x.ai/v1/responses with `tools: [{type: "x_search"}]`), authenticated with the `CONTENTLAYEROS_XAI` secret.

**Why:** The Replit X connector attached to this project carries an API key that returns 401 on every X API v2 endpoint (Aug 2026). The user's `CONTENTLAYEROS_XAI` secret is an xAI key, not an X platform key — it fails against api.x.com but works against api.x.ai. xAI's older `search_parameters` Live Search is deprecated; use the Agent Tools API (`x_search` tool on /v1/responses) instead.

**How to apply:** For any future feature needing live X data, reuse the xAI x_search approach (see `server/lib/dailyScan.ts`) rather than the X connector, unless the connector's key is repaired. Grok's output can include citation-marker artifacts — prompt for plain URLs only.
