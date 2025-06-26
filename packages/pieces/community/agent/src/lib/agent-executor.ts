import { Agent, agentOutputUtils, assertNotNullOrUndefined, ContentBlockType, isNil, RichContentBlock, ToolCallContentBlock, ToolCallStatus, ToolCallType } from "@activepieces/shared"
import { agentTodos } from "./agent-todo"
import { streamText } from "ai"
import { agentCommon } from "./common"
import { agentTools } from "./agent-tools"
import { agentMcp } from "./agent-mcp"

export const agentExecutor = {
    async execute(params: ExecuteAgent) {
        const agent = await agentCommon.getAgent({
            apiUrl: params.apiUrl,
            token: params.serverToken,
            id: params.agentId,
        })
     

        const mcp = await agentMcp.getMcp({
            apiUrl: params.apiUrl,
            token: params.serverToken,
            mcpId: agent.mcpId,
        })
        const comment = await agentTodos.createComment({
            serverToken: params.serverToken,
            publicUrl: params.publicUrl,
            todoId: todo.body.id,
            requestBody: { content: '' },
        })

        const agentToolInstance = await agentTools({
            agent,
            apiUrl: params.apiUrl,
            token: params.serverToken,
            mcp,
        })
        try {
            const model = await agentCommon.initializeOpenAIModel({
                apiUrl: params.apiUrl,
                token: params.serverToken,
            })
            const { fullStream } = streamText({
                model,
                system: constructSystemPrompt(agent),
                prompt: params.prompt,
                maxSteps: agent.maxSteps,
                tools: await agentToolInstance.tools(),
            })
            const blocks: RichContentBlock[] = []
            let currentText = ''

            for await (const chunk of fullStream) {
                if (chunk.type === 'text-delta') {
                    currentText += chunk.textDelta
                }
                else if (chunk.type === 'tool-call') {
                    if (currentText.length > 0) {
                        blocks.push({
                            type: ContentBlockType.MARKDOWN,
                            markdown: currentText,
                        })
                        currentText = ''
                    }
                    blocks.push({
                        type: ContentBlockType.TOOL_CALL,
                        toolCallId: chunk.toolCallId,
                        toolCallType: isNil(metadata.logoUrl) ? ToolCallType.FLOW : ToolCallType.PIECE,
                        displayName: metadata.displayName,
                        name: chunk.toolName,
                        logoUrl: metadata.logoUrl,
                        status: ToolCallStatus.IN_PROGRESS,
                        startTime: new Date().toISOString(),
                        input: chunk.args,
                    })
                }
                else if (chunk.type === 'tool-result') {
                    const lastBlockIndex = blocks.findIndex((block) => block.type === ContentBlockType.TOOL_CALL && block.toolCallId === chunk.toolCallId)
                    const lastBlock = blocks[lastBlockIndex] as ToolCallContentBlock
                    assertNotNullOrUndefined(lastBlock, 'Last block must be a tool call')
                    blocks[lastBlockIndex] = {
                        type: ContentBlockType.TOOL_CALL,
                        toolCallId: lastBlock.toolCallId,
                        toolCallType: lastBlock.toolCallType,
                        displayName: lastBlock.displayName,
                        name: lastBlock.name,
                        logoUrl: lastBlock.logoUrl,
                        status: ToolCallStatus.COMPLETED,
                        startTime: lastBlock.startTime,
                        endTime: new Date().toISOString(),
                        input: lastBlock.input,
                        output: chunk.result,
                    }
                }
                // TODO UPDATE
            }
            if (currentText.length > 0) {
                blocks.push({
                    type: ContentBlockType.MARKDOWN,
                    markdown: currentText,
                })
            }
            // TODO UPDATE

            return agentOutputUtils.findAgentResult({
                todoId: todo.body.id,
                content: blocks,
            })
        }
        finally {
            await agentToolInstance.close()
        }
    }

}

function constructSystemPrompt(agent: Agent) {
    return `
    You are an autonomous assistant designed to efficiently achieve the user's goal.

    YOU MUST ALWAYS call the mark as complete tool with the output or message wether you have successfully completed the task or not.
    
    **Today's Date**: ${new Date().toISOString()}  
    Use this to interpret time-based queries like "this week" or "due tomorrow."

    ---
    ${agent.systemPrompt}
    `
}

type ExecuteAgent = {
    agentId: string
    prompt: string
    apiUrl: string
    todoId: string
    serverToken: string
    publicUrl: string
    flowId: string
    runId: string
}