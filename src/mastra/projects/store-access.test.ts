import { afterAll, describe, expect, it, vi } from "vitest";
import { rmSync } from "node:fs";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { MastraCompositeStore } from "@mastra/core/storage";
import { projectStateSchema } from "./schema";

const DB_FILE = "/tmp/kessel-run-store-access-test.db";

const testMemory = new Memory({
  storage: new MastraCompositeStore({
    id: "access-test-store",
    default: new LibSQLStore({ id: "access-test", url: `file:${DB_FILE}` }),
  }),
  options: {
    workingMemory: { enabled: true, scope: "thread", schema: projectStateSchema },
  },
});

// store.ts imports `mastra` from ../index, which constructs the DuckDB
// observability store. Stub it with the minimal surface store.ts actually
// uses, so these tests exercise the real store logic against real storage
// without booting all of Mastra.
vi.mock("../index", () => ({
  mastra: {
    getAgentById: () => ({ getMemory: async () => testMemory }),
  },
}));

const { createProject, getProject, getProjectState, listProjects } =
  await import("./store");

afterAll(() => {
  rmSync(DB_FILE, { force: true });
});

describe("getProject ownership", () => {
  it("returns the project to its owner", async () => {
    const created = await createProject({
      resourceId: "owner",
      title: "Mine",
      publication: "P",
      format: "article",
    });

    const found = await getProject("owner", created.id);
    expect(found?.id).toBe(created.id);
    expect(found?.title).toBe("Mine");
  });

  it("returns null for a different resourceId", async () => {
    const created = await createProject({
      resourceId: "owner",
      title: "Private",
      publication: "P",
      format: "article",
    });

    // The attacker knows the exact project id and is still refused.
    expect(await getProject("intruder", created.id)).toBeNull();
  });

  it("returns null for an id that does not exist", async () => {
    expect(await getProject("owner", "no-such-thread")).toBeNull();
  });
});

describe("listProjects isolation", () => {
  it("returns only the caller's projects", async () => {
    await createProject({
      resourceId: "alice",
      title: "Alice piece",
      publication: "P",
      format: "article",
    });
    await createProject({
      resourceId: "bob",
      title: "Bob piece",
      publication: "P",
      format: "thread",
    });

    const alices = await listProjects("alice");
    expect(alices.length).toBeGreaterThan(0);
    expect(alices.every(p => p.title !== "Bob piece")).toBe(true);
  });
});

describe("getProjectState", () => {
  it("returns the empty state for a project never written to", async () => {
    const created = await createProject({
      resourceId: "owner",
      title: "Fresh",
      publication: "P",
      format: "article",
    });

    const state = await getProjectState("owner", created.id);
    expect(state.currentStage).toBeNull();
    expect(state.anchor).toBeNull();
  });
});
