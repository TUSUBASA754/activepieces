import { httpClient, HttpMethod } from "@activepieces/pieces-common"
import { McpWithTools } from "@activepieces/shared"


export const agentMcp = {
    getMcp: async (params: McpParams) => {
        const response = await httpClient.sendRequest<McpWithTools>({
            method: HttpMethod.GET,
            url: `${params.apiUrl}v1/mcp/${params.mcpId}`,
        })
        return response.body
    }
}   

type McpParams = {
    apiUrl: string
    token: string
    mcpId: string
}