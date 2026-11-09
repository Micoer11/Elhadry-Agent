// Curated from NousResearch/hermes-agent optional-mcps manifests (Nous-approved MCP servers) and
// official vendor-hosted remote MCP servers verified against their documentation.
// Each entry is a remote HTTP MCP: https://github.com/NousResearch/hermes-agent/tree/main/optional-mcps
export type McpCatalogEntry = {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly url: string
  /** Vendor site host used for the logo. */
  readonly host: string
  readonly auth: "oauth" | "none"
  readonly source: string
  readonly color: string
}

export const MCP_CATALOG: ReadonlyArray<McpCatalogEntry> = [
  {
    "id": "adp",
    "name": "ADP",
    "description": "Payroll, HR, and workforce data from your ADP account.",
    "url": "https://mcp.adp.com/mcp",
    "host": "adp.com",
    "auth": "oauth",
    "source": "https://developers.adp.com/",
    "color": "#D0271D"
  },
  {
    "id": "airbyte",
    "name": "Airbyte",
    "description": "Data pipelines, connections, and sync status from Airbyte Cloud.",
    "url": "https://mcp.airbyte.com/mcp",
    "host": "airbyte.com",
    "auth": "oauth",
    "source": "https://docs.airbyte.com/ai-agents/mcp-server",
    "color": "#615EFF"
  },
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
    "id": "alpaca",
    "name": "Alpaca",
    "description": "Trading accounts, orders, positions, and market data from Alpaca.",
    "url": "https://mcp.alpaca.markets/mcp",
    "host": "alpaca.markets",
    "auth": "none",
    "source": "https://docs.alpaca.markets/docs/alpaca-mcp-server",
    "color": "#F5C518"
  },
  {
    "id": "alpha-vantage",
    "name": "Alpha Vantage",
    "description": "Stocks, forex, and economic indicators from Alpha Vantage.",
    "url": "https://mcp.alphavantage.co/mcp",
    "host": "alphavantage.co",
    "auth": "oauth",
    "source": "https://www.alphavantage.co/documentation/",
    "color": "#1E88E5"
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
    "id": "apify",
    "name": "Apify",
    "description": "Run Apify actors and fetch datasets from your Apify account.",
    "url": "https://mcp.apify.com/",
    "host": "apify.com",
    "auth": "oauth",
    "source": "https://docs.apify.com/platform/integrations/mcp",
    "color": "#00B4D8"
  },
  {
    "id": "apollo",
    "name": "Apollo.io",
    "description": "Contacts, accounts, and sales engagement data from Apollo.io.",
    "url": "https://mcp.apollo.io/mcp",
    "host": "apollo.io",
    "auth": "oauth",
    "source": "https://www.apollo.io/product/mcp",
    "color": "#FF7A00"
  },
  {
    "id": "appwrite",
    "name": "Appwrite",
    "description": "Projects, databases, functions, and users from your Appwrite organization.",
    "url": "https://mcp.appwrite.io/",
    "host": "appwrite.io",
    "auth": "oauth",
    "source": "https://appwrite.io/docs/tooling/ai/mcp-servers",
    "color": "#FD366E"
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
    "id": "assemblyai",
    "name": "AssemblyAI",
    "description": "Transcribe and analyze audio with AssemblyAI.",
    "url": "https://mcp.assemblyai.com/mcp",
    "host": "assemblyai.com",
    "auth": "oauth",
    "source": "https://www.assemblyai.com/docs/mcp-server",
    "color": "#5C6BFF"
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
    "id": "aweber",
    "name": "AWeber",
    "description": "Email campaigns, subscribers, and lists from AWeber.",
    "url": "https://mcp.aweber.com/mcp",
    "host": "aweber.com",
    "auth": "oauth",
    "source": "https://mcp.aweber.com/docs",
    "color": "#1F70C1"
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
    "id": "basecamp",
    "name": "Basecamp",
    "description": "Projects, to-dos, messages, and files from Basecamp.",
    "url": "https://mcp.basecamp.com/mcp",
    "host": "basecamp.com",
    "auth": "oauth",
    "source": "https://basecamp.com/ai",
    "color": "#5ECC62"
  },
  {
    "id": "beehiiv",
    "name": "beehiiv",
    "description": "Newsletters, subscribers, and posts from beehiiv.",
    "url": "https://mcp.beehiiv.com/mcp",
    "host": "beehiiv.com",
    "auth": "oauth",
    "source": "https://www.beehiiv.com/mcp",
    "color": "#FFCC00"
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
    "id": "box",
    "name": "Box",
    "description": "Files, folders, and shared content from your Box account.",
    "url": "https://mcp.box.com/mcp",
    "host": "box.com",
    "auth": "oauth",
    "source": "https://developer.box.com/guides/box-mcp",
    "color": "#0061D5"
  },
  {
    "id": "braze",
    "name": "Braze",
    "description": "Campaigns, canvases, and engagement data from Braze.",
    "url": "https://mcp.braze.com/mcp",
    "host": "braze.com",
    "auth": "oauth",
    "source": "https://www.braze.com/docs/mcp",
    "color": "#FF5C39"
  },
  {
    "id": "buffer",
    "name": "Buffer",
    "description": "Social posts, channels, and analytics from Buffer.",
    "url": "https://mcp.buffer.com/mcp",
    "host": "buffer.com",
    "auth": "oauth",
    "source": "https://buffer.com/mcp",
    "color": "#168EEA"
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
    "id": "cal",
    "name": "Cal.com",
    "description": "Bookings, event types, availability, and schedules from Cal.com.",
    "url": "https://mcp.cal.com/mcp",
    "host": "cal.com",
    "auth": "oauth",
    "source": "https://cal.com/docs/mcp-server",
    "color": "#292929"
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
    "id": "clerk",
    "name": "Clerk",
    "description": "Users, organizations, and sessions from your Clerk application.",
    "url": "https://mcp.clerk.com/mcp",
    "host": "clerk.com",
    "auth": "oauth",
    "source": "https://clerk.com/docs/guides/ai/mcp/clerk-mcp-server",
    "color": "#6C47FF"
  },
  {
    "id": "clevertap",
    "name": "CleverTap",
    "description": "Segments, campaigns, and engagement data from CleverTap.",
    "url": "https://mcp.clevertap.com/mcp",
    "host": "clevertap.com",
    "auth": "oauth",
    "source": "https://developer.clevertap.com/docs",
    "color": "#F2545B"
  },
  {
    "id": "clickhouse",
    "name": "ClickHouse",
    "description": "Query ClickHouse Cloud services, databases, and tables.",
    "url": "https://mcp.clickhouse.cloud/mcp",
    "host": "clickhouse.com",
    "auth": "oauth",
    "source": "https://clickhouse.com/docs/guides/use-cases/ai-ml/MCP",
    "color": "#FFCC01"
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
    "id": "contentful",
    "name": "Contentful",
    "description": "Content types, entries, and assets from your Contentful space.",
    "url": "https://mcp.contentful.com/mcp",
    "host": "contentful.com",
    "auth": "oauth",
    "source": "https://www.contentful.com/developers/docs/tools/mcp-server/",
    "color": "#2478CC"
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
    "id": "convex",
    "name": "Convex",
    "description": "Inspect and manage Convex deployments, tables, and functions.",
    "url": "https://mcp.convex.dev/mcp",
    "host": "convex.dev",
    "auth": "none",
    "source": "https://docs.convex.dev/ai/convex-mcp-server",
    "color": "#EE342F"
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
    "id": "customer-io",
    "name": "Customer.io",
    "description": "Journeys, campaigns, and customer profiles from Customer.io.",
    "url": "https://mcp.customer.io/mcp",
    "host": "customer.io",
    "auth": "oauth",
    "source": "https://docs.customer.io/ai/mcp-server",
    "color": "#6C5CE7"
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
    "id": "digitalocean",
    "name": "DigitalOcean",
    "description": "Droplets, databases, and infrastructure in your DigitalOcean account.",
    "url": "https://mcp.digitalocean.com/mcp",
    "host": "digitalocean.com",
    "auth": "oauth",
    "source": "https://docs.digitalocean.com/reference/mcp/",
    "color": "#0080FF"
  },
  {
    "id": "docusign",
    "name": "DocuSign",
    "description": "Envelopes, templates, and agreements from your DocuSign account.",
    "url": "https://mcp.docusign.com/mcp",
    "host": "docusign.com",
    "auth": "oauth",
    "source": "https://www.docusign.com/products/mcp",
    "color": "#FFCC22"
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
    "id": "elevenlabs",
    "name": "ElevenLabs",
    "description": "Generate speech, clone voices, and manage ElevenLabs agents.",
    "url": "https://api.elevenlabs.io/v1/mcp",
    "host": "elevenlabs.io",
    "auth": "oauth",
    "source": "https://elevenlabs.io/mcp",
    "color": "#111111"
  },
  {
    "id": "exa",
    "name": "Exa",
    "description": "Web search, page fetching, and research via Exa.",
    "url": "https://mcp.exa.ai/mcp",
    "host": "exa.ai",
    "auth": "none",
    "source": "https://docs.exa.ai/reference/exa-mcp",
    "color": "#6C63FF"
  },
  {
    "id": "fal",
    "name": "fal",
    "description": "Generate images, video, and audio with fal models.",
    "url": "https://mcp.fal.ai/mcp",
    "host": "fal.ai",
    "auth": "oauth",
    "source": "https://fal.ai/docs/mcp",
    "color": "#7C3AED"
  },
  {
    "id": "fathom",
    "name": "Fathom",
    "description": "Meeting recordings, transcripts, and summaries from Fathom.",
    "url": "https://api.fathom.ai/mcp",
    "host": "fathom.video",
    "auth": "oauth",
    "source": "https://developers.fathom.ai/mcp",
    "color": "#2563EB"
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
    "id": "finnhub",
    "name": "Finnhub",
    "description": "Stock quotes, company fundamentals, and market news from Finnhub.",
    "url": "https://mcp.finnhub.io/mcp",
    "host": "finnhub.io",
    "auth": "oauth",
    "source": "https://finnhub.io/docs/api",
    "color": "#11A683"
  },
  {
    "id": "firecrawl",
    "name": "Firecrawl",
    "description": "Scrape, crawl, and search the web with Firecrawl.",
    "url": "https://mcp.firecrawl.dev/v2/mcp",
    "host": "firecrawl.dev",
    "auth": "none",
    "source": "https://docs.firecrawl.dev/mcp-server",
    "color": "#FF6B00"
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
    "id": "framer",
    "name": "Framer",
    "description": "Create and edit Framer sites, pages, and CMS content.",
    "url": "https://mcp.framer.com/mcp",
    "host": "framer.com",
    "auth": "oauth",
    "source": "https://www.framer.com/mcp/",
    "color": "#0055FF"
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
    "id": "gitbook",
    "name": "GitBook",
    "description": "Documentation spaces, pages, and search from GitBook.",
    "url": "https://mcp.gitbook.com/mcp",
    "host": "gitbook.com",
    "auth": "oauth",
    "source": "https://docs.gitbook.com/",
    "color": "#346DDB"
  },
  {
    "id": "github",
    "name": "GitHub",
    "description": "Repositories, issues, pull requests, and code search on GitHub.",
    "url": "https://api.githubcopilot.com/mcp/",
    "host": "github.com",
    "auth": "oauth",
    "source": "https://github.com/github/github-mcp-server",
    "color": "#181717"
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
    "id": "gong",
    "name": "Gong",
    "description": "Sales calls, transcripts, and revenue insights from Gong.",
    "url": "https://mcp.gong.io/mcp",
    "host": "gong.io",
    "auth": "oauth",
    "source": "https://www.gong.io/",
    "color": "#7A3FF2"
  },
  {
    "id": "gorgias",
    "name": "Gorgias",
    "description": "Support tickets, customers, and help center content from Gorgias.",
    "url": "https://mcp.gorgias.com/mcp",
    "host": "gorgias.com",
    "auth": "none",
    "source": "https://docs.gorgias.com/",
    "color": "#FF5A5F"
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
    "id": "granola",
    "name": "Granola",
    "description": "Meeting notes, transcripts, and action items from Granola.",
    "url": "https://mcp.granola.ai/mcp",
    "host": "granola.ai",
    "auth": "oauth",
    "source": "https://docs.granola.ai/mcp",
    "color": "#F5C518"
  },
  {
    "id": "greenhouse",
    "name": "Greenhouse",
    "description": "Jobs, candidates, and recruiting data from Greenhouse.",
    "url": "https://mcp.greenhouse.io/mcp",
    "host": "greenhouse.io",
    "auth": "oauth",
    "source": "https://developers.greenhouse.io/",
    "color": "#24A47F"
  },
  {
    "id": "harness",
    "name": "Harness",
    "description": "Pipelines, deployments, and service health from Harness.",
    "url": "https://mcp.harness.io/mcp",
    "host": "harness.io",
    "auth": "oauth",
    "source": "https://developer.harness.io/",
    "color": "#00ADE4"
  },
  {
    "id": "heroku",
    "name": "Heroku",
    "description": "Apps, dynos, pipelines, and add-ons in your Heroku account.",
    "url": "https://mcp.heroku.com/mcp",
    "host": "heroku.com",
    "auth": "oauth",
    "source": "https://devcenter.heroku.com/articles/heroku-mcp-server",
    "color": "#430098"
  },
  {
    "id": "heygen",
    "name": "HeyGen",
    "description": "Create and manage avatars and videos with HeyGen.",
    "url": "https://mcp.heygen.com/mcp/v1/",
    "host": "heygen.com",
    "auth": "oauth",
    "source": "https://www.heygen.com/model-context-protocol",
    "color": "#6C5CE7"
  },
  {
    "id": "higgsfield",
    "name": "Higgsfield",
    "description": "Generate images and videos with Higgsfield AI models.",
    "url": "https://mcp.higgsfield.ai/mcp",
    "host": "higgsfield.ai",
    "auth": "oauth",
    "source": "https://higgsfield.ai/mcp",
    "color": "#030304"
  },
  {
    "id": "honeycomb",
    "name": "Honeycomb",
    "description": "Traces, queries, and observability data from Honeycomb.",
    "url": "https://mcp.honeycomb.io/mcp",
    "host": "honeycomb.io",
    "auth": "oauth",
    "source": "https://docs.honeycomb.io/mcp",
    "color": "#F5A623"
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
    "id": "incidentio",
    "name": "incident.io",
    "description": "Incidents, alerts, and on-call schedules from incident.io.",
    "url": "https://mcp.incident.io/mcp",
    "host": "incident.io",
    "auth": "oauth",
    "source": "https://docs.incident.io/ai/remote-mcp",
    "color": "#FF3366"
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
    "id": "instacart",
    "name": "Instacart",
    "description": "Grocery search, recipes, and shopping lists via Instacart.",
    "url": "https://mcp.instacart.com/mcp",
    "host": "instacart.com",
    "auth": "none",
    "source": "https://docs.instacart.com/",
    "color": "#43B02A"
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
    "id": "jina",
    "name": "Jina AI",
    "description": "Web reading, search, and embeddings with Jina AI.",
    "url": "https://mcp.jina.ai/sse",
    "host": "jina.ai",
    "auth": "none",
    "source": "https://jina.ai/",
    "color": "#EB6161"
  },
  {
    "id": "jotform",
    "name": "Jotform",
    "description": "Forms, submissions, and responses from Jotform.",
    "url": "https://mcp.jotform.com/mcp",
    "host": "jotform.com",
    "auth": "oauth",
    "source": "https://www.jotform.com/mcp",
    "color": "#FF6100"
  },
  {
    "id": "kinsta",
    "name": "Kinsta",
    "description": "WordPress sites, environments, and hosting data from Kinsta.",
    "url": "https://mcp.kinsta.com/mcp",
    "host": "kinsta.com",
    "auth": "oauth",
    "source": "https://kinsta.com/docs/",
    "color": "#533BE5"
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
    "id": "launchdarkly",
    "name": "LaunchDarkly",
    "description": "Feature flags, environments, and experiments in LaunchDarkly.",
    "url": "https://mcp.launchdarkly.com/mcp",
    "host": "launchdarkly.com",
    "auth": "oauth",
    "source": "https://launchdarkly.com/docs/home/getting-started/mcp",
    "color": "#405CF5"
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
    "id": "mailerlite",
    "name": "MailerLite",
    "description": "Subscribers, campaigns, and automations from MailerLite.",
    "url": "https://mcp.mailerlite.com/mcp",
    "host": "mailerlite.com",
    "auth": "oauth",
    "source": "https://developers.mailerlite.com/mcp",
    "color": "#09C269"
  },
  {
    "id": "mapbox",
    "name": "Mapbox",
    "description": "Mapbox documentation search for maps, geocoding, and navigation.",
    "url": "https://mcp-docs.mapbox.com/mcp",
    "host": "mapbox.com",
    "auth": "none",
    "source": "https://docs.mapbox.com/",
    "color": "#4264FB"
  },
  {
    "id": "mercury",
    "name": "Mercury",
    "description": "Accounts, transactions, and payments from your Mercury banking.",
    "url": "https://mcp.mercury.com/mcp",
    "host": "mercury.com",
    "auth": "oauth",
    "source": "https://mercury.com/mcp",
    "color": "#5266EB"
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
    "id": "mongodb",
    "name": "MongoDB",
    "description": "Query MongoDB Atlas clusters, databases, and collections.",
    "url": "https://mcp.mongodb.com/mcp",
    "host": "mongodb.com",
    "auth": "oauth",
    "source": "https://www.mongodb.com/docs/mcp-server/",
    "color": "#47A248"
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
    "id": "namecheap",
    "name": "Namecheap",
    "description": "Domains, DNS, and hosting from your Namecheap account.",
    "url": "https://mcp.namecheap.com/mcp",
    "host": "namecheap.com",
    "auth": "oauth",
    "source": "https://www.namecheap.com/support/api/",
    "color": "#DE3723"
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
    "id": "newrelic",
    "name": "New Relic",
    "description": "Query New Relic metrics, logs, alerts, and traces.",
    "url": "https://mcp.newrelic.com/mcp",
    "host": "newrelic.com",
    "auth": "oauth",
    "source": "https://docs.newrelic.com/docs/agentic-ai/mcp/overview/",
    "color": "#1CE783"
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
    "id": "omnisend",
    "name": "Omnisend",
    "description": "Email, SMS, and automation data from Omnisend.",
    "url": "https://mcp.omnisend.com/mcp",
    "host": "omnisend.com",
    "auth": "oauth",
    "source": "https://api-docs.omnisend.com/reference/mcp-server",
    "color": "#00C08B"
  },
  {
    "id": "otter",
    "name": "Otter.ai",
    "description": "Meeting transcripts, summaries, and action items from Otter.ai.",
    "url": "https://mcp.otter.ai/mcp",
    "host": "otter.ai",
    "auth": "oauth",
    "source": "https://otter.ai/",
    "color": "#00B2A9"
  },
  {
    "id": "pagerduty",
    "name": "PagerDuty",
    "description": "Incidents, schedules, and on-call information from PagerDuty.",
    "url": "https://mcp.pagerduty.com/mcp",
    "host": "pagerduty.com",
    "auth": "oauth",
    "source": "https://docs.pagerduty.com/ai-automation/advance/pagerduty-mcp-server",
    "color": "#06AC38"
  },
  {
    "id": "pandadoc",
    "name": "PandaDoc",
    "description": "Documents, templates, and e-signature workflows in PandaDoc.",
    "url": "https://mcp.pandadoc.com/v1/mcp",
    "host": "pandadoc.com",
    "auth": "oauth",
    "source": "https://developers.pandadoc.com/docs/getting-started-with-mcp",
    "color": "#FF5A1F"
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
    "id": "personio",
    "name": "Personio",
    "description": "Employees, absences, and HR workflows from Personio.",
    "url": "https://mcp.personio.de/mcp",
    "host": "personio.com",
    "auth": "oauth",
    "source": "https://developer.personio.de/mcp",
    "color": "#FF4D4D"
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
    "id": "planetscale",
    "name": "PlanetScale",
    "description": "Databases, branches, and schema insights from PlanetScale.",
    "url": "https://mcp.pscale.dev/mcp/planetscale",
    "host": "planetscale.com",
    "auth": "oauth",
    "source": "https://planetscale.com/docs/mcp-server",
    "color": "#111111"
  },
  {
    "id": "posthog",
    "name": "PostHog",
    "description": "Product analytics, insights, and feature flags from PostHog.",
    "url": "https://mcp.posthog.com/mcp",
    "host": "posthog.com",
    "auth": "oauth",
    "source": "https://posthog.com/docs/model-context-protocol",
    "color": "#F54E00"
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
    "id": "productboard",
    "name": "Productboard",
    "description": "Features, insights, and roadmaps from Productboard.",
    "url": "https://mcp.productboard.com/mcp",
    "host": "productboard.com",
    "auth": "oauth",
    "source": "https://www.productboard.com/integrations/mcp-server",
    "color": "#FF6B00"
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
    "id": "ramp",
    "name": "Ramp",
    "description": "Spend, cards, transactions, and vendors from Ramp.",
    "url": "https://mcp.ramp.com/mcp",
    "host": "ramp.com",
    "auth": "oauth",
    "source": "https://docs.ramp.com/developer-api/mcp",
    "color": "#E1F54B"
  },
  {
    "id": "recorded-future",
    "name": "Recorded Future",
    "description": "Threat intelligence, alerts, and risk context from Recorded Future.",
    "url": "https://mcp.recordedfuture.com/mcp",
    "host": "recordedfuture.com",
    "auth": "oauth",
    "source": "https://www.recordedfuture.com/",
    "color": "#6A4C93"
  },
  {
    "id": "render",
    "name": "Render",
    "description": "Web services, databases, and deploys on Render.",
    "url": "https://mcp.render.com/mcp",
    "host": "render.com",
    "auth": "oauth",
    "source": "https://render.com/docs/mcp-server",
    "color": "#46E3B7"
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
    "id": "replicate",
    "name": "Replicate",
    "description": "Run and manage Replicate models and predictions.",
    "url": "https://mcp.replicate.com/mcp",
    "host": "replicate.com",
    "auth": "oauth",
    "source": "https://replicate.com/docs/reference/mcp",
    "color": "#111111"
  },
  {
    "id": "resend",
    "name": "Resend",
    "description": "Send and manage transactional email with Resend.",
    "url": "https://mcp.resend.com/mcp",
    "host": "resend.com",
    "auth": "oauth",
    "source": "https://resend.com/docs/mcp",
    "color": "#111111"
  },
  {
    "id": "rippling",
    "name": "Rippling",
    "description": "Employees, payroll, and HR data from Rippling.",
    "url": "https://mcp.rippling.com/mcp",
    "host": "rippling.com",
    "auth": "oauth",
    "source": "https://developer.rippling.com/",
    "color": "#F5C400"
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
    "id": "rootly",
    "name": "Rootly",
    "description": "Incidents, alerts, and on-call workflows from Rootly.",
    "url": "https://mcp.rootly.com/mcp",
    "host": "rootly.com",
    "auth": "oauth",
    "source": "https://docs.rootly.com/",
    "color": "#FF4F79"
  },
  {
    "id": "runway",
    "name": "Runway",
    "description": "Generate and edit video with Runway's AI models.",
    "url": "https://mcp.runwayml.com/mcp",
    "host": "runwayml.com",
    "auth": "oauth",
    "source": "https://docs.dev.runwayml.com/",
    "color": "#111827"
  },
  {
    "id": "sanity",
    "name": "Sanity",
    "description": "Query and manage content in your Sanity datasets.",
    "url": "https://mcp.sanity.io/mcp",
    "host": "sanity.io",
    "auth": "oauth",
    "source": "https://www.sanity.io/mcp",
    "color": "#F03E2F"
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
    "id": "similarweb",
    "name": "Similarweb",
    "description": "Website traffic, rankings, and market intelligence from Similarweb.",
    "url": "https://mcp.similarweb.com/mcp",
    "host": "similarweb.com",
    "auth": "oauth",
    "source": "https://developers.similarweb.com/mcp",
    "color": "#1F3BB3"
  },
  {
    "id": "slack",
    "name": "Slack",
    "description": "Search messages, read channels, and post updates in Slack.",
    "url": "https://mcp.slack.com/mcp",
    "host": "slack.com",
    "auth": "oauth",
    "source": "https://docs.slack.dev/ai/slack-mcp-server",
    "color": "#4A154B"
  },
  {
    "id": "smartsheet",
    "name": "Smartsheet",
    "description": "Sheets, rows, and workspace data from Smartsheet.",
    "url": "https://mcp.smartsheet.com/mcp",
    "host": "smartsheet.com",
    "auth": "oauth",
    "source": "https://developers.smartsheet.com/",
    "color": "#00A9A5"
  },
  {
    "id": "sprinklr",
    "name": "Sprinklr",
    "description": "Social listening, publishing, and engagement from Sprinklr.",
    "url": "https://mcp.sprinklr.com/mcp",
    "host": "sprinklr.com",
    "auth": "oauth",
    "source": "https://dev.sprinklr.com/",
    "color": "#0057FF"
  },
  {
    "id": "sprout-social",
    "name": "Sprout Social",
    "description": "Social posts, analytics, and engagement from Sprout Social.",
    "url": "https://mcp.sproutsocial.com/mcp",
    "host": "sproutsocial.com",
    "auth": "oauth",
    "source": "https://api.sproutsocial.com/docs",
    "color": "#59CB59"
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
    "id": "squarespace",
    "name": "Squarespace",
    "description": "Domains, sites, and commerce tools from Squarespace.",
    "url": "https://mcp.squarespace.com/mcp",
    "host": "squarespace.com",
    "auth": "none",
    "source": "https://developers.squarespace.com/",
    "color": "#111111"
  },
  {
    "id": "stackoverflow",
    "name": "Stack Overflow",
    "description": "Search Stack Overflow questions, answers, and tags.",
    "url": "https://mcp.stackoverflow.com",
    "host": "stackoverflow.com",
    "auth": "oauth",
    "source": "https://stackoverflow.blog/mcp/",
    "color": "#F48024"
  },
  {
    "id": "statsig",
    "name": "Statsig",
    "description": "Feature gates, experiments, and analytics from Statsig.",
    "url": "https://api.statsig.com/v1/mcp",
    "host": "statsig.com",
    "auth": "oauth",
    "source": "https://docs.statsig.com/mcp",
    "color": "#4F46E5"
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
    "id": "sumo-logic",
    "name": "Sumo Logic",
    "description": "Logs, metrics, and observability queries from Sumo Logic.",
    "url": "https://mcp.sumologic.com/mcp",
    "host": "sumologic.com",
    "auth": "oauth",
    "source": "https://help.sumologic.com/",
    "color": "#1B4DE4"
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
    "id": "typeform",
    "name": "Typeform",
    "description": "Forms, responses, and workspaces from your Typeform account.",
    "url": "https://api.typeform.com/mcp",
    "host": "typeform.com",
    "auth": "oauth",
    "source": "https://www.typeform.com/developers/mcp/",
    "color": "#262627"
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
    "id": "vultr",
    "name": "Vultr",
    "description": "Cloud instances, storage, and networking from Vultr.",
    "url": "https://mcp.vultr.com/mcp",
    "host": "vultr.com",
    "auth": "oauth",
    "source": "https://docs.vultr.com/",
    "color": "#007BFC"
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
    "id": "wise",
    "name": "Wise",
    "description": "Transfers, balances, and payment data from Wise.",
    "url": "https://mcp.wise.com/mcp",
    "host": "wise.com",
    "auth": "oauth",
    "source": "https://docs.wise.com/",
    "color": "#9FE870"
  },
  {
    "id": "wix",
    "name": "Wix",
    "description": "Sites, stores, and content in your Wix account.",
    "url": "https://mcp.wix.com/mcp",
    "host": "wix.com",
    "auth": "oauth",
    "source": "https://dev.wix.com/docs/sdk/articles/use-the-wix-mcp/about-the-wix-mcp",
    "color": "#116DFF"
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
  },
  {
    "id": "xero",
    "name": "Xero",
    "description": "Invoices, contacts, and accounting data from Xero.",
    "url": "https://mcp.xero.com/mcp",
    "host": "xero.com",
    "auth": "oauth",
    "source": "https://developer.xero.com/",
    "color": "#13B5EA"
  },
  {
    "id": "zendesk",
    "name": "Zendesk",
    "description": "Tickets, users, and help center content from Zendesk.",
    "url": "https://mcp.zendesk.com/mcp",
    "host": "zendesk.com",
    "auth": "oauth",
    "source": "https://developer.zendesk.com/",
    "color": "#03363D"
  }
]
