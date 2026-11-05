// Curated from NousResearch/hermes-agent optional-mcps manifests (Nous-approved MCP servers).
// Each entry is a remote HTTP MCP: https://github.com/NousResearch/hermes-agent/tree/main/optional-mcps
export type McpCatalogEntry = {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly url: string
  /** Vendor site host from the manifest's composer-suggestion metadata, used for the logo. */
  readonly host: string
  readonly auth: "oauth" | "none"
  readonly source: string
  readonly color: string
}

export const MCP_CATALOG: ReadonlyArray<McpCatalogEntry> = [
  {
    "id": "airtable",
    "name": "Airtable",
    "description": "Bases, tables, and records from your Airtable workspace.",
    "url": "https://mcp.airtable.com/mcp",
    "host": "airtable.com",
    "auth": "oauth",
    "source": "https://support.airtable.com/articles/9897799762-using-the-airtable-mcp-server",
    "color": "#18BFFF"
  },
  {
    "id": "algolia",
    "name": "Algolia",
    "description": "Algolia search: indices, analytics, and settings (read-only).",
    "url": "https://mcp.algolia.com/mcp",
    "host": "algolia.com",
    "auth": "oauth",
    "source": "https://www.algolia.com/doc/guides/model-context-protocol/productivity-mcp",
    "color": "#F97316"
  },
  {
    "id": "alltrails",
    "name": "AllTrails",
    "description": "AllTrails: find hikes and trails with reviews and ratings.",
    "url": "https://www.alltrails.com/mcp",
    "host": "alltrails.com",
    "auth": "none",
    "source": "https://www.alltrails.com/mcp",
    "color": "#06B6D4"
  },
  {
    "id": "amplitude",
    "name": "Amplitude",
    "description": "Amplitude analytics: charts, dashboards, experiments, flags.",
    "url": "https://mcp.amplitude.com/mcp",
    "host": "amplitude.com",
    "auth": "oauth",
    "source": "https://amplitude.com/docs/amplitude-ai/amplitude-mcp",
    "color": "#8B5CF6"
  },
  {
    "id": "asana",
    "name": "Asana",
    "description": "Tasks, projects, and goals from your Asana workspace.",
    "url": "https://mcp.asana.com/v2/mcp",
    "host": "asana.com",
    "auth": "oauth",
    "source": "https://developers.asana.com/docs/integrating-with-asanas-mcp-server",
    "color": "#F06A6A"
  },
  {
    "id": "atlassian",
    "name": "Atlassian",
    "description": "Jira issues and Confluence pages via Atlassian's hosted remote MCP.",
    "url": "https://mcp.atlassian.com/v1/mcp/authv2",
    "host": "atlassian.net",
    "auth": "oauth",
    "source": "https://support.atlassian.com/rovo/docs/getting-started-with-the-atlassian-remote-mcp-server/",
    "color": "#0052CC"
  },
  {
    "id": "attio",
    "name": "Attio",
    "description": "CRM records, lists, and notes in Attio.",
    "url": "https://mcp.attio.com/mcp",
    "host": "attio.com",
    "auth": "oauth",
    "source": "https://attio.com/help/apps/other-apps/using-the-attio-mcp-server",
    "color": "#EC4899"
  },
  {
    "id": "aws-knowledge",
    "name": "AWS Knowledge",
    "description": "Authoritative AWS docs, API references, and best practices.",
    "url": "https://knowledge-mcp.global.api.aws",
    "host": "aws.amazon.com",
    "auth": "none",
    "source": "https://awslabs.github.io/mcp/servers/aws-knowledge-mcp-server/",
    "color": "#EF4444"
  },
  {
    "id": "betterstack",
    "name": "Better Stack",
    "description": "Better Stack: logs, uptime monitors, incidents, and status pages.",
    "url": "https://mcp.betterstack.com",
    "host": "betterstack.com",
    "auth": "oauth",
    "source": "https://betterstack.com/docs/getting-started/integrations/mcp/",
    "color": "#4C8DFF"
  },
  {
    "id": "buildkite",
    "name": "Buildkite",
    "description": "CI/CD pipelines, builds, and test results from Buildkite.",
    "url": "https://mcp.buildkite.com/mcp",
    "host": "buildkite.com",
    "auth": "oauth",
    "source": "https://buildkite.com/docs/apis/mcp-server",
    "color": "#EC4899"
  },
  {
    "id": "calendly",
    "name": "Calendly",
    "description": "Scheduling links, events, and invitees from Calendly.",
    "url": "https://mcp.calendly.com",
    "host": "calendly.com",
    "auth": "oauth",
    "source": "https://developer.calendly.com/calendly-mcp-server",
    "color": "#4C8DFF"
  },
  {
    "id": "canva",
    "name": "Canva",
    "description": "Create, search, and manage Canva designs.",
    "url": "https://mcp.canva.com/mcp",
    "host": "canva.com",
    "auth": "oauth",
    "source": "https://www.canva.dev/docs/mcp/",
    "color": "#8B5CF6"
  },
  {
    "id": "circleci",
    "name": "CircleCI",
    "description": "CircleCI: diagnose build failures, read logs, rerun workflows.",
    "url": "https://mcp.circleci.com/v1/mcp",
    "host": "circleci.com",
    "auth": "oauth",
    "source": "https://circleci.com/docs/guides/toolkit/circleci-mcp-overview/",
    "color": "#EF4444"
  },
  {
    "id": "clickup",
    "name": "ClickUp",
    "description": "Tasks, docs, and workspaces in ClickUp.",
    "url": "https://mcp.clickup.com/mcp",
    "host": "clickup.com",
    "auth": "oauth",
    "source": "https://developer.clickup.com/docs/connect-an-ai-assistant-to-clickups-mcp-server",
    "color": "#8B5CF6"
  },
  {
    "id": "close",
    "name": "Close",
    "description": "Sales CRM: leads, opportunities, calls, and emails.",
    "url": "https://mcp.close.com/mcp",
    "host": "close.com",
    "auth": "oauth",
    "source": "https://help.close.com/docs/mcp-server",
    "color": "#EF4444"
  },
  {
    "id": "cloudflare",
    "name": "Cloudflare",
    "description": "Full Cloudflare API access via the official remote MCP.",
    "url": "https://mcp.cloudflare.com/mcp?codemode=false",
    "host": "cloudflare.com",
    "auth": "oauth",
    "source": "https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/",
    "color": "#8B5CF6"
  },
  {
    "id": "cloudinary",
    "name": "Cloudinary",
    "description": "Upload, search, and transform media assets in Cloudinary.",
    "url": "https://asset-management.mcp.cloudinary.com/mcp",
    "host": "cloudinary.com",
    "auth": "oauth",
    "source": "https://cloudinary.com/documentation/cloudinary_llm_mcp",
    "color": "#06B6D4"
  },
  {
    "id": "comfy-cloud",
    "name": "Comfy Cloud",
    "description": "Generate images, video, audio, and 3D on Comfy Cloud.",
    "url": "https://cloud.comfy.org/mcp",
    "host": "comfy.org",
    "auth": "oauth",
    "source": "https://docs.comfy.org/agent-tools/cloud",
    "color": "#EF4444"
  },
  {
    "id": "context7",
    "name": "Context7",
    "description": "Up-to-date, version-specific library docs and code examples.",
    "url": "https://mcp.context7.com/mcp",
    "host": "context7.com",
    "auth": "none",
    "source": "https://context7.com/docs/resources/all-clients",
    "color": "#06B6D4"
  },
  {
    "id": "craft",
    "name": "Craft",
    "description": "Craft: structured docs, tasks, and personal knowledge base.",
    "url": "https://mcp.craft.do/my/mcp",
    "host": "craft.do",
    "auth": "oauth",
    "source": "https://support.craft.do/hc/en-us/articles/29455875123101",
    "color": "#84CC16"
  },
  {
    "id": "datadog",
    "name": "Datadog",
    "description": "Logs, monitors, dashboards, and incidents from Datadog.",
    "url": "https://mcp.datadoghq.com/api/unstable/mcp-server/mcp",
    "host": "datadoghq.com",
    "auth": "oauth",
    "source": "https://docs.datadoghq.com/bits_ai/mcp_server/",
    "color": "#632CA6"
  },
  {
    "id": "deepwiki",
    "name": "DeepWiki",
    "description": "Ask questions about any public GitHub repo (Devin's DeepWiki).",
    "url": "https://mcp.deepwiki.com/mcp",
    "host": "deepwiki.com",
    "auth": "none",
    "source": "https://docs.devin.ai/work-with-devin/deepwiki-mcp",
    "color": "#84CC16"
  },
  {
    "id": "dropbox",
    "name": "Dropbox",
    "description": "Search, read, and manage files in Dropbox.",
    "url": "https://mcp.dropbox.com/mcp",
    "host": "dropbox.com",
    "auth": "oauth",
    "source": "https://help.dropbox.com/integrations/connect-dropbox-mcp-server",
    "color": "#4C8DFF"
  },
  {
    "id": "figma",
    "name": "Figma",
    "description": "Official Figma remote MCP — design context, Code Connect, and write-to-canvas via https://mcp.figma.com/mcp (OAuth).",
    "url": "https://mcp.figma.com/mcp",
    "host": "figma.com",
    "auth": "oauth",
    "source": "https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/",
    "color": "#F24E1E"
  },
  {
    "id": "fireflies",
    "name": "Fireflies",
    "description": "Meeting transcripts, summaries, and action items.",
    "url": "https://api.fireflies.ai/mcp",
    "host": "fireflies.ai",
    "auth": "oauth",
    "source": "https://docs.fireflies.ai/getting-started/mcp-configuration",
    "color": "#6366F1"
  },
  {
    "id": "gamma",
    "name": "Gamma",
    "description": "Gamma: generate and edit AI presentations, docs, and sites.",
    "url": "https://mcp.gamma.app/mcp",
    "host": "gamma.app",
    "auth": "oauth",
    "source": "https://developers.gamma.app/docs/gamma-mcp-server",
    "color": "#EC4899"
  },
  {
    "id": "gitlab",
    "name": "GitLab",
    "description": "GitLab: issues, merge requests, pipelines, and repo context.",
    "url": "https://gitlab.com/api/v4/mcp",
    "host": "gitlab.com",
    "auth": "oauth",
    "source": "https://docs.gitlab.com/user/model_context_protocol/mcp_server/",
    "color": "#FC6D26"
  },
  {
    "id": "globalping",
    "name": "Globalping",
    "description": "Ping, traceroute, DNS, and HTTP tests from global probes.",
    "url": "https://mcp.globalping.dev/mcp",
    "host": "globalping.io",
    "auth": "oauth",
    "source": "https://github.com/jsdelivr/globalping-mcp-server",
    "color": "#F97316"
  },
  {
    "id": "grafana",
    "name": "Grafana",
    "description": "Query metrics, logs, dashboards, alerts, and incidents from Grafana Cloud.",
    "url": "https://mcp.grafana.com/mcp",
    "host": "grafana.net",
    "auth": "oauth",
    "source": "https://grafana.com/docs/grafana-cloud/ai-tools/mcp-servers/cloud-mcp/",
    "color": "#84CC16"
  },
  {
    "id": "hugging_face",
    "name": "Hugging Face",
    "description": "Models, datasets, Spaces, and papers from the Hugging Face Hub.",
    "url": "https://huggingface.co/mcp",
    "host": "huggingface.co",
    "auth": "oauth",
    "source": "https://huggingface.co/docs/hub/agents-mcp",
    "color": "#FFD21E"
  },
  {
    "id": "indeed",
    "name": "Indeed",
    "description": "Search jobs and listings on Indeed.",
    "url": "https://mcp.indeed.com/claude/mcp",
    "host": "indeed.com",
    "auth": "oauth",
    "source": "https://docs.indeed.com/indeed-mcp",
    "color": "#6366F1"
  },
  {
    "id": "intercom",
    "name": "Intercom",
    "description": "Conversations, tickets, and customer data from Intercom.",
    "url": "https://mcp.intercom.com/mcp",
    "host": "intercom.com",
    "auth": "oauth",
    "source": "https://developers.intercom.com/docs/guides/mcp",
    "color": "#6AFDEF"
  },
  {
    "id": "kiwi",
    "name": "Kiwi.com",
    "description": "Kiwi.com flight search: itineraries with direct booking links.",
    "url": "https://mcp.kiwi.com",
    "host": "kiwi.com",
    "auth": "none",
    "source": "https://www.kiwi.com/stories/kiwi-mcp-connector/",
    "color": "#06B6D4"
  },
  {
    "id": "klaviyo",
    "name": "Klaviyo",
    "description": "Klaviyo marketing: campaigns, flows, segments, and reporting.",
    "url": "https://mcp.klaviyo.com/mcp?core-tools-only=true&disable-tools-with-user-generated-content=true",
    "host": "klaviyo.com",
    "auth": "oauth",
    "source": "https://developers.klaviyo.com/en/docs/klaviyo_mcp_server",
    "color": "#EC4899"
  },
  {
    "id": "linear",
    "name": "Linear",
    "description": "Find, create, and update Linear issues, projects, and comments.",
    "url": "https://mcp.linear.app/mcp",
    "host": "linear.app",
    "auth": "oauth",
    "source": "https://linear.app/docs/mcp",
    "color": "#5E6AD2"
  },
  {
    "id": "microsoft-learn",
    "name": "Microsoft Learn",
    "description": "Official Microsoft, Azure, and .NET docs and code samples.",
    "url": "https://learn.microsoft.com/api/mcp",
    "host": "learn.microsoft.com",
    "auth": "none",
    "source": "https://learn.microsoft.com/en-us/training/support/mcp-get-started",
    "color": "#F97316"
  },
  {
    "id": "miro",
    "name": "Miro",
    "description": "Read and edit Miro boards, diagrams, and frames.",
    "url": "https://mcp.miro.com/",
    "host": "miro.com",
    "auth": "oauth",
    "source": "https://developers.miro.com/docs/connecting-to-miro-mcp",
    "color": "#F97316"
  },
  {
    "id": "mixpanel",
    "name": "Mixpanel",
    "description": "Mixpanel analytics: events, funnels, retention, dashboards.",
    "url": "https://mcp.mixpanel.com/mcp",
    "host": "mixpanel.com",
    "auth": "oauth",
    "source": "https://docs.mixpanel.com/docs/mcp",
    "color": "#10B981"
  },
  {
    "id": "monday",
    "name": "monday.com",
    "description": "Boards, items, docs, and workflows in monday.com.",
    "url": "https://mcp.monday.com/mcp",
    "host": "monday.com",
    "auth": "oauth",
    "source": "https://developer.monday.com/apps/docs/mondaycom-mcp-integration",
    "color": "#84CC16"
  },
  {
    "id": "motherduck",
    "name": "MotherDuck",
    "description": "MotherDuck: query DuckDB cloud warehouses with SQL.",
    "url": "https://api.motherduck.com/mcp",
    "host": "motherduck.com",
    "auth": "oauth",
    "source": "https://motherduck.com/docs/key-tasks/ai-and-motherduck/mcp-setup/",
    "color": "#10B981"
  },
  {
    "id": "neon",
    "name": "Neon",
    "description": "Neon serverless Postgres: projects, branches, and SQL.",
    "url": "https://mcp.neon.tech/mcp",
    "host": "neon.tech",
    "auth": "oauth",
    "source": "https://neon.com/docs/ai/neon-mcp-server",
    "color": "#10B981"
  },
  {
    "id": "netlify",
    "name": "Netlify",
    "description": "Sites, deploys, and env vars via Netlify's hosted MCP.",
    "url": "https://netlify-mcp.netlify.app/mcp",
    "host": "netlify.com",
    "auth": "oauth",
    "source": "https://docs.netlify.com/build/build-with-ai/agent-setup-guides/agent-setup-overview/",
    "color": "#00C7B7"
  },
  {
    "id": "notion",
    "name": "Notion",
    "description": "Pages and databases from your Notion workspace.",
    "url": "https://mcp.notion.com/mcp",
    "host": "notion.so",
    "auth": "oauth",
    "source": "https://developers.notion.com/docs/mcp",
    "color": "#000000"
  },
  {
    "id": "paypal",
    "name": "PayPal",
    "description": "Payments, invoices, and subscriptions via PayPal's hosted MCP.",
    "url": "https://mcp.paypal.com/sse",
    "host": "developer.paypal.com",
    "auth": "oauth",
    "source": "https://developer.paypal.com/tools/mcp-server/",
    "color": "#003087"
  },
  {
    "id": "plaid",
    "name": "Plaid",
    "description": "Plaid dashboard: integrations, Items, and usage debugging.",
    "url": "https://api.dashboard.plaid.com/mcp/",
    "host": "plaid.com",
    "auth": "oauth",
    "source": "https://plaid.com/docs/resources/mcp/",
    "color": "#10B981"
  },
  {
    "id": "postman",
    "name": "Postman",
    "description": "Postman workspaces, collections, environments, and APIs.",
    "url": "https://mcp.postman.com/minimal",
    "host": "postman.com",
    "auth": "oauth",
    "source": "https://learning.postman.com/docs/reference/postman-api/postman-mcp-server/postman-mcp-remote-server/",
    "color": "#10B981"
  },
  {
    "id": "prisma-postgres",
    "name": "Prisma Postgres",
    "description": "Create and manage Prisma Postgres databases.",
    "url": "https://mcp.prisma.io/mcp",
    "host": "prisma.io",
    "auth": "oauth",
    "source": "https://www.prisma.io/docs/postgres/integrations/mcp-server",
    "color": "#4C8DFF"
  },
  {
    "id": "railway",
    "name": "Railway",
    "description": "Railway: projects, services, deployments, and environments.",
    "url": "https://mcp.railway.com",
    "host": "railway.com",
    "auth": "oauth",
    "source": "https://docs.railway.com/guides/mcp-server",
    "color": "#6366F1"
  },
  {
    "id": "rentahuman",
    "name": "RentAHuman",
    "description": "Find people and manage real-world work through RentAHuman.",
    "url": "https://rentahuman.ai/api/mcp",
    "host": "rentahuman.ai",
    "auth": "oauth",
    "source": "https://rentahuman.ai/docs#mcp",
    "color": "#8B5CF6"
  },
  {
    "id": "robinhood",
    "name": "Robinhood",
    "description": "Robinhood agentic trading: portfolio, balances, and orders.",
    "url": "https://agent.robinhood.com/mcp/trading",
    "host": "robinhood.com",
    "auth": "oauth",
    "source": "https://robinhood.com/us/en/support/articles/agentic-trading-overview/",
    "color": "#EF4444"
  },
  {
    "id": "semgrep",
    "name": "Semgrep",
    "description": "Scan code for security vulnerabilities with Semgrep.",
    "url": "https://mcp.semgrep.ai/mcp",
    "host": "semgrep.dev",
    "auth": "oauth",
    "source": "https://semgrep.dev/docs/mcp",
    "color": "#8B5CF6"
  },
  {
    "id": "sentry",
    "name": "Sentry",
    "description": "Issues, stack traces, and error context from Sentry.",
    "url": "https://mcp.sentry.dev/mcp",
    "host": "sentry.io",
    "auth": "oauth",
    "source": "https://docs.sentry.io/product/sentry-mcp/",
    "color": "#362D59"
  },
  {
    "id": "square",
    "name": "Square",
    "description": "Catalog, orders, and payments via Square's hosted MCP.",
    "url": "https://mcp.squareup.com/sse",
    "host": "squareup.com",
    "auth": "oauth",
    "source": "https://developer.squareup.com/docs/mcp",
    "color": "#3E4348"
  },
  {
    "id": "strava",
    "name": "Strava",
    "description": "Strava: activities, fitness trends, training load (read-only).",
    "url": "https://mcp.strava.com/mcp",
    "host": "strava.com",
    "auth": "oauth",
    "source": "https://support.strava.com/en-us/articles/15401531-strava-mcp-connector",
    "color": "#6366F1"
  },
  {
    "id": "stripe",
    "name": "Stripe",
    "description": "Payments, customers, and invoices via Stripe's hosted MCP.",
    "url": "https://mcp.stripe.com",
    "host": "dashboard.stripe.com",
    "auth": "oauth",
    "source": "https://docs.stripe.com/mcp",
    "color": "#635BFF"
  },
  {
    "id": "supabase",
    "name": "Supabase",
    "description": "Database, auth, and storage from your Supabase projects.",
    "url": "https://mcp.supabase.com/mcp",
    "host": "supabase.com",
    "auth": "oauth",
    "source": "https://supabase.com/docs/guides/ai-tools/mcp",
    "color": "#3FCF8E"
  },
  {
    "id": "todoist",
    "name": "Todoist",
    "description": "Manage Todoist tasks and projects.",
    "url": "https://ai.todoist.net/mcp",
    "host": "todoist.com",
    "auth": "oauth",
    "source": "https://www.todoist.com/help/articles/todoist-mcp-server",
    "color": "#E44332"
  },
  {
    "id": "trivago",
    "name": "trivago",
    "description": "trivago hotel search: compare prices by city and dates.",
    "url": "https://mcp.trivago.com/mcp",
    "host": "trivago.com",
    "auth": "none",
    "source": "https://mcp.trivago.com/mcp",
    "color": "#4C8DFF"
  },
  {
    "id": "twelve-data",
    "name": "Twelve Data",
    "description": "Stocks, forex, and crypto market data from Twelve Data.",
    "url": "https://mcp.twelvedata.com/mcp",
    "host": "twelvedata.com",
    "auth": "oauth",
    "source": "https://twelvedata.com/docs",
    "color": "#4C8DFF"
  },
  {
    "id": "twilio-docs",
    "name": "Twilio Docs",
    "description": "Twilio developer docs search (public beta, read-only).",
    "url": "https://mcp.twilio.com/docs",
    "host": "twilio.com",
    "auth": "none",
    "source": "https://www.twilio.com/docs/ai/mcp",
    "color": "#EF4444"
  },
  {
    "id": "unreal-engine",
    "name": "Unreal Engine",
    "description": "Drive the Unreal Engine 5.8 editor over its local MCP server.",
    "url": "http://127.0.0.1:8000/mcp",
    "host": "",
    "auth": "none",
    "source": "https://dev.epicgames.com/documentation/unreal-engine/unreal-mcp-in-unreal-editor",
    "color": "#0E1128"
  },
  {
    "id": "vercel",
    "name": "Vercel",
    "description": "Deployments, logs, and projects via Vercel's hosted MCP.",
    "url": "https://mcp.vercel.com",
    "host": "vercel.com",
    "auth": "oauth",
    "source": "https://vercel.com/docs/mcp",
    "color": "#000000"
  },
  {
    "id": "webflow",
    "name": "Webflow",
    "description": "Sites, CMS collections, and pages via Webflow's hosted MCP.",
    "url": "https://mcp.webflow.com/mcp",
    "host": "webflow.com",
    "auth": "oauth",
    "source": "https://developers.webflow.com/mcp/reference/getting-started",
    "color": "#146EF5"
  },
  {
    "id": "wolfram",
    "name": "Wolfram",
    "description": "Wolfram|Alpha computation, math, and curated knowledge.",
    "url": "https://agenttools.wolfram.com/mcp",
    "host": "wolfram.com",
    "auth": "none",
    "source": "https://www.wolfram.com/agent-tools/",
    "color": "#4C8DFF"
  },
  {
    "id": "wordpress-com",
    "name": "WordPress.com",
    "description": "WordPress.com: posts, pages, drafts, stats, and comments.",
    "url": "https://public-api.wordpress.com/wpcom/v2/mcp/v1",
    "host": "wordpress.com",
    "auth": "oauth",
    "source": "https://developer.wordpress.com/docs/mcp/",
    "color": "#8B5CF6"
  }
]
