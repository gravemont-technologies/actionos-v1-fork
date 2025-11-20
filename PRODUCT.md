# Action OS - Product Documentation

**Version:** 1.0 MVP  
**Product Type:** Strategic Action Guidance Platform  
**Target Audience:** Founders, Entrepreneurs, Product Managers, High-Agency Individuals

---

## Product Vision

**Action OS transforms strategic thinking into concrete actions.**

In a world drowning in advice, Action OS cuts through the noise to deliver **1-3 exact, high-leverage actions** tailored to your situation—in under 60 seconds. No fluff, no generic advice, just actionable steps that move the needle.

---

## The Problem

### What We Solve

**The Paralysis Problem:**
- Founders face complex decisions daily
- Generic advice doesn't account for unique constraints
- Analysis paralysis prevents action
- Impact is hard to measure
- Feedback loops are missing

**The Noise Problem:**
- Too many options, not enough clarity
- Strategic advice is vague ("think about your users")
- No personalization to individual strengths/weaknesses
- No accountability or progress tracking

**The Time Problem:**
- Strategic thinking takes hours
- Consultants are expensive ($500+/hr)
- Mentors aren't always available
- DIY frameworks are time-consuming

---

## The Solution

### What Action OS Does

**1. Instant Strategic Analysis**
- User describes their situation (1-3 sentences)
- AI analyzes context, constraints, and goals
- Returns 1-3 specific, actionable steps in 60 seconds
- Each action is measurable and time-bound

**2. Personalized Guidance**
- Learns from your profile (onboarding quiz)
- Adapts to your baseline IPP (Impact Per Pivot) and BUT (Bias Under Tension)
- Uses past feedback to refine future recommendations
- Patterns emerge: "You consistently overestimate time"

**3. Measurable Impact**
- Dashboard tracks completion rate
- Calculates total ΔIPP (cumulative impact)
- Shows streak (consecutive days with action)
- Predicts vs. realizes impact (calibration)

**4. Continuous Improvement**
- Feedback loop after each action
- Slider (0-10): "How impactful was this?"
- Outcome text: "What actually happened?"
- Retrospective insights: "What did you learn?"

---

## Core Features

### 1. Onboarding Quiz (Profile Generation)

**Purpose:** Understand user's baseline strengths and biases

**Experience:**
- 4 multiple-choice questions
- Each answer reveals a mini-insight (3-second display)
- Questions cover:
  - **Pivot behavior:** How you make decisions
  - **Risk tolerance:** Your comfort with uncertainty
  - **Action orientation:** Bias toward doing vs. planning
  - **Timeline preference:** Short-term vs. long-term thinking

**Output:**
- Profile with baseline IPP (40-60) and BUT (40-60)
- Tags: SYSTEMATIC, MEDIUM_RISK, ACTION_READY, etc.
- Strengths: "Clear goal-setting", "Quick execution", etc.

**Design Philosophy:**
- Fast (2 minutes)
- Insightful (each answer teaches you something)
- Non-judgmental (no wrong answers)
- Foundation for personalization

---

### 2. Analysis Engine (Core Workflow)

**Purpose:** Convert situation → actionable steps

**User Input:**
- **Situation** (required): Current state in 1-3 sentences
- **Goal** (required): Desired outcome
- **Constraints** (required): Limitations (time, money, independence, etc.)
- **Current Steps** (required): What you're already doing
- **Deadline** (optional): Timeline for action
- **Stakeholders** (optional): Who's involved
- **Resources** (optional): What you have available

**Example Input:**
```
Situation: I'm 3 days from missing rent and need my SaaS MVP stable enough to onboard real users.
Goal: Functionalize and harden the core activation path so 500 test users can use it without failures, then scale to 10,000.
Constraints: money, independence, time (3 days)
Current Steps: Integrating auth, fixing billing flow, stabilizing backend endpoints
```

**AI Processing:**
1. Normalizes input (signature computation)
2. Checks cache (24h TTL)
3. If cache miss: Calls LLM with structured prompt
4. Parses response into strict JSON schema
5. Applies guardrails (fallbacks for incomplete data)
6. Caches response for future use

**Output Sections:**

**a) Summary** (2-3 sentences)
- High-level assessment of situation
- Identifies core tension or bottleneck
- Sets context for actions

**b) Immediate Steps** (1-3 actions)
- Each step has:
  - **Description:** Clear, specific action
  - **Delta Bucket:** SMALL (0.5-2Δ), MEDIUM (2-5Δ), LARGE (5-10Δ)
  - **ΔIPP:** Expected impact on baseline
  - **Time Estimate:** Hours to complete
- Ordered by impact/effort ratio
- Time-bound and measurable

**c) Strategic Lens** (1 paragraph)
- Broader context and pattern recognition
- Connects current situation to larger goals
- Identifies recurring themes

**d) Top Risks** (2-3 risks)
- Each risk has:
  - **Risk:** What could go wrong
  - **Mitigation:** How to address it
- Prioritized by likelihood × impact

**e) Recommended KPI** (1 metric)
- Single metric to track success
- Measurable and time-bound
- Aligned with goal

**Design Philosophy:**
- **Concise:** No fluff, maximum 200 tokens
- **Specific:** "Fix bug X" not "improve quality"
- **Actionable:** User can start immediately
- **Measurable:** Clear success criteria
- **Time-bound:** Includes time estimates

---

### 3. Save & Organize Insights

**Purpose:** Build a personal knowledge base of strategic decisions

**Features:**
- **Save Analysis:** One-click save with custom title and tags
- **Search:** Full-text search across situation, goal, summary
- **Tags:** Categorize by project, theme, or priority
- **Pagination:** Load more as you scroll
- **Delete:** Remove outdated insights

**Use Cases:**
- Review past decisions
- Track progress on recurring problems
- Share insights with team
- Build pattern recognition

**Design Philosophy:**
- Zero friction (one click to save)
- Easy to retrieve (search + tags)
- Private by default (user-scoped)
- Permanent (no expiration)

---

### 4. Dashboard (Progress Tracking)

**Purpose:** Measure impact and build momentum

**Sections:**

**a) Active Step**
- Shows current action being worked on
- Timer: Elapsed time (MM:SS format)
- Updates every second
- Visual indicator of focus

**b) Mark Step Done**
- **Slider (0-10):** Rate the impact
  - 0-3: Minimal impact
  - 4-6: Moderate impact
  - 7-10: High impact (counts as "win")
- **Outcome:** Short text (max 80 chars) describing result
- **Retrospective:** AI-generated insights based on outcome
  - 3-5 bullet points
  - Pattern recognition
  - Calibration feedback
  - Next-step suggestions

**c) Giant Metrics**
- **IPP Baseline:** Current impact per pivot score
- **BUT Baseline:** Current bias under tension score
- Visual comparison to previous baseline (Δ+2.5, etc.)

**d) Dashboard Statistics**
- **Completed:** Count of actions with slider ≥ 7
- **Total ΔIPP:** Sum of all impact deltas
- **Current Streak:** Consecutive days with feedback

**e) Recent Wins**
- Last 8 successful completions (slider ≥ 7)
- Shows title, slider value, ΔIPP, outcome
- Click to view full analysis

**f) Sparkline Chart**
- Predicted vs. Realized impact over time
- Predicted: Delta bucket (SMALL=1, MEDIUM=2, LARGE=3)
- Realized: Slider value normalized (0-10 → 0-3)
- Reveals calibration accuracy

**Design Philosophy:**
- **Motivational:** Celebrate wins, visualize progress
- **Honest:** No gaming the system (self-reported impact)
- **Learning:** Retrospective feedback improves future actions
- **Momentum:** Streak mechanic encourages consistency

---

### 5. Feedback Loop (Continuous Improvement)

**Purpose:** Personalize recommendations based on actual results

**How It Works:**

1. **User completes action** → Marks step done
2. **User rates impact (0-10)** → Self-assessment
3. **User describes outcome** → What actually happened
4. **AI generates retrospective** → 3-5 insights
5. **Baseline updates** → IPP/BUT recalibrated
6. **Cache invalidates** → Related analyses refresh
7. **Future analyses improve** → Uses feedback context

**Personalization Examples:**

**Pattern Detection:**
- "You consistently complete LARGE delta actions in <50% of estimated time"
- "Your BUT score suggests you underestimate stakeholder complexity"
- "Recent wins show strength in technical execution, opportunity in customer discovery"

**Adaptive Prompts:**
- Early user: Generic advice, more structure
- 10+ feedbacks: Personalized, pattern-aware advice
- High streak: Higher ambition, larger deltas

**Baseline Recalibration:**
- If slider consistently >7: IPP increases
- If slider consistently <4: IPP decreases or BUT increases
- Dampened updates (prevent overreaction to single feedback)

**Design Philosophy:**
- **Self-aware:** System knows its blind spots
- **Adaptive:** Learns from your unique context
- **Non-judgmental:** No right/wrong, just calibration
- **Transparent:** Shows how feedback shapes future advice

---

## User Flows

### Flow 1: New User → First Action (Happy Path)

1. **Landing Page** → User clicks "Get Started"
2. **Sign Up** → Clerk authentication
3. **Onboarding Quiz** → 4 questions, 2 minutes
4. **Profile Created** → Baseline IPP/BUT set
5. **Analyze Page** → User describes situation
6. **AI Analysis** → 60 seconds, returns 1-3 actions
7. **User Reviews Output** → Reads summary, steps, risks
8. **User Saves Insight** → Optional, one click
9. **User Starts Action** → Navigates to Dashboard
10. **Timer Starts** → Tracks elapsed time
11. **User Marks Done** → Slider + outcome + retrospective
12. **Dashboard Updates** → Stats refresh, streak increments
13. **User Submits Next Analysis** → Improved with feedback context

**Time:** 10-15 minutes end-to-end

---

### Flow 2: Returning User → Routine Use

1. **Sign In** → Clerk authentication
2. **Analyze Page** → User describes new situation
3. **AI Analysis** → Uses feedback context, more personalized
4. **User Saves Insight** → Optional
5. **Dashboard** → Checks active step, marks done if complete
6. **Insights View** → Reviews past decisions, searches by tag

**Time:** 3-5 minutes per analysis

---

### Flow 3: Power User → Deep Dive

1. **Analyze Page** → User submits situation
2. **AI Analysis** → Returns 1-3 steps
3. **Follow-Up Analysis** → User clicks "Deeper Dive on Strategic Lens"
4. **Focused Analysis** → Expands on selected section
5. **User Saves Both** → Original + follow-up
6. **Dashboard** → Completes action, gets retrospective
7. **Insights View** → Reviews patterns across 50+ saved insights
8. **Sparkline Analysis** → Sees calibration improving over time

**Time:** 10-20 minutes for deep strategic work

---

## Design Principles

### 1. Speed Over Perfection
- 60-second analysis > 60-minute deliberation
- Done is better than perfect
- Bias toward action

### 2. Specificity Over Generality
- "Fix bug in payment flow" > "Improve quality"
- "Email 10 users by EOD" > "Get feedback"
- Measurable, time-bound actions

### 3. Honesty Over Positivity
- Acknowledge hard truths
- Highlight risks upfront
- No false encouragement

### 4. Learning Over Judgment
- No right/wrong answers
- Calibration, not criticism
- Pattern recognition over blame

### 5. Privacy Over Virality
- User-scoped data (no public sharing)
- No social features (no likes, no follows)
- Personal knowledge base, not social network

### 6. Focus Over Features
- Core workflow is sacred
- New features must enhance, not distract
- Simplicity is a feature

---

## Success Metrics

### User Engagement
- **Activation:** % of sign-ups who complete onboarding
- **Retention:** % of users who return within 7 days
- **Frequency:** Median analyses per week per active user
- **Depth:** % of analyses that lead to dashboard feedback

### Impact Metrics
- **Completion Rate:** % of actions marked done (slider ≥ 7)
- **Time to Action:** Median time from analysis → mark done
- **Streak:** Median consecutive days with feedback
- **Total ΔIPP:** Average cumulative impact per user

### Quality Metrics
- **Calibration:** Correlation between predicted delta and realized slider
- **Satisfaction:** Average slider rating across all feedback
- **Retention:** % of users still active after 30 days

### Business Metrics
- **LLM Cost per User:** Average OpenAI API cost
- **Server Cost per User:** Supabase + hosting costs
- **Conversion Rate:** Free → paid (when monetization added)

---

## Competitive Landscape

### Alternatives & Why Action OS Wins

**1. AI Chatbots (ChatGPT, Claude)**
- **Them:** Generic advice, no memory, no structure
- **Us:** Personalized, learns from feedback, strict output format

**2. Strategic Frameworks (SWOT, OKRs)**
- **Them:** Time-consuming, manual, no AI assistance
- **Us:** AI-powered, instant, integrated feedback loop

**3. Consultants/Coaches**
- **Them:** Expensive ($500+/hr), scheduling friction, availability
- **Us:** $0-10/month, instant 24/7, no scheduling

**4. Task Managers (Todoist, Notion)**
- **Them:** Organize tasks, no strategic guidance
- **Us:** Generate tasks from strategy, measure impact

**5. Journaling Apps (Day One, Obsidian)**
- **Them:** Capture thoughts, manual reflection
- **Us:** AI-powered retrospectives, automated insights

---

## Roadmap & Future Features

### MVP (Current)
- ✅ Onboarding quiz
- ✅ Analysis engine
- ✅ Save insights
- ✅ Dashboard tracking
- ✅ Feedback loop

### V1.1 (Next 3 Months)
- 📋 Collaboration (share insights with team)
- 📋 Templates (pre-built prompts for common scenarios)
- 📋 Integrations (Notion, Linear, Google Docs)
- 📋 Mobile app (iOS, Android)

### V2.0 (6-12 Months)
- 📋 Multi-project tracking
- 📋 Team dashboards
- 📋 Custom metrics (beyond IPP/BUT)
- 📋 Advanced analytics (cohort analysis, A/B tests)
- 📋 Public sharing (opt-in, curated insights)

### V3.0 (12+ Months)
- 📋 Predictive insights ("You'll need to hire by Q2")
- 📋 Automated check-ins (nudges, reminders)
- 📋 Marketplace (share templates, sell insights)
- 📋 Enterprise features (SSO, audit logs, compliance)

---

## Monetization Strategy

### Free Tier (MVP)
- 10 analyses per month
- Unlimited saves
- Dashboard tracking
- Basic retrospectives

### Pro Tier ($10/month)
- Unlimited analyses
- Priority LLM (faster, better models)
- Follow-up deep dives
- Advanced analytics
- Export data (PDF, CSV)

### Team Tier ($50/month for 5 users)
- All Pro features
- Shared insights
- Team dashboards
- Collaboration tools

### Enterprise (Custom pricing)
- SSO/SAML
- Audit logs
- Custom integrations
- Dedicated support

---

## User Personas

### 1. The Solo Founder
- **Profile:** Building MVP, wearing all hats, limited resources
- **Pain:** Analysis paralysis, too many options, no feedback
- **Use Case:** Daily strategic decisions (product, hiring, marketing)
- **Value:** Speed, clarity, accountability

### 2. The Product Manager
- **Profile:** Managing roadmap, balancing stakeholders, shipping features
- **Pain:** Prioritization, alignment, measuring impact
- **Use Case:** Sprint planning, feature prioritization, stakeholder updates
- **Value:** Data-driven decisions, pattern recognition

### 3. The Executive
- **Profile:** Leading team, setting strategy, making high-stakes decisions
- **Pain:** Limited time, need for quick synthesis, accountability
- **Use Case:** Quarterly planning, crisis management, delegation
- **Value:** Instant strategic synthesis, executive presence

### 4. The Consultant
- **Profile:** Advising clients, managing projects, billing hours
- **Pain:** Repeating same frameworks, no scalability, manual documentation
- **Use Case:** Client reports, strategic workshops, proposal generation
- **Value:** Scalable expertise, client documentation, credibility

---

## Brand & Voice

### Brand Attributes
- **Direct:** No jargon, no fluff
- **Honest:** Acknowledge trade-offs and risks
- **Empowering:** You have agency, we provide tools
- **Technical:** Built for builders, not laypeople
- **Minimal:** Clean design, focused experience

### Voice Guidelines
- **Do:** "This will take 3 hours and increase conversion by 5%"
- **Don't:** "Consider exploring opportunities to enhance user engagement"

- **Do:** "You're overestimating stakeholder buy-in (pattern from 5 feedbacks)"
- **Don't:** "Great job! Keep up the momentum!"

- **Do:** "Risk: Users churn before onboarding. Mitigation: Add demo video"
- **Don't:** "There might be some challenges to consider"

---

## Technical Implementation (High-Level)

**For detailed technical documentation, see TECHNICAL_DOCUMENTATION.md**

### Architecture
- **Frontend:** React + Vite + TypeScript + Tailwind
- **Backend:** Node.js + Express + TypeScript
- **Database:** Supabase (PostgreSQL)
- **Auth:** Clerk
- **LLM:** OpenAI GPT-4o-mini
- **Hosting:** Vercel (frontend) + Railway (backend)

### Data Flow
1. User input → Client-side signature computation
2. Signature → Cache lookup (24h TTL)
3. Cache miss → LLM API call
4. LLM response → Parse + validate + guardrails
5. Response → Cache + return to user
6. User saves → Database insert (user-scoped)
7. User completes → Feedback → Baseline update → Cache invalidation

### Security
- HTTPS only
- JWT authentication (Clerk)
- Rate limiting (per endpoint)
- Input validation (Zod schemas)
- Ownership validation (user-scoped queries)
- No RLS (service role architecture)

---

## FAQ

**Q: How is this different from ChatGPT?**  
A: ChatGPT gives generic advice. Action OS learns from your feedback, tracks impact, and personalizes over time. It's structured (1-3 steps, strict format) vs. free-form conversation.

**Q: How accurate is the AI?**  
A: Calibration improves with feedback. Initial predictions may be off by 20-30%, but after 10+ feedbacks, accuracy improves to within 10-15%. The system is self-aware of uncertainty.

**Q: Can I share insights with my team?**  
A: Not in MVP. Coming in V1.1 with collaboration features.

**Q: What if I disagree with the AI's advice?**  
A: Action OS is a tool, not a decision-maker. Use it as input, not gospel. Your judgment is the final authority.

**Q: How is my data used?**  
A: Your data is private and user-scoped. We don't train models on your data or share it with third parties. See Privacy Policy for details.

**Q: What LLM models do you use?**  
A: GPT-4o-mini by default. Pro tier gets access to GPT-4 for higher quality outputs.

**Q: Can I export my data?**  
A: Not in MVP. Coming in Pro tier with PDF/CSV export.

---

## Conclusion

Action OS is a **strategic action guidance platform** that transforms thinking into doing. By combining AI-powered analysis, personalized feedback loops, and measurable impact tracking, it helps high-agency individuals make better decisions faster.

**The Promise:**
- **60 seconds** to strategic clarity
- **1-3 actions** per analysis
- **Measurable impact** via dashboard
- **Continuous improvement** via feedback

**The Reality:**
- Built for founders who ship
- No fluff, no filler
- Honest about trade-offs
- Learns from your unique context

**The Future:**
- Collaboration tools for teams
- Predictive insights for planning
- Marketplace for shared expertise
- Enterprise-ready scalability

---

**Document Version:** 1.0 MVP  
**Last Updated:** 2025-11-20  
**Maintained By:** Product Team  
**Next Review:** After 100 active users
