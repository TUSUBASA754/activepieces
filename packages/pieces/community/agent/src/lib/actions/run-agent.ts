import { createAction, Property, PieceAuth } from '@activepieces/pieces-framework';
import { agentCommon } from '../common';
import { ExecutionType } from '@activepieces/shared';

enum EscalationMode {
  STOP = 'stop',
  IGNORE = 'ignore',
}

export const runAgent = createAction({
  name: 'run_agent',
  displayName: 'Run Agent',
  description: 'Run the AI assistant to complete your task.',
  auth: PieceAuth.None(),
  errorHandlingOptions: {
    retryOnFailure: {
      hide: true,
    },
    continueOnFailure: {
      hide: true,
    },
  },
  props: {
    agentId: Property.Dropdown({
      displayName: 'Agent',
      description: 'Select agent created',
      required: true,
      refreshers: [],
      options: async (_auth, ctx) => {
        const agentPage = await agentCommon.listAgents({
          apiUrl: ctx.server.apiUrl,
          token: ctx.server.token,
        })
        return {
          disabled: false,
          options: agentPage.body.data.map((agent) => {
            return {
              label: agent.displayName,
              value: agent.id,
            };
          }),
        }
      },
    }),
    prompt: Property.LongText({
      displayName: 'Prompt',
      description: 'Describe what you want the assistant to do.',
      required: true,
    }),
    escalation: Property.StaticDropdown<EscalationMode>({
      displayName: 'Escalation',
      description: 'The behavior when the agent fails to complete the task.',
      required: true,
      options: {
        options: [
          {
            label: 'Stop the flow',
            value: EscalationMode.STOP,
          },
          {
            label: 'Ignore and continue',
            value: EscalationMode.IGNORE,
          },
        ],
      },
      defaultValue: EscalationMode.STOP,
    }),
  },
  async run(context) {
    const { agentId, prompt, escalation } = context.propsValue
    const serverToken = context.server.token;

    if(context.executionType === ExecutionType.BEGIN) {
      const agent = await agentCommon.getAgent({
        apiUrl: context.server.apiUrl,
        token: serverToken,
        id: agentId,
      })
    }


  },
});
