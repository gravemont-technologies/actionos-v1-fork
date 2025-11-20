import { tokenTracker } from "./tokenTracker.js";
import { retry } from "../utils/retry.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

type LLMRequest = {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  userId?: string | null; // Clerk user ID for token tracking
};

export interface LLMProvider {
  complete(request: LLMRequest): Promise<string>;
}

class OpenAIProvider implements LLMProvider {
  constructor(private apiKey: string, private model: string) {}

  async complete(request: LLMRequest): Promise<string> {
    const maxOutputTokens = request.maxTokens ?? 1000; // Increased default from 180 to 1000
    
    // Estimate tokens for this request
    const estimatedTokens = tokenTracker.estimateTokens(
      request.system,
      request.user,
      maxOutputTokens
    );

    // Check if we can use tokens (enforce 50,000 limit per user per day)
    const canUse = await tokenTracker.canUseTokens(request.userId ?? null, estimatedTokens);
    if (!canUse) {
      const usage = await tokenTracker.getUsage(request.userId ?? null);
      throw new Error(
        `Token limit exceeded: Cannot use ${estimatedTokens} tokens. Current usage: ${usage.used}/${usage.limit} (${usage.percentage}%). Remaining: ${usage.remaining} tokens.`
      );
    }

    // Wrap OpenAI API call with retry logic
    const payload = await retry(
      async () => {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            temperature: request.temperature ?? 0,
            max_tokens: maxOutputTokens,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: request.system },
              { role: "user", content: request.user },
            ],
          }),
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          
          // Format error into clear, actionable message
          const formattedError = formatOpenAIError(response.status, errorPayload);
          const error = new Error(formattedError);
          
          // Don't retry on 4xx errors (client errors)
          if (response.status >= 400 && response.status < 500) {
            logger.warn({ 
              status: response.status, 
              error: errorPayload,
              apiKeyPrefix: this.apiKey.substring(0, 7) + "...",
              model: this.model
            }, "LLM client error, not retrying");
            
            // Log specific guidance for permission issues
            if (response.status === 401) {
              const errorMessage = errorPayload?.error?.message || "Unknown error";
              logger.error({
                message: "OpenAI API authentication failed",
                formattedMessage: formattedError,
                keyPrefix: this.apiKey.substring(0, 7) + "...",
              }, "API key configuration issue");
            }
          }
          throw error;
        }

        const payload = await response.json();
        const content = payload?.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error("LLM response missing content");
        }

        return payload;
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
        retryable: (error) => {
          // Retry on network errors, timeouts, and 5xx errors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes("500") || message.includes("502") || message.includes("503") || message.includes("504")) {
              return true;
            }
            if (message.includes("timeout") || message.includes("network") || message.includes("econnrefused")) {
              return true;
            }
          }
          return false;
        },
      }
    );

    const content = payload?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("LLM response missing content");
    }

    // Record actual token usage from API response if available, otherwise use estimate
    const actualUsage = payload.usage?.total_tokens ?? estimatedTokens;
    await tokenTracker.recordUsage(request.userId ?? null, actualUsage);

    return content;
  }
}

class MockLLMProvider implements LLMProvider {
  async complete(): Promise<string> {
    const now = new Date().toISOString();
    return JSON.stringify({
      summary: "Focus on a tiny experiment to unlock momentum.",
      immediate_steps: [
        {
          step: "Schedule a 15-minute win and execute it today.",
          effort: "L",
          delta_bucket: "MEDIUM",
          confidence: "MED",
          est_method: "heuristic",
          TTI: "minutes",
        },
      ],
      strategic_lens: "Tackle friction via smallest reversible experiment.",
      top_risks: [
        { risk: "No follow-through", mitigation: "Timebox and public commit" },
      ],
      kpi: { name: "Step-1 completion rate", target: "≥35% weekly", cadence: "weekly" },
      micro_nudge: "Replace “maybe” with “decide by EOD”.",
      module: {
        name: "Action Guarantee",
        steps: ["Clarify friction", "Timebox experiment", "Report outcome"],
      },
      meta: {
        profile_id: "mock-profile",
        signature_hash: "mock-signature",
        cached: false,
        timestamp: now,
      },
    });
  }
}

/**
 * Formats OpenAI API errors into clear, actionable error messages
 */
function formatOpenAIError(status: number, errorPayload: any): string {
  const errorMessage = errorPayload?.error?.message || "Unknown error";
  const errorType = errorPayload?.error?.type || "unknown";
  
  // Handle 401 permission errors with specific guidance
  if (status === 401) {
    if (errorMessage.includes("model.request")) {
      return `OpenAI API Key Permission Error

Your API key is missing the required permissions to make model requests.

CAUSE: ${errorMessage.includes("organization") ? "Organization role issue" : "API key capability not enabled"}

FIX:
1. Check Organization Role: Go to https://platform.openai.com/org/settings
   - You need Writer or Owner role (Reader is insufficient)
   - Check both organization-level AND project-level roles

2. Check API Key Capabilities: Go to https://platform.openai.com/api-keys
   - Find your key starting with "${env.OPENAI_API_KEY?.substring(0, 7)}..."
   - Click "Edit" and enable "Chat completions (/v1/chat/completions)"
   - Or enable "All" capabilities

3. If using a restricted key, ensure it has Chat completions enabled

4. After making changes, wait 10-30 seconds and restart the server

For more help, see README.md troubleshooting section.`;
    }
    
    if (errorMessage.includes("Invalid API key") || errorMessage.includes("Incorrect API key")) {
      return `OpenAI API Key Invalid

The API key in your .env file is invalid or has been revoked.

FIX:
1. Check OPENAI_API_KEY in your .env file
2. Verify the key is correct (no extra spaces, quotes, or newlines)
3. Generate a new key at https://platform.openai.com/api-keys if needed
4. Restart the server after updating .env`;
    }
    
    return `OpenAI API Authentication Error (401)

${errorMessage}

Check your API key configuration and permissions. See README.md for troubleshooting.`;
  }
  
  // Handle 429 rate limit errors
  if (status === 429) {
    return `OpenAI API Rate Limit Exceeded

You've exceeded the rate limit for API requests.

FIX:
- Wait a few minutes before trying again
- Check your OpenAI usage limits at https://platform.openai.com/usage
- Consider upgrading your plan if this persists`;
  }
  
  // Handle 500+ server errors
  if (status >= 500) {
    return `OpenAI API Server Error (${status})

OpenAI's servers are experiencing issues.

FIX:
- Wait a few minutes and try again
- Check OpenAI status at https://status.openai.com
- If the problem persists, contact OpenAI support`;
  }
  
  // Generic error
  return `OpenAI API Error (${status})

${errorMessage}

Type: ${errorType}`;
}

function createProvider(): LLMProvider {
  // Use validated env config instead of direct process.env access
  const apiKey = env.OPENAI_API_KEY;
  if (apiKey) {
    const model = env.OPENAI_MODEL;
    logger.info({ model, keyPrefix: apiKey.substring(0, 7) + "..." }, "OpenAI provider initialized");
    return new OpenAIProvider(apiKey, model);
  }
  logger.warn("No OPENAI_API_KEY found, using mock provider");
  return new MockLLMProvider();
}

export const llmProvider = createProvider();

