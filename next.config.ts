import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DuckDB (used by Mastra's observability storage) ships native .node bindings
  // that the bundler can't resolve; load them from node_modules at runtime.
  serverExternalPackages: ["@mastra/duckdb", "@duckdb/node-api", "@duckdb/node-bindings"],
};

export default nextConfig;
