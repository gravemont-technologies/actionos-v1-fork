# Manual Testing Checklist - Action OS MVP

**Purpose:** This document specifies the exact areas requiring manual intervention before production deployment.  
**Version:** 1.0  
**Last Updated:** 2025-11-20

---

## Critical: Manual Testing Required

⚠️ **These tests CANNOT be automated and require human verification**

**Estimated Time:** 4-6 hours  
**Recommended Team:** 2 testers (parallel workflows)  
**Prerequisites:** Staging environment with production-like configuration

---

## Pre-Testing Setup

### 1. Environment Preparation

- [ ] Staging environment deployed
- [ ] Supabase production database schema applied
- [ ] Clerk production environment configured
- [ ] OpenAI API key set (production key, not test)
- [ ] All environment variables set correctly
- [ ] Health check passes: `curl https://staging.your-domain.com/api/health`

### 2. Test User Accounts

Create 2 test accounts:
- **Tester 1:** Fresh user (new sign-up)
- **Tester 2:** Returning user (existing profile)

### 3. Testing Tools

- [ ] Browser DevTools open (Console, Network tabs)
- [ ] Spreadsheet for tracking results
- [ ] Screen recording tool (optional but recommended)
- [ ] Mobile device for responsive testing

---

## Section 1: Authentication & Onboarding (30-45 min)

### 1.1 Sign Up Flow

**Tester 1 (Fresh User):**

- [ ] Visit landing page: `https://staging.your-domain.com`
- [ ] Click "Get Started" or "Sign Up"
- [ ] Clerk sign-up modal appears
- [ ] Enter email and password
- [ ] Verify email (check email inbox)
- [ ] Redirected to `/onboarding` automatically
- [ ] No console errors in browser DevTools

**Expected Result:** User redirected to onboarding quiz  
**Failure:** If redirected to /sign-in or error page → **BLOCKER**

### 1.2 Onboarding Quiz

**Tester 1:**

- [ ] Quiz displays 4 questions
- [ ] Questions are readable and clear
- [ ] Each question has 3-4 options
- [ ] Selecting option shows insight toast (3 seconds)
- [ ] Insight text is visible and helpful
- [ ] Cannot click "Submit" until all answered
- [ ] Submit button is enabled after answering all
- [ ] Click "Submit"
- [ ] Loading spinner appears
- [ ] Profile created successfully
- [ ] Redirected to `/app/analyze`
- [ ] No console errors

**Expected Result:** Profile created, redirected to analyze page  
**Failure:** Profile not created or error → **BLOCKER**

**Verify Database (Supabase Dashboard):**
- [ ] Open Supabase → Table Editor → `profiles`
- [ ] Find row with your `user_id`
- [ ] Check `baseline_ipp` is between 40-60
- [ ] Check `baseline_but` is between 40-60
- [ ] Check `tags` array has 3-4 tags
- [ ] Check `strengths` array has 2-3 items
- [ ] Check `created_at` is recent timestamp

**Expected Result:** Profile row exists with correct data  
**Failure:** Missing row or invalid data → **BLOCKER**

### 1.3 Sign In Flow (Returning User)

**Tester 2:**

- [ ] Visit landing page
- [ ] Click "Sign In"
- [ ] Clerk sign-in modal appears
- [ ] Enter existing credentials
- [ ] Sign in successful
- [ ] If profile exists: Redirect to `/app/analyze`
- [ ] If no profile: Redirect to `/onboarding`
- [ ] No console errors

**Expected Result:** Redirect to correct page based on profile state  
**Failure:** Redirect to wrong page → **MEDIUM**

### 1.4 Session Persistence

**Both Testers:**

- [ ] Refresh page (F5)
- [ ] Still signed in (no redirect to /sign-in)
- [ ] Profile data still loaded
- [ ] Open new tab, navigate to app
- [ ] Still signed in
- [ ] Close browser, reopen
- [ ] Still signed in (if "Remember me" selected)

**Expected Result:** Session persists across refreshes/tabs  
**Failure:** Session lost on refresh → **HIGH**

---

## Section 2: Analysis Workflow (45-60 min)

### 2.1 Form Validation

**Tester 1:**

- [ ] Navigate to `/app/analyze`
- [ ] Try to submit empty form
- [ ] See validation errors for required fields
- [ ] Error messages are clear and helpful

**Test each field:**

- [ ] **Situation:** Type 5 chars → Error "Min 10 characters"
- [ ] **Situation:** Type 2005 chars → Error "Max 2000 characters"
- [ ] **Goal:** Type 3 chars → Error "Min 5 characters"
- [ ] **Constraints:** Leave empty → Error "Required"
- [ ] **Current Steps:** Leave empty → Error "Required"

**Expected Result:** Validation prevents submission, errors are clear  
**Failure:** Can submit invalid data → **HIGH**

### 2.2 Demo Data Pre-fill

**Tester 1:**

- [ ] Click "Demo Data" button
- [ ] All required fields populate instantly
- [ ] Data is realistic and readable
- [ ] Can submit form immediately

**Expected Result:** Form fills with demo data  
**Failure:** Demo data broken or missing → **LOW**

### 2.3 Analysis Submission

**Both Testers:**

Fill form with:
```
Situation: I need to decide whether to pivot my SaaS from B2B to B2C. Current B2B ARR is $50k/mo but growth has plateaued. B2C market is 10x larger but requires complete rebuild.

Goal: Make decision by end of week and have clear 90-day execution plan if pivoting.

Constraints: $200k runway (5 months), team of 3 engineers, existing B2B customers expecting features

Current Steps: Analyzing TAM for B2C, interviewing potential customers, estimating rebuild cost
```

- [ ] Click "Analyze"
- [ ] Loading spinner appears
- [ ] Analysis completes within 10 seconds
- [ ] Response displays correctly

**Check Response Sections:**

- [ ] **Summary:** 2-3 sentences, relevant to input
- [ ] **Immediate Steps:** 1-3 steps displayed
  - Each step has description
  - Each step shows delta bucket (SMALL/MEDIUM/LARGE badge)
  - Each step shows estimated time (e.g., "2.5 hrs")
- [ ] **Strategic Lens:** 1 paragraph, insightful
- [ ] **Top Risks:** 2-3 risks with mitigations
- [ ] **Recommended KPI:** Single metric, measurable

**Expected Result:** All sections render, content is relevant  
**Failure:** Missing sections or generic content → **HIGH**

### 2.4 Follow-Up Analysis

**Tester 1:**

- [ ] Click "Deeper Dive" on Strategic Lens section
- [ ] Modal/form opens with focus area pre-filled
- [ ] Submit follow-up request
- [ ] Follow-up analysis returns within 10 seconds
- [ ] Content is more detailed than original
- [ ] Can navigate back to original analysis

**Expected Result:** Follow-up provides deeper insight  
**Failure:** Follow-up fails or is generic → **MEDIUM**

### 2.5 Save Insight

**Both Testers:**

- [ ] Click "Save Insight" button
- [ ] Modal opens with title field
- [ ] Default title is auto-generated (not "Untitled")
- [ ] Can edit title
- [ ] Can add tags (comma-separated or tag input)
- [ ] Click "Save"
- [ ] Success message appears
- [ ] Button changes to "Saved" state
- [ ] Navigate to `/app/insights`
- [ ] Saved insight appears in list
- [ ] Insight shows correct title, tags, date

**Expected Result:** Insight saved and visible in list  
**Failure:** Save fails or insight not in list → **HIGH**

### 2.6 Cache Behavior

**Tester 2:**

- [ ] Submit same input as previous analysis (exact same text)
- [ ] Analysis completes instantly (<1 second)
- [ ] Response is identical to first submission
- [ ] "Cached" indicator shows (if implemented)

**Expected Result:** Cached response returns immediately  
**Failure:** Cache miss (slow response) → **MEDIUM**

---

## Section 3: Dashboard Workflow (60-90 min)

### 3.1 Active Step Display

**Tester 1:**

- [ ] After analysis, navigate to `/app/dashboard`
- [ ] Active step is displayed
- [ ] Step description matches first immediate step from analysis
- [ ] Timer shows "00:00" initially
- [ ] Timer increments every second (00:01, 00:02, etc.)

**Expected Result:** Active step displays, timer works  
**Failure:** No active step or timer frozen → **HIGH**

### 3.2 Mark Step Done (CRITICAL PATH)

**Both Testers:**

- [ ] Click "Mark Step Done" button
- [ ] Overlay/modal opens
- [ ] Slider is visible (0-10 scale)
- [ ] Slider is interactive (drag or click to set value)
- [ ] Outcome text input is visible
- [ ] Outcome has autocomplete (if previous outcomes exist)

**Set Values:**
- [ ] Slider: 8.0
- [ ] Outcome: "Decided to pivot, created 90-day plan"

- [ ] Click "Submit"
- [ ] Retrospective modal appears (AI-generated insights)
- [ ] Retrospective has 3-5 bullet points
- [ ] Insights are relevant to outcome
- [ ] Can close retrospective modal

**Check Dashboard Updates:**

- [ ] Active step clears (no longer shown)
- [ ] **Completed** count increments by 1
- [ ] **Total ΔIPP** increases (numeric value)
- [ ] **Streak** shows 1 (if first feedback today)
- [ ] Giant metrics update (IPP/BUT baselines)
- [ ] Recent wins section shows new entry

**Expected Result:** All stats update correctly  
**Failure:** Stats don't update or incorrect values → **BLOCKER**

**Verify Database (Supabase Dashboard):**
- [ ] Open `feedback_records` table
- [ ] Find latest row with your `profile_id`
- [ ] Check `slider` = 8.0
- [ ] Check `outcome` = "Decided to pivot, created 90-day plan"
- [ ] Check `delta_ipp` is calculated
- [ ] Check `recorded_at` is recent

**Expected Result:** Feedback row exists with correct data  
**Failure:** Missing row → **BLOCKER**

### 3.3 Streak Calculation

**Tester 1 (Day 1):**
- [ ] Submit feedback (slider ≥ 7)
- [ ] Streak shows 1

**Tester 1 (Day 2 - requires waiting 24 hours OR manual DB edit):**
- [ ] Submit another feedback
- [ ] Streak increments to 2

**Manual DB Test (Advanced):**
- [ ] In Supabase, insert feedback with `recorded_at` = yesterday
- [ ] Refresh dashboard
- [ ] Streak should show 2 (consecutive days)

**Expected Result:** Streak calculates correctly  
**Failure:** Streak stuck at 1 or wrong count → **MEDIUM**

### 3.4 Recent Wins

**Both Testers:**

- [ ] Submit 3 feedbacks with slider ≥ 7
- [ ] Navigate to Dashboard
- [ ] Recent wins section shows all 3
- [ ] Wins are ordered by most recent first
- [ ] Each win shows:
  - Title (from saved insight or auto-generated)
  - Slider value
  - ΔIPP value
  - Outcome text
  - Date/time
- [ ] Click on a win
- [ ] Navigates to analysis view with pre-filled data

**Expected Result:** Wins display and navigate correctly  
**Failure:** Wins not showing or navigation broken → **MEDIUM**

### 3.5 Sparkline Chart

**Tester 2 (requires 15+ feedbacks):**

- [ ] Submit 15 feedbacks over time
- [ ] Navigate to Dashboard
- [ ] Sparkline chart renders
- [ ] Chart shows predicted (delta bucket) vs. realized (slider)
- [ ] Hover shows tooltip with values
- [ ] Chart is readable and meaningful

**Expected Result:** Chart renders with accurate data  
**Failure:** Chart missing or incorrect data → **LOW**

---

## Section 4: Insights View (30 min)

### 4.1 List Display

**Both Testers:**

- [ ] Navigate to `/app/insights`
- [ ] Saved insights list loads
- [ ] Insights are ordered by most recent first
- [ ] Each insight card shows:
  - Title
  - Tags (if any)
  - Goal (truncated)
  - Summary (truncated)
  - Date
- [ ] Pagination works (if >20 insights)
- [ ] "Load More" button appears
- [ ] Clicking loads next 20

**Expected Result:** List displays all saved insights  
**Failure:** Insights missing or wrong order → **MEDIUM**

### 4.2 Search

**Tester 1:**

- [ ] Type in search box: "pivot"
- [ ] List filters to insights containing "pivot"
- [ ] Search is case-insensitive
- [ ] Search checks situation, goal, and summary
- [ ] Clear search restores full list

**Expected Result:** Search filters correctly  
**Failure:** Search broken or no results → **LOW**

### 4.3 View Analysis

**Both Testers:**

- [ ] Click "View" on an insight
- [ ] Navigates to `/app/analyze`
- [ ] Form pre-fills with insight data
- [ ] Response displays original analysis
- [ ] Can re-submit to get fresh analysis
- [ ] Can navigate back to insights (browser back or nav)

**Expected Result:** Insight loads in analyze view  
**Failure:** Data doesn't load or errors → **MEDIUM**

### 4.4 Delete Insight

**Tester 1:**

- [ ] Click "Remove" on an insight
- [ ] Confirmation dialog appears (if implemented)
- [ ] Confirm deletion
- [ ] Insight disappears from list
- [ ] No errors in console

**Verify Database:**
- [ ] In Supabase `signature_cache`, check `is_saved` = false for that signature
- [ ] OR row is deleted entirely

**Expected Result:** Insight removed from list  
**Failure:** Insight still visible or error → **MEDIUM**

---

## Section 5: Navigation & UX (30 min)

### 5.1 Tab Switching

**Both Testers:**

- [ ] Click "ANALYZE" tab → Navigate to `/app/analyze`
- [ ] Click "DASHBOARD" tab → Navigate to `/app/dashboard`
- [ ] Click "INSIGHTS" tab → Navigate to `/app/insights`
- [ ] Tab switching is instant (<200ms)
- [ ] Active tab is visually highlighted
- [ ] URL updates correctly
- [ ] Browser back button works (returns to previous tab)

**Expected Result:** Tab switching smooth and functional  
**Failure:** Slow switching or broken navigation → **MEDIUM**

### 5.2 Keyboard Shortcuts

**Tester 1:**

- [ ] From any page, press Escape key
- [ ] Redirects to `/app/analyze`
- [ ] Works from Dashboard
- [ ] Works from Insights
- [ ] Works from modals (closes modal first, then navigate)

**Expected Result:** Escape key navigates to analyze  
**Failure:** Shortcut doesn't work → **LOW**

### 5.3 Visual Feedback

**Both Testers:**

- [ ] After marking step done, Dashboard tab pulses/glows
- [ ] Pulse lasts 2 seconds
- [ ] Pulse is visible and noticeable
- [ ] Streak bar displays at top of app
- [ ] Abandoned step indicator shows (if step >24h old)

**Expected Result:** Visual feedback is clear  
**Failure:** No feedback or invisible → **LOW**

---

## Section 6: Error Handling (30 min)

### 6.1 Network Errors

**Simulate Network Failure (DevTools → Network → Offline):**

- [ ] Try submitting analysis
- [ ] See user-friendly error message (not raw error)
- [ ] Error message suggests retrying
- [ ] Can retry by clicking button or resubmitting

**Expected Result:** Error handled gracefully  
**Failure:** App crashes or cryptic error → **HIGH**

### 6.2 Rate Limiting

**Tester 1:**

- [ ] Submit 10 analyses rapidly (within 1 minute)
- [ ] See rate limit error (429) after 2-10 requests (depending on endpoint)
- [ ] Error message is clear: "Too many requests, please wait"
- [ ] Can submit again after waiting

**Expected Result:** Rate limit enforced, clear error  
**Failure:** No rate limit or unclear error → **MEDIUM**

### 6.3 Invalid Input

**Both Testers:**

- [ ] Submit analysis with invalid data (e.g., 10,000 char situation)
- [ ] See validation error before submission (client-side)
- [ ] OR see 400 Bad Request with clear message (server-side)
- [ ] Error points to specific field

**Expected Result:** Validation prevents invalid data  
**Failure:** Invalid data submitted → **HIGH**

---

## Section 7: Performance (30 min)

### 7.1 Page Load Times

**Use Browser DevTools → Network → Disable Cache:**

**Tester 1:**

- [ ] Refresh landing page → Measure time to interactive
  - **Target:** <3 seconds
- [ ] Navigate to `/app/analyze` → Measure load time
  - **Target:** <2 seconds
- [ ] Navigate to `/app/dashboard` → Measure load time
  - **Target:** <2 seconds
- [ ] Navigate to `/app/insights` → Measure load time
  - **Target:** <2 seconds

**Expected Result:** All pages load within targets  
**Failure:** Page >5 seconds → **MEDIUM**

### 7.2 Analysis Speed

**Both Testers:**

- [ ] Submit new analysis (not cached)
- [ ] Measure time from click to response
  - **Target:** <10 seconds
- [ ] Submit same analysis (cached)
- [ ] Measure time from click to response
  - **Target:** <1 second

**Expected Result:** Analysis within targets  
**Failure:** >15 seconds for new analysis → **HIGH**

### 7.3 UI Responsiveness

**Both Testers:**

- [ ] Rapid tab switching (click tabs quickly)
- [ ] No UI freezing or lag
- [ ] Scroll insights list (if >20 items)
- [ ] Smooth scrolling, no jank
- [ ] Type in search box rapidly
- [ ] No input lag

**Expected Result:** UI remains responsive  
**Failure:** UI freezes or stutters → **MEDIUM**

---

## Section 8: Responsive Design (30 min)

### 8.1 Mobile (375px width)

**Use DevTools → Toggle Device Toolbar → iPhone SE:**

- [ ] Landing page displays correctly
- [ ] Nav menu is accessible (hamburger menu if implemented)
- [ ] Sign up/sign in works
- [ ] Onboarding quiz is readable
- [ ] Analysis form is usable (all fields visible)
- [ ] Response displays correctly (no horizontal scroll)
- [ ] Dashboard is readable
- [ ] Insights list works
- [ ] Touch interactions work (tap, swipe)

**Expected Result:** Fully functional on mobile  
**Failure:** Unusable UI or broken layout → **HIGH**

### 8.2 Tablet (768px width)

**Use DevTools → iPad:**

- [ ] All features work
- [ ] Layout adapts to tablet size
- [ ] No elements cut off
- [ ] Touch interactions work

**Expected Result:** Fully functional on tablet  
**Failure:** Broken layout → **MEDIUM**

### 8.3 Desktop (1920px width)

**Use DevTools → Responsive → 1920x1080:**

- [ ] All features work
- [ ] Layout doesn't stretch excessively
- [ ] Content is centered or max-width constrained
- [ ] Readable and professional

**Expected Result:** Fully functional on large screens  
**Failure:** Content too wide or unreadable → **LOW**

---

## Section 9: Browser Compatibility (30 min)

### 9.1 Chrome/Edge (Latest)

**Tester 1:**

- [ ] Test full workflow (onboarding → analysis → dashboard)
- [ ] No console errors
- [ ] All features work

**Expected Result:** Fully functional  
**Failure:** Broken features → **HIGH**

### 9.2 Firefox (Latest)

**Tester 2:**

- [ ] Test full workflow
- [ ] No console errors
- [ ] All features work

**Expected Result:** Fully functional  
**Failure:** Broken features → **MEDIUM**

### 9.3 Safari (Latest)

**Tester 1 (macOS/iOS):**

- [ ] Test full workflow
- [ ] No console errors
- [ ] All features work
- [ ] Date pickers work
- [ ] Audio works (if applicable)

**Expected Result:** Fully functional  
**Failure:** Broken features → **MEDIUM**

### 9.4 Mobile Safari (iOS)

**Tester 2 (iPhone):**

- [ ] Test full workflow
- [ ] Touch interactions work
- [ ] No layout issues
- [ ] Keyboard doesn't block input fields

**Expected Result:** Fully functional  
**Failure:** Broken features → **HIGH**

---

## Section 10: Data Persistence (15 min)

### 10.1 Session Persistence

**Both Testers:**

- [ ] Complete analysis
- [ ] Refresh page (F5)
- [ ] Active step persists
- [ ] Dashboard stats unchanged
- [ ] Saved insights still visible

**Expected Result:** Data persists across refreshes  
**Failure:** Data lost → **BLOCKER**

### 10.2 Multi-Tab Behavior

**Tester 1:**

- [ ] Open 2 tabs to `/app/analyze`
- [ ] Submit analysis in Tab 1
- [ ] Switch to Tab 2, refresh
- [ ] Analysis appears in insights (if saved)
- [ ] Dashboard stats reflect submission

**Expected Result:** Data syncs across tabs  
**Failure:** Tabs out of sync → **LOW**

---

## Summary: Issue Severity

**BLOCKER:** Prevents core workflow, must fix before launch
- Authentication failure
- Profile creation failure
- Analysis submission failure
- Dashboard stats not updating
- Data loss on refresh

**HIGH:** Significantly impacts user experience
- Validation not working
- Error handling broken
- Mobile completely unusable
- Performance >15s for critical actions

**MEDIUM:** Impacts usability but has workarounds
- Cache not working
- Search broken
- Navigation issues
- One browser not working

**LOW:** Minor issues, nice-to-have fixes
- Visual feedback missing
- Keyboard shortcuts not working
- Sparkline chart missing
- Desktop layout suboptimal

---

## Post-Testing Report Template

**Tester:** [Name]  
**Date:** [YYYY-MM-DD]  
**Environment:** [Staging URL]  
**Browser:** [Chrome 120, Firefox 121, etc.]

### Issues Found

| Severity | Section | Issue | Steps to Reproduce | Expected | Actual |
|----------|---------|-------|-------------------|----------|--------|
| BLOCKER | 2.3 | Analysis fails | Submit form → error | Response | 500 error |
| HIGH | 3.2 | Stats not updating | Mark done → check stats | Count +1 | No change |
| ... | ... | ... | ... | ... | ... |

### Pass/Fail by Section

- [ ] Section 1: Authentication & Onboarding - PASS/FAIL
- [ ] Section 2: Analysis Workflow - PASS/FAIL
- [ ] Section 3: Dashboard Workflow - PASS/FAIL
- [ ] Section 4: Insights View - PASS/FAIL
- [ ] Section 5: Navigation & UX - PASS/FAIL
- [ ] Section 6: Error Handling - PASS/FAIL
- [ ] Section 7: Performance - PASS/FAIL
- [ ] Section 8: Responsive Design - PASS/FAIL
- [ ] Section 9: Browser Compatibility - PASS/FAIL
- [ ] Section 10: Data Persistence - PASS/FAIL

### Overall Verdict

- [ ] **APPROVED FOR PRODUCTION** - All BLOCKER/HIGH issues resolved
- [ ] **NOT READY** - BLOCKER/HIGH issues remain

### Notes

[Any additional observations, edge cases, or recommendations]

---

**Document Version:** 1.0  
**Prepared By:** GitHub Copilot Agent  
**Next Steps:** Execute manual testing → Fix issues → Retest → Deploy
