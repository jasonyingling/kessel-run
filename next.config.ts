import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DuckDB (used by Mastra's observability storage) ships native .node bindings
  // that the bundler can't resolve; load them from node_modules at runtime.
  serverExternalPackages: ["@mastra/duckdb", "@duckdb/node-api", "@duckdb/node-bindings"],
  // Kessel Run skills are markdown read from disk at request time, so the
  // bundler never sees an import for them. Trace them explicitly or a deployed
  // build starts with no skills loaded.
  outputFileTracingIncludes: {
    "/api/**": ["./src/mastra/skills/**/*.md"],
  },
};

export default nextConfig;
