import { afterAll, describe, expect, it } from "vitest";
import { rmSync } from "node:fs";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { MastraCompositeStore } from "@mastra/core/storage";
import { PROJECT_THREAD_KIND, projectStateSchema } from "./schema";

const DB = "file:/tmp/kessel-run-store-test.db";

const memory = new Memory({
  storage: new MastraCompositeStore({
    id: "test-store",
    default: new LibSQLStore({ id: "store-test", url: DB }),
  }),
  options: {
    workingMemory: { enabled: true, scope: "thread", schema: projectStateSchema },
  },
});

afterAll(() => {
  rmSync("/tmp/kessel-run-store-test.db", { force: true });
});

describe("project threads", () => {
  it("round-trips a project thread and its metadata", async () => {
    const thread = await memory.createThread({
      resourceId: "user-1",
      title: "Agents at agencies",
      metadata: {
        kind: PROJECT_THREAD_KIND,
        publication: "The Newsletter",
        format: "article",
        pinnedSkill: null,
      },
    });

    expect(thread.metadata?.kind).toBe(PROJECT_THREAD_KIND);

    const { threads } = await memory.listThreads({
      filter: { resourceId: "user-1", metadata: { kind: PROJECT_THREAD_KIND } },
      perPage: false,
    });
    expect(threads.map(t => t.id)).toContain(thread.id);
  });

  it("does not return another resource's projects", async () => {
    await memory.createThread({
      resourceId: "user-2",
      title: "Someone else's piece",
      metadata: {
        kind: PROJECT_THREAD_KIND,
        publication: "Other",
        format: "thread",
        pinnedSkill: null,
      },
    });

    const { threads } = await memory.listThreads({
      filter: { resourceId: "user-1", metadata: { kind: PROJECT_THREAD_KIND } },
      perPage: false,
    });
    expect(threads.every(t => t.resourceId === "user-1")).toBe(true);
  });

  it("round-trips working memory as a JSON string", async () => {
    const thread = await memory.createThread({
      resourceId: "user-1",
      title: "WM test",
      metadata: {
        kind: PROJECT_THREAD_KIND,
        publication: "P",
        format: "article",
        pinnedSkill: null,
      },
    });

    await memory.updateWorkingMemory({
      threadId: thread.id,
      resourceId: "user-1",
      workingMemory: JSON.stringify({
        currentStage: 1,
        researchBrief: null,
        anchor: {
          idea: "Agents make agency devs more essential",
          publication: "The Newsletter",
          format: "article",
          audience: "Agency developers",
          goal: "Understand why",
          framing: "contrarian",
          missionAlignment: "Real outcomes",
          keySourceMaterial: "Marriott project",
          scopeNotes: "One piece",
        },
        ideationMap: null,
        hook: null,
        beatMap: null,
        draft: null,
        personalizationNotes: null,
        polishScorecard: null,
      }),
    });

    const raw = await memory.getWorkingMemory({
      threadId: thread.id,
      resourceId: "user-1",
    });
    expect(raw).toBeTruthy();
    const parsed = projectStateSchema.parse(JSON.parse(raw as string));
    expect(parsed.currentStage).toBe(1);
    expect(parsed.anchor?.framing).toBe("contrarian");
  });

  it("returns null working memory for a project never written to", async () => {
    const thread = await memory.createThread({
      resourceId: "user-1",
      title: "Fresh",
      metadata: {
        kind: PROJECT_THREAD_KIND,
        publication: "P",
        format: "article",
        pinnedSkill: null,
      },
    });

    const raw = await memory.getWorkingMemory({
      threadId: thread.id,
      resourceId: "user-1",
    });
    expect(raw).toBeNull();
  });
});
