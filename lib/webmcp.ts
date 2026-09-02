type Tool = {
  name: string; title: string; description: string; inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown | Promise<unknown>;
};
type Registry = { registerTool: (tool: Tool, options?: { signal: AbortSignal }) => void | Promise<void> };
export type GameActions = {
  read: () => object;
  start: () => void;
  control: (action: 'left' | 'right' | 'pause' | 'resume') => void;
};

function validateObject(input: unknown, keys: string[]) {
  if (!input || typeof input !== 'object' || Array.isArray(input)
    || Object.keys(input).some((key) => !keys.includes(key))) {
    throw new Error('Expected an object with only the declared input fields.');
  }
  return input as Record<string, unknown>;
}

export function registerGameTools(actions: GameActions) {
  const context = (document as Document & { modelContext?: Registry }).modelContext;
  if (!context?.registerTool) return () => {};
  const lifecycle = new AbortController();
  const emptySchema = { type: 'object', properties: {}, additionalProperties: false };
  const tools: Tool[] = [
    {
      name: 'get_neon_dodge_state', title: 'Read game state',
      description: 'Read the visible Neon Dodge round state, lane, score, lives and approaching objects.',
      inputSchema: emptySchema, annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) { validateObject(input, []); return actions.read(); },
    },
    {
      name: 'start_neon_dodge_round', title: 'Start a new round',
      description: 'Start or restart a 60-second round, resetting the current round score and lives.',
      inputSchema: emptySchema, annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) { validateObject(input, []); actions.start(); return actions.read(); },
    },
    {
      name: 'control_neon_dodge', title: 'Move or pause the game',
      description: 'Move one lane left or right during play, or explicitly pause/resume the current round.',
      inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['left', 'right', 'pause', 'resume'] } }, required: ['action'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const { action } = validateObject(input, ['action']);
        if (action !== 'left' && action !== 'right' && action !== 'pause' && action !== 'resume') {
          throw new Error('action must be left, right, pause or resume.');
        }
        actions.control(action);
        return actions.read();
      },
    },
  ];
  for (const tool of tools) {
    try {
      void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {
        // Optional browser capability: the visible game remains usable if registration fails.
      });
    } catch {
      // Unsupported/partial implementations must never prevent normal gameplay.
    }
  }
  return () => lifecycle.abort();
}
