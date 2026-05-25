import type { Framework } from "./types";

/**
 * PRE-SEED EVALUATION FRAMEWORK
 *
 * Philosophy: Judge the mind, not the metrics. Insight, founder conviction,
 * and problem quality dominate. Product may not exist.
 *
 * Weights sum to 100%. Sub-criteria scored 1-5. Section score = avg × 5.
 * Final = Σ(section_score × weight%).
 */
export const PRE_SEED_FRAMEWORK: Framework = {
  stage: "Pre-Seed",
  philosophy:
    "Judge the mind, not the metrics. Insight, founder conviction, and problem quality dominate. Product may not exist.",

  sections: [
    /* ─── PROBLEM (20%) ─────────────────────────────────────────────────── */
    {
      id: "problem",
      name: "Problem",
      weight: 0.2,
      description:
        "Quality of the pain being solved. Specificity, urgency, and structural understanding.",
      redFlags: [
        "Problem is 'nice to have' not 'must solve'",
        "Founder cannot name 3 real people who have this problem",
        "Problem already solved by a dominant player",
        "Problem framed too broadly ('everyone has this issue')",
      ],
      greenFlags: [
        "Founder personally experienced the pain",
        "Can cite 5+ interviews with specifics and quotes",
        "Problem is hidden/underserved due to market structure",
        "Pain causes measurable financial or time loss (can be quantified)",
      ],
      example:
        "Brex: Founders at 19 couldn't get a corporate card as a startup. Named exact rejection reasons from 3 banks. Problem = structural credit model doesn't account for startup financing.",
      dataInputs: [
        "Problem statement (written)",
        "Interview count + direct quotes",
        "Current workarounds used",
        "Frequency and cost per customer",
      ],
      aiNotes:
        "Penalize vague language. Look for quantification. Founder-lived-problem = 2x signal. If no customer interviews mentioned, cap score at 3. Flag if problem description changes between slides.",
      subCriteria: [
        {
          id: "pain_specificity",
          name: "Pain Specificity",
          description:
            "Is the problem narrowly defined? 'People waste time' = noise. 'SMB restaurants lose 3 hrs/wk reconciling POS data manually' = signal. Must name a specific person in a specific situation with a specific pain.",
          rubric: {
            "1": "Generic ('people have this problem')",
            "2": "Directional — industry named",
            "3": "Specific segment identified",
            "4": "Specific + quantified (time/money lost)",
            "5": "Specific + quantified + validated by ≥5 customer interviews",
          },
        },
        {
          id: "urgency_frequency",
          name: "Urgency & Frequency",
          description:
            "How often does pain occur? How costly each time? Daily operational friction > annual strategic nuisance. Look for 'I deal with this every day and it costs me X.'",
          rubric: {
            "1": "Rare / mild",
            "2": "Monthly / moderate",
            "3": "Weekly / significant financial impact",
            "4": "Daily / material cost",
            "5": "Daily + costly + founder has personally lived it",
          },
        },
        {
          id: "root_cause_clarity",
          name: "Root Cause Clarity",
          description:
            "Does the team understand WHY the problem exists structurally, not just THAT it exists? Structural causes = durable opportunity. Surface-level symptoms = short-lived solutions.",
          rubric: {
            "1": "Symptom only described",
            "2": "Guesses at cause",
            "3": "Clear cause identified",
            "4": "Cause validated through research",
            "5": "Cause + structural market barrier named that perpetuates it",
          },
        },
      ],
    },

    /* ─── SOLUTION (18%) ────────────────────────────────────────────────── */
    {
      id: "solution",
      name: "Solution",
      weight: 0.18,
      description:
        "Clarity of mechanism, fit to the root cause, and a defensible 'why now.'",
      redFlags: [
        "Solution requires massive behavior change from customers",
        "No 'why now' — could have been built anytime",
        "'We are X for Y' without actual differentiation",
        "Solution is feature-level not product-level",
      ],
      greenFlags: [
        "Single clear mechanism of value delivery",
        "Enabled by a recent structural shift (GPT API, new regulation, platform change)",
        "10x better on the single axis that matters most to the customer",
        "Customers describe it in their own words compellingly without prompting",
      ],
      example:
        "Stripe: 'Seven lines of code to accept payments.' Exact mechanism, no jargon. Why now: iPhone apps needed payments but Authorize.net required weeks of integration.",
      dataInputs: [
        "One-sentence solution description",
        "Technology or approach used",
        "Why now rationale (specific)",
        "Comparison to current alternative",
      ],
      aiNotes:
        "Score 'why now' heavily. A solution without a timing rationale is suspect — either obvious or premature. Penalize buzzword-heavy descriptions (AI-powered, blockchain-enabled) without clear mechanism. Reward non-obvious insights.",
      subCriteria: [
        {
          id: "clarity_of_mechanism",
          name: "Clarity of Mechanism",
          description:
            "Can the solution be explained in one sentence without jargon? Complexity ≠ sophistication. Simplicity + precision = understanding. Test: can a 12-year-old understand what it does?",
          rubric: {
            "1": "Confused / contradictory",
            "2": "Requires lengthy explanation",
            "3": "Clear with some context needed",
            "4": "One sentence, no jargon",
            "5": "One sentence + memorable analogy that sticks",
          },
        },
        {
          id: "problem_solution_fit",
          name: "Problem-Solution Fit",
          description:
            "Does the solution directly address the root cause, or is it tangential? Elegant ≠ correct. The best solutions are obvious in hindsight. Watch for solutions that address symptoms.",
          rubric: {
            "1": "Misaligned — doesn't solve the stated problem",
            "2": "Partial fit — addresses part of the problem",
            "3": "Addresses the symptom directly",
            "4": "Addresses the root cause",
            "5": "Uniquely addresses root cause in a non-obvious way that competitors can't replicate easily",
          },
        },
        {
          id: "why_now",
          name: "Why Now",
          description:
            "What changed recently — technology, regulation, consumer behavior, infrastructure — that makes this solvable today when it wasn't 5 years ago? Without 'why now,' you're too early or too late.",
          rubric: {
            "1": "No answer or 'we just thought of it'",
            "2": "Vague trend cited ('AI is everywhere')",
            "3": "Specific enabling factor named",
            "4": "Enabler + timing logic + market readiness",
            "5": "Proprietary access to the enabling factor (API, dataset, regulation change)",
          },
        },
      ],
    },

    /* ─── PRODUCT (10%) ─────────────────────────────────────────────────── */
    {
      id: "product",
      name: "Product",
      weight: 0.1,
      description:
        "Whether anything exists yet, and whether the core value loop is visible.",
      redFlags: [
        "Deck has no product slides at all",
        "Only describes features, not user experience",
        "Product scope is too broad for early-stage team",
        "Product requires specialized knowledge to use",
      ],
      greenFlags: [
        "Working prototype at pre-seed stage",
        "Real users described (not hypothetical)",
        "Core loop extremely tight — does one thing exceptionally well",
        "Non-technical founder still shipped something",
      ],
      example:
        "Figma pre-seed: Browser-based vector editor demo. Tiny scope. Core loop: design → share link → collaborator opens in browser immediately (no install). Demo took 90 seconds.",
      dataInputs: [
        "Screenshots or live demo link",
        "Description of core user action sequence",
        "Current product stage (concept/mockup/prototype/live)",
      ],
      aiNotes:
        "Forgive missing product at pre-seed but reward those who have it. Cap score at 3 if no artifact exists. Penalize if deck claims 'coming soon' for all features.",
      subCriteria: [
        {
          id: "artifact_quality",
          name: "Artifact Quality",
          description:
            "Is there a prototype, mockup, or live demo? Pre-seed forgives no-code or wireframe. Zero artifact = meaningful concern at this stage. Reward founders who over-delivered.",
          rubric: {
            "1": "Verbal description only",
            "2": "Hand sketch or static wireframe",
            "3": "Clickable mockup / Figma prototype",
            "4": "Working prototype (may have bugs)",
            "5": "Live product with real users actively using it",
          },
        },
        {
          id: "core_loop_clarity",
          name: "Core Loop Clarity",
          description:
            "Is the primary value-delivery loop visible? User does X → gets Y. This loop should be demonstrable and comprehensible in under 2 minutes. Fuzzy loops = fuzzy value.",
          rubric: {
            "1": "Core loop unclear or not articulated",
            "2": "Loop implied but not demonstrated",
            "3": "Loop described verbally",
            "4": "Loop demonstrated in demo or screenshots",
            "5": "Loop demonstrated + user reaction or quote showing they understand the value",
          },
        },
      ],
    },

    /* ─── MARKET (12%) ──────────────────────────────────────────────────── */
    {
      id: "market",
      name: "Market",
      weight: 0.12,
      description:
        "TAM credibility and beachhead specificity. Bottom-up beats top-down.",
      redFlags: [
        "TAM = '1% of a $1T market' math",
        "No beachhead — attempting to sell to everyone",
        "Market defined so broadly it loses meaning",
        "Market size requires decades of penetration to be material",
      ],
      greenFlags: [
        "Bottom-up TAM with unit-level math (# companies × ACV)",
        "Specific beachhead with 2-3 named early customers already engaged",
        "Market growing faster than GDP due to structural shift",
        "Logical expansion path from beachhead articulated",
      ],
      example:
        "Zoom: Beachhead = IT buyers at F500 needing reliable video for distributed teams. TAM = $8B enterprise communication. Not 'everyone on earth video calls.'",
      dataInputs: [
        "TAM/SAM/SOM numbers + methodology",
        "Target customer segment description",
        "Market growth rate + source",
        "Analogue company that proves market exists",
      ],
      aiNotes:
        "'We are in a $100B market' with no source or methodology = score 1. Reward founders who show sequenced market entry (beachhead → adjacent → full market). SAM should match beachhead.",
      subCriteria: [
        {
          id: "tam_credibility",
          name: "TAM Credibility",
          description:
            "Is market size derived from real data or reverse-engineered from growth targets? Bottom-up beats top-down every time. VCs see '1% of a $1T market' in 80% of decks — it's an instant credibility killer.",
          rubric: {
            "1": "No number cited",
            "2": "'1% of huge market' math",
            "3": "Top-down with credible source",
            "4": "Bottom-up with stated assumptions",
            "5": "Bottom-up + validated by real customer counts + precedent company size",
          },
        },
        {
          id: "beachhead_clarity",
          name: "Beachhead Clarity",
          description:
            "Is there a specific first customer segment that is reachable and ownable? 'We'll go after everyone' = going after no one. The beachhead must be small enough to dominate and large enough to matter.",
          rubric: {
            "1": "No segment — 'everyone needs this'",
            "2": "Vague category named",
            "3": "Specific segment named",
            "4": "Named + estimated size of segment",
            "5": "Named + sized + reachable via specific known channel",
          },
        },
      ],
    },

    /* ─── TEAM (25%) ────────────────────────────────────────────────────── */
    {
      id: "team",
      name: "Team",
      weight: 0.25,
      description:
        "The #1 signal at pre-seed. Founder-market fit, execution evidence, and completeness.",
      redFlags: [
        "Zero domain connection to problem or market",
        "All technical team with no distribution thinking or plan",
        "Founders haven't worked together before on anything",
        "Team lists advisors as if they are full-time contributors",
      ],
      greenFlags: [
        "Serial founder with previous relevant exit",
        "Founder was a power user of the exact product they're building",
        "Technical + distribution co-founder pairing",
        "Team has shipped fast in previous roles (velocity signal)",
        "Founders met through deep work context, not a hackathon",
      ],
      example:
        "Airbnb: Chesky (design + hustle + sales), Gebbia (design + distribution ideas), Blecharczyk (engineering). Complementary skills + lived the problem as broke designers in SF.",
      dataInputs: [
        "Full founder bios (role, prior company, LinkedIn)",
        "Previous companies or products built",
        "How and when founders met",
        "Advisors with specific active contribution described",
      ],
      aiNotes:
        "Team is the #1 signal at pre-seed. Weight at 25%. Serial founder = strong prior. Solo technical founder with no GTM plan = risk. Penalize if team section is one line with no specifics. 'Former Google engineer' alone is insufficient.",
      subCriteria: [
        {
          id: "founder_market_fit",
          name: "Founder-Market Fit",
          description:
            "Do founders have unfair advantages to solve this problem? Domain expertise, personal network in the target customer base, or having lived the problem as a customer. Why THESE founders for THIS problem?",
          rubric: {
            "1": "No connection to problem or market",
            "2": "Adjacent industry experience",
            "3": "Clear domain expertise (worked in industry)",
            "4": "Deep domain + personal network in target segment",
            "5": "World-class expertise OR personally lived the exact pain as a customer",
          },
        },
        {
          id: "execution_signal",
          name: "Execution Signal",
          description:
            "Is there evidence founders can build things and get things done — regardless of outcome? Previous startups (even failed ones), side projects shipped, shipping velocity in current company.",
          rubric: {
            "1": "No evidence of building anything",
            "2": "Academic credentials only",
            "3": "Worked at relevant company in relevant role",
            "4": "Shipped something (product, project, company)",
            "5": "Built, scaled, and sold something relevant — serial founder",
          },
        },
        {
          id: "team_completeness",
          name: "Team Completeness",
          description:
            "Are critical functions covered — product, technology, sales/distribution? A team of three engineers with no distribution thinking is incomplete. Single points of failure should be named and acknowledged.",
          rubric: {
            "1": "Solo founder, no plan to address gaps",
            "2": "Solo with advisors who are not hands-on",
            "3": "Two founders but clear critical gap (no technical or no GTM)",
            "4": "Two founders with complementary skills",
            "5": "Full founding team covering all critical functions with overlap",
          },
        },
      ],
    },

    /* ─── TRACTION (5%) ─────────────────────────────────────────────────── */
    {
      id: "traction",
      name: "Traction",
      weight: 0.05,
      description:
        "Any demand signal. Low weight at pre-seed — presence is reward, absence not penalized harshly.",
      redFlags: [
        "'Traction' is 500 signups from social posts",
        "No attempt to test demand in any form",
        "Traction numbers are from friends/family/colleagues",
      ],
      greenFlags: [
        "Any paying customer regardless of amount",
        "LOI from a credible named organization",
        "Waitlist with evidence of organic referral growth",
      ],
      example:
        "Superhuman at seed: 5 paying beta users at $30/mo + 2,000-person waitlist. Each user personally onboarded by founder. Clear demand signal from small, passionate group.",
      dataInputs: [
        "Number of users/signups/customers",
        "Revenue if any (exact number)",
        "Type of traction signal",
        "How it was acquired (organic/paid/founder network)",
      ],
      aiNotes:
        "Low weight (5%) at pre-seed. Reward ANY signal. Do not penalize absence harshly — it's pre-seed. But reward presence significantly as it increases confidence across all other scores.",
      subCriteria: [
        {
          id: "early_signal_quality",
          name: "Early Signal Quality",
          description:
            "Any evidence of demand: waitlist, LOIs, paid pilots, press coverage. At pre-seed, quality > quantity. One LOI from a relevant company > 1,000 email signups from friends.",
          rubric: {
            "1": "No evidence of demand at all",
            "2": "Anecdotal ('my friend said they'd use it')",
            "3": "Waitlist or survey with methodology",
            "4": "LOIs or paid pilots in progress",
            "5": "Paying customers before the raise",
          },
        },
      ],
    },

    /* ─── GTM (5%) ──────────────────────────────────────────────────────── */
    {
      id: "gtm",
      name: "GTM",
      weight: 0.05,
      description:
        "A single primary channel hypothesis with rationale. Not a laundry list.",
      redFlags: [
        "Lists 5+ channels with no prioritization",
        "GTM is 'viral' or 'word of mouth' with no mechanic described",
        "Sales motion requires expensive enterprise sales for a low-ACV product",
      ],
      greenFlags: [
        "Single channel with clear acquisition logic tied to ICP",
        "Founder has personal network in target segment (warm channel)",
        "Existing distribution partnership identified",
      ],
      example:
        "Rippling early GTM: Founder's direct network in SF tech HR community. One channel, high trust, high conversion. Didn't try paid ads or content at the start.",
      dataInputs: [
        "Primary acquisition channel hypothesis",
        "Rationale for channel fit",
        "Any channel tests run and results",
      ],
      aiNotes:
        "Low weight (5%) at pre-seed. Look for intellectual honesty. Founders who say 'we're still figuring this out and here's what we've tested' score better than those who list 7 channels with no evidence.",
      subCriteria: [
        {
          id: "channel_hypothesis",
          name: "Channel Hypothesis",
          description:
            "Has the team articulated one primary acquisition channel with a rationale? Not a list of channels. A clear hypothesis is: 'We will acquire customers through X because our ICP spends time there and we have Y advantage.'",
          rubric: {
            "1": "No GTM thinking at all",
            "2": "Laundry list of channels",
            "3": "Primary channel named without rationale",
            "4": "Primary channel + clear rationale for why it fits ICP",
            "5": "Primary channel + rationale + early evidence it's working",
          },
        },
      ],
    },

    /* ─── ASK (5%) ──────────────────────────────────────────────────────── */
    {
      id: "ask",
      name: "Ask",
      weight: 0.05,
      description:
        "Use of funds tied to milestones, raise size calibrated to stage.",
      redFlags: [
        "Ask with no milestone attached",
        "Raising $10M+ at pre-seed without extraordinary explanation",
        "Use of funds is 80%+ 'marketing' with no product budget",
        "No mention of runway",
      ],
      greenFlags: [
        "Clear 18-month milestone that de-risks the next round",
        "Specific hires named with roles and costs",
        "Runway calculation shown explicitly (raise ÷ monthly burn)",
        "Series A trigger defined in measurable terms",
      ],
      example:
        "$1.5M: 60% engineering (2 senior hires), 30% GTM experiments, 10% ops. Goal: 10 paying enterprise pilots in 12 months. Series A trigger: $500K ARR + repeatable outbound channel.",
      dataInputs: [
        "Raise amount",
        "Use of funds % breakdown",
        "Key milestone targeted",
        "Implied runway in months",
        "Series A trigger (if defined)",
      ],
      aiNotes:
        "Check internal consistency: raise amount ÷ estimated monthly burn = runway. Should be 18–24 months. Milestone should directly address the single biggest unknown that blocks the next round.",
      subCriteria: [
        {
          id: "use_of_funds_specificity",
          name: "Use of Funds Specificity",
          description:
            "Is the raise tied to specific milestones, or is it generic ('hire team, build product, grow')? The best asks say: 'This money gets us to X milestone in Y months, which unlocks Z.'",
          rubric: {
            "1": "No breakdown or rationale",
            "2": "Vague categories (product, marketing, ops)",
            "3": "Categories with % allocation",
            "4": "Milestone-linked breakdown",
            "5": "Milestone-linked + timeline + explicit Series A trigger defined",
          },
        },
        {
          id: "raise_size_reasonableness",
          name: "Raise Size Reasonableness",
          description:
            "Does the raise amount match the stage, team size, and milestones targeted? Pre-seed should be $500K–$2M typically. Calibration signals financial maturity.",
          rubric: {
            "1": "Wildly inconsistent with stage",
            "2": "Off by >2x without explanation",
            "3": "Reasonable for stage",
            "4": "Well-calibrated with rationale",
            "5": "Precisely calibrated + explicitly shows capital efficiency mindset",
          },
        },
      ],
    },
  ],
};
