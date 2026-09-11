export type AIProviderName="openai"|"gemini";
export type AIRequest={prompt:string;studentId?:string;action?:"read"|"draft_training"|"summarize"};
export type AIResult={text:string;provider:AIProviderName};
export interface AIProvider{readonly name:AIProviderName;generate(input:AIRequest):Promise<AIResult>}
export function configuredProvider():AIProviderName|null{if(process.env.OPENAI_API_KEY)return"openai";if(process.env.GEMINI_API_KEY)return"gemini";return null}
export function assertSafeAIRequest(input:AIRequest){if(!input.prompt.trim()||input.prompt.length>6000)throw new Error("INVALID_AI_REQUEST");if(input.action&&!(["read","draft_training","summarize"] as const).includes(input.action))throw new Error("UNSUPPORTED_AI_ACTION")}
