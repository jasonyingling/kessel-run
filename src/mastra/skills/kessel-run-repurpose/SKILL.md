---
name: kessel-run-repurpose
description: "Standalone Kessel Run skill: adapts existing content into other formats. Use this skill when the user wants to turn an article into a LinkedIn post, create a thread from a blog post, generate social posts from a newsletter, extract a video script from written content, create an email summary from a published piece, or generate any cross-format adaptation. Also trigger when the user says things like 'turn this into a LinkedIn post,' 'make a thread from this,' 'repurpose this,' 'I need a social version of this,' 'adapt this for Twitter,' or 'create a video script from this article.' Works with any content — does not require the Kessel Run pipeline. Feed it anything and tell it what format you want out."
---

# Kessel Run — Repurpose

You are helping the user adapt existing content into a different format. This is a standalone skill — the content may have come through the Kessel Run pipeline or it may be something the user wrote independently, a talk transcript, a podcast summary, or even someone else's content they want to respond to.

Repurposing is not summarizing. It's re-entering the content through the target format's lens and rebuilding it for how that format is consumed. A LinkedIn post about the same topic as a blog post should feel like it was conceived for LinkedIn, not extracted from a blog.

## Workspace context

Before starting, read [the shared workspace contract](references/workspace.md) to locate the selected publication, exact voice versions, output and sources, preserve existing notes, and provide a resumable handoff when files are unavailable.

## Getting started

You need two things:

1. **The source content.** The user provides the original piece — pasted text, a link, a document, or a description of what they published. Read it fully. Identify the core insight, the strongest supporting points, the best story moments, and the most quotable lines.

2. **The target format(s).** What does the user want to create? They may want one format or several. Ask if they have a publication profile for the target format — if they do, apply its voice, audience, and constraints.

## Target formats and how to adapt

Each format has its own consumption pattern, structural norms, and audience expectations. Don't just compress or expand — restructure.

### LinkedIn post

**Consumption pattern**: Hook must stop a fast scroll. Whitespace matters — short paragraphs, line breaks. Most readers see only the first 2–3 lines before "see more." Mobile-first.

**Adaptation approach**:
- Extract the single most compelling insight from the source content. One insight, not a summary of all of them.
- Write a new hook optimized for the LinkedIn scroll — this may be different from the original article's hook. What works in a newsletter opening doesn't always work in a feed.
- Structure: Hook (1–2 lines) → Context (2–3 lines) → Core insight (the bulk) → Takeaway (1–2 lines) → Engagement prompt (1 line).
- Target 150–300 words. Anything over 300 is pushing it for LinkedIn engagement.
- If the source has a strong personal story, lead with that. LinkedIn rewards personal-professional narrative.
- End with a genuine question or invitation, not a hollow "Thoughts?" The engagement prompt should relate to the specific content.

**Generate 2 variants**: One that leads with the insight, one that leads with a story moment. Let the user pick.

### Twitter/X thread

**Consumption pattern**: Each post must stand alone AND build on the previous. Readers drop off at every post boundary. First post does all the heavy lifting.

**Adaptation approach**:
- Post 1 is a standalone hook. If someone only reads this post, they should get value and want more. Front-load the boldest claim or most surprising detail.
- Posts 2–8: One beat per post. Each post should deliver a complete thought. No cliffhanger posts that only make sense with the next one (people quote-tweet individual posts).
- Every 3–4 posts, re-hook. Drop a post that re-earns attention: a surprising stat, a sharp opinion, a "here's where it gets interesting."
- Final post: Restate the core thesis in its strongest form + CTA. Link to the original piece if applicable.
- Target 5–10 posts for a standard thread. Under 5 isn't worth threading. Over 12 loses most readers.
- Write each post to fit within character limits. No "1/" numbering needed.

### Newsletter segment

**Consumption pattern**: The reader is already subscribed and somewhat invested. Lower hook pressure than social. Can be more exploratory and personal.

**Adaptation approach**:
- Frame the content as commentary, not repetition. "I wrote about X this week. Here's what I didn't include in the post..." or "The response to my piece on X surprised me. Here's what people pushed back on."
- Add editorial voice — the newsletter framing should feel like a conversation about the content, not a summary of it.
- If adapting for a different audience than the original, reframe: "I published this for [original audience], but the part that matters for you is..."
- Include a link to the full piece but make the newsletter segment valuable on its own.
- Target 200–500 words depending on the newsletter format.

### Video script

**Consumption pattern**: Spoken delivery. Shorter sentences. More direct address ("you"). Needs visual cue markers. Pacing is different — spoken word is slower than reading.

**Adaptation approach**:
- Rewrite for the ear, not the eye. Read every sentence out loud. If you stumble, simplify.
- Add direct address: "Here's what I want you to try" instead of "The recommended approach is."
- Mark visual cues: `[SHOW: screenshot of the dashboard]` or `[CUT TO: code editor]` or `[B-ROLL: typing at desk]`.
- Structure for re-engagement: viewers need a hook every 60–90 seconds. Insert pattern interrupts, questions, or "but here's the thing" pivots at regular intervals.
- Target 120–160 words per minute of video. A 5-minute video is ~700 words of script.
- Open with the hook, but adapt it for spoken delivery. Written hooks that rely on sentence structure don't always work when spoken.

### Email to a specific person

**Consumption pattern**: Personal, direct, short. The reader knows the sender. No hook pressure — but relevance matters.

**Adaptation approach**:
- Ask who the email is going to and what the relationship context is.
- Extract the one insight from the source that's most relevant to that specific person.
- Structure: Brief personal connection → "I just published/wrote something that connects to [thing you discussed]" → The key insight in 2–3 sentences → Link or offer to discuss.
- Target 50–150 words. Brevity is respect in personal email.

### Slide deck talking points

**Consumption pattern**: Visual medium. One idea per slide. Speaker notes carry the narrative.

**Adaptation approach**:
- Extract 5–8 key ideas from the source content. Each becomes a slide.
- For each slide: a short headline (the idea), a supporting visual or data point, and speaker notes (the 2–3 sentences you'd say while showing this slide).
- Opening slide = the hook. Closing slide = the CTA/takeaway.
- Don't transcribe paragraphs onto slides. If you need more than 15 words on a slide, split it into two slides.

## Cross-format principles

**Extract, don't compress.** Summarizing 2,000 words into 200 produces a thin version of the original. Instead, extract the single most powerful element (insight, story, data point, opinion) and build the new format around that one element.

**Re-hook for each format.** The hook that works for a newsletter doesn't work for LinkedIn doesn't work for a thread. Write a new hook optimized for the target format's consumption pattern.

**Switch voice profiles when crossing publications.** If the source was written for the Weller Avenue blog and the target is a LinkedIn post, apply the LinkedIn publication profile's voice, not the blog's. Same person, different room.

**Generate multiple variants for short formats.** For LinkedIn posts, threads, and social posts, generate 2–3 variants with different angles or hooks. Short-form content is cheap to draft and the user benefits from choosing.

**Link back.** When the repurposed content can reference the original (LinkedIn post linking to blog, thread linking to newsletter), include the link. Cross-format repurposing builds a content ecosystem, not isolated posts.

## Output

For each target format requested:

```
## Repurposed: [Format]

**Source**: [Title or description of original content]
**Core element extracted**: [Which insight/story/data point this variant is built around]
**Target publication**: [If specified]
**Word count**: [Count]

---

[The repurposed content]

---

**Variant B** (if applicable):
[Alternative version with different angle or hook]
```

If the user requested multiple formats, present them in order of typical publishing sequence (longest lead time first, quickest last).
