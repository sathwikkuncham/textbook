/**
 * Single source of truth for model selection across all agents.
 *
 * Per product directive: every agent uses the PRO model. Flash is insufficient
 * for the quality bar we're after. The FLASH constant is kept only as a
 * backward-compat alias pointing to PRO — do not treat FLASH as a lower tier.
 */
export const MODELS = {
  PRO: "gemini-3.1-pro-preview",
  FLASH: "gemini-3.1-pro-preview",
} as const;
