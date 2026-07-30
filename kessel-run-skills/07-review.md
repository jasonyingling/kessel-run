---
name: kessel-run-review
description: "Standalone Kessel Run skill: checks whether published content is still accurate, relevant, and serving its audience over time. Use this skill when the user wants to audit old content for freshness, check if a post from months ago still holds up, decide whether to update or retire a piece, review a content library for outdated material, or maintain evergreen quality. Also trigger when the user says things like 'is this still accurate,' 'should I update this post,' 'review my old content,' 'what needs refreshing,' 'content audit,' 'is this still relevant,' or 'check this piece for me.' This is the long-term maintenance skill — run it quarterly or whenever the landscape shifts."
---

# Kessel Run — Review

You are helping the user evaluate whether published content is still accurate, relevant, and worth keeping live. Content has a shelf life. Facts change, tools evolve, opinions shift, and what was a fresh take six months ago might be conventional wisdom now — or outright wrong.

This is the long-term maintenance skill. Run it against individual pieces or across a content library. The goal is to keep published content trustworthy and useful over time, and to identify opportunities to update, expand, or retire pieces.

## Getting started

The user may approach this in two ways:

**Single piece review**: "Is this post still good?" — They have a specific piece they want to check. Read it, evaluate it, and give a verdict.

**Library audit**: "What needs refreshing?" — They want to scan across multiple published pieces and prioritize what needs attention. Work through them systematically.

For either approach, you need the content itself and when it was published. If available, the original anchor (topic, audience, goal) provides useful context for evaluating whether the piece still serves its purpose.

## The review framework

Evaluate each piece across five lenses. Not every lens applies to every piece — skip what's irrelevant.

### 1. Factual accuracy

Has anything stated as fact become incorrect since publishing?

Search for and check:
- **Statistics and data points.** Are the numbers still current? Have newer studies superseded the ones cited?
- **Tool and product references.** Do the tools mentioned still exist? Have they changed significantly? Have better alternatives emerged?
- **Process and workflow descriptions.** Does the described process still work? Have APIs, interfaces, or methods changed?
- **People and organizations.** Are referenced people still in the roles described? Have organizations changed direction?
- **Links.** Are the linked sources still live and still saying what they said? (Link rot is real.)

**Verdict options:**
- **Accurate**: Everything checks out. No updates needed.
- **Minor corrections needed**: 1–2 details are outdated but the core content holds. Quick fixes.
- **Significant updates required**: Multiple facts are outdated or a key claim is no longer true. Needs a rewrite of affected sections.
- **Fundamentally outdated**: The premise of the piece is no longer valid. Consider retiring or doing a complete rewrite.

For each inaccuracy found, note what changed and suggest the specific correction.

### 2. Relevance

Does the audience still care about this topic in this frame?

Consider:
- **Has the conversation moved on?** A piece about "should you use AI for coding?" was relevant in 2024. By 2026, the question has shifted to "how should you use AI for coding?" The original framing might feel dated even if the facts are correct.
- **Has the audience changed?** If the user's audience has grown more sophisticated, beginner-level content may no longer serve them. Or vice versa — new audience members may need the fundamentals.
- **Has the competitive landscape shifted?** If ten other people have published better versions of this take, the piece may no longer differentiate. It might need a sharper angle or additional depth.
- **Is the topic seasonal or evergreen?** Some content has natural shelf lives (event coverage, trend analysis). Evergreen content should stay useful indefinitely if maintained.

**Verdict options:**
- **Still relevant**: The topic, framing, and depth still serve the audience.
- **Needs reframing**: The core content is valuable but the angle or framing feels dated. Consider updating the hook, intro, and framing while keeping the substance.
- **Superseded**: Better content exists (either from the user or others). Consider updating to reclaim the territory or redirecting to the better piece.
- **Expired**: The topic is no longer relevant to the audience. Consider retiring or archiving.

### 3. Voice consistency

Does the piece still sound like the author?

Writers evolve. The user's voice six months ago may differ from their voice today. Check:
- Does the piece match the current publication voice profile?
- Are there patterns or phrases the user has since abandoned?
- Does it feel like the same author who's publishing now?

This lens matters most for pieces that get ongoing traffic (evergreen blog posts, portfolio pieces). If new readers discover an old piece that sounds nothing like the author's current work, it creates a disconnect.

**Verdict options:**
- **Consistent**: Reads like current work.
- **Minor drift**: A few phrases or patterns feel slightly off from current voice. Optional cleanup.
- **Significant drift**: Reads like a different author. Consider a voice-update pass if the piece still gets traffic.

### 4. Performance trajectory

Is this piece still doing its job?

If the user has analytics:
- **Traffic trend**: Is traffic to this piece increasing, stable, or declining?
- **Engagement**: Are new comments or shares still coming in?
- **Search performance**: Is it ranking for target keywords? Has ranking dropped?
- **Conversion**: If the piece has a CTA, is it still driving action?

A piece with declining traffic might need an update to recapture search ranking. A piece with stable traffic but outdated content is actively misinforming readers and needs priority attention.

If the user doesn't have analytics, skip this lens or work with qualitative impressions.

### 5. Update opportunity

Could this piece become significantly better with what you know now?

Sometimes the best reason to revisit old content isn't that it's wrong — it's that you've learned things since publishing that would make it much stronger:

- New personal experiences that add evidence or stories
- New data that strengthens (or challenges) the original thesis
- Reader feedback that reveals gaps or questions the piece didn't address
- New tools, techniques, or developments that extend the piece's value
- A follow-up angle that could be added as a new section

**Verdict options:**
- **Strong as-is**: No significant improvement opportunity.
- **Updatable**: Specific additions would meaningfully improve the piece. Worth the time.
- **Rewrite candidate**: The core idea is still good but the execution could be dramatically better with current knowledge and skill. Consider a ground-up rewrite rather than patches.

## Output: The review verdict

For a single piece:

```
## Content Review

**Piece**: [Title]
**Published**: [Date]
**Age**: [How long ago]
**Publication**: [Where]

---

### Verdicts

| Lens | Verdict | Priority |
|------|---------|----------|
| Factual accuracy | [Verdict] | [High/Medium/Low/None] |
| Relevance | [Verdict] | [High/Medium/Low/None] |
| Voice consistency | [Verdict] | [High/Medium/Low/None] |
| Performance trajectory | [Verdict or N/A] | [High/Medium/Low/None] |
| Update opportunity | [Verdict] | [High/Medium/Low/None] |

---

### Overall recommendation

[One of: No action needed | Minor updates | Significant update | Rewrite | Retire]

### Specific actions

[For each lens that isn't "no action," list the specific changes needed:]

1. [Action]: [What to change and why]
2. [Action]: [What to change and why]

### Timeline suggestion

[Based on priority: "Update within a week" / "Add to next month's content plan" / "Low priority, update when convenient" / "Retire now — it's actively misleading"]
```

For a library audit, present a summary table:

```
## Content Library Audit

**Pieces reviewed**: [Count]
**Date range**: [Oldest to newest]

| Piece | Age | Accuracy | Relevance | Recommendation | Priority |
|-------|-----|----------|-----------|----------------|----------|
| [Title] | [Age] | [Verdict] | [Verdict] | [Action] | [H/M/L] |

### Top priorities

1. [Piece]: [Why it needs attention first]
2. [Piece]: [Why]
3. [Piece]: [Why]
```

## Guiding principles

**Accuracy is non-negotiable.** A piece that contains outdated facts is worse than no piece at all. It erodes trust. Accuracy issues are always the highest priority fix.

**Relevance is a judgment call.** Unlike accuracy, relevance is subjective. A piece the user considers outdated might still serve new readers discovering it for the first time. Present your assessment but let the user decide.

**Don't audit for the sake of auditing.** Focus review time on pieces that get traffic, pieces that represent the user's current expertise, and pieces linked from other content. A low-traffic post from two years ago that nobody reads can stay as-is unless it's actively wrong.

**Updates beat rewrites when possible.** A 30-minute update to an existing piece is almost always a better investment than a 3-hour rewrite — unless the original execution is so far from current standards that patches won't help.

**Retiring content is okay.** Not everything needs to live forever. If a piece is outdated, irrelevant, and getting no traffic, retiring or archiving it is a legitimate choice. The user's published content is a portfolio — curation matters.

**Use web search proactively.** When checking factual accuracy, search for the current state of referenced tools, stats, and claims. Don't rely on your training data for recency — verify.
