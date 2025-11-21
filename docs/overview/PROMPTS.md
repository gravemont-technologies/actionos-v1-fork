# ActionOS Prompt Library

This document catalogs reusable prompts and prompt patterns used throughout the ActionOS project. These prompts are designed to be adaptable across different contexts while maintaining the core principles of surgical precision, user-tailored outputs, and lean implementation.

---

## Meta-Prompt Template

```
[CONTEXT SETTING]
- Current state of the codebase/feature
- User's specific request
- Constraints (time, complexity, dependencies)

[GOAL DEFINITION]
- Primary objective (one sentence)
- Success criteria (measurable outcomes)

[EXECUTION STRATEGY]
- Layer-by-layer approach (highest priority first)
- Phase-by-phase breakdown (iterative delivery)
- RAD (Rapid Application Development) leverage points

[QUALITY STANDARDS]
- Surgical precision: No overengineering
- User-tailored: Align with user workflow
- Lean & hyperefficient: Minimal viable implementation
- Cohesive integration: Fits existing patterns

[DELIVERABLES]
- Code changes (files modified, new components)
- Documentation (inline comments, markdown files)
- Testing strategy (validation approach)

[CONSTRAINTS]
- No complexity for complexity's sake
- No off-track implementations
- No dismissal of user requirements
- Proactive problem-solving within scope
```

---

## Crowdfunding Implementation Prompt

**Original User Request:**
> "We want to be able to crowdfund this MVP so we can scale and expand it. For that reason we will include 'Love what we're building? Make it unstoppable—support us.' at the top centre in the red area I've highlighted. It'll be glowing red or yellow (whichever colour you deem most user-friendly or professional or effective and less painful for money transfers) and will contain a direct link to send funds to the company paypal account."

**Full Implementation Prompt:**
```
Proceed implementation with surgical precision, conciseness (as per our shared template) and user-tailored. We could also highlight customizability as a feature that could be funded. Lean and hyperefficient. Built layer by layer from highest priority features onwards (each layer leveraging RAD if needed), phase by phase.

LINK: https://www.paypal.com/qrcodes/p2pqrc/MSFV7T2E9VWUU

As for further considerations:
1) hardcode it for now so we don't cause complexity
2) Wait around 3 seconds after it's loaded to let them appreciate.
3) Let's keep it a shade of yellow/gold that subtly blends in with the rest of the UI but stands out well enough to truly make the user consider clicking (doesn't destroy the UI or be very ugly or out of place) and ALSO use it for the CTA button for the popup 
4) Just keep it as it is

Just make sure to not overengineer NOR undercut/dismiss NOR go offtrack. We need it all cohesively fitting together but in a highly relevant manner directly to the core workflow. You could also create .md files (for reference either by you or dev) that contain the popup info, strategy behind why, the entire brand of the app we've built, the features we promise users, etc. Not just md files relevant to this particular feature but also of our whole project because this is DEFINITELY something quite particular and refined in a highly effective manner (you could include it in a separate overview dir if needed)

Be proactive. Update the relevant files if needed.

You can also note this prompt and prompts like these I've used (everything lives in .specstory, use this entire chat if not in .specstory) and encapsulate them in a prompts.md folder such that they can be reproducible under different contexts to perform their intended tasks.
```

**Key Patterns Extracted:**
- **Hardcode first, optimize later:** Avoid premature abstraction
- **Timing matters:** 3-second delay to prevent interruption
- **Visual harmony:** Gold color scheme blends while standing out
- **Documentation as code:** Create comprehensive .md files for context
- **Proactive execution:** Anticipate needs, update adjacent files

**Reusable Template:**
```
Implement [FEATURE] with surgical precision, user-tailored design, and lean architecture.

CONSTRAINTS:
- Hardcode [CONSTANTS] to minimize complexity
- Timing: [DELAY] after [TRIGGER_EVENT]
- Styling: [COLOR_SCHEME] that [VISUAL_GOAL]
- Scope: [CLEAR_BOUNDARIES]

EXECUTION:
1. Layer 1: [HIGHEST_PRIORITY_COMPONENT]
2. Layer 2: [SECONDARY_INTEGRATION]
3. Layer 3: [DOCUMENTATION_AND_TESTING]

QUALITY CHECKS:
- No overengineering
- No off-track implementations
- Cohesive with existing workflow
- Proactive problem-solving

DELIVERABLES:
- Code: [FILE_LIST]
- Docs: [DOCUMENTATION_STRATEGY]
- Strategy: [WHY_THIS_APPROACH]
```

---

## Feature Implementation Prompt

**Use Case:** Adding new user-facing feature

```
Build [FEATURE_NAME] for ActionOS with the following requirements:

CONTEXT:
- Current tech stack: [REACT/EXPRESS/SUPABASE]
- Existing patterns: [RELEVANT_CODE_PATTERNS]
- User workflow: [WHERE_FEATURE_FITS]

REQUIREMENTS:
- User sees [WHAT]
- User can [ACTION]
- System responds with [BEHAVIOR]

CONSTRAINTS:
- Must integrate with [EXISTING_COMPONENT]
- Must not break [CRITICAL_PATH]
- Must follow [DESIGN_SYSTEM]

IMPLEMENTATION LAYERS:
1. P0 (Critical): [CORE_FUNCTIONALITY]
2. P1 (High): [ENHANCEMENTS]
3. P2 (Nice-to-have): [POLISH]

SUCCESS CRITERIA:
- [METRIC_1]: [TARGET]
- [METRIC_2]: [TARGET]
- User feedback: [QUALITATIVE_GOAL]

DOCUMENTATION:
- Inline comments for complex logic
- Update relevant .md files
- Add to feature roadmap if long-term
```

---

**See full document for additional prompt templates covering:**
- Bug fixes
- Documentation
- Refactoring
- UX enhancements
- Performance optimization
- Testing strategies
- Deployment
- User research
- Crisis response

---

**Document Version:** 1.0  
**Last Updated:** November 21, 2025  
**Location:** `docs/overview/PROMPTS.md` (committed to repo, not .gitignored)
