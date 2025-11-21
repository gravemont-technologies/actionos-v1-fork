# ActionOS Feature Roadmap

## Current State (MVP v1.0)

**Core Features Implemented:**
- ✅ Onboarding quiz (10 questions, baseline calibration)
- ✅ ANALYZE page (situation → 3-step plan via LLM)
- ✅ DASHBOARD (metrics, active Step-1, recent wins)
- ✅ INSIGHTS (saved projects, max 5 limit)
- ✅ FEEDBACK (retrospective loop, baseline adjustment)
- ✅ PDF export (download analysis reports)
- ✅ Crowdfunding integration (support link + popup)

**Technical Stack:**
- Frontend: React + TypeScript + Vite + Tailwind
- Backend: Express + TypeScript + tsx
- Database: Supabase (PostgreSQL)
- Auth: Clerk
- LLM: OpenAI GPT-3.5-turbo
- Deployment: TBD (Vercel/Railway)

---

## Roadmap Strategy

### Guiding Principles
1. **User-funded prioritization:** Supporters vote on features
2. **Execution over features:** Ship small, ship fast
3. **Metrics-driven:** Only build what moves core KPIs
4. **Backward compatibility:** Never break existing workflows

### Success Metrics (North Star)
- **S1SR (Step-1 Success Rate):** % of Step-1s completed within 48 hours
- **ICR (Insight Conversion Rate):** % of analyses that lead to saved project
- **RSI (Reality Shift Index):** How accurate are predictions vs. outcomes
- **User Retention:** Weekly active users (WAU) / Monthly active users (MAU)

---

## Phase 1: Foundation Stability (Months 1-2)

**Goal:** Make MVP bulletproof before adding features

**P0 (Critical):**
- [ ] **Production deployment** (Vercel frontend, Railway backend)
- [ ] **Error monitoring** (Sentry integration)
- [ ] **Performance optimization** (LLM response time < 5s)
- [ ] **Mobile responsiveness** (iOS/Android browser support)
- [ ] **Data backup** (automated Supabase backups)

**P1 (High Priority):**
- [ ] **Email notifications** (Step-1 reminders after 24h)
- [ ] **Analytics dashboard** (admin view of usage metrics)
- [ ] **Rate limiting** (prevent abuse of LLM API)
- [ ] **User feedback form** (in-app bug reporting)

**P2 (Nice to Have):**
- [ ] **Dark/light mode toggle** (accessibility)
- [ ] **Keyboard shortcuts** (power user efficiency)
- [ ] **Offline mode** (view cached insights without internet)

**Success Criteria:**
- 99.5% uptime
- < 1% error rate on critical paths
- S1SR > 60%
- NPS > 40

---

## Phase 2: Core Workflow Enhancements (Months 3-4)

**Goal:** Remove friction from daily usage

**P0 (Critical):**
- [ ] **Browser extension** (analyze any webpage text)
- [ ] **Quick entry shortcuts** (analyze from anywhere)
- [ ] **Improved Step-1 timer** (desktop notifications at 12h, 24h)
- [ ] **Bulk project management** (archive, delete multiple insights)

**P1 (High Priority):**
- [ ] **Templates** (common situations: meetings, decisions, conflicts)
- [ ] **Custom tags** (user-defined categories for insights)
- [ ] **Search & filter** (find past insights by keyword, tag, date)
- [ ] **Export history** (CSV download of all feedback records)

**P2 (Nice to Have):**
- [ ] **Voice input** (dictate situation instead of typing)
- [ ] **Mobile app** (native iOS/Android)
- [ ] **Calendar integration** (schedule Step-1 on calendar)

**Success Criteria:**
- S1SR > 70%
- ICR > 50%
- WAU/MAU > 0.4
- Average session duration > 5 minutes

---

## Phase 3: Advanced Analytics (Months 5-6)

**Goal:** Help users understand their patterns

**P0 (Critical):**
- [ ] **Historical trends** (IPP/BUT over time, visual charts)
- [ ] **Pattern recognition** (what types of situations get best outcomes)
- [ ] **Goal trajectory** (predict when you'll hit IPP milestones)
- [ ] **Weekly digest** (automated summary email of progress)

**P1 (High Priority):**
- [ ] **Custom baselines** (different baselines for work vs. personal)
- [ ] **Comparative analytics** (your metrics vs. anonymized cohort)
- [ ] **Impact heatmap** (which days/times yield highest IPP)
- [ ] **Outcome clustering** (group similar outcomes, identify themes)

**P2 (Nice to Have):**
- [ ] **Predictive suggestions** (based on past patterns, recommend next action)
- [ ] **Baseline forecasting** (if current trend continues, where will you be in 3 months)
- [ ] **Correlation analysis** (which tags/constraints correlate with success)

**Success Criteria:**
- RSI < 1.2 (predictions getting more accurate)
- TAA > 0.7 (time estimates improving)
- HLAD > 3 (high-leverage actions per week)
- User retention (month-over-month) > 80%

---

## Phase 4: Collaboration & Teams (Months 7-9)

**Goal:** Enable team/organizational usage

**P0 (Critical):**
- [ ] **Shared workspaces** (multiple users, one project space)
- [ ] **Role-based permissions** (admin, contributor, viewer)
- [ ] **Team baselines** (aggregated IPP/BUT metrics)
- [ ] **Activity feed** (see what teammates are working on)

**P1 (High Priority):**
- [ ] **Commenting** (discuss analyses, give feedback)
- [ ] **Assignments** (delegate Step-1s to team members)
- [ ] **Team dashboard** (see collective progress, blockers)
- [ ] **Slack/Discord integration** (notifications, quick actions)

**P2 (Nice to Have):**
- [ ] **Public workspaces** (showcase your team's impact)
- [ ] **Guest access** (invite external stakeholders to view projects)
- [ ] **Approval workflows** (manager reviews before Step-1 execution)

**Success Criteria:**
- 10% of users on team plans
- Team S1SR > individual S1SR (collaboration effect)
- Average team size: 3-7 members
- Team retention > 90%

---

## Phase 5: Customization & Power Features (Months 10-12)

**Goal:** Serve advanced users, differentiate from competitors

**P0 (Critical):**
- [ ] **Custom prompts** (modify LLM instructions for domain-specific use)
- [ ] **API access** (integrate ActionOS into other tools)
- [ ] **Webhooks** (trigger actions in external systems on events)
- [ ] **Advanced LLM models** (GPT-4, Claude 3 Opus, custom fine-tuned models)

**P1 (High Priority):**
- [ ] **Automation rules** (if X happens, do Y automatically)
- [ ] **Custom metrics** (define your own impact formulas)
- [ ] **White-label** (embed ActionOS in your product)
- [ ] **Data export** (full account export in JSON/CSV)

**P2 (Nice to Have):**
- [ ] **Plugin system** (third-party extensions)
- [ ] **Visual workflow builder** (no-code automation)
- [ ] **Self-hosted option** (run ActionOS on your own infrastructure)

**Success Criteria:**
- 20% of users on pro/API plans
- Average API calls per user per day > 5
- Custom prompt adoption > 30%
- Power user retention > 95%

---

## Future Explorations (12+ months)

**Speculative Features (Not Committed):**

### AI Coaching
- Weekly 1:1 with LLM coach (review patterns, set goals)
- Personalized micro-nudges based on behavior
- Scenario planning (simulate outcomes before acting)

### Community Features
- Public insight library (anonymized, curated analyses)
- Forums for discussing common situations
- Leaderboards (opt-in, gamification for high performers)

### Hardware Integrations
- Smartwatch app (quick Step-1 logging)
- Physical button (press to mark Step-1 done)
- AR glasses integration (ambient Step-1 reminders)

### Enterprise Features
- SSO integration (Okta, Azure AD)
- Compliance certifications (SOC 2, GDPR, HIPAA)
- Dedicated support (SLA, onboarding, training)
- Custom hosting (private cloud, on-premises)

---

## Sunset Policy (When to Kill Features)

**Criteria for Deprecation:**
1. **< 5% adoption** after 6 months
2. **Negative impact on core metrics** (lowers S1SR, ICR, or retention)
3. **High maintenance cost** (bugs, support tickets, complexity)
4. **Redundant with better feature** (new approach supersedes old)

**Deprecation Process:**
1. Announce 90 days before removal
2. Offer migration path (if applicable)
3. Archive code for potential future resurrection
4. Remove from codebase, update docs

**Recent Sunsets:**
- Credits system → Replaced by 5-project hard limit (simpler, clearer)
- "Coming Soon" banner → Replaced by support message (more actionable)

---

## Feature Request Process

### How Users Can Influence Roadmap

**1. Support Contributions**
- Supporters get voting power on feature prioritization
- $10 contribution = 1 vote
- Quarterly voting rounds on top 10 feature requests

**2. Feedback Form**
- Category: Bugs, Improvements, Thoughts, Secrets
- All feedback reviewed weekly
- Top requests elevated to roadmap consideration

**3. Community Discussions**
- Discord server (future)
- Monthly AMAs with development team
- Feature proposal template (problem, solution, metrics)

### Decision Framework

**Evaluate each feature request against:**
1. **Impact:** Does it improve core metrics (S1SR, ICR, RSI)?
2. **Effort:** Can we ship in < 2 weeks?
3. **Alignment:** Does it fit the "stop planning, start executing" ethos?
4. **Demand:** Do > 10 users request it?
5. **Monetization:** Can it justify pro tier pricing?

**Scoring:**
- Impact: 1-5
- Effort: 1-5 (lower is better)
- Alignment: 1-5
- Demand: 1-5
- Monetization: 1-5

**Formula:** (Impact + Alignment + Demand + Monetization) / Effort  
**Threshold:** > 10 = build it, < 5 = reject, 5-10 = backlog

---

## Pricing Tiers (Future)

### Free Tier
- 5 saved projects max
- GPT-3.5-turbo LLM
- Basic metrics (IPP, BUT, S1SR)
- Email support

### Pro Tier ($10/mo)
- Unlimited projects
- GPT-4 LLM access
- Advanced analytics (trends, forecasting)
- Priority support
- Custom tags & templates
- Export history

### Team Tier ($50/mo, 5 users)
- All Pro features
- Shared workspaces
- Team baselines & dashboards
- Slack/Discord integration
- Admin controls

### API Tier ($100/mo)
- All Team features
- API access (10k calls/month)
- Webhooks
- Custom prompts
- White-label option

### Enterprise (Custom Pricing)
- All API features
- SSO integration
- SLA guarantees
- Dedicated support
- On-premises deployment

**Supporter Benefit:**  
Early supporters (crowdfunding contributors) get **lifetime 50% off** any paid tier.

---

## Success Stories (Vision)

**1 Year from Now:**
- 10,000 active users
- S1SR: 75%
- ICR: 60%
- RSI: 1.1 (predictions within 10% of reality)
- $5,000/month in supporter contributions
- $20,000/month in subscription revenue
- Featured in: TechCrunch, Product Hunt (#1 product of the day)

**3 Years from Now:**
- 100,000 active users
- 1,000 team accounts
- API powering 50+ third-party integrations
- Acquired by productivity company OR sustainable profitable indie business
- Case studies: Fortune 500 using ActionOS for strategic decision-making

---

## Open Questions (Research Needed)

1. **LLM Costs:** Can we sustain free tier with GPT-3.5 pricing? Break-even at what user count?
2. **Baseline Drift:** Do baselines stabilize over time or continuously shift? What's healthy drift rate?
3. **Team Dynamics:** Do team baselines converge or diverge? What's optimal team size?
4. **Mobile vs. Desktop:** Where do users get most value? Optimize for which platform first?
5. **Monetization Mix:** What % revenue from subscriptions vs. one-time support? Which is more sustainable?

---

## Conclusion

This roadmap is **user-driven, metrics-focused, and execution-oriented**. We ship features that move the needle on S1SR, ICR, and RSI. We sunset features that don't. We listen to supporters and prioritize their votes. We maintain the core ethos: **stop planning, start executing.**

Every quarter, we review progress against this roadmap, adjust based on user feedback and data, and ship relentlessly.

---

**Document Version:** 1.0  
**Last Updated:** November 21, 2025  
**Next Review:** February 2026
