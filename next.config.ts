import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  serverExternalPackages: [
    "openai",
    "@anthropic-ai/sdk",
    "groq-sdk",
    "@google/generative-ai",
    "@mistralai/mistralai",
  ],
};

export default nextConfig;
