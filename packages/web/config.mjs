const stage = process.env.SST_STAGE || "dev"

export default {
  url: stage === "production" ? "https://elhadry.ai" : `https://${stage}.elhadry.ai`,
  console: stage === "production" ? "https://elhadry.ai/auth" : `https://${stage}.elhadry.ai/auth`,
  email: "help@anoma.ly",
  socialCard: "https://social-cards.sst.dev",
  github: "https://github.com/anomalyco/opencode",
  discord: "https://elhadry.ai/discord",
  headerLinks: [
    { name: "app.header.home", url: "/" },
    { name: "app.header.docs", url: "/v2/docs" },
  ],
}
