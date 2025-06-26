import { PopulatedTodo, CreateTodoRequestBody, AGENT_STATUS_OPTIONS, CreateTodoActivityRequestBody, UpdateTodoRequestBody } from '@activepieces/shared';
import { HttpMethod, AuthenticationType, httpClient } from '@activepieces/pieces-common';
import { generateText } from 'ai';
import { agentCommon } from './common';

export const agentTodos = {
    async createTodo(params: CreateTodoParams) {
        const title = await generateTitle(params.description, params.apiUrl, params.serverToken)
        const requestBody: CreateTodoRequestBody = {
            title,
            description: params.description ?? '',
            statusOptions: AGENT_STATUS_OPTIONS,
            flowId: params.flowId,
            runId: params.runId,
            assigneeId: undefined,
            resolveUrl: undefined
        };
        return await httpClient.sendRequest<PopulatedTodo>({
            method: HttpMethod.POST,
            url: `${params.publicUrl}v1/todos`,
            body: requestBody,
            authentication: {
                type: AuthenticationType.BEARER_TOKEN,
                token: params.serverToken,
            },
        });
    },
    async createComment(params: CreateCommentParams) {
        return await httpClient.sendRequest<PopulatedTodo>({
            method: HttpMethod.POST,
            url: `${params.publicUrl}v1/todos/${params.todoId}/activities`,
            body: params.requestBody,
            authentication: {
                type: AuthenticationType.BEARER_TOKEN,
                token: params.serverToken,
            },
        });
    },
    async updateActivity(params: UpdateActivityParams) {
        return await httpClient.sendRequest<PopulatedTodo>({
            method: HttpMethod.PUT,
            url: `${params.publicUrl}v1/todos/${params.todoId}`,
            body: params.requestBody,
        });
    }
}


type UpdateActivityParams = {
    publicUrl: string;
    todoId: string;
    requestBody: UpdateTodoRequestBody;
}

type CreateCommentParams = {
    serverToken: string;
    publicUrl: string;
    todoId: string;
    requestBody: CreateTodoActivityRequestBody;
}


async function generateTitle(prompt: string, apiUrl: string, token: string) {
    const model = await agentCommon.initializeOpenAIModel({ apiUrl, token })
    const result = await generateText({
        model,
        prompt: `
        You are a helpful assistant that generates concise, clear, and relevant todo titles based on user descriptions. Only return the title, nothing else.
        User description: ${prompt}
        `,
    })
    return result.text
}

type CreateTodoParams = {
    apiUrl: string;
    description: string;
    serverToken: string;
    publicUrl: string
    flowId: string
    runId: string
}