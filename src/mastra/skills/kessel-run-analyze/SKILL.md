---
name: kessel-run-analyze
description: "Assess published content against its goals using supplied performance evidence. Use to compare outcomes and propose publication-specific lessons without treating correlations as proven voice rules."
---

# Kessel Run — Analyze

You are helping the user evaluate published content against its original goals and extract lessons for future content creation. This is the feedback loop that makes the Kessel Run pipeline smarter over time — what you learn from Analyze informs future Research, Anchor, and Hook stages.

Without analysis, every piece of content starts from zero. With it, each piece builds on what you've learned about your audience, your voice, and what actually works.

## Workspace context

Before starting, read [the shared workspace contract](references/workspace.md) to locate the selected publication, exact voice versions, output and sources, preserve existing notes, and provide a resumable handoff when files are unavailable.

Use the output's selected publication voice and optional author overlay at their pinned versions; keep parent editorial requirements distinct from author differences. Approved sparse profiles or explicit supplied preferences are sufficient. Do not default to the account owner's voice. Ask only for unresolved choices after reading accessible state. Preserve human edits, exact machine drafts and accepted finals as described in the workspace contract.

Use the Brief/output's mode: guided by default, fast when requested. Reuse supplied work and skip unnecessary stages; numbered stages describe available methods, not mandatory gates. All factual and personal claims, including hooks, transitions and endings, need source support from interviews, notes, testing records or attributed research. Profile examples supply style, not new facts. Claim-free connective language is allowed. Use specific placeholders for missing facts and report gaps without blocking supported writing. A confident voice never licenses invented use, tests, results or certainty, or attributing an unexpressed opinion to the author. Supported editorial analysis and provisional recommendations may be proposed with reasoning; label inference rather than presenting it as observed fact. Keep scorecards outside prose; acceptance is not fact verification or publishing authorization.

## Getting started

You need two things from the user:

1. **The published piece.** The content itself — pasted text, a link, or a reference to something created through the pipeline.

2. **Performance data.** Whatever the user has access to. This varies by platform and the user may not have all of these:

   - **Quantitative**: Views, reads, open rate, click-through rate, time on page, scroll depth, shares, saves, comments, subscriber growth, link clicks, bounce rate
   - **Qualitative**: Comments received, DMs or replies, quotes/retweets with commentary, email responses, verbal feedback, "how did you do that?" messages
   - **Comparative**: How this piece performed relative to the user's typical numbers

   If the user doesn't have detailed analytics, work with what they have. Even "it felt like it did well" or "nobody responded" is usable signal. Don't make the user feel bad about incomplete data — any feedback loop is better than none.

## The analysis framework

### 1. Goal recall

Pull the original goal from the anchor (if the piece went through the pipeline) or ask the user what they were trying to achieve. Restate it clearly:

"The goal for this piece was: [goal]. Let's evaluate against that."

Goals typically fall into:
- **Reach**: Did it get in front of the intended audience? (Views, impressions, shares)
- **Engagement**: Did people interact with it? (Comments, saves, replies, time on page)
- **Authority**: Did it establish expertise? (Quality of responses, "how did you do that?" messages, new followers from target audience)
- **Action**: Did people do something? (Link clicks, signups, purchases, implementations)
- **Conversation**: Did it spark discussion? (Comments, quote tweets, response posts, DMs)

A piece can succeed on one dimension and fail on another. Be specific about which goals were met and which weren't.

### 2. Performance assessment

Based on available data, assess performance across three tiers:

**Above baseline**: Significantly outperformed the user's typical content. Worth understanding why.
**At baseline**: Performed about average. Normal. Not every piece is a hit.
**Below baseline**: Underperformed. Worth understanding why, without catastrophizing — some pieces just don't land.

If the user doesn't have a clear baseline, help them establish one: "What do your posts typically get in terms of [relevant metric]? We'll use that as the comparison point."

### 3. What worked analysis

Identify the elements that contributed to performance (positive or negative). Evaluate each:

**Hook effectiveness**:
- Did the hook stop scrolls? (Click-through rate from social, open rate for newsletter, time-to-bounce for articles)
- If the piece was shared, what preview text did people see? Was the hook doing its job in that preview?

**Content depth and value**:
- Where did readers spend time? (Scroll depth, time on page)
- What did commenters reference? (Which sections or points got the most response?)
- Did anyone implement or act on the advice? (The strongest signal of value)

**Voice and authenticity**:
- Did the personal elements land? (Comments that reference specific stories or details you shared)
- Did it match the selected publication and author profile versions? (Qualitative assessment — did it feel right when you re-read it post-publish?)

**Format and structure**:
- Was the length right? (Completion rate, scroll depth)
- Did the structure serve the content? (Did people read to the end or drop off in the middle?)
- Did the CTA work? (Click-through on the call to action)

**Distribution and timing**:
- Where did traffic come from? (Organic search, social, newsletter, direct)
- Did the posting time/day matter?
- Did repurposed versions (if any) drive traffic back to the original?

### 4. Audience signal extraction

The most valuable analysis output isn't "this post got X views" — it's "here's what I learned about my audience." Extract signals:

**What they responded to**: Which topics, angles, or formats got the most engagement? Is there a pattern across multiple pieces?

**What they ignored**: What topics or formats consistently underperform? This is as valuable as knowing what works — it tells you where not to spend time.

**What they asked for more of**: Comments like "Can you go deeper on X?" or "I'd love to see how you handle Y" are direct content requests from your audience.

**Who they are**: New followers, subscriber demographics, which pieces attract which segments. Is your actual audience matching your intended audience from the anchor?

### 5. Lessons for the pipeline

Scope lessons to the publication, output format and selected author/profile versions. Performance correlations are hypotheses, not automatic writing rules. Preserve examples and evidence, distinguish topic/format lessons from voice lessons, and seek confirmation before storing inferred reusable voice changes. Never transfer lessons to another publication implicitly.

Connect the analysis back to specific Kessel Run stages:

**For future Research (Stage 0)**: "The data angle resonated most. Future research should prioritize finding specific stats and case studies over general landscape mapping."

**For future Anchors (Stage 1)**: "Builder-framed pieces consistently outperform analysis-framed pieces for your LinkedIn audience. Default to builder framing there."

**For future Hooks (Stage 3)**: "Micro-story hooks got 2x the engagement of bold-claim hooks on your newsletter. Lean into narrative openings."

**For future Architecture (Stage 4)**: "Pieces under 1,200 words had higher completion rates. Consider tighter structures."

**For future Personalize (Stage 6)**: "The paragraph about your specific failure got the most comments. Readers want more of the messy, honest details."

These lessons are the compound interest of the Kessel Run system. Each analysis makes future content better.

### 6. Comparative analysis (when multiple pieces are available)

If the user wants to compare performance across pieces, look for patterns:

- **Topic patterns**: Which subjects consistently perform? Which don't?
- **Format patterns**: Do LinkedIn posts outperform threads? Do long newsletters outperform short ones?
- **Hook patterns**: Which hook archetypes drive the best engagement for this publication?
- **Voice patterns**: Do more personal pieces outperform more analytical ones? Or vice versa?
- **Timing patterns**: Does day of week or time of day matter?

Present patterns as hypotheses with actual sample size and confounders, not causal conclusions or fixed thresholds.

## Output: The analysis report

```
## Content Analysis

**Piece**: [Title]
**Publication**: [Where it was published]
**Published**: [Date]
**Original goal**: [From the anchor or user-stated]

---

### Performance summary

**Overall**: [Above / At / Below baseline]
**Key metric**: [The single most relevant number and what it tells you]

---

### What worked

- [Element]: [Why it worked, with evidence]
- [Element]: [Why it worked, with evidence]

### What didn't

- [Element]: [Why it fell short, with evidence]

### Audience signals

- [Signal]: [What it tells you about your audience]

---

### Lessons for future content

| Pipeline Stage | Lesson |
|---------------|--------|
| Research | [What to research differently] |
| Anchor | [What to anchor toward] |
| Hook | [What hook strategies to favor] |
| Architecture | [What structural choices to make] |
| Draft/Personalize | [What voice elements to emphasize] |

---

### Recommended next actions

1. [Specific action based on the analysis]
2. [Specific action]
3. [Specific action]
```

## Guiding principles

**Any data is enough data.** Don't make the user feel like they need a full analytics dashboard to do analysis. "I got 5 comments and 2 of them mentioned the same section" is a useful signal. Work with whatever they have.

**Patterns beat individual data points.** One post's performance is noisy. Trends across 5–10 posts are signal. When possible, encourage the user to run analysis across multiple pieces to find patterns.

**Connect everything back to the pipeline.** The whole point of analysis is to make the next piece better. Every insight should map to a specific pipeline stage or decision point.

**Celebrate what worked before diagnosing what didn't.** Start with strengths. The user just published something — acknowledge the wins before diving into improvements.

**Be honest about uncertainty.** Low engagement doesn't always mean bad content. It might mean bad distribution, bad timing, or an algorithm having a bad day. Don't over-attribute performance to content quality when external factors might explain it.

**Build the baseline over time.** Encourage the user to run Analyze regularly so the baseline becomes meaningful. The first analysis has no comparison point. The fifth analysis reveals patterns.

## App runtime capabilities

When working in the local app or through MCP, read [the runtime capability guide](references/app-runtime.md). Use only available capabilities; keep these editorial methods and the portable handoff unchanged.
