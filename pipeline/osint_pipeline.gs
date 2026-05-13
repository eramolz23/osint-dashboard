// YOUTUBE OSINT INTEL PIPELINE — v2.22 (SYNTHESIS + EXTRACTION AUDIT FIXES)
// Daily TAC-INT + News Wire + Reddit RSS + Weekly Rollup
// + Cross-Day Memory + Claim Tracker + Claim Aging
// + Dashboard Colors + Confidence Charts + Email Improvements
//
// CHANGELOG v2.22 (May 13, 2026):
//   PHASE 13 — SYNTHESIS AUDIT FIXES (4 INTEL_PROMPT changes):
//   - ESCALATION GUARD added: host confidence cannot elevate claim above [C3]
//   - HARD NOISE SUPPRESSION added: historical analogies, literary refs,
//     legal statutes, stream gimmicks explicitly blocked from synthesis output
//   - EVIDENCE PRIORITY RULE added: physical/visual evidence cannot be dropped
//     in favor of host verbal estimate on same topic
//   - NAMED ACTOR RULE added: specific named individuals must appear verbatim,
//     never collapsed into generic group labels
//
//   PHASE 14 — EXTRACTION AUDIT FIXES (4 partPrompt changes):
//   - STEP 1: 93rd Mechanized Brigade phonetic correction added;
//     unit number preservation rule added
//   - STEP 2: Named officials and targets made REQUIRED (mandatory extraction);
//     information control actions made REQUIRED; cyber "ruled out" findings
//     made extractable as operational constraints
//   - STEP 3: Full rewrite — historical tangent semantic filter with explicit
//     examples; domestic US events exclusion tightened; stream gimmick
//     (Morse code decoders, donation games) exclusion added; host emotional
//     state exclusion formalized
//
// CHANGELOG v2.19 (May 11, 2026):
//   PHASE 9 — RED TEAM AUDIT FIXES (8 INTEL_PROMPT changes):
//   - Fix 1: Step 2 carve-out allowing baseline geopolitical
//     vocabulary for Step 1 entity cleanup only
//   - Fix 2: C1/C3 definition alignment — C3 requires observable
//     event; all host reasoning/extrapolation/stats without source = C1
//   - Fix 3: Removed "phonetic transcription artifacts that survived
//     entity cleanup" from FLAGGED-VERIFY triggers (resolves temporal
//     loop where silent Step 1 cleanup is then audited mid-output)
//   - Fix 4: HIERARCHY RULE added — geographic fronts take absolute
//     precedence as Section 2 headers; thematic headers only for
//     claims not tied to a specific theater
//   - Fix 5: [OVERALL: Cx] now specified as mode of Section 2 tags
//   - Fix 6: KIQ scoped to internal logical gaps only (no outside
//     geopolitical context inference required)
//   - Fix 7: Section 3 tie-breaker added — highest volume of
//     associated claims wins among equal-priority subjects
//   - Fix 8: HTML tag specificity — permitted tags listed explicitly,
//     <ul><li> required for bullets, no Markdown hyphens or asterisks
//   - Fix 9: Rule 2a moved out of footer STRICT RULES into the
//     Section 2 REQUIRED block where it belongs
//
//   PHASE 10 — DISINFORMATION DETECTION (from Deep Research on
//   Military Summary and History Legends):
//   - Added pro-Russian narrative laundering signature patterns to
//     INTEL_PROMPT FLAGGED-VERIFY triggers
//
//   PHASE 11 — ISW HANDLING (from Deep Research on Institute for
//   the Study of War):
//   - NEWS_PROMPT updated with explicit ISW source profile
//
// CHANGELOG v2.17 TIMEOUT FIX:
//   - PROBLEM: Large transcripts (>200K chars) caused Stage 1 to
//     exceed Google Apps Script's 6-minute execution limit.
//   - FIX: When transcript > 200K chars, Stage 1 now runs Gemini
//     extraction only and saves assembled bullets to Pipeline Cache.
//     Claude synthesis is deferred to the start of Stage 2.
//
// ============================================================
const PROPS = PropertiesService.getScriptProperties();
const CONFIG = {
  YOUTUBE_CHANNEL_ID: "UCM-eRxEc_TutiPIbOS1YYbw",
  SPECIFIC_VIDEO_ID:  "",
  SOURCE_TIER: "TIER_C",
  SOURCE_MAX_CONFIDENCE: "C3",
  AI_PROVIDER: "hybrid",
  GEMINI_API_KEY:   PROPS.getProperty("GEMINI_API_KEY")   || "",
  YOUTUBE_API_KEY:  PROPS.getProperty("YOUTUBE_API_KEY")  || "",
  SUPADATA_API_KEY: PROPS.getProperty("SUPADATA_API_KEY") || "",
  CLAUDE_API_KEY:   PROPS.getProperty("CLAUDE_API_KEY")   || "",
  EMAIL_RECIPIENTS: [
    "eramolz23@gmail.com",
    "eramomd@gmail.com",
    "theeramos@gmail.com",
    "grace3ram0@gmail.com",
  ],
  EMAIL_SUBJECT: "TAC-INT Brief — {DATE}",
  SHEET_ID:   "1gVpKaZGsRUK6CSfO1P6D7uQOpRgYoyf3FI7OrpTyzW4",
  SHEET_NAME: "Intel Log",
  TRIGGER_HOUR:     7,
  WEEKLY_HOUR:      8,
  CLAIM_AGING_HOUR: 9,
  NEWS_HEADLINES_PER_SOURCE: 5,
  REDDIT_POSTS_PER_SUB: 5,
  REDDIT_ANALYSIS_CAP: 20,
  NEWS_FEEDS: [
    { name: "Reuters",          url: "https://feeds.reuters.com/reuters/worldNews",               tier: "A" },
    { name: "BBC News",         url: "http://feeds.bbci.co.uk/news/world/rss.xml",                tier: "A" },
    { name: "Al Jazeera",       url: "https://www.aljazeera.com/xml/rss/all.xml",                 tier: "A" },
    { name: "AP News",          url: "https://feeds.apnews.com/rss/apf-topnews",                  tier: "A" },
    { name: "France 24",        url: "https://www.france24.com/en/rss",                           tier: "A" },
    { name: "The Guardian",     url: "https://www.theguardian.com/world/rss",                     tier: "A" },
    { name: "Sky News",         url: "https://feeds.skynews.com/feeds/rss/world.xml",             tier: "A" },
    { name: "Deutsche Welle",   url: "https://rss.dw.com/rdf/rss-en-world",                       tier: "A" },
    { name: "NPR World",        url: "https://feeds.npr.org/1004/rss.xml",                        tier: "A" },
    { name: "Defense One",      url: "https://www.defenseone.com/rss/all/",                       tier: "B" },
    { name: "War on the Rocks", url: "https://warontherocks.com/feed/",                           tier: "B" },
    { name: "Foreign Policy",   url: "https://foreignpolicy.com/feed/",                           tier: "B" },
    { name: "Kyiv Independent", url: "https://kyivindependent.com/feed/",                         tier: "B" },
    { name: "Bellingcat",       url: "https://www.bellingcat.com/feed/",                          tier: "B" },
    { name: "Middle East Eye",  url: "https://www.middleeasteye.net/rss",                         tier: "B" },
    { name: "Times of Israel",  url: "https://www.timesofisrael.com/feed/",                       tier: "B" },
    { name: "UNIAN",            url: "https://www.unian.info/rss/all_news.rss",                   tier: "B" },
    { name: "ISW",              url: "https://www.understandingwar.org/feed",                     tier: "B" },
  ],
  REDDIT_SUBS: [
    { name: "worldnews",             weight: "MED"  },
    { name: "ukraine",               weight: "HIGH" },
    { name: "geopolitics",           weight: "MED"  },
    { name: "CredibleDefense",       weight: "HIGH" },
    { name: "UkraineWarVideoReport", weight: "MED"  },
    { name: "iran",                  weight: "MED"  },
    { name: "MiddleEast",            weight: "MED"  },
    { name: "IsraelPalestine",       weight: "LOW"  },
    { name: "RussiaUkraineWar2022",  weight: "MED"  },
    { name: "europe",                weight: "MED"  },
    { name: "NATO",                  weight: "MED"  },
    { name: "CombatFootage",         weight: "MED"  },
    { name: "worldpolitics",         weight: "LOW"  },
    { name: "GlobalPowers",          weight: "LOW"  },
    { name: "UkraineRussiaReport",   weight: "MED"  },
    { name: "syriancivilwar",        weight: "MED"  },
    { name: "China",                 weight: "MED"  },
    { name: "AskMiddleEast",         weight: "LOW"  },
    { name: "OSINT",                 weight: "HIGH" },
  ],
  // ============================================================
  // SECTION 1 PROMPT — YouTube Stream Analysis
  // ============================================================
  INTEL_PROMPT: `You are a Senior OSINT Analyst. Your ONLY source of information is the YouTube transcript provided below.
STEP 1 — ENTITY CLEANUP (do this silently before analysis):
Correct obvious transcription errors in proper nouns, country names, city names, and place names.
Common errors to fix: "Tran" → "Iran", "Thran" → "Tehran", "Hezbola" → "Hezbollah",
"Faytukes" or "Faitooks" → "Faytuks", "Elint" → "Elint News", "Oryx" (preserve as-is),
"Magyar Birds" → "MAGYARBIRDS", "Deep State Map" → "DeepStateMap", "ISW" (preserve as-is),
"Perun" (preserve as-is), "Willy O.A.M." → "Willy OAM".
Do not add any words that were not spoken — only correct clear transcription artifacts.
STEP 2 — CRITICAL CONSTRAINTS:
- Do NOT search the web, use outside knowledge, or add context beyond what is in the transcript — EXCEPT when applying baseline geopolitical vocabulary corrections mandated in Step 1 entity cleanup only.
- Do NOT fabricate weapon systems, unit names, locations, or predictions not stated by hosts.
- Do NOT infer or assume anything the hosts did not explicitly say.
- If a section has nothing to report, write: Not addressed in this stream.
SYNTHESIS NOISE SUPPRESSION — the following must be suppressed entirely from ALL sections of the brief:
- Historical analogies and battle comparisons used as rhetorical framing (e.g., Little Bighorn, WWI parallels, Civil War comparisons). If the host uses a historical example to make a specific named prediction about a current actor, extract the prediction ONLY — discard the historical framing entirely.
- Literary or pop culture references (1984, TMZ, etc.) with no direct intelligence value.
- Legal statute citations (US Code sections, treason law text) UNLESS a named actor is explicitly facing prosecution with an operational consequence stated.
- Stream entertainment mechanics: Morse code decoders, donation sound effect readings, viewer game outputs. These are channel gimmicks — never extract as intelligence.
- Host emotional states framed as intelligence: "host fears," "host feels," "host has a negative opinion of." Extract the underlying claim if one exists — discard the emotional wrapper.
- If it would not appear in an ISW daily update, suppress it.
STEP 3 — SOURCE CREDIBILITY CEILING:
This transcript is from a YouTube commentary channel (TIER C source).
MAXIMUM confidence for any claim from this source is [C3].
KNOWN BIAS: This source has a confirmed pro-Ukrainian, Western-aligned editorial stance.
Claims about Ukrainian failures, losses, or setbacks are systematically underrepresented.
Apply additional [FLAGGED-VERIFY] scrutiny to any claim framing Ukrainian performance
as overwhelmingly positive or Russian losses as extraordinary.
Do NOT assign [C4] or [C5] to any claim under any circumstances.
CONFIDENCE SCALE — tag EVERY factual claim inline:
[C3] POSSIBLE    — Host reports a physical, observable event as fact, no named primary source
[C2] UNCONFIRMED — Host flagged as rumor, early report, or single unnamed source
[C1] UNVERIFIED  — Host opinion, prediction, extrapolation, or any non-observable statistic or state claimed without a named source
     CRITICAL RULE: If a claim is an analytical deduction, extrapolation, or
     interpretation by the host — even if stated with authority and confidence —
     it is [C1], not [C3]. Example: host states "the US has 2.5 months of oil
     reserves remaining" with no cited primary source = [C1]. [C3] requires a
     reported observable event. All host reasoning is [C1].
     ESCALATION GUARD: A host's confident delivery, repeated assertion, or
     dramatic framing of an unverified claim does NOT elevate it above [C3].
     Unconfirmed reports (vessel losses, casualty figures, equipment kills)
     remain [C3] regardless of how certain the host sounds. Only Oryx
     visual confirmation or a corroborating Tier A/B source justifies [C2].
[FLAGGED-VERIFY] — Add alongside confidence tag for claims that are physically implausible,
                   internally inconsistent, or extraordinary. Example: [C3][FLAGGED-VERIFY]
                   REQUIRED triggers for FLAGGED-VERIFY:
                   • Munitions or drone quantities exceeding plausible production or stockpile rates
                   • Constitutional or legal claims about foreign governments (verify against state media)
                   • Weapons capability claims that contradict known published specifications
                   • Highly specific trigger mechanisms (assassination clauses, nuclear thresholds)
                   PRO-RUSSIAN DISINFORMATION SIGNATURE PATTERNS:
                   When the host references, quotes, or debunks claims from channels known to
                   launder pro-Russian narratives (Military Summary, History Legends, Dima,
                   Alexandre Robert), apply extra FLAGGED-VERIFY scrutiny to the underlying
                   disputed claim. Recognize these specific patterns:
                   • Casualty inflation anchors: Ukrainian KIA/WIA totals exceeding 50% of
                     independent Western intelligence estimates within the same timeframe;
                     "40,000 perished," "150,000 casualties since [month]," "irrevocably injured"
                   • Premature or "verbal capture" declarations: claims that a town, city, or
                     strategic location has fallen to Russian forces without geolocated visual
                     confirmation; "Kupiansk has fallen," "Threshold of historic decision,"
                     "Only 24 hours remain"
                   • "Well actually" historical revisionist framing: subverting accepted facts
                     by obsessing over marginal anomalies or stripped-context primary sources;
                     defending Axis/historical aggressor actions to relativize current conflict
                   • Legal deflection re. civilian infrastructure: questioning the illegality of
                     strikes on civil targets by invoking "no declared war," "decision-making
                     centres," or misapplied Geneva Conventions arguments
                   • Hardware disparagement bias: framing Western/Ukrainian weapons as failures
                     using emotive capitalized verbs (BULLY, ABANDONING, DEBACLE, COLLAPSE) in
                     conjunction with named sovereign actors
                   • Asymmetric ambiguity resolution: defaulting to "Ukrainian losses" or
                     "destroyed Leopard/Bradley/Abrams" interpretation when footage is from a
                     contested gray zone and identification is ambiguous
                   When the host EXPLICITLY DEBUNKS one of these patterns, extract the host's
                   conclusion only — do NOT propagate the underlying disinformation claim as
                   fact. When the host REPEATS such a pattern without debunking it, flag the
                   claim with [FLAGGED-VERIFY] regardless of confidence tier.
CROSS-DAY TAGGING (only if cross-day memory is provided above the transcript):
When a claim directly confirms, contradicts, or updates yesterday's reported claims, add ONE of:
[CONFIRMS YESTERDAY] [CONTRADICTS YESTERDAY] [UPDATES YESTERDAY]
Apply SPARINGLY — only when the connection is direct and unmistakable.
Never let yesterday's claims influence your confidence ratings for today's transcript.
PRIORITIZATION ORDER for Section 3 subject selection:
1. Kinetic military action (strikes, combat, casualties)
2. Force movements (deployments, withdrawals, buildups)
3. Weapons employment or new capability
4. Diplomatic or political developments
Produce a Tactical Intelligence Package (TAC-INT) using HTML tags only. No Markdown.
<h3>0. KEY INTELLIGENCE QUESTIONS (KIQ)</h3>
List 3-5 critical missing details about events explicitly described in this transcript.
(Example: if a strike is mentioned but no weapon system is named, ask "What munition was used?")
Do NOT generate questions that require outside geopolitical context to formulate.
Numbered list, one sentence each.
NOTE: These are QUESTIONS only — not claims. Do not tag with confidence scores.
<p></p>
<h3>1. EXECUTIVE SUMMARY (BLUF)</h3>
High-level summary using only what was stated in the transcript.
Tag overall confidence at top: [OVERALL: Cx] — calculated as the most frequently assigned confidence tag across all Section 2 claims (statistical mode).
If cross-day memory is present, include one sentence on how today confirms/contradicts/updates yesterday's dominant story.
Write until complete — do not truncate.
<p></p>
<h3>2. GLOBAL CONFLICT RECAP (THE EVERYTHING LIST)</h3>
Bulleted list of EVERY major front or topic mentioned. 1-2 sentences per bullet.
REQUIRED — verify each of these appears if present in the source material:
Every named geographic front listed separately (never combine theaters);
Nuclear or WMD posture claims; Logistical claims (supply chains, rail, overland routes);
Diplomatic contacts (named officials, specific calls, specific terms offered);
Tactical vulnerability assessments; Audience polls on geopolitical topics (tag [C1]);
Specific day markers or timeline references;
Cyber operations, electronic warfare, infrastructure attacks;
Legal or government decrees (named officials, specific terms, named statutes).
HIERARCHY RULE: Geographic fronts take absolute precedence as headers.
If a logistical, diplomatic, cyber, or other thematic event is tied to a specific
geographic front, file it under that front's geographic header. Use thematic headers
(e.g., Global Logistics, Nuclear Posture, Cyber Operations) ONLY for broad claims
not tied to a specific theater.
GROUPING RULE: Each theater or topic gets its own bold header. Never place
unrelated developments under the same header (e.g. Cuba activity does not
belong under a China header).
EVIDENCE PRIORITY RULE: Physical or visual evidence (debris recovery, drone footage,
Oryx-confirmed wreckage) is higher-value than a host verbal estimate on the same topic.
If both exist in the source, the physical evidence is REQUIRED in the brief. The host
estimate is optional context. Never drop the physical evidence while keeping only the
verbal claim.
NAMED ACTOR RULE: If the source contains a specific list of named individuals (officials,
executives, military commanders), those names must appear in the brief. Never collapse a
named list into a generic label (e.g., do not write "top business leaders" when the
source names specific individuals). Names are intelligence. Generalizations are not.
Use <b></b> for topic titles. Tag each bullet with confidence score.
Apply cross-day tags [CONFIRMS YESTERDAY] etc. where directly applicable.
Only include topics explicitly discussed. Write until complete — do not truncate.
<p></p>
<h3>3. TACTICAL DEEP-DIVE: [INSERT SUBJECT HERE]</h3>
Select ONE subject using prioritization order above. State which priority tier applies.
TIE-BREAKER: If multiple subjects share the same priority tier, select the one with
the highest volume of associated claims in the transcript.
<p></p>
<b>BREAKING NEWS AND TACTICAL DEVELOPMENTS:</b> Specific weapon systems, unit movements, locations as stated. Tag each claim.<p></p>
<b>OSINT SOURCES AND METHODOLOGY:</b> Only sources the hosts named explicitly. No additions.<p></p>
<b>LOGISTICAL ANALYSIS:</b> Supply, movement, infrastructure details as described. Tag each claim.<p></p>
<b>NATIONAL SECURITY IMPLICATIONS:</b> Only second-order effects the hosts explicitly discussed. Tag each claim.<p></p>
<h3>4. PREDICTIVE REASONING</h3>
Forecasts and predictions stated by the hosts only. ALL automatically receive [C1].
Clearly attributed as host analysis throughout — never presented as fact.
Format as grouped topic sections with bold headers. Every prediction its own bullet.
<p></p>
<h3>5. CONFIDENCE SUMMARY</h3>
<b>C3 Claims:</b> X | <b>C2 Claims:</b> X | <b>C1 Claims:</b> X | <b>FLAGGED-VERIFY:</b> X<br>
<b>Cross-Day Tags:</b> X CONFIRMS | X CONTRADICTS | X UPDATES<br>
<b>Source Tier:</b> TIER C (YouTube Commentary — max confidence C3)<br>
<b>Overall Stream Reliability:</b> One sentence assessment of this stream's information quality.
<p></p>
STRICT RULES:
1. Output in strict HTML. No hashtags, asterisks, or Markdown. Permitted tags: <h3>, <b>, <p>, <ul>, <li>, <br>. Use <ul><li> for all bulleted lists. Never use Markdown hyphens or asterisks as bullets.
2. Every factual claim gets a confidence tag [C1], [C2], or [C3].
3. [FLAGGED-VERIFY] added alongside (not instead of) the confidence tag.
4. h3 for section headers. b for sub-headers.
5. Use <br><br> after every paragraph for spacing.
6. Section 4 predictions attributed as host analysis, not fact.
7. NEVER assign [C4] or [C5].
8. KIQ items in Section 0 are questions — do not tag with confidence scores.
9. Write every section to completion. Do not cut off mid-sentence.
TRANSCRIPT:
`,
  // ============================================================
  // SECTION 2 PROMPT — News Wire Analysis
  // ============================================================
  NEWS_PROMPT: `You are a Senior Intelligence Analyst reviewing professional wire service headlines.
Your ONLY source is the headlines provided. Every item MUST be labeled [SOURCE: outlet name].
Tier A sources (Reuters, BBC, AP, Al Jazeera, France 24, Guardian, Sky News, DW, NPR): highest reliability.
Tier B sources (Defense One, War on the Rocks, Foreign Policy, Kyiv Independent, Bellingcat, Middle East Eye, Times of Israel, UNIAN, ISW): analytical/regional specialty.
Weight Tier A confirmations more heavily than Tier B.
ISW SOURCE PROFILE (Tier B with structural caveats — apply when ISW appears):
The Institute for the Study of War is a Washington DC policy think tank, NOT a neutral
military intelligence agency. Its analytical output reflects three documented structural biases:
  • Neoconservative policy advocacy: ISW leadership network ("Kagan industrial complex")
    consistently advocates Western military interventionism. Strategic forecasts treat
    diplomatic/negotiated outcomes as appeasement and default to military solutions.
  • Defense-industrial funding: ISW receives substantial corporate sponsorship from RTX,
    General Dynamics, Northrop Grumman, CACI, and DynCorp. When ISW asserts a specific
    Western weapon system (F-16, ATACMS, Abrams, Patriot) is the missing variable for
    Ukrainian breakthrough, recognize this as correlated with sponsor financial interest.
  • Asymmetric source verification: ISW treats Ukrainian official claims as baseline fact
    while applying maximum skepticism to Russian official claims. This injects pro-Kyiv
    bias into the underlying data aggregation.
ISW DATA HANDLING — bifurcated approach:
  HIGH FIDELITY (weight heavily, treat as reliable factual baseline):
  • Geospatial coordinates, named units, geolocated visual confirmations
  • NASA FIRMS thermal anomaly data
  • Aggregated primary source links and Russian milblogger compilation
  • Daily Russian Offensive Campaign Assessment factual unit-tracking
  LOWER FIDELITY (weight lower, scrutinize for war optimism framing):
  • Strategic forecasts and prediction sections
  • Capture/control claims not yet visually confirmed by DeepStateUA
  • Narrative interpretation of why an operation succeeded or failed
  • Sections framing the conflict as imminently winnable with more weapons
WAR OPTIMISM PATTERNS to flag when present in ISW reporting:
  • Tactical burial: significant Ukrainian setbacks mentioned only in passing or buried
    deep in the assessment after extensive positive framing
  • Weapons-as-silver-bullet framing: claims that a specific Western system would
    decisively change the operational picture
  • Russian capability underestimation: dismissal of Russian adaptational capacity,
    drone warfare evolution, or industrial production rates
  • Lagging-indicator capture mapping: ISW claims a town/city is contested or held
    based on official Ukrainian acknowledgment without independent visual confirmation
ISW capture or control claims should be cross-validated against the visual confirmation
cadence of independent OSINT (DeepStateUA, geolocated footage timestamps) before
treating as ground truth in this brief.
Produce a WIRE SERVICE NEWS BRIEF using HTML only. No Markdown.
<h3>TOP WIRE SERVICE HEADLINES</h3>
List the 15-20 most geopolitically significant headlines. For each:
<b>Headline title</b> [SOURCE: Outlet Name] [Tier A or Tier B]<br>
1-2 sentence summary in your own words.<br>
Link: url
<p></p>
<h3>BREAKING DEVELOPMENTS</h3>
Stories confirmed by 2+ wire services: [MULTI-SOURCE CONFIRMED]
Stories from a single Tier A source: [SINGLE-SOURCE TIER A]
Stories from ISW alone that include strategic forecasting or weapons-procurement framing: [ISW-FORECAST — apply discounting heuristic]
These are not equivalent — distinguish clearly.
<p></p>
<h3>WIRE vs STREAM COMPARISON</h3>
IMPORTANT: The stream summary contains Section 2 (Global Conflict Recap) only.
This is the complete itemized list of stream claims — every claim appears once and only once.
Do not evaluate any claim more than one time.
For each claim, assign exactly one of:
[WIRE CONFIRMED]    — Wire service independently reports the same development
[PARTIAL ALIGNMENT] — Wire confirms the topic but not the specific detail claimed
[DISCREPANCY]       — Wire reporting contradicts or undermines the stream claim
[NOT IN WIRE]       — No wire coverage found (absence of evidence, not confirmation of falsity)
Evaluate every claim. Do not skip any. Do not combine multiple claims into one line.
REQUIRED FORMAT — follow this exactly:
- Each topic category gets its own bold header line: <b>Topic Category Name</b><br>
- Each claim beneath it gets its own line ending with <br>
- Do NOT write the topic category name inline at the start of a claim
- Do NOT run multiple claims together in a paragraph block
Write until complete — do not truncate.
<p></p>
RULES:
1. Every headline must have [SOURCE: outlet name]
2. HTML only — no Markdown
3. Focus on geopolitically relevant stories
4. Each claim evaluated exactly once — no duplicates
5. Write every section to completion — do not truncate
6. When ISW is the source, apply the bifurcated handling above
TODAY'S STREAM CLAIMS (Section 2 — Global Conflict Recap only):
{STREAM_SUMMARY}
WIRE HEADLINES:
`,
  // ============================================================
  // SECTION 3 PROMPT — Reddit OSINT Analysis
  // ============================================================
  REDDIT_PROMPT: `You are a Senior OSINT Analyst reviewing Reddit posts from geopolitical subreddits.
Your ONLY source is the Reddit posts listed below with their POST numbers.
Every item MUST be labeled [SOURCE: r/subredditname].
SUBREDDIT CREDIBILITY WEIGHTS:
HIGH (r/CredibleDefense, r/ukraine): sourced, moderated, analytical
MED  (r/worldnews, r/geopolitics, r/CombatFootage, r/UkraineWarVideoReport, r/UkraineRussiaReport,
      r/iran, r/MiddleEast, r/europe, r/NATO, r/RussiaUkraineWar2022, r/syriancivilwar, r/China): mixed quality
LOW  (r/IsraelPalestine, r/worldpolitics, r/GlobalPowers, r/AskMiddleEast): opinion/discussion
CONFIDENCE FOR REDDIT:
[C3] HIGH subreddit AND post links to a primary source (news article, gov doc, verified footage)
[C2] MED subreddit OR no primary source link present
[C1] LOW subreddit OR post is opinion, discussion, or speculation
============================================================
HALLUCINATION GUARD — YOUR MOST CRITICAL RULE
============================================================
The valid post numbers are listed at the top of the post list below as VALID POST NUMBERS.
You may ONLY cite post numbers from that list.
Citing a post number not in that list is fabrication — a critical failure.
THIS GUARD APPLIES TO EVERY SECTION:
- TOP DEVELOPMENTS: only describe posts that exist in the VALID list
- SENTIMENT ANALYSIS: do NOT cite POST numbers at all — topic and subreddit names only
- REDDIT vs STREAM: only cite POST numbers from the VALID list
PRE-FLIGHT CHECK before writing ANY POST number:
1. Look at the VALID POST NUMBERS list.
2. Confirm the number is in that list.
3. If not, write [NOT ON REDDIT] instead.
============================================================
CITATION FORMAT RULE
============================================================
In the REDDIT vs STREAM section, every line must follow this exact format:
  Claim text. [TAG] POST X
No parenthetical commentary inside or after the POST number.
No editorial notes. No qualifications.
Just: the claim, the tag, and the POST number. Nothing else on that line.
CITATION RELEVANCE RULE: Only cite a POST number if that post directly reports the same
specific fact, figure, or event as the stream claim. If the closest post covers the topic
but not the specific claim, write [NOT ON REDDIT] instead.
============================================================
NO BONUS ITEMS RULE
============================================================
The REDDIT vs STREAM section evaluates ONLY the stream claims provided below.
Do NOT add extra items. Nothing else belongs in that section.
============================================================
CROSS-SECTION CITATION RULE
============================================================
In REDDIT vs STREAM, you may ONLY cite POST numbers already described in TOP DEVELOPMENTS.
============================================================
POST NUMBER ACCURACY RULE
============================================================
Every entry in TOP DEVELOPMENTS must begin with "POST X —" using the ORIGINAL post number.
When writing REDDIT vs STREAM citations, scan your TOP DEVELOPMENTS entries,
find the "POST X —" label, and copy that number exactly.
Produce a REDDIT OSINT SCAN using HTML only. No Markdown.
<h3>TOP DEVELOPMENTS FROM REDDIT</h3>
List 15-20 most significant posts. For each entry:
POST X — <b>Topic title</b> [SOURCE: r/subredditname] [Cx] [Subreddit weight: HIGH/MED/LOW]<br>
1-2 sentence summary.<br>
Link: url<br>
<p></p>
<h3>REDDIT SENTIMENT ANALYSIS</h3>
What topics are generating the most engagement?
What is the overall tone — alarmed, analytical, skeptical, partisan?
Note any narratives that appear coordinated or disproportionately amplified.
CRITICAL: Do NOT cite POST numbers here. Use topic and subreddit descriptions only.
<p></p>
<h3>REDDIT vs STREAM COMPARISON</h3>
IMPORTANT: Evaluate ONLY the stream claims listed below — one tag per claim, nothing more.
CROSS-SECTION RULE: Only cite POST numbers labeled in TOP DEVELOPMENTS above.
ACCURACY RULE: Find the matching "POST X —" label in TOP DEVELOPMENTS and copy the number.
For each claim, assign exactly one of:
[REDDIT CORROBORATES] — Multiple posts support this claim
[REDDIT MENTIONS]     — At least one post touches this topic
[REDDIT CONTRADICTS]  — Posts directly contradict this claim
[NOT ON REDDIT]       — No posts found, OR matching post not in TOP DEVELOPMENTS
Format: Claim text [C-rating]. [TAG] POST X
        (no match: Claim text [C-rating]. [NOT ON REDDIT])
Write until every stream claim is evaluated. Do not truncate.
<p></p>
RULES:
1. Every item MUST have [SOURCE: r/subredditname]
2. HTML only — no Markdown
3. Never present Reddit claims as confirmed fact
4. LOW subreddit posts are lowest weight
5. ONLY cite POST numbers from the VALID list
6. SENTIMENT ANALYSIS never cites POST numbers
7. Each claim evaluated exactly once
8. No bonus items in comparison — only stream claims
9. No editorial commentary inside citation lines
10. REDDIT vs STREAM may only cite POST numbers labeled in TOP DEVELOPMENTS
11. Every TOP DEVELOPMENTS entry begins with "POST X —" using original POST number
12. Only cite a POST when it directly reports the same specific fact — not just same topic
TODAY'S STREAM CLAIMS (Section 2 — Global Conflict Recap only):
{STREAM_SUMMARY}
THE POST LIST FOLLOWS. VALID POST NUMBERS ARE LISTED FIRST.
REDDIT POSTS:
`,
  // ============================================================
  // DIGEST PROMPT — 2-Minute Executive Summary
  // ============================================================
  DIGEST_PROMPT: `You are a Senior Intelligence Analyst writing a concise executive brief.
You are given plain-text summaries of three intelligence sources from the same day:
  Section 1: YouTube stream analysis (TIER C — max confidence C3)
  Section 2: Wire service news brief (TIER A/B)
  Section 3: Reddit OSINT scan (unverified community intelligence)
Produce a 2-MINUTE EXECUTIVE DIGEST using HTML only. No Markdown.
This is the SHORT version — write for a reader who will NOT read the full brief today.
Be direct, specific, and concrete. No filler sentences.
<h3 style="margin:0 0 6px 0;">🌐 SITUATION IN ONE SENTENCE</h3>
One sentence capturing the dominant geopolitical story of the day.<br><br>
<h3 style="margin:0 0 6px 0;">📌 TOP 5 DEVELOPMENTS</h3>
The five most significant developments across all three sources. For each:<br>
<b>Topic</b> — one sentence summary. [SOURCE: Wire/Stream/Reddit] [Cx if from stream or Reddit]<br>
Order by significance — most important first. No additional commentary after the source tag.<br><br>
<h3 style="margin:0 0 6px 0;">⚠️ CONFIDENCE NOTE</h3>
One sentence flagging the most important cross-source discrepancy or caveat a reader must hold in mind today.
Check ALL three source pairs for contradictions: wire vs stream, Reddit vs stream, and Reddit vs wire.
Flag whichever contradiction is most significant.
If no direct contradiction exists, flag the most important unverified claim instead.<br><br>
<h3 style="margin:0 0 6px 0;">👁️ WATCH LIST</h3>
Three specific things to monitor in the next 24-48 hours.
REQUIRED FORMAT — each item on its own line, separated by <br>. Do NOT run items together.
Write exactly three items. No numbering. No bullet characters.<br>
RULES:
1. HTML only. No Markdown.
2. Do not repeat the same development twice.
3. Prefer wire-confirmed developments over stream-only or Reddit-only claims.
4. Check all three source pairs for contradictions. Flag the most significant.
5. No additional headers or sections beyond the four specified above.
6. Do not truncate — write all five developments and all three watch items in full.
SECTION 1 — STREAM ANALYSIS (plain text):
{STREAM_BRIEF}
SECTION 2 — WIRE NEWS BRIEF (plain text):
{NEWS_BRIEF}
SECTION 3 — REDDIT OSINT (plain text):
{REDDIT_BRIEF}
`,
  // ============================================================
  // CLAIM AGING PROMPT — Daily verification of open claims
  // ============================================================
  CLAIM_AGING_PROMPT: `You are an intelligence analyst performing claim verification.
Below are OPEN CLAIMS from previous daily briefs that were not confirmed by wire services at the time.
Also below are TODAY'S wire headlines.
For each claim, determine its current status:
CONFIRMED    — Today's wire independently reports the same development
CONTRADICTED — Today's wire reporting contradicts this claim
STILL OPEN   — No wire coverage found today; claim remains unverified
Return ONLY valid JSON — no other text, no markdown, no backticks:
{"results":[{"claimId":1,"status":"CONFIRMED","note":"brief one-sentence explanation"},{"claimId":2,"status":"STILL OPEN","note":""}]}
OPEN CLAIMS:
{CLAIMS}
TODAY'S WIRE HEADLINES:
{HEADLINES}
{HEADLINES}
`,
  // ============================================================
  // URGENCY ASSESSMENT PROMPT — Stage 4 alerting
  // ============================================================
  URGENCY_PROMPT: `You are an intelligence triage officer. Assess whether today's brief contains genuinely major, historically significant news warranting an immediate push notification to phones.

URGENCY SCALE:
1 — Routine daily update. Standard developments in ongoing conflicts.
2 — Notable but expected. Significant within context, not structurally new.
3 — Meaningful escalation or reversal. Story shifted but fits known patterns.
4 — Major structural shift. New actor enters conflict, new theater opened, unprecedented weapon use, capital city struck, ceasefire announced or collapsed, senior military/political leader confirmed killed.
5 — Historic rupture. Nuclear weapon use or credible imminent launch, NATO Article 5 invoked, head of state killed, major Western city struck, direct US/NATO kinetic engagement with Russia or Iran.

CRITICAL RULE: Default to 1 or 2. Routine strikes, standard frontline movement, typical diplomatic statements, weapons deliveries, and ongoing bombardment campaigns are ALWAYS 1 or 2 no matter how large the numbers. Only assign 4+ when something categorically new has happened — an event type that has not occurred before in this conflict cycle.

PIPELINE STRESS MODIFIERS — these can raise your score by +1 if the underlying event is already a 3+:
- Wire DISCREPANCY count today: {DISCREPANCY_COUNT}
- FLAGGED-VERIFY claim count today: {FLAGGED_COUNT}
- CONTRADICTS YESTERDAY count: {CONTRADICTS_COUNT}

Return ONLY valid JSON — no other text, no markdown, no backticks:
{"level":1,"reason":"one sentence plain English explanation of why this score","headline":"10 words max — the notification title if sent"}

TODAY'S EXECUTIVE DIGEST:
{DIGEST}`
}; // end CONFIG
// ============================================================
// SCRIPT PROPERTIES HELPERS
// ============================================================
function storeApiKeys() {
  Logger.log("storeApiKeys() is a reference function only.");
  Logger.log("Enter keys manually in: Project Settings → Script Properties");
  Logger.log("Required: CLAUDE_API_KEY, GEMINI_API_KEY, YOUTUBE_API_KEY, SUPADATA_API_KEY");
}
function testScriptProperties() {
  const keys = ["CLAUDE_API_KEY","GEMINI_API_KEY","YOUTUBE_API_KEY","SUPADATA_API_KEY"];
  keys.forEach(function(k) {
    const v = PROPS.getProperty(k) || "";
    Logger.log(k + ": " + (v.length > 0 ? "LOADED (" + v.length + " chars)" : "MISSING"));
  });
}
// ============================================================
// PIPELINE STATE MANAGEMENT
// ============================================================
function _getPipelineCacheSheet() {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var sheet = ss.getSheetByName("Pipeline Cache");
  if (!sheet) {
    sheet = ss.insertSheet("Pipeline Cache");
    sheet.appendRow(["Key", "Value"]);
    sheet.getRange(1,1,1,2).setFontWeight("bold").setBackground("#1a1a2e").setFontColor("#ffffff");
    sheet.setColumnWidth(1, 180);
    sheet.setColumnWidth(2, 800);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
function _savePipelineContent(key, value) {
  var sheet = _getPipelineCacheSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) { sheet.getRange(i+1,2).setValue(value); return; }
  }
  sheet.appendRow([key, value]);
}
function _loadPipelineContent(key) {
  var sheet = _getPipelineCacheSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) return String(data[i][1] || "");
  }
  return "";
}
function _clearPipelineState() {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    var sheet = ss.getSheetByName("Pipeline Cache");
    if (sheet) {
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) sheet.getRange(2,1,lastRow-1,2).clearContent();
    }
    var props = PropertiesService.getScriptProperties();
    props.deleteProperty("PIPELINE_META");
    props.deleteProperty("PIPELINE_TRIGGER_ID");
  } catch(e) { Logger.log("_clearPipelineState error: " + e.message); }
}
function _savePipelineMeta(obj) {
  PropertiesService.getScriptProperties().setProperty("PIPELINE_META", JSON.stringify(obj));
}
function _loadPipelineMeta() {
  var raw = PropertiesService.getScriptProperties().getProperty("PIPELINE_META");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch(e) { return null; }
}
function _scheduleNextStage() {
  _deleteExistingContinuationTrigger();
  var trigger = ScriptApp.newTrigger("continueOSINTPipeline").timeBased().after(90*1000).create();
  PropertiesService.getScriptProperties().setProperty("PIPELINE_TRIGGER_ID", trigger.getUniqueId());
  Logger.log("Next stage scheduled. Trigger ID: " + trigger.getUniqueId());
}
function _deleteExistingContinuationTrigger() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("PIPELINE_TRIGGER_ID");
  if (!id) return;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getUniqueId() === id && t.getHandlerFunction() === "continueOSINTPipeline") {
      ScriptApp.deleteTrigger(t);
      Logger.log("Deleted continuation trigger: " + id);
    }
  });
  props.deleteProperty("PIPELINE_TRIGGER_ID");
}
// ============================================================
// STAGE 1 — Transcript fetch + AI analysis
// FIX: Large transcripts (>200K chars) defer Claude synthesis
//      to Stage 2 to avoid the 6-minute execution time limit.
// ============================================================
function runOSINTPipeline() {
  Logger.log("=== OSINT Daily Pipeline v2.22 — Stage 1 Starting ===");
  _clearPipelineState();
  PropertiesService.getScriptProperties().deleteProperty("STAGE4_COMPLETE");
  try {
    const videoId = CONFIG.SPECIFIC_VIDEO_ID || getLatestLivestreamId(CONFIG.YOUTUBE_CHANNEL_ID);
    if (!videoId) throw new Error("No video ID found.");
    Logger.log("Video ID: " + videoId);
    const videoMeta = getVideoMetadata(videoId);
    Logger.log("Title: " + videoMeta.title);
    const transcript = getYouTubeTranscript(videoId);
    if (!transcript || transcript.length < 100) {
      throw new Error("Transcript unavailable. (Got " + (transcript ? transcript.length : 0) + " chars)");
    }
    Logger.log("Transcript: " + transcript.length + " chars");
    const MAX_CHARS = 200000;
    let needsSynthesis = false;
    if (transcript.length <= MAX_CHARS) {
      // Short transcript: single-pass Claude, fits within 6-min budget
      const intelBrief = analyzeWithAI(transcript, videoMeta);
      Logger.log("Stream analysis done (Claude): " + intelBrief.length + " chars");
      const streamSummary = extractStreamSummary(intelBrief);
      Logger.log("Stream summary extracted: " + streamSummary.length + " chars");
      _savePipelineContent("intelBrief",    intelBrief);
      _savePipelineContent("streamSummary", streamSummary);
    } else {
      // Large transcript: Gemini extraction only in Stage 1.
      // Claude synthesis deferred to Stage 2 to avoid 6-min timeout.
      Logger.log("Large transcript (" + transcript.length + " chars). Gemini extraction only in Stage 1...");
      // Load cross-day memory here since analyzeWithAI won't be called
      const yesterday = loadYesterdayMemory();
      let crossDayNote = "";
      if (yesterday && yesterday.streamSummary && yesterday.streamSummary.length > 50) {
        crossDayNote =
          "\n\n[CROSS-DAY MEMORY — FOR COMPARISON ONLY — DO NOT TREAT AS TODAY'S TRANSCRIPT SOURCE]\n" +
          "Yesterday's Date: " + yesterday.date + "\n" +
          "Yesterday's Stream: " + yesterday.videoTitle + "\n" +
          "Yesterday's Key Claims (Section 2):\n" + yesterday.streamSummary.substring(0, 3000) + "\n" +
          "[END CROSS-DAY MEMORY]\n\n";
        Logger.log("Cross-day memory loaded from: " + yesterday.date);
      } else {
        Logger.log("No cross-day memory — running without comparison.");
      }
      const chunks = chunkText(transcript, MAX_CHARS);
      const partialSummaries = [];
      for (let i = 0; i < chunks.length; i++) {
        Logger.log("Extracting chunk " + (i+1) + "/" + chunks.length + " via Gemini...");
        const partPrompt =
  "This is PART " + (i+1) + " of " + chunks.length + " of a long livestream transcript.\n" +
  "STEP 1: Silently correct transcription errors in proper nouns and military terminology before extracting.\n" +
  "Common phonetic garble patterns to fix: 'cob cages' → 'cope cages', 'Hezbola' → 'Hezbollah', " +
  "'Tran' → 'Iran', 'USNS Pillow' → correct vessel name using context, " +
  "'winter mechanized brigade' or similar descriptive garble → 93rd Mechanized Brigade, " +
  "'41st mechanized' → 41st Separate Mechanized Brigade. " +
  "Any Ukrainian unit number followed by 'mechanized,' 'assault,' or 'separate' — preserve the exact number; never replace it with a descriptive label. " +
  "When a term is garbled beyond recovery, append [PHONETIC?] after your best correction.\n" +

  "STEP 2: Extract ONLY the following — no filler, no commentary:\n" +
"  • Kinetic events (strikes, attacks, explosions, casualties) — include specific unit names, brigade designations, and force sizes when stated\n" +
"  • Naval operations — include mine-laying, swarm tactics, blockade actions, and vessel seizures with exact numbers when given\n" +
"  • Force movements (deployments, withdrawals, buildups) — include troop/equipment counts and named locations\n" +
"  • Weapon systems named explicitly — list each system as its own bullet\n" +
"  • Operational mechanics and physical constraints — how or why an operation succeeded or failed (terrain, draft limits, ROE, logistical chokepoints, altitude ceilings) — include specific technical details when stated; ALSO extract any vector or attack method the host explicitly rules out, as 'ruled out' findings are operational constraints\n" +
"  • Specific target lists — when hosts name individual locations, hubs, ports, refineries, or nodes, list EACH as its own bullet; never collapse into 'various locations' or 'multiple targets'\n" +
"  • Cyber operations, electronic warfare, information control, or internet shutdowns\n" +
"  • Named sources or outlets cited by the hosts\n" +
"  • Host predictions or forecasts — label each [HOST FORECAST]\n" +
"  • Diplomatic claims — REQUIRED: include the full name and title of every named official; never write 'UAE official' or 'Iranian spokesperson' when a specific name was given; named officials are intelligence\n" +
"  • Information control actions — REQUIRED: if a named head of state or senior official characterizes a category of speech as treasonous, illegal, or suppressed, extract verbatim with the speaker named\n" +
"  • Named target locations — REQUIRED: every named geographic target (island, refinery, port, facility) is its own bullet; never generalize a specific name into a region name\n" +
"  • Legal or government decrees cited by name or number\n" +
"  • Medical or biological threat specifics — include fatality rates, incubation periods, transmission details when stated\n" +
"  • Media and information environment — accreditation stripping, broadcast delays, state censorship actions\n" +
"  • Military response actions by allied or third-party nations (Latvia, UAE, Saudi Arabia, etc.)\n" +
"  • Audience polls on geopolitical topics — include the question and result percentages when stated; NOTE: these are NOT excluded as channel metrics\n" +
"STEP 3 — HARD EXCLUSIONS. Do NOT extract any of the following:\n\n" +
"HISTORICAL TANGENTS:\n" +
"Before extracting anything historical, ask: is this event happening NOW? If yes, extract it. " +
"If the host is using it as a comparison, analogy, or lesson, exclude it entirely.\n" +
"Hard exclude: Battle of Little Bighorn, Custer, Springfield trapdoor rifles, lever-action rifles (1800s context), " +
"Standard Oil, Carnegie, Vanderbilt, trustbusting, Gilded Age, Civil War references, WWI/WWII analogies used as comparisons.\n" +
"Exception: if a historical example leads to a specific prediction about a NAMED current actor, " +
"extract the prediction only — drop the historical framing entirely.\n\n" +
"DOMESTIC US EVENTS UNRELATED TO CONFLICT:\n" +
"Exclude any US domestic crime, accident, infrastructure failure, or court case with no direct " +
"link to the monitored conflicts. Examples: bridge collapses, DOJ charges against non-conflict actors, " +
"domestic economic debates unless explicitly tied to a named military aid package.\n\n" +
"STREAM GIMMICKS:\n" +
"The channel uses Morse code decoders, donation sound effects, and viewer message games. Exclude:\n" +
"  • Any Morse code message or decoded output from stream gimmicks\n" +
"  • Donation or superchat readings unless the host explicitly validates the content with his own sourcing\n" +
"  • Viewer poll results UNLESS the host frames it as a geopolitical question (those go in Audience Polls)\n\n" +
"HOST EMOTIONAL STATES:\n" +
"Do not extract 'host feels,' 'host fears,' 'host has a negative opinion of,' or 'host is frustrated by' " +
"unless directly paired with a specific named claim or prediction. Extract the claim — discard the emotional framing.\n\n" +
"STANDARD EXCLUSIONS:\n" +
"  • YouTube or channel metrics (subscriber counts, view counts, analytics, donation callouts)\n" +
"  • Live chat audience comments, questions, or theories — UNLESS the host explicitly validates them\n" +
"  • If the host reads a chat theory and then DEBUNKS it, extract only the host's conclusion\n" +
"  • Public health content unrelated to military operations\n" +
"  • If it would not appear in an ISW daily update, do not extract it\n\n" +
"Output ONLY plain bullet points. Be exhaustive — do not combine separate claims into one bullet.\n" +
"If a bullet point is incomplete due to segment boundary, end it with [TRUNCATED].\n" +
"If a chunk contains no relevant content: [No significant content in this segment]\n\n" +
  "TRANSCRIPT PART " + (i+1) + "/" + chunks.length + ":\n" + chunks[i];
        partialSummaries.push("=== EXTRACTED SEGMENT " + (i+1) + " OF " + chunks.length + " ===\n" +
          callGeminiMax(partPrompt));
        Utilities.sleep(1500);
      }
      const assembledBullets =
        "[NOTE: The following are pre-extracted bullet points from a " + chunks.length +
        "-segment transcript. Use ONLY these bullets as your source — do not add outside knowledge.]\n\n" +
        partialSummaries.join("\n\n");
      _savePipelineContent("extractedBullets", assembledBullets);
      _savePipelineContent("crossDayNote",     crossDayNote);
      Logger.log("Gemini extraction complete (" + assembledBullets.length + " chars). Claude synthesis deferred to Stage 2.");
      needsSynthesis = true;
    }
    _savePipelineMeta({
      stage:            2,
      needsSynthesis:   needsSynthesis,
      videoId:          videoMeta.id,
      videoTitle:       videoMeta.title,
      videoUrl:         videoMeta.url,
      channelTitle:     videoMeta.channelTitle || "",
      transcriptLength: transcript.length
    });
    Logger.log("Stage 1 complete. Scheduling Stage 2 in 90s...");
    _scheduleNextStage();
  } catch(e) {
    Logger.log("PIPELINE ERROR (Stage 1): " + e.message);
    _clearPipelineState();
    MailApp.sendEmail(CONFIG.EMAIL_RECIPIENTS[0], "OSINT Pipeline Error — Stage 1",
      "Stage 1 failed:\n\n" + e.message + "\n\nCheck Apps Script logs.");
  }
}
// ============================================================
// STAGE DISPATCHER
// ============================================================
function continueOSINTPipeline() {
  _deleteExistingContinuationTrigger();
  const meta = _loadPipelineMeta();
  if (!meta || !meta.stage) {
    Logger.log("continueOSINTPipeline: No pipeline state found.");
    return;
  }
  Logger.log("=== OSINT Pipeline v2.22 — Stage " + meta.stage + " Starting ===");
  try {
    if      (meta.stage === 2) { _runPipelineStage2(meta); }
    else if (meta.stage === 3) { _runPipelineStage3(meta); }
    else if (meta.stage === 4) { _runPipelineStage4(meta); }
    else { Logger.log("Unknown stage " + meta.stage + ". Clearing."); _clearPipelineState(); }
  } catch(e) {
    Logger.log("PIPELINE ERROR (Stage " + meta.stage + "): " + e.message);
    _clearPipelineState();
    MailApp.sendEmail(CONFIG.EMAIL_RECIPIENTS[0], "OSINT Pipeline Error — Stage " + meta.stage,
      "Stage " + meta.stage + " failed:\n\n" + e.message + "\n\nCheck Apps Script logs.");
  }
}
// ============================================================
// STAGE 2 — (Deferred synthesis if needed) + News wire
// ============================================================
function _runPipelineStage2(meta) {
  if (meta.needsSynthesis) {
    Logger.log("Stage 2: Running deferred Claude synthesis...");
    const bullets      = _loadPipelineContent("extractedBullets");
    const crossDayNote = _loadPipelineContent("crossDayNote");
    const intelBrief   = callClaude(CONFIG.INTEL_PROMPT + crossDayNote + bullets, 8192);
    Logger.log("Deferred synthesis done (Claude): " + intelBrief.length + " chars");
    const streamSummary = extractStreamSummary(intelBrief);
    _savePipelineContent("intelBrief",    intelBrief);
    _savePipelineContent("streamSummary", streamSummary);
    Logger.log("Stream summary extracted: " + streamSummary.length + " chars");
    _saveExtractedBulletsToLog(bullets, meta);
  }
  const streamSummary = _loadPipelineContent("streamSummary");
  const newsHeadlines = fetchNewsWire();
  Logger.log("News headlines fetched: " + newsHeadlines.length);
  const newsBrief = analyzeNewsWire(newsHeadlines, streamSummary);
  Logger.log("News brief done (Claude): " + newsBrief.length + " chars");
  _savePipelineContent("newsBrief",     newsBrief);
  _savePipelineContent("newsHeadlines", JSON.stringify(newsHeadlines.slice(0,30)));
  _savePipelineMeta(Object.assign({}, meta, { stage: 3 }));
  Logger.log("Stage 2 complete. Scheduling Stage 3 in 90s...");
  _scheduleNextStage();
}
// ============================================================
// STAGE 3 — Reddit fetch + Claude analysis
// ============================================================
function _runPipelineStage3(meta) {
  const streamSummary = _loadPipelineContent("streamSummary");
  const redditPosts   = fetchRedditRSS();
  Logger.log("Reddit posts fetched: " + redditPosts.length);
  const redditBrief = analyzeReddit(redditPosts, streamSummary);
  Logger.log("Reddit brief done (Claude): " + redditBrief.length + " chars");
  _savePipelineContent("redditBrief", redditBrief);
  _savePipelineMeta(Object.assign({}, meta, { stage: 4 }));
  Logger.log("Stage 3 complete. Scheduling Stage 4 in 90s...");
  _scheduleNextStage();
}
// ============================================================
// STAGE 4 — Digest + scorecard + log + email + memory + claims
// ============================================================
function _runPipelineStage4(meta) {
  const intelBrief   = _loadPipelineContent("intelBrief");
  const newsBrief    = _loadPipelineContent("newsBrief");
  const redditBrief  = _loadPipelineContent("redditBrief");
  const headlinesRaw = _loadPipelineContent("newsHeadlines");
  const newsHeadlines = headlinesRaw ? JSON.parse(headlinesRaw) : [];
  const videoMeta = {
    id:           meta.videoId,
    title:        meta.videoTitle,
    url:          meta.videoUrl,
    channelTitle: meta.channelTitle || ""
  };
  const date = new Date().toLocaleDateString("en-US", {year:"numeric",month:"long",day:"numeric"});
  saveToMemory(videoMeta, _loadPipelineContent("streamSummary"), intelBrief);
  Logger.log("Saved to Daily Memory.");
  extractAndSaveClaims(newsBrief, intelBrief, videoMeta, date);
  Logger.log("Claims saved to Claim Tracker.");
  updateReliabilityScorecard(videoMeta, intelBrief, newsHeadlines);
  Logger.log("Reliability scorecard updated.");
  logToSheet(videoMeta, intelBrief, meta.transcriptLength, newsBrief, redditBrief);
  Logger.log("Logged to Intel Log sheet.");
  const digestHtml = generateShortDigest(intelBrief, newsBrief, redditBrief);
  Logger.log("Executive digest done (Claude): " + digestHtml.length + " chars");
  sendEmailBrief(videoMeta, intelBrief, newsBrief, redditBrief, digestHtml);
  Logger.log("Email sent to " + CONFIG.EMAIL_RECIPIENTS.length + " recipients.");
  assessUrgencyAndNotify(digestHtml, intelBrief, newsBrief);
  PropertiesService.getScriptProperties().setProperty("STAGE4_COMPLETE", "true");
  _clearPipelineState();
  PropertiesService.getScriptProperties().deleteProperty("STAGE4_COMPLETE");
  Logger.log("=== Daily Pipeline v2.22 Complete ===");
}
// ============================================================
// STAGE 4 RECOVERY
// ============================================================
function recoverStage4() {
  Logger.log("=== recoverStage4() called ===");
  const complete = PropertiesService.getScriptProperties().getProperty("STAGE4_COMPLETE");
  if (complete === "true") {
    Logger.log("Stage 4 already completed. Clearing residual state.");
    _clearPipelineState();
    PropertiesService.getScriptProperties().deleteProperty("STAGE4_COMPLETE");
    return;
  }
  const meta = _loadPipelineMeta();
  if (!meta) {
    Logger.log("recoverStage4: No pipeline meta found. Nothing to recover.");
    return;
  }
  Logger.log("recoverStage4: Re-running Stage 4...");
  try {
    _runPipelineStage4(meta);
    Logger.log("recoverStage4: Recovery complete.");
  } catch(e) {
    Logger.log("recoverStage4 error: " + e.message);
    MailApp.sendEmail(CONFIG.EMAIL_RECIPIENTS[0], "OSINT Recovery Error — Stage 4",
      "Stage 4 recovery failed:\n\n" + e.message);
  }
}
// ============================================================
// EXTRACT STREAM SUMMARY (Section 2 only, plain text)
// ============================================================
function extractStreamSummary(intelBrief) {
  const plain = intelBrief.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
  const section2Index = plain.indexOf("2. GLOBAL CONFLICT RECAP");
  const trimmed = section2Index > -1 ? plain.substring(section2Index) : plain;
  const section3Index = trimmed.indexOf("3. TACTICAL DEEP-DIVE");
  const claimsOnly = section3Index > -1 ? trimmed.substring(0, section3Index) : trimmed;
  const capped = claimsOnly.substring(0, 10000);
  const lastPeriod = capped.lastIndexOf(".");
  return lastPeriod > 7000 ? capped.substring(0, lastPeriod+1) : capped;
}
// ============================================================
// GET LATEST LIVESTREAM
// ============================================================
function getLatestLivestreamId(channelId) {
  const url = "https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=" + channelId +
    "&type=video&eventType=completed&order=date&maxResults=1&key=" + CONFIG.YOUTUBE_API_KEY;
  const data = JSON.parse(UrlFetchApp.fetch(url, {muteHttpExceptions:true}).getContentText());
  if (data.items && data.items.length > 0) return data.items[0].id.videoId;
  const fallback = "https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=" + channelId +
    "&type=video&order=date&maxResults=1&key=" + CONFIG.YOUTUBE_API_KEY;
  const fbData = JSON.parse(UrlFetchApp.fetch(fallback, {muteHttpExceptions:true}).getContentText());
  if (fbData.items && fbData.items.length > 0) return fbData.items[0].id.videoId;
  return null;
}
// ============================================================
// GET VIDEO METADATA
// ============================================================
function getVideoMetadata(videoId) {
  const url = "https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=" +
    videoId + "&key=" + CONFIG.YOUTUBE_API_KEY;
  const data = JSON.parse(UrlFetchApp.fetch(url, {muteHttpExceptions:true}).getContentText());
  if (data.items && data.items.length > 0) {
    const s = data.items[0].snippet;
    return { id: videoId, title: s.title, publishedAt: s.publishedAt,
             channelTitle: s.channelTitle, url: "https://youtube.com/watch?v=" + videoId };
  }
  return { id: videoId, title: "Unknown", channelTitle: "",
           url: "https://youtube.com/watch?v=" + videoId };
}
// ============================================================
// GET TRANSCRIPT — Supadata with retry
// ============================================================
function getYouTubeTranscript(videoId) {
  Logger.log("Fetching transcript via Supadata...");
  const MAX_RETRIES  = 3;
  const RETRY_DELAYS = [3000, 8000, 20000];
  for (var attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const url = "https://api.supadata.ai/v1/youtube/transcript?url=https://www.youtube.com/watch?v=" +
        videoId + "&text=true";
      const resp = UrlFetchApp.fetch(url, {
        muteHttpExceptions: true,
        headers: { "x-api-key": CONFIG.SUPADATA_API_KEY }
      });
      const code = resp.getResponseCode();
      const body = resp.getContentText();
      Logger.log("Supadata response (attempt " + attempt + "): " + code);
      if (code === 200) {
        const data = JSON.parse(body);
        if (data.content && data.content.length > 100) {
          Logger.log("Transcript: " + data.content.length + " chars");
          return data.content;
        }
        Logger.log("Supadata 200 but content too short: " + body.substring(0,200));
      } else if (code === 502 || code === 503 || code === 429) {
        Logger.log("Supadata transient error " + code + " on attempt " + attempt);
      } else {
        Logger.log("Supadata non-retryable error " + code + ": " + body.substring(0,200));
        return null;
      }
    } catch(e) {
      Logger.log("Supadata fetch exception (attempt " + attempt + "): " + e.message);
    }
    if (attempt < MAX_RETRIES) {
      var delay = RETRY_DELAYS[attempt-1];
      Logger.log("Retrying in " + (delay/1000) + "s...");
      Utilities.sleep(delay);
    }
  }
  Logger.log("Supadata failed after " + MAX_RETRIES + " attempts.");
  return null;
}
// ============================================================
// FETCH NEWS WIRE RSS
// ============================================================
function fetchNewsWire() {
  const allHeadlines = [];
  CONFIG.NEWS_FEEDS.forEach(function(feed) {
    try {
      const resp = UrlFetchApp.fetch(feed.url, {
        muteHttpExceptions: true,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; OSINTBot/2.22)" }
      });
      if (resp.getResponseCode() === 200) {
        const items = parseNewsRSS(resp.getContentText(), feed.name, feed.tier);
        items.slice(0, CONFIG.NEWS_HEADLINES_PER_SOURCE).forEach(function(item) {
          allHeadlines.push(item);
        });
        Logger.log(feed.name + " [Tier " + feed.tier + "]: " + items.length + " headlines");
      } else {
        Logger.log(feed.name + " failed: " + resp.getResponseCode());
      }
      Utilities.sleep(300);
    } catch(e) { Logger.log(feed.name + " error: " + e.message); }
  });
  Logger.log("Total wire headlines: " + allHeadlines.length);
  return allHeadlines;
}
// ============================================================
// FETCH REDDIT RSS
// ============================================================
function fetchRedditRSS() {
  const allPosts = [];
  CONFIG.REDDIT_SUBS.forEach(function(sub) {
    try {
      const url = "https://www.reddit.com/r/" + sub.name +
        "/top.rss?t=day&limit=" + CONFIG.REDDIT_POSTS_PER_SUB;
      const resp = UrlFetchApp.fetch(url, {
        muteHttpExceptions: true,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; OSINTBot/2.22)" }
      });
      if (resp.getResponseCode() === 200) {
        const parsed = parseRSS(resp.getContentText(), sub.name, sub.weight);
        parsed.forEach(function(p) { allPosts.push(p); });
        Logger.log("r/" + sub.name + " [" + sub.weight + "]: " + parsed.length + " posts");
      } else {
        Logger.log("r/" + sub.name + " failed: " + resp.getResponseCode());
      }
      Utilities.sleep(400);
    } catch(e) { Logger.log("r/" + sub.name + " error: " + e.message); }
  });
  Logger.log("Total Reddit posts: " + allPosts.length);
  return allPosts;
}
// ============================================================
// PARSE NEWS RSS
// ============================================================
function parseNewsRSS(xml, sourceName, tier) {
  const items = [];
  try {
    const entries = xml.match(/<item>([\s\S]*?)<\/item>/g) ||
                    xml.match(/<entry>([\s\S]*?)<\/entry>/g);
    if (!entries) return items;
    entries.forEach(function(entry) {
      try {
        const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/);
        const title = titleMatch ? cleanText(titleMatch[1]) : "";
        const linkMatch = entry.match(/<link[^>]*href="([^"]+)"/) ||
                          entry.match(/<link>([\s\S]*?)<\/link>/);
        const link = linkMatch ? linkMatch[1].trim() : "";
        const descMatch = entry.match(/<description[^>]*>([\s\S]*?)<\/description>/) ||
                          entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
        const desc = descMatch ? cleanText(descMatch[1]).substring(0,300) : "";
        if (title && title.length > 5) {
          items.push({ source: sourceName, tier: tier||"B", title: title, url: link, description: desc });
        }
      } catch(e) {}
    });
  } catch(e) { Logger.log("News RSS parse error: " + e.message); }
  return items;
}
// ============================================================
// PARSE REDDIT RSS
// ============================================================
function parseRSS(xml, subreddit, weight) {
  const posts = [];
  try {
    const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g);
    if (!entries) return posts;
    entries.forEach(function(entry) {
      try {
        const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/);
        const title = titleMatch ? cleanText(titleMatch[1]) : "";
        const linkMatch = entry.match(/<link[^>]*href="([^"]+)"/);
        const link = linkMatch ? linkMatch[1] : "";
        const contentMatch = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/) ||
                             entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
        const content = contentMatch ? cleanText(contentMatch[1]).substring(0,400) : "";
        if (title.toLowerCase().includes("mod post") ||
            title.toLowerCase().includes("weekly thread") ||
            title.toLowerCase().includes("daily discussion")) return;
        if (title && title.length > 5) {
          posts.push({ subreddit: subreddit, weight: weight||"MED",
                       title: title, url: link, content: content });
        }
      } catch(e) {}
    });
  } catch(e) { Logger.log("Reddit RSS parse error: " + e.message); }
  return posts;
}
function cleanText(text) {
  return text
    .replace(/<!\[CDATA\[/g,"").replace(/\]\]>/g,"")
    .replace(/<[^>]+>/g," ")
    .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g," ")
    .replace(/\s+/g," ").trim();
}
// ============================================================
// GENERATE SHORT DIGEST — Claude (with code fence strip)
// ============================================================
function generateShortDigest(intelBrief, newsBrief, redditBrief) {
  try {
    function stripAndCap(html, cap) {
      return html.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().substring(0,cap);
    }
    const prompt = CONFIG.DIGEST_PROMPT
      .replace("{STREAM_BRIEF}",  stripAndCap(intelBrief,  4000))
      .replace("{NEWS_BRIEF}",    stripAndCap(newsBrief,   4000))
      .replace("{REDDIT_BRIEF}",  stripAndCap(redditBrief, 3000));
    let result = callClaude(prompt, 4096);
    result = result.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    return result;
  } catch(e) {
    Logger.log("Digest generation error: " + e.message);
    return "<p><i>Executive digest unavailable — see full brief below.</i></p>";
  }
}
// ============================================================
// AI ANALYSIS — YouTube transcript (single-pass only)
// Called from runOSINTPipeline for transcripts <= 200K chars.
// ============================================================
function analyzeWithAI(transcript, videoMeta) {
  const yesterday = loadYesterdayMemory();
  let crossDayNote = "";
  if (yesterday && yesterday.streamSummary && yesterday.streamSummary.length > 50) {
    crossDayNote =
      "\n\n[CROSS-DAY MEMORY — FOR COMPARISON ONLY — DO NOT TREAT AS TODAY'S TRANSCRIPT SOURCE]\n" +
      "Yesterday's Date: " + yesterday.date + "\n" +
      "Yesterday's Stream: " + yesterday.videoTitle + "\n" +
      "Yesterday's Key Claims (Section 2):\n" + yesterday.streamSummary.substring(0, 3000) + "\n" +
      "[END CROSS-DAY MEMORY]\n\n";
    Logger.log("Cross-day memory loaded from: " + yesterday.date);
  } else {
    Logger.log("No cross-day memory available — running without comparison.");
  }
  Logger.log("Transcript within single-pass limit. Sending to Claude...");
  return callClaude(CONFIG.INTEL_PROMPT + crossDayNote + transcript, 8192);
}
// ============================================================
// ANALYZE NEWS WIRE — Claude
// ============================================================
function analyzeNewsWire(headlines, streamSummary) {
  if (!headlines || headlines.length === 0) {
    return "<p><i>No wire service headlines retrieved.</i></p>";
  }
  const formatted = headlines.map(function(h, i) {
    return "HEADLINE " + (i+1) + "\nSource: " + h.source + " [Tier " + (h.tier||"B") + "]" +
      "\nTitle: " + h.title +
      (h.description ? "\nSummary: " + h.description : "") +
      (h.url ? "\nLink: " + h.url : "");
  }).join("\n\n---\n\n");
  const prompt = CONFIG.NEWS_PROMPT
    .replace("{STREAM_SUMMARY}", streamSummary || "No stream summary available.") +
    "\n\n" + formatted;
  return callClaude(prompt, 8192);
}
// ============================================================
// ANALYZE REDDIT — Claude + Layer 2 hallucination scrub
// ============================================================
function analyzeReddit(posts, streamSummary) {
  if (!posts || posts.length === 0) {
    return "<p><i>No Reddit posts retrieved.</i></p>";
  }
  const postsToAnalyze = posts.slice(0, CONFIG.REDDIT_ANALYSIS_CAP);
  const totalPosts = postsToAnalyze.length;
  const validNumbers = postsToAnalyze.map(function(_, i) { return (i+1); }).join(", ");
  Logger.log("Reddit analysis: " + totalPosts + " posts (capped from " + posts.length + ")");
  const formatted = postsToAnalyze.map(function(p, i) {
    return "POST " + (i+1) +
      "\nSubreddit: r/" + p.subreddit + " [Weight: " + (p.weight||"MED") + "]" +
      "\nTitle: " + p.title +
      "\nLink: " + p.url +
      (p.content ? "\nContent: " + p.content : "");
  }).join("\n\n---\n\n");
  const whitelistHeader =
    "TOTAL POSTS PROVIDED: " + totalPosts + "\n" +
    "VALID POST NUMBERS: " + validNumbers + "\n" +
    "YOU MAY ONLY CITE THESE POST NUMBERS: " + validNumbers + "\n" +
    "ANY NUMBER NOT IN THAT LIST DOES NOT EXIST. CITING IT IS A CRITICAL FAILURE.\n" +
    "REMINDER: Each TOP DEVELOPMENTS entry must begin with 'POST X —' using original POST number.\n" +
    "REMINDER: SENTIMENT ANALYSIS must NOT cite POST numbers.\n" +
    "REMINDER: REDDIT vs STREAM must NOT add bonus items beyond stream claims list.\n" +
    "REMINDER: Citation format is strict — claim, tag, POST number only. No commentary.\n" +
    "REMINDER: REDDIT vs STREAM may only cite POST numbers labeled in TOP DEVELOPMENTS.\n" +
    "WHEN IN DOUBT WRITE [NOT ON REDDIT] INSTEAD OF GUESSING A POST NUMBER.\n\n";
  const prompt = CONFIG.REDDIT_PROMPT
    .replace("{STREAM_SUMMARY}", streamSummary || "No stream summary available.") +
    "\n\n" + whitelistHeader + formatted;
  let brief = callClaude(prompt, 8192);
  // Layer 2 hallucination scrub
  const topDevMatch = brief.match(/TOP DEVELOPMENTS FROM REDDIT[\s\S]*?(?=<h3|$)/i);
  const describedPosts = new Set();
  if (topDevMatch) {
    const postMatches = topDevMatch[0].match(/POST\s+(\d+)/gi) || [];
    postMatches.forEach(function(m) {
      describedPosts.add(parseInt(m.replace(/\D/g,""), 10));
    });
  }
  const useAllowlist = describedPosts.size > 0;
  if (useAllowlist) {
    const sorted = Array.from(describedPosts).sort(function(a,b){return a-b;});
    Logger.log("Reddit scrub: ALLOWLIST mode — described posts: [" + sorted.join(", ") + "]");
  } else {
    Logger.log("WARNING: Reddit scrub could not find TOP DEVELOPMENTS section header. Falling back to ceiling mode.");
  }
  brief = brief.replace(/POST\s+(\d+)/gi, function(match, num) {
    const n = parseInt(num, 10);
    if (useAllowlist) return describedPosts.has(n) ? match : "[POST REFERENCE REMOVED]";
    return n <= totalPosts ? match : "[POST REFERENCE REMOVED]";
  });
  Logger.log("Reddit hallucination scrub complete. Allowlist size: " + describedPosts.size);
  brief = brief.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  return brief;
}
// ============================================================
// SOURCE RELIABILITY SCORECARD
// ============================================================
function updateReliabilityScorecard(videoMeta, intelBrief, newsHeadlines) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let sheet = ss.getSheetByName("Reliability Scorecard");
    if (!sheet) {
      sheet = ss.insertSheet("Reliability Scorecard");
      sheet.appendRow(["Date","Stream Title","Total Claims","Wire Confirmed",
        "Wire Contradicted","Not In Wire","FLAGGED-VERIFY Count",
        "Confirmation Rate %","C3 Count","C2 Count","C1 Count","Notes"]);
      sheet.getRange(1,1,1,12).setFontWeight("bold").setBackground("#1a1a2e").setFontColor("#ffffff");
      sheet.setFrozenRows(1);
      sheet.setColumnWidths(1,12,130);
    }
    const c3count = (intelBrief.match(/\[C3\]/g) || []).length;
    const c2count = (intelBrief.match(/\[C2\]/g) || []).length;
    const c1count = (intelBrief.match(/\[C1\]/g) || []).length;
    const flaggedCount = (intelBrief.match(/FLAGGED-VERIFY/g) || []).length;
    const scorePrompt =
      "You are an intelligence accuracy analyst.\n" +
      "Compare the TAC-INT brief claims against wire service headlines from the same day.\n" +
      "Count: confirmed claims (wire independently reports same development), " +
      "contradicted claims (wire contradicts), not-in-wire claims (no wire coverage).\n" +
      "Return ONLY valid JSON — no other text, no markdown, no backticks:\n" +
      '{"totalClaims":0,"confirmed":0,"contradicted":0,"notInWire":0,' +
      '"iranConfirmed":0,"iranTotal":0,"ukraineConfirmed":0,"ukraineTotal":0,' +
      '"israelConfirmed":0,"israelTotal":0,"otherConfirmed":0,"otherTotal":0,"notes":"one sentence"}\n\n' +
      "For topic breakdown, categorize claims by keyword:\n" +
      "Iran/Hormuz: iran, hormuz, strait, irgc, persian gulf, tehran\n" +
      "Ukraine/Russia: ukraine, russia, kyiv, moscow, crimea, zelensky, putin\n" +
      "Israel/Lebanon: israel, gaza, lebanon, hamas, beirut, netanyahu, hezbollah\n" +
      "Other: anything else\n\n" +
      "STREAM BRIEF:\n" +
      intelBrief.replace(/<[^>]+>/g," ").replace(/\s+/g," ").substring(0,3000) + "\n\n" +
      "WIRE HEADLINES:\n" +
      newsHeadlines.slice(0,30).map(function(h) {
        return "[Tier " + (h.tier||"B") + "] " + h.source + ": " + h.title;
      }).join("\n");
    const scoreResponse = callGemini(scorePrompt);
    let total=0, confirmed=0, contradicted=0, notInWire=0, notes="";
    let iranC=0, iranT=0, ukC=0, ukT=0, isC=0, isT=0, otC=0, otT=0;
    try {
      const clean = scoreResponse.replace(/```json|```/g,"").trim();
      const d = JSON.parse(clean);
      total        = d.totalClaims    || 0;
      confirmed    = d.confirmed      || 0;
      contradicted = d.contradicted   || 0;
      notInWire    = d.notInWire      || 0;
      notes        = d.notes          || "";
      iranC = d.iranConfirmed    || 0; iranT = d.iranTotal    || 0;
      ukC   = d.ukraineConfirmed || 0; ukT   = d.ukraineTotal || 0;
      isC   = d.israelConfirmed  || 0; isT   = d.israelTotal  || 0;
      otC   = d.otherConfirmed   || 0; otT   = d.otherTotal   || 0;
    } catch(e) {
      Logger.log("Score parse error: " + e.message);
      notes = "Score parsing failed";
    }
    const confirmRate = total > 0 ? Math.round((confirmed/total)*100) : 0;
    const date = new Date().toLocaleDateString("en-US", {year:"numeric",month:"long",day:"numeric"});
    sheet.appendRow([date, videoMeta.title, total, confirmed, contradicted,
      notInWire, flaggedCount, confirmRate + "%", c3count, c2count, c1count, notes]);
    sheet.autoResizeColumns(1,12);
    applyDashboardColors(sheet);
    updateTopicBreakdown(ss, date, videoMeta.title,
      iranC, iranT, ukC, ukT, isC, isT, otC, otT);
    updateConfidenceTrendChart(ss, sheet);
    Logger.log("Scorecard: " + confirmed + "/" + total + " confirmed (" + confirmRate + "%) | " +
      c3count + " C3 | " + c2count + " C2 | " + c1count + " C1 | " + flaggedCount + " flagged");
  } catch(e) { Logger.log("Scorecard error: " + e.message); }
}
// ============================================================
// APPLY RAG COLORS TO SCORECARD ROWS
// ============================================================
function applyDashboardColors(sheet) {
  try {
    const data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      const rateStr = String(data[i][7] || "0").replace("%","");
      const rate = parseInt(rateStr, 10) || 0;
      var bgColor;
      if (rate >= 60) bgColor = "#d4edda";
      else if (rate >= 40) bgColor = "#fff3cd";
      else bgColor = "#f8d7da";
      sheet.getRange(i+1, 1, 1, sheet.getLastColumn()).setBackground(bgColor);
    }
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).setBackground("#1a1a2e").setFontColor("#ffffff");
    Logger.log("Dashboard colors applied.");
  } catch(e) { Logger.log("applyDashboardColors error: " + e.message); }
}
// ============================================================
// UPDATE TOPIC BREAKDOWN SHEET
// ============================================================
function updateTopicBreakdown(ss, date, title, iranC, iranT, ukC, ukT, isC, isT, otC, otT) {
  try {
    let sheet = ss.getSheetByName("Topic Breakdown");
    if (!sheet) {
      sheet = ss.insertSheet("Topic Breakdown");
      sheet.appendRow(["Date","Stream Title",
        "Iran/Hormuz Confirmed","Iran/Hormuz Total","Iran Rate %",
        "Ukraine/Russia Confirmed","Ukraine/Russia Total","Ukraine Rate %",
        "Israel/Lebanon Confirmed","Israel/Lebanon Total","Israel Rate %",
        "Other Confirmed","Other Total","Other Rate %"]);
      sheet.getRange(1,1,1,14).setFontWeight("bold").setBackground("#1a1a2e").setFontColor("#ffffff");
      sheet.setFrozenRows(1);
      sheet.setColumnWidths(1,14,120);
    }
    const iranRate = iranT > 0 ? Math.round((iranC/iranT)*100) + "%" : "N/A";
    const ukRate   = ukT   > 0 ? Math.round((ukC/ukT)*100)   + "%" : "N/A";
    const isRate   = isT   > 0 ? Math.round((isC/isT)*100)   + "%" : "N/A";
    const otRate   = otT   > 0 ? Math.round((otC/otT)*100)   + "%" : "N/A";
    sheet.appendRow([date, title,
      iranC, iranT, iranRate,
      ukC,   ukT,   ukRate,
      isC,   isT,   isRate,
      otC,   otT,   otRate]);
    sheet.autoResizeColumns(1,14);
    Logger.log("Topic breakdown updated.");
  } catch(e) { Logger.log("updateTopicBreakdown error: " + e.message); }
}
// ============================================================
// CONFIDENCE TREND CHART
// ============================================================
function updateConfidenceTrendChart(ss, scorecardSheet) {
  try {
    const data = scorecardSheet.getDataRange().getValues();
    if (data.length < 3) return;
    const lastRow = scorecardSheet.getLastRow();
    const chartSheet = ss.getSheetByName("Reliability Scorecard");
    const existingCharts = chartSheet.getCharts();
    existingCharts.forEach(function(c) { chartSheet.removeChart(c); });
    const dateRange = chartSheet.getRange(2, 1,  lastRow-1, 1);
    const c3Range   = chartSheet.getRange(2, 9,  lastRow-1, 1);
    const c2Range   = chartSheet.getRange(2, 10, lastRow-1, 1);
    const c1Range   = chartSheet.getRange(2, 11, lastRow-1, 1);
    var chart = chartSheet.newChart()
      .setChartType(Charts.ChartType.LINE)
      .addRange(dateRange)
      .addRange(c3Range)
      .addRange(c2Range)
      .addRange(c1Range)
      .setPosition(data.length + 3, 1, 0, 0)
      .setOption("title", "Daily Confidence Distribution — C3 / C2 / C1")
      .setOption("legend", { position: "bottom" })
      .setOption("series", {
        0: { labelInLegend: "C3 (Possible)", color: "#2ecc71" },
        1: { labelInLegend: "C2 (Unconfirmed)", color: "#f39c12" },
        2: { labelInLegend: "C1 (Unverified/Opinion)", color: "#e74c3c" }
      })
      .setOption("width", 700)
      .setOption("height", 350)
      .build();
    chartSheet.insertChart(chart);
    Logger.log("Confidence trend chart updated.");
  } catch(e) { Logger.log("updateConfidenceTrendChart error: " + e.message); }
}
// ============================================================
// CROSS-DAY MEMORY — Save and Load
// ============================================================
function saveToMemory(videoMeta, streamSummary, intelBrief) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let sheet = ss.getSheetByName("Daily Memory");
    if (!sheet) {
      sheet = ss.insertSheet("Daily Memory");
      sheet.appendRow(["Date","Video Title","Stream Summary (Section 2)","Intel Brief Excerpt"]);
      sheet.getRange(1,1,1,4).setFontWeight("bold").setBackground("#1a1a2e").setFontColor("#ffffff");
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(3, 600);
      sheet.setColumnWidth(4, 600);
    }
    const date = new Date().toLocaleDateString("en-US", {year:"numeric",month:"long",day:"numeric"});
    const briefExcerpt = intelBrief.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().substring(0,5000);
    sheet.appendRow([date, videoMeta.title, streamSummary, briefExcerpt]);
    Logger.log("Memory saved for: " + date);
  } catch(e) { Logger.log("saveToMemory error: " + e.message); }
}
function loadYesterdayMemory() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName("Daily Memory");
    if (!sheet) return null;
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return null;
    const lastRow = data[data.length - 1];
    return {
      date:          String(lastRow[0] || ""),
      videoTitle:    String(lastRow[1] || ""),
      streamSummary: String(lastRow[2] || ""),
      briefExcerpt:  String(lastRow[3] || "")
    };
  } catch(e) {
    Logger.log("loadYesterdayMemory error: " + e.message);
    return null;
  }
}
// ============================================================
// CLAIM TRACKER — Extract and save unverified/flagged claims
// ============================================================
function categorizeClaim(text) {
  const t = text.toLowerCase();
  if (t.match(/iran|hormuz|strait|irgc|persian gulf|tehran|konarak|bandar abbas|qeshm/)) return "Iran/Hormuz";
  if (t.match(/ukraine|russia|kyiv|moscow|crimea|zelensky|putin|donbas|leningrad|cheboksary|sevastopol/)) return "Ukraine/Russia";
  if (t.match(/israel|gaza|lebanon|hamas|beirut|netanyahu|hezbollah|west bank/)) return "Israel/Lebanon";
  return "Other";
}
function extractClaimsForTracker(newsBrief, intelBrief) {
  const claims = [];
  const plainNews  = newsBrief.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const plainIntel = intelBrief.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const notInWireRegex = /([^.!?]{20,400})\s*\[NOT IN WIRE\]/g;
  let m;
  while ((m = notInWireRegex.exec(plainNews)) !== null) {
    const claim = m[1].replace(/\[CONFIRMS YESTERDAY\]|\[CONTRADICTS YESTERDAY\]|\[UPDATES YESTERDAY\]/g,"").trim();
    if (claim.length > 20) {
      claims.push({ text: claim.substring(0,400), type: "NOT IN WIRE", priority: "NORMAL" });
    }
  }
  const discrepancyRegex = /([^.!?]{20,400})\s*\[DISCREPANCY\]/g;
  while ((m = discrepancyRegex.exec(plainNews)) !== null) {
    const claim = m[1].replace(/\[C[0-9]\]/g,"").trim();
    if (claim.length > 20) {
      claims.push({ text: claim.substring(0,400), type: "DISCREPANCY", priority: "HIGH" });
    }
  }
  const flaggedRegex = /([^.!?]{20,400})\s*\[FLAGGED-VERIFY\]/g;
  while ((m = flaggedRegex.exec(plainIntel)) !== null) {
    const claim = m[1].replace(/\[C[0-9]\]/g,"").trim();
    if (claim.length > 20) {
      claims.push({ text: claim.substring(0,400), type: "FLAGGED-VERIFY", priority: "HIGH" });
    }
  }
  return claims.slice(0, 30);
}
function extractAndSaveClaims(newsBrief, intelBrief, videoMeta, date) {
  try {
    const claims = extractClaimsForTracker(newsBrief, intelBrief);
    if (claims.length === 0) {
      Logger.log("No claims to track today.");
      return;
    }
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let sheet = ss.getSheetByName("Claim Tracker");
    if (!sheet) {
      sheet = ss.insertSheet("Claim Tracker");
      sheet.appendRow(["Date Added","Stream Title","Claim","Type","Category",
        "Priority","Status","Days Open","Last Checked","Resolution Notes"]);
      sheet.getRange(1,1,1,10).setFontWeight("bold").setBackground("#1a1a2e").setFontColor("#ffffff");
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(3, 500);
      sheet.setColumnWidth(10, 250);
    }
    claims.forEach(function(c) {
      sheet.appendRow([
        date, videoMeta.title, c.text, c.type,
        categorizeClaim(c.text), c.priority, "OPEN", 0, date, ""
      ]);
    });
    sheet.autoResizeColumns(1,2);
    sheet.autoResizeColumns(4,7);
    Logger.log("Claim Tracker: " + claims.length + " claims saved.");
  } catch(e) { Logger.log("extractAndSaveClaims error: " + e.message); }
}
// ============================================================
// CLAIM AGING — Runs daily at CLAIM_AGING_HOUR
// ============================================================
function runClaimAging() {
  Logger.log("=== Claim Aging v2.22 Starting ===");
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName("Claim Tracker");
    if (!sheet) {
      Logger.log("Claim Tracker sheet not found — nothing to age.");
      return;
    }
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      Logger.log("No claims in tracker yet.");
      return;
    }
    const openClaims = [];
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][6]).trim() === "OPEN") {
        openClaims.push({ rowIndex: i+1, claimId: i, row: data[i] });
      }
    }
    if (openClaims.length === 0) {
      Logger.log("No open claims to age.");
      return;
    }
    Logger.log("Open claims to check: " + openClaims.length);
    const headlines = fetchNewsWire();
    Logger.log("Wire headlines fetched for aging: " + headlines.length);
    const headlineText = headlines.slice(0,40).map(function(h) {
      return "[" + h.source + "] " + h.title;
    }).join("\n");
    const claimsText = openClaims.map(function(c, idx) {
      return "CLAIM " + (idx+1) + " [" + c.row[3] + " / " + c.row[5] + "]: " + c.row[2];
    }).join("\n");
    const prompt = CONFIG.CLAIM_AGING_PROMPT
      .replace("{CLAIMS}", claimsText)
      .replace("{HEADLINES}", headlineText);
    const response = callClaude(prompt, 2048);
    let results = [];
    try {
      const clean = response.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      results = parsed.results || [];
    } catch(e) {
      Logger.log("Claim aging JSON parse error: " + e.message);
      return;
    }
    const today = new Date().toLocaleDateString("en-US", {year:"numeric",month:"long",day:"numeric"});
    let confirmed=0, contradicted=0, stillOpen=0;
    results.forEach(function(r) {
      const idx = r.claimId - 1;
      if (idx < 0 || idx >= openClaims.length) return;
      const claim = openClaims[idx];
      const dateAdded = new Date(claim.row[0]);
      const daysOpen = Math.floor((new Date() - dateAdded) / (1000*60*60*24));
      const status = r.status || "STILL OPEN";
      const note   = r.note   || "";
      sheet.getRange(claim.rowIndex, 7).setValue(status === "STILL OPEN" ? "OPEN" : status);
      sheet.getRange(claim.rowIndex, 8).setValue(daysOpen);
      sheet.getRange(claim.rowIndex, 9).setValue(today);
      sheet.getRange(claim.rowIndex, 10).setValue(note);
      var bgColor = "#ffffff";
      if (status === "CONFIRMED")    bgColor = "#d4edda";
      if (status === "CONTRADICTED") bgColor = "#f8d7da";
      if (status === "STILL OPEN")   bgColor = "#fff3cd";
      sheet.getRange(claim.rowIndex, 1, 1, 10).setBackground(bgColor);
      if (status === "CONFIRMED")         confirmed++;
      else if (status === "CONTRADICTED") contradicted++;
      else stillOpen++;
    });
    Logger.log("Claim aging complete: " + confirmed + " confirmed | " +
      contradicted + " contradicted | " + stillOpen + " still open");
  } catch(e) {
    Logger.log("runClaimAging ERROR: " + e.message);
  }
}
// ============================================================
// URGENCY ASSESSMENT — Claude scores today's brief 1-5
// Called from Stage 4. Sends push notification if level >= 4.
// ============================================================
function assessUrgencyAndNotify(digestHtml, intelBrief, newsBrief) {
  try {
    const plainNews  = newsBrief.replace(/<[^>]+>/g, " ");
    const plainIntel = intelBrief.replace(/<[^>]+>/g, " ");

    const discrepancyCount = (plainNews.match(/\[DISCREPANCY\]/g)           || []).length;
    const flaggedCount     = (plainIntel.match(/FLAGGED-VERIFY/g)            || []).length;
    const contradictCount  = (plainIntel.match(/\[CONTRADICTS YESTERDAY\]/g) || []).length;

    const digestPlain = digestHtml
      .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().substring(0, 3000);

    const prompt = CONFIG.URGENCY_PROMPT
      .replace("{DISCREPANCY_COUNT}", discrepancyCount)
      .replace("{FLAGGED_COUNT}",     flaggedCount)
      .replace("{CONTRADICTS_COUNT}", contradictCount)
      .replace("{DIGEST}",            digestPlain);

    const response = callClaude(prompt, 512);
    const clean    = response.replace(/```json|```/g, "").trim();
    const result   = JSON.parse(clean);

    const level    = result.level    || 1;
    const reason   = result.reason   || "No reason provided.";
    const headline = result.headline || "OSINT Daily Brief Ready";

    Logger.log("Urgency assessment — Level: " + level + " | " + reason);
    Logger.log("Pipeline signals — DISCREPANCY: " + discrepancyCount +
      " | FLAGGED: " + flaggedCount + " | CONTRADICTS: " + contradictCount);

    logUrgencyToIntelLog(level, reason);

    if (level >= 4) {
      sendPushNotification(level, reason, headline);
      Logger.log("PUSH NOTIFICATION SENT — Level " + level);
    } else {
      Logger.log("No push notification — Level " + level + " below threshold.");
    }

    return level;
  } catch(e) {
    Logger.log("assessUrgencyAndNotify error: " + e.message);
    return 0;
  }
}
// ============================================================
// SEND PUSH NOTIFICATION — OneSignal REST API
// ============================================================
function sendPushNotification(level, reason, headline) {
  try {
    const appId  = PROPS.getProperty("ONESIGNAL_APP_ID")      || "";
    const apiKey = PROPS.getProperty("ONESIGNAL_REST_API_KEY") || "";

    if (!appId || !apiKey) {
      Logger.log("OneSignal keys missing — push not sent.");
      return;
    }

    const levelEmoji = level >= 5 ? "🚨🚨" : "⚡";
    const payload = {
      app_id:            appId,
      included_segments: ["All"],
      headings:  { en: levelEmoji + " OSINT ALERT — Level " + level + ": " + headline },
      contents:  { en: reason },
      data:      { level: level },
      priority:  level >= 5 ? 10 : 7,
      ttl:       3600
    };

    const resp = UrlFetchApp.fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": "Basic " + apiKey
      },
      payload:            JSON.stringify(payload),
      muteHttpExceptions: true
    });

    Logger.log("OneSignal response: " + resp.getResponseCode() +
      " — " + resp.getContentText().substring(0, 200));
  } catch(e) {
    Logger.log("sendPushNotification error: " + e.message);
  }
}
// ============================================================
// LOG URGENCY LEVEL TO INTEL LOG SHEET
// ============================================================
function logUrgencyToIntelLog(level, reason) {
  try {
    const ss    = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) return;

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (!headers.includes("Urgency Level")) {
      sheet.getRange(1, 9).setValue("Urgency Level");
      sheet.getRange(1, 10).setValue("Urgency Reason");
      sheet.getRange(1, 9, 1, 2)
        .setFontWeight("bold").setBackground("#1a1a2e").setFontColor("#ffffff");
    }

    sheet.getRange(lastRow, 9).setValue(level);
    sheet.getRange(lastRow, 10).setValue(reason);

    var bg = "#ffffff";
    if (level >= 5) bg = "#c0392b";
    else if (level >= 4) bg = "#e74c3c";
    else if (level >= 3) bg = "#f39c12";
    else if (level >= 2) bg = "#f9e79f";
    sheet.getRange(lastRow, 9).setBackground(bg);

    Logger.log("Urgency level " + level + " logged to Intel Log row " + lastRow);
  } catch(e) {
    Logger.log("logUrgencyToIntelLog error: " + e.message);
  }
}
// ============================================================
// TEST — Run this manually to verify OneSignal push works
// ============================================================
function testUrgencyAlert() {
  Logger.log("=== TEST: Urgency Alert System ===");
  sendPushNotification(
    4,
    "TEST ONLY — Pipeline alert system test. No real event.",
    "Alert system test — ignore"
  );
  Logger.log("Test push sent. Check your phone within 30 seconds.");
}
// ============================================================
// CHUNK TEXT
// ============================================================
function chunkText(text, maxChars) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf(".", end);
      if (lastPeriod > start + maxChars * 0.8) end = lastPeriod + 1;
    }
    chunks.push(text.substring(start, end).trim());
    start = end;
  }
  return chunks;
}
// ============================================================
// CLAUDE API — claude-sonnet-4-6
// ============================================================
function callClaude(prompt, maxTokens) {
  maxTokens = maxTokens || 8192;
  const url = "https://api.anthropic.com/v1/messages";
  const resp = UrlFetchApp.fetch(url, {
    method: "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         CONFIG.CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    payload: JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages:   [{ role: "user", content: prompt }]
    }),
    muteHttpExceptions: true
  });
  const code = resp.getResponseCode();
  const body = resp.getContentText();
  if (code !== 200) {
    throw new Error("Claude API error " + code + ": " + body.substring(0,300));
  }
  const data = JSON.parse(body);
  if (data.content && data.content[0]) return data.content[0].text;
  throw new Error("Claude API unexpected response: " + JSON.stringify(data).substring(0,300));
}
// ============================================================
// OPUS API — claude-opus-4-6 (strategic/weekly use only)
// DO NOT call from Stage 1, 2, 3, or 4 daily pipeline.
// ============================================================
function callOpus(prompt, maxTokens) {
  maxTokens = maxTokens || 12000;
  const url = "https://api.anthropic.com/v1/messages";
  const resp = UrlFetchApp.fetch(url, {
    method: "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         CONFIG.CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    payload: JSON.stringify({
      model:      "claude-opus-4-6",
      max_tokens: maxTokens,
      messages:   [{ role: "user", content: prompt }]
    }),
    muteHttpExceptions: true
  });
  const code = resp.getResponseCode();
  const body = resp.getContentText();
  if (code !== 200) {
    throw new Error("Opus API error " + code + ": " + body.substring(0,300));
  }
  const data = JSON.parse(body);
  if (data.content && data.content[0]) return data.content[0].text;
  throw new Error("Opus API unexpected response: " + JSON.stringify(data).substring(0,300));
}
// ============================================================
// GEMINI API CALLS
// ============================================================
function callGemini(prompt)      { return callGeminiWithTokens(prompt, 8192);  }
function callGeminiLarge(prompt) { return callGeminiWithTokens(prompt, 16384); }
function callGeminiMax(prompt)   { return callGeminiWithTokens(prompt, 32768); }
function callGeminiWithTokens(prompt, maxTokens) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
    CONFIG.GEMINI_API_KEY;
  const resp = UrlFetchApp.fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    payload: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens }
    }),
    muteHttpExceptions: true
  });
  const data = JSON.parse(resp.getContentText());
  if (data.candidates && data.candidates[0]) return data.candidates[0].content.parts[0].text;
  throw new Error("Gemini error: " + JSON.stringify(data));
}
// ============================================================
// LOG TO SHEETS
// ============================================================
function logToSheet(videoMeta, intelBrief, transcriptLength, newsBrief, redditBrief) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow(["Date","Video Title","Channel","Video URL",
      "Transcript (chars)","TAC-INT Brief","Wire News","Reddit OSINT"]);
    sheet.getRange(1,1,1,8).setFontWeight("bold").setBackground("#1a1a2e").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(6,500);
    sheet.setColumnWidth(7,500);
    sheet.setColumnWidth(8,500);
  }
  sheet.appendRow([
    new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}),
    videoMeta.title, videoMeta.channelTitle, videoMeta.url,
    transcriptLength, intelBrief, newsBrief, redditBrief
  ]);
  sheet.autoResizeColumns(1,5);
}
// ============================================================
// EXTRACT DISCREPANCIES for email banner
// ============================================================
function extractDiscrepancies(newsBrief) {
  const plain = newsBrief.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const discrepancies = [];
  const regex = /([^.]{20,300})\[DISCREPANCY\]/g;
  let m;
  while ((m = regex.exec(plain)) !== null) {
    const cleaned = m[1].replace(/\[C[0-9]\]/g,"").replace(/\[CONFIRMS YESTERDAY\]|\[CONTRADICTS YESTERDAY\]|\[UPDATES YESTERDAY\]/g,"").trim();
    if (cleaned.length > 20) discrepancies.push(cleaned.substring(0,250));
  }
  return discrepancies.slice(0, 3);
}
// ============================================================
// SEND EMAIL — v2.22
// ============================================================
function sendEmailBrief(videoMeta, intelBrief, newsBrief, redditBrief, digestHtml) {
  const date = new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  const subject = CONFIG.EMAIL_SUBJECT.replace("{DATE}", date);
  const discrepancies = extractDiscrepancies(newsBrief);
  let discrepancyBanner = "";
  if (discrepancies.length > 0) {
    const items = discrepancies.map(function(d) {
      return '<div style="margin-top:6px;font-size:13px;line-height:1.5;">⚡ ' + d + ' <b>[WIRE CONTRADICTS STREAM]</b></div>';
    }).join("");
    discrepancyBanner =
      '<div style="background:#fdf2f2;border:2px solid #c0392b;border-radius:6px;' +
      'padding:14px 20px;margin-bottom:16px;">' +
      '<strong style="color:#c0392b;font-size:14px;">⚠️ WIRE DIRECTLY CONTRADICTS STREAM — VERIFY BEFORE ACTING</strong>' +
      items + '</div>';
  }
  const tocBlock =
    '<div style="background:#f4f4f4;padding:10px 20px;border:1px solid #ccc;border-radius:6px;' +
    'margin-bottom:16px;font-size:13px;">' +
    '<strong>QUICK NAV:</strong>' +
    '<a href="#digest"   style="margin-left:12px;color:#1a5276;text-decoration:none;">⚡ Digest</a>' +
    '<a href="#section1" style="margin-left:12px;color:#1a5276;text-decoration:none;">🎯 TAC-INT</a>' +
    '<a href="#section2" style="margin-left:12px;color:#1a5276;text-decoration:none;">📰 Wire</a>' +
    '<a href="#section3" style="margin-left:12px;color:#1a5276;text-decoration:none;">🔍 Reddit</a>' +
    '</div>';
  const mobileCSS =
    '<style>' +
    '@media only screen and (max-width:600px){' +
    '.email-wrapper{max-width:100%!important;padding:0 8px!important;}' +
    '.section-header{padding:14px 16px!important;}' +
    '.section-body{padding:16px!important;}' +
    'h1{font-size:16px!important;}' +
    'h2{font-size:15px!important;}' +
    '}' +
    '</style>';
  const digestBlock =
    '<a name="digest"></a>' +
    '<div class="section-header" style="background:#12002a;color:white;padding:20px 28px;border-radius:8px 8px 0 0;">' +
    '<div style="font-size:10px;letter-spacing:2px;color:#c39fff;margin-bottom:4px;">EXECUTIVE DIGEST — 2-MIN READ · ALL THREE SOURCES</div>' +
    '<h1 style="margin:0;font-size:20px;font-weight:700;letter-spacing:1px;">⚡ DAILY INTELLIGENCE DIGEST</h1>' +
    '<p style="margin:6px 0 0;font-size:13px;color:#d4b8ff;">' + date + '</p>' +
    '</div>' +
    '<div class="section-body" style="background:#f7f3ff;padding:22px 28px;border:2px solid #8e44ad;border-top:none;border-radius:0 0 8px 8px;line-height:1.75;font-size:14px;">' +
    (digestHtml || "<p><i>Executive digest unavailable — see full brief below.</i></p>") +
    '</div>' +
    '<div style="text-align:center;margin:28px 0 20px;color:#888;font-size:12px;letter-spacing:2px;">▼ &nbsp; FULL BRIEF BELOW — THREE SECTIONS &nbsp; ▼</div>';
  const htmlBody =
    mobileCSS +
    '<div class="email-wrapper" style="font-family:Arial,sans-serif;max-width:820px;margin:0 auto;color:#1a1a1a;">' +
    tocBlock +
    discrepancyBanner +
    digestBlock +
    '<a name="section1"></a>' +
    '<div class="section-header" style="background:#0d1b2a;color:white;padding:24px 28px;border-radius:8px 8px 0 0;margin-top:8px;">' +
    '<div style="font-size:10px;letter-spacing:2px;color:#7faacc;margin-bottom:4px;">SECTION 1 OF 3 — PRIMARY SOURCE</div>' +
    '<h1 style="margin:0;font-size:20px;font-weight:700;letter-spacing:1px;">🎯 TACTICAL INTELLIGENCE PACKAGE</h1>' +
    '<p style="margin:6px 0 0;font-size:13px;color:#aac4de;">' + date + '</p>' +
    '</div>' +
    '<div style="background:#f0f4f8;padding:14px 20px;border-left:4px solid #c0392b;">' +
    '<strong>SOURCE:</strong> <a href="' + videoMeta.url + '" style="color:#1a5276;margin-left:6px;">' + videoMeta.title + '</a><br>' +
    '<strong>CHANNEL:</strong> <span style="margin-left:6px;">' + (videoMeta.channelTitle||"N/A") + '</span>' +
    '<span style="margin-left:12px;background:#f39c12;color:white;padding:2px 8px;border-radius:4px;font-size:11px;">TIER C — MAX CONFIDENCE C3</span><br>' +
    '<strong>AI ENGINE:</strong> <span style="margin-left:6px;">CLAUDE SONNET 4.6 (Analysis) · GEMINI 2.5 FLASH (Extraction)</span>' +
    '</div>' +
    '<div class="section-body" style="background:white;padding:24px 28px;border:1px solid #dce3ea;border-top:none;border-radius:0 0 8px 8px;line-height:1.7;">' +
    intelBrief +
    '</div>' +
    '<a name="section2"></a>' +
    '<div class="section-header" style="background:#1a3a1a;color:white;padding:16px 28px;margin-top:32px;border-radius:8px 8px 0 0;">' +
    '<div style="font-size:10px;letter-spacing:2px;color:#7fcf7f;margin-bottom:4px;">SECTION 2 OF 3 — PROFESSIONAL WIRE SERVICES</div>' +
    '<h2 style="margin:0;font-size:18px;font-weight:700;">📰 WIRE SERVICE NEWS BRIEF</h2>' +
    '<p style="margin:6px 0 0;font-size:12px;color:#a8d5a8;">Reuters · BBC · Al Jazeera · AP · France 24 · The Guardian · Sky News · Deutsche Welle · NPR · Defense One · War on the Rocks · Foreign Policy · Kyiv Independent · Bellingcat · Middle East Eye · Times of Israel</p>' +
    '</div>' +
    '<div class="section-body" style="background:#f0f7f0;padding:24px 28px;border:1px solid #c8e6c9;border-top:none;border-radius:0 0 8px 8px;line-height:1.7;">' +
    newsBrief +
    '</div>' +
    '<a name="section3"></a>' +
    '<div class="section-header" style="background:#1a1a2e;color:white;padding:16px 28px;margin-top:32px;border-radius:8px 8px 0 0;">' +
    '<div style="font-size:10px;letter-spacing:2px;color:#e74c3c;margin-bottom:4px;">SECTION 3 OF 3 — COMMUNITY INTELLIGENCE ⚠️ UNVERIFIED</div>' +
    '<h2 style="margin:0;font-size:18px;font-weight:700;">🔍 REDDIT OSINT SCAN</h2>' +
    '<p style="margin:6px 0 0;font-size:12px;color:#aac4de;">r/worldnews · r/ukraine · r/geopolitics · r/CredibleDefense · r/iran · r/MiddleEast · r/NATO · and more<br>' +
    '<span style="color:#e74c3c;font-weight:bold;">All items are Reddit-sourced. Verify before acting on any claim.</span></p>' +
    '</div>' +
    '<div class="section-body" style="background:#fafafa;padding:24px 28px;border:1px solid #dce3ea;border-top:none;border-radius:0 0 8px 8px;line-height:1.7;">' +
    redditBrief +
    '</div>' +
    '<p style="color:#aaa;font-size:11px;margin-top:20px;text-align:center;">' +
    'Automated OSINT Pipeline v2.22 · Hybrid AI: Claude Sonnet 4.6 + Gemini 2.5 Flash · Open Source Intelligence Only<br>' +
    'Digest: All Sources · Section 1: The Enforcer (YouTube — TIER C) · Section 2: Wire Services (TIER A/B) · Section 3: Reddit Community' +
    '</p>' +
    '</div>';
  const plainText =
    "=== EXECUTIVE DIGEST (2-MIN READ) ===\n" +
    (digestHtml||"").replace(/<[^>]+>/g,"").replace(/\s+/g," ") +
    "\n\n====================================\n" +
    "=== SECTION 1: TAC-INT BRIEF ===\n" +
    "SOURCE: " + videoMeta.title + "\n" + videoMeta.url + "\n" +
    "TIER C SOURCE — MAX CONFIDENCE C3\nAI: Claude Sonnet 4.6 + Gemini 2.5 Flash\n\n" +
    intelBrief.replace(/<[^>]+>/g,"").replace(/\s+/g," ") +
    "\n\n=== SECTION 2: WIRE SERVICE NEWS ===\n" +
    newsBrief.replace(/<[^>]+>/g,"").replace(/\s+/g," ") +
    "\n\n=== SECTION 3: REDDIT OSINT (UNVERIFIED) ===\n" +
    redditBrief.replace(/<[^>]+>/g,"").replace(/\s+/g," ");
  CONFIG.EMAIL_RECIPIENTS.forEach(function(email) {
    MailApp.sendEmail({to:email, subject:subject, body:plainText, htmlBody:htmlBody});
  });
}
// ============================================================
// WEEKLY ROLLUP
// ============================================================
function runWeeklyRollup() {
  Logger.log("=== Weekly Rollup v2.22 Starting ===");
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1).slice(-7);
    if (rows.length === 0) throw new Error("No daily briefs found.");
    Logger.log("Found " + rows.length + " briefs.");
    const dayObjects = rows.map(function(row, i) {
      const plain = (row[5]||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
      return {
        dayNum:       i+1,
        date:         row[0]||"Unknown",
        title:        row[1]||"Unknown",
        brief:        plain,
        flaggedCount: (plain.match(/FLAGGED-VERIFY/g)||[]).length
      };
    });
    const reliabilityStats = getWeeklyReliabilityStats(ss);
    const weeklyBrief = callWeeklyAI(dayObjects, reliabilityStats);
    Logger.log("Weekly brief (Opus): " + weeklyBrief.length + " chars");
    logWeeklyToSheet(weeklyBrief, rows.length);
    sendWeeklyEmail(weeklyBrief, rows.length, reliabilityStats);
    Logger.log("=== Weekly Rollup v2.22 Complete ===");
  } catch(e) {
    Logger.log("WEEKLY ERROR: " + e.message);
    MailApp.sendEmail(CONFIG.EMAIL_RECIPIENTS[0], "Weekly Rollup Error", e.message);
  }
}
function getWeeklyReliabilityStats(ss) {
  try {
    const sheet = ss.getSheetByName("Reliability Scorecard");
    if (!sheet) return null;
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1).slice(-7);
    if (rows.length === 0) return null;
    let totalClaims=0, totalConfirmed=0, totalContradicted=0, totalNotInWire=0, totalFlagged=0;
    const dailyRates = [];
    rows.forEach(function(row) {
      const claims    = Number(row[2])||0;
      const confirmed = Number(row[3])||0;
      totalClaims       += claims;
      totalConfirmed    += confirmed;
      totalContradicted += Number(row[4])||0;
      totalNotInWire    += Number(row[5])||0;
      totalFlagged      += Number(row[6])||0;
      if (claims > 0) dailyRates.push(Math.round((confirmed/claims)*100));
    });
    const avgRate = totalClaims > 0 ? Math.round((totalConfirmed/totalClaims)*100) : 0;
    const trend   = dailyRates.length >= 2
      ? (dailyRates[dailyRates.length-1] - dailyRates[0] > 0 ? "IMPROVING" : "DECLINING")
      : "INSUFFICIENT DATA";
    return { totalClaims, confirmed:totalConfirmed, contradicted:totalContradicted,
             notInWire:totalNotInWire, flagged:totalFlagged, avgRate, dailyRates, trend };
  } catch(e) { return null; }
}
function callWeeklyAI(dayObjects, reliabilityStats) {
  const briefsSummary = dayObjects.map(function(d) {
    return "=== DAY " + d.dayNum + " — " + d.date + " ===\n" +
      "SOURCE VIDEO: " + d.title + "\n" +
      "FLAGGED CLAIMS THIS DAY: " + d.flaggedCount + "\n" + d.brief;
  }).join("\n\n");
  const reliabilitySection = reliabilityStats ?
    "\n\nSOURCE RELIABILITY THIS WEEK:" +
    "\nTotal claims tracked: "       + reliabilityStats.totalClaims +
    "\nWire-confirmed: "             + reliabilityStats.confirmed +
    "\nWire-contradicted: "          + reliabilityStats.contradicted +
    "\nNot in wire (unverifiable): " + reliabilityStats.notInWire +
    "\nFLAGGED-VERIFY claims: "      + reliabilityStats.flagged +
    "\nWeek avg confirmation rate: " + reliabilityStats.avgRate + "%" +
    "\nDaily rates: ["               + (reliabilityStats.dailyRates||[]).join("%, ") + "%]" +
    "\nWeek trend: "                 + reliabilityStats.trend : "";
  const prompt =
    "You are a Senior Strategic Intelligence Analyst.\n" +
    "Below are " + dayObjects.length + " daily TAC-INT briefs from a TIER C source (YouTube commentary).\n" +
    "Synthesize into a WEEKLY STRATEGIC ASSESSMENT using HTML only. No Markdown.\n" +
    "Find PATTERNS and TRENDS across days — do not just list what each day said.\n" +
    reliabilitySection + "\n\n" +
    "<h2>📊 WEEKLY STRATEGIC ASSESSMENT</h2>\n\n" +
    "<h3>PERIOD COVERED</h3>State the date range and number of briefs synthesized.<p></p>\n\n" +
    "<h3>1. STRATEGIC OVERVIEW</h3>Dominant strategic theme this week. 2-3 paragraphs synthesizing the week as a whole.<p></p>\n\n" +
    "<h3>2. KEY DEVELOPMENTS THIS WEEK</h3>5-7 most significant events. Bold each title. Note which days it appeared. Include confidence tag.<p></p>\n\n" +
    "<h3>3. TREND ANALYSIS — DAY OVER DAY</h3>Compare days explicitly. What escalated? What de-escalated? What shifted in framing?<p></p>\n\n" +
    "<h3>4. RECURRING ACTORS AND LOCATIONS</h3>Most frequently mentioned people, units, locations. Note frequency changes.<p></p>\n\n" +
    "<h3>5. CLAIMS THAT AGED WELL vs CLAIMS THAT DID NOT</h3>Which predictions from early in the week appear validated by later days?<p></p>\n\n" +
    "<h3>6. STRATEGIC FORECAST</h3>Host predictions across the week. All [C1]. Attributed as host analysis throughout.<p></p>\n\n" +
    "<h3>7. INTELLIGENCE GAPS</h3>4-6 specific unanswered questions a reader should pursue from Tier A sources.<p></p>\n\n" +
    "<h3>8. SOURCE RELIABILITY REPORT</h3>" +
    (reliabilityStats ?
      "The Enforcer made " + reliabilityStats.totalClaims + " verifiable claims this week. " +
      reliabilityStats.confirmed + " confirmed by wire services (" + reliabilityStats.avgRate + "%). " +
      reliabilityStats.contradicted + " contradicted. " + reliabilityStats.flagged + " FLAGGED-VERIFY. " +
      "Trend: " + reliabilityStats.trend + ". Frank one-paragraph assessment of channel reliability." :
      "Reliability data unavailable this week.") + "<p></p>\n\n" +
    "RULES: HTML only. No outside knowledge. Section 3 must cite day numbers. Write every section to completion.\n\n" +
    "DAILY BRIEFS:\n" + briefsSummary;
  return callOpus(prompt, 12000);
}
function logWeeklyToSheet(weeklyBrief, dayCount) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sheet = ss.getSheetByName("Weekly Rollups");
  if (!sheet) {
    sheet = ss.insertSheet("Weekly Rollups");
    sheet.appendRow(["Week Ending","Days Covered","Weekly Assessment"]);
    sheet.getRange(1,1,1,3).setFontWeight("bold").setBackground("#0a0f1e").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(3,800);
  }
  sheet.appendRow([
    new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}),
    dayCount + " days",
    weeklyBrief
  ]);
  sheet.autoResizeColumns(1,2);
}
function sendWeeklyEmail(weeklyBrief, dayCount, reliabilityStats) {
  const date = new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  const subject = "WEEKLY STRATEGIC ASSESSMENT — " + date;
  let reliabilityBanner = "";
  if (reliabilityStats) {
    const trendColor = reliabilityStats.trend === "IMPROVING" ? "#27ae60" : "#c0392b";
    const trendIcon  = reliabilityStats.trend === "IMPROVING" ? "📈" : "📉";
    reliabilityBanner =
      '<div style="background:#eaf4ea;padding:12px 20px;border-left:4px solid ' + trendColor + ';">' +
      '<strong>📊 WEEKLY SOURCE RELIABILITY:</strong> The Enforcer had a <strong>' +
      reliabilityStats.avgRate + '% wire-confirmation rate</strong> this week (' +
      reliabilityStats.confirmed + '/' + reliabilityStats.totalClaims + ' claims confirmed). ' +
      '<strong>' + reliabilityStats.contradicted + '</strong> contradicted. ' +
      '<strong>' + reliabilityStats.flagged + '</strong> FLAGGED-VERIFY. ' +
      'Trend: <strong style="color:' + trendColor + '">' + trendIcon + ' ' + reliabilityStats.trend + '</strong>' +
      '</div>';
  }
  const htmlBody =
    '<div style="font-family:Arial,sans-serif;max-width:820px;margin:0 auto;color:#1a1a1a;">' +
    '<div style="background:#0a0f1e;color:white;padding:24px 28px;border-radius:8px 8px 0 0;">' +
    '<div style="font-size:11px;letter-spacing:2px;color:#7faacc;margin-bottom:6px;">CLASSIFICATION: OPEN SOURCE — WEEKLY EDITION</div>' +
    '<h1 style="margin:0;font-size:22px;font-weight:700;">📊 WEEKLY STRATEGIC ASSESSMENT</h1>' +
    '<p style="margin:6px 0 0;font-size:13px;color:#aac4de;">' + date + '</p></div>' +
    reliabilityBanner +
    '<div style="background:#f0f4f8;padding:14px 20px;border-left:4px solid #2471a3;">' +
    '<strong>SOURCE:</strong> The Enforcer (TIER C) — ' + dayCount + ' Daily Briefs Synthesized<br>' +
    '<strong>AI ENGINE:</strong> CLAUDE OPUS 4.6 (Weekly Synthesis) · GEMINI 2.5 FLASH (Extraction)</div>' +
    '<div style="background:white;padding:24px 28px;border:1px solid #dce3ea;border-top:none;border-radius:0 0 8px 8px;line-height:1.8;">' +
    weeklyBrief + '</div>' +
    '<p style="color:#aaa;font-size:11px;margin-top:12px;text-align:center;">' +
    'Automated OSINT Pipeline v2.22 · Weekly Rollup · Open Source Intelligence Only</p></div>';
  const plainText = "WEEKLY STRATEGIC ASSESSMENT — " + date + "\n\n" +
    weeklyBrief.replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim();
  CONFIG.EMAIL_RECIPIENTS.forEach(function(email) {
    MailApp.sendEmail({to:email, subject:subject, body:plainText, htmlBody:htmlBody});
  });
}
// ============================================================
// SETUP TRIGGERS
// ============================================================
function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "runOSINTPipeline") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("runOSINTPipeline").timeBased().atHour(CONFIG.TRIGGER_HOUR).everyDays(1).create();
  Logger.log("Daily trigger set for " + CONFIG.TRIGGER_HOUR + ":00 AM");
}
function setupWeeklyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "runWeeklyRollup") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("runWeeklyRollup").timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(CONFIG.WEEKLY_HOUR).create();
  Logger.log("Weekly trigger set: Sunday at " + CONFIG.WEEKLY_HOUR + ":00 AM");
}
function setupContinuationTrigger() {
  const existing = ScriptApp.getProjectTriggers().filter(function(t) {
    return t.getHandlerFunction() === "continueOSINTPipeline";
  });
  if (existing.length > 0) {
    Logger.log("continueOSINTPipeline trigger already registered (" + existing.length + " found).");
    return;
  }
  ScriptApp.newTrigger("continueOSINTPipeline").timeBased().after(365*24*60*60*1000).create();
  Logger.log("continueOSINTPipeline registered as a project trigger.");
}
function setupClaimAgingTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "runClaimAging") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("runClaimAging").timeBased().atHour(CONFIG.CLAIM_AGING_HOUR).everyDays(1).create();
  Logger.log("Claim aging trigger set for " + CONFIG.CLAIM_AGING_HOUR + ":00 AM daily.");
}
// ============================================================
// TEST FUNCTIONS
// ============================================================
function testRun() {
  Logger.log("=== TEST: Full Daily Pipeline v2.22 (Staged) ===");
  runOSINTPipeline();
}
function testRunStageStatus() {
  const meta = _loadPipelineMeta();
  Logger.log("Pipeline Meta: " + JSON.stringify(meta));
  Logger.log("intelBrief length: "       + _loadPipelineContent("intelBrief").length);
  Logger.log("streamSummary length: "    + _loadPipelineContent("streamSummary").length);
  Logger.log("extractedBullets length: " + _loadPipelineContent("extractedBullets").length);
  Logger.log("crossDayNote length: "     + _loadPipelineContent("crossDayNote").length);
  Logger.log("newsBrief length: "        + _loadPipelineContent("newsBrief").length);
  Logger.log("redditBrief length: "      + _loadPipelineContent("redditBrief").length);
  Logger.log("newsHeadlines length: "    + _loadPipelineContent("newsHeadlines").length);
  const triggerId = PropertiesService.getScriptProperties().getProperty("PIPELINE_TRIGGER_ID");
  const stage4    = PropertiesService.getScriptProperties().getProperty("STAGE4_COMPLETE");
  Logger.log("Pending trigger ID: " + (triggerId||"none"));
  Logger.log("STAGE4_COMPLETE flag: " + (stage4||"not set"));
}
function testNewsWireOnly() {
  Logger.log("=== TEST: News Wire RSS ===");
  const headlines = fetchNewsWire();
  Logger.log("Headlines: " + headlines.length);
  const brief = analyzeNewsWire(headlines, "Test run — no stream summary available.");
  MailApp.sendEmail(CONFIG.EMAIL_RECIPIENTS[0],
    "News Wire Test — " + new Date().toLocaleDateString(), brief.replace(/<[^>]+>/g,""), {htmlBody:brief});
  Logger.log("Test email sent.");
}
function testRedditOnly() {
  Logger.log("=== TEST: Reddit RSS ===");
  const posts = fetchRedditRSS();
  Logger.log("Posts: " + posts.length);
  const brief = analyzeReddit(posts, "Test run — no stream summary available.");
  MailApp.sendEmail(CONFIG.EMAIL_RECIPIENTS[0],
    "Reddit OSINT Test — " + new Date().toLocaleDateString(), brief.replace(/<[^>]+>/g,""), {htmlBody:brief});
  Logger.log("Test email sent.");
}
function testClaimAgingOnly() {
  Logger.log("=== TEST: Claim Aging ===");
  runClaimAging();
}
function testWeeklyRollup() {
  Logger.log("=== TEST: Weekly Rollup ===");
  runWeeklyRollup();
}
// ============================================================
// SAVE EXTRACTED BULLETS TO AUDIT LOG (for prompt calibration)
// ============================================================
function _saveExtractedBulletsToLog(bullets, meta) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    var sheet = ss.getSheetByName("Extraction Audit Log");
    if (!sheet) {
      sheet = ss.insertSheet("Extraction Audit Log");
      sheet.appendRow(["Date", "Video Title", "Chunk Count", "Extracted Bullets"]);
      sheet.getRange(1,1,1,4).setFontWeight("bold")
        .setBackground("#1a1a2e").setFontColor("#ffffff");
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(4, 800);
    }
    var date = new Date().toLocaleDateString("en-US",
      {year:"numeric", month:"long", day:"numeric"});
    var chunkCount = (bullets.match(/=== EXTRACTED SEGMENT/g) || []).length;
    var title = (meta && meta.videoTitle) ? meta.videoTitle : "Unknown";
    sheet.appendRow([date, title, chunkCount, bullets]);
    Logger.log("Extracted bullets saved to Extraction Audit Log.");
  } catch(e) {
    Logger.log("_saveExtractedBulletsToLog error: " + e.message);
  }
}
