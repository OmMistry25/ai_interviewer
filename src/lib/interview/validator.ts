import { templateConfigSchema, TemplateConfig } from "@/types/template";

export function validateTemplateConfig(config: unknown): TemplateConfig {
  const result = templateConfigSchema.safeParse(config);
  
  if (!result.success) {
    const errors = result.error.issues
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    throw new Error(`Invalid template config: ${errors}`);
  }
  
  return result.data;
}

