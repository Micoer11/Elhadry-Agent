import { useLanguage } from "@/runtime/i18n/language"
import { usePlatform } from "@/runtime/platform/platform"
import { useServerSDK } from "@/runtime/server/client"

/**
 * Starts the browser OAuth flow for a configured MCP server when it reports `needs_auth`.
 * Returns without doing anything for servers that are already connected or do not use OAuth.
 */
export function useMcpAuthorize() {
  const sdk = useServerSDK()
  const platform = usePlatform()
  const language = useLanguage()

  return async (name: string, location?: { directory?: string }) => {
    let server = (await sdk.api.mcp.list({ location })).data.find((item) => item.name === name)

    if (!server) return

    if (server.status.status !== "needs_auth" && server.status.status !== "connected") {
      await sdk.api.mcp.connect({ server: name, location })
      server = (await sdk.api.mcp.list({ location })).data.find((item) => item.name === name)
    }

    if (!server || server.status.status !== "needs_auth" || !server.integrationID) return

    const integration = await sdk.api.integration.get({
      integrationID: server.integrationID,
      location,
    })

    const method = integration.data?.methods.find((item) => item.type === "oauth" && !item.form?.length)

    if (!method || method.type !== "oauth") throw new Error(language.t("mcp.auth.interactiveForm", { name }))

    const attempt = await sdk.api.integration.oauth.connect({
      integrationID: server.integrationID,
      methodID: method.id,
      location,
    })

    platform.openExternal(attempt.data.url)
  }
}
