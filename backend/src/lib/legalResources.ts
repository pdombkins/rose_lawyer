/**
 * Combined "Legal resources" list for the Library → Legal resources tab.
 *
 * Merges the two design docs that previously lived separately at the repo
 * root:
 *   - australian-legal-sources-map.md  (what data sources exist, per
 *     jurisdiction, for legislation + case law, and their licence status)
 *   - citation-verification-gate.md    (how Rose validates a citation
 *     against those sources without breaching AustLII's / Jade's terms)
 *
 * Each entry is classified by how Rose can actually use it *today*:
 *
 *   "ai_auto_fetched"      Rose's own server fetches this automatically
 *                          (e.g. curated official RSS feeds for Regwatch).
 *   "ai_when_jade_approved" Only usable by the AI when an admin has turned
 *                          on `jade_access_approved` (BarNet written
 *                          permission obtained). When OFF, this source is
 *                          NOT queried by the AI at all — falls back to
 *                          human/manual use of AustLII instead.
 *   "user_only"            Rose never fetches, scrapes or frames this
 *                          source. The user opens it themselves in their
 *                          own browser and (for citations) records a
 *                          verified/not-verified outcome; only that
 *                          boolean reaches the AI (see
 *                          lib/verification/assertionCheck.ts).
 *
 * Nothing here is fetched by this module — it is a reference list only.
 */

export type ResourceCategory =
    | "validation" // case/legislation citation validation sources
    | "legislation" // official legislation registers, per jurisdiction
    | "case_law" // official/first-party case law sources, per jurisdiction
    | "regulatory_feed"; // curated official RSS feeds (Regwatch, C018)

export type ResourceAccessMode =
    | "ai_auto_fetched"
    | "ai_when_jade_approved"
    | "user_only";

export type LegalResource = {
    id: string;
    category: ResourceCategory;
    jurisdiction: string; // "Cth", "NSW", "VIC", ..., "NZ", "All AU/NZ"
    title: string;
    url: string;
    access: ResourceAccessMode;
    /** Short human-readable note: licence status, coverage caveat, etc. */
    note?: string;
};

export const LEGAL_RESOURCES: LegalResource[] = [
    // ── Validation sources (how Rose checks a citation is real) ──────────
    {
        id: "val_jade",
        category: "validation",
        jurisdiction: "All AU/NZ",
        title: "Jade.io (BarNet) — case law & legislation search, citation validation, judgment fetch",
        url: "https://jade.io/",
        access: "ai_when_jade_approved",
        note: "Requires BarNet's prior written permission (admin toggle 'Jade access approved'). When off, Rose never calls Jade.",
    },
    {
        id: "val_austlii",
        category: "validation",
        jurisdiction: "All AU/NZ",
        title: "AustLII — manual citation verification (search link only)",
        url: "https://www.austlii.edu.au/",
        access: "user_only",
        note: "Rose computes an outbound search link only; never fetches, scrapes or frames AustLII. The user opens it, reviews it, and records verified/not_verified themselves. Always the default fallback when Jade access is off.",
    },

    // ── Foundational open corpus (recommended base layer — not yet ingested) ──
    {
        id: "corpus_oalc",
        category: "case_law",
        jurisdiction: "All AU",
        title: "Open Australian Legal Corpus (OALC) — Cth/NSW/QLD/WA/SA/TAS legislation + HCA, Federal Court family, all NSW case law",
        url: "https://huggingface.co/datasets/isaacus/open-australian-legal-corpus",
        access: "user_only",
        note: "CC BY 4.0 compilation; permission-cleared per source. Not yet ingested into Rose — reference/candidate dataset for future automated use, not a live AI tool today.",
    },

    // ── Legislation — official registers, per jurisdiction ───────────────
    {
        id: "leg_cth",
        category: "legislation",
        jurisdiction: "Cth",
        title: "Federal Register of Legislation",
        url: "https://www.legislation.gov.au/",
        access: "user_only",
        note: "CC BY 4.0 (open). Included in OALC. Not yet wired into Rose as a live tool.",
    },
    {
        id: "leg_nsw",
        category: "legislation",
        jurisdiction: "NSW",
        title: "NSW legislation register",
        url: "https://legislation.nsw.gov.au/",
        access: "user_only",
        note: "Crown copyright; OALC has permission — verify computational-reuse terms before automated use.",
    },
    {
        id: "leg_qld",
        category: "legislation",
        jurisdiction: "QLD",
        title: "Queensland legislation register",
        url: "https://www.legislation.qld.gov.au/",
        access: "user_only",
        note: "CC BY 4.0 (open, QLD Government default). Included in OALC.",
    },
    {
        id: "leg_wa",
        category: "legislation",
        jurisdiction: "WA",
        title: "Western Australia legislation register",
        url: "https://www.legislation.wa.gov.au/",
        access: "user_only",
        note: "Crown copyright; OALC has permission — verify.",
    },
    {
        id: "leg_sa",
        category: "legislation",
        jurisdiction: "SA",
        title: "South Australia legislation register",
        url: "https://www.legislation.sa.gov.au/",
        access: "user_only",
        note: "Crown copyright; OALC has permission — verify.",
    },
    {
        id: "leg_tas",
        category: "legislation",
        jurisdiction: "TAS",
        title: "Tasmania legislation register (EnAct)",
        url: "https://www.legislation.tas.gov.au/",
        access: "user_only",
        note: "Crown copyright; OALC has permission — verify.",
    },
    {
        id: "leg_vic",
        category: "legislation",
        jurisdiction: "VIC",
        title: "Victoria legislation register",
        url: "https://www.legislation.vic.gov.au/",
        access: "user_only",
        note: "© State of Victoria — “personal use only”, not openly licensed. Gap in OALC. Contact ocpc@vic.gov.au for reuse permission.",
    },
    {
        id: "leg_act",
        category: "legislation",
        jurisdiction: "ACT",
        title: "ACT legislation register",
        url: "https://www.legislation.act.gov.au/",
        access: "user_only",
        note: "© ACT Government, “all rights reserved” — verify reuse terms. Gap in OALC. Contact pco@act.gov.au.",
    },
    {
        id: "leg_nt",
        category: "legislation",
        jurisdiction: "NT",
        title: "NT legislation register",
        url: "https://legislation.nt.gov.au/",
        access: "user_only",
        note: "Crown copyright — verify current notice. Gap in OALC.",
    },
    {
        id: "leg_nz",
        category: "legislation",
        jurisdiction: "NZ",
        title: "New Zealand Legislation",
        url: "https://www.legislation.govt.nz/",
        access: "user_only",
    },

    // ── Case law — official/first-party sources, per jurisdiction ────────
    {
        id: "case_hca",
        category: "case_law",
        jurisdiction: "Cth",
        title: "High Court of Australia — judgments database",
        url: "https://eresources.hcourt.gov.au/",
        access: "user_only",
        note: "Crown copyright. Included in OALC (all HCA decisions).",
    },
    {
        id: "case_fca",
        category: "case_law",
        jurisdiction: "Cth",
        title: "Federal Court of Australia — Digital Law Library (Judgments)",
        url: "https://www.fedcourt.gov.au/digital-law-library/judgments/search",
        access: "user_only",
        note: "Crown copyright. Included in OALC (Federal Court family).",
    },
    {
        id: "case_comcourts",
        category: "case_law",
        jurisdiction: "Cth",
        title: "Federal Circuit & Family Court — Commonwealth Courts Portal",
        url: "https://www.comcourts.gov.au/",
        access: "user_only",
        note: "Not fully covered by OALC.",
    },
    {
        id: "case_art",
        category: "case_law",
        jurisdiction: "Cth",
        title: "Administrative Review Tribunal (ART) — decisions",
        url: "https://www.art.gov.au/",
        access: "user_only",
        note: "Replaced the AAT on 14 Oct 2024; publishes significant decisions.",
    },
    {
        id: "case_fwc",
        category: "case_law",
        jurisdiction: "Cth",
        title: "Fair Work Commission — Find decisions and orders",
        url: "https://www.fwc.gov.au/hearings-decisions/find-decisions-and-orders",
        access: "user_only",
        note: "Decisions since 1 Jan 2003; pre-2003 only via AustLII.",
    },
    {
        id: "case_nsw",
        category: "case_law",
        jurisdiction: "NSW",
        title: "NSW Caselaw",
        url: "https://www.caselaw.nsw.gov.au/",
        access: "user_only",
        note: "Best official state portal; all NSW courts + tribunals. Included in OALC.",
    },
    {
        id: "case_vic",
        category: "case_law",
        jurisdiction: "VIC",
        title: "Supreme Court of Victoria — judgments",
        url: "https://www.supremecourt.vic.gov.au/",
        access: "user_only",
        note: "Selected judgments only; full historical text previously only on AustLII. Gap in OALC.",
    },
    {
        id: "case_qld",
        category: "case_law",
        jurisdiction: "QLD",
        title: "Supreme Court Library Qld CaseLaw (SCLQ)",
        url: "https://www.sclqld.org.au/caselaw",
        access: "user_only",
        note: "Official publisher of unreported QLD judgments; published within 24h.",
    },
    {
        id: "case_wa",
        category: "case_law",
        jurisdiction: "WA",
        title: "eCourts Portal of Western Australia",
        url: "https://ecourts.justice.wa.gov.au/",
        access: "user_only",
        note: "Crown copyright.",
    },
    {
        id: "case_sa",
        category: "case_law",
        jurisdiction: "SA",
        title: "Courts Administration Authority SA — judgments",
        url: "https://www.courts.sa.gov.au/",
        access: "user_only",
        note: "Selected judgments only.",
    },
    {
        id: "case_tas",
        category: "case_law",
        jurisdiction: "TAS",
        title: "Supreme Court of Tasmania — judgments",
        url: "https://www.supremecourt.tas.gov.au/",
        access: "user_only",
        note: "Selected judgments only.",
    },
    {
        id: "case_act",
        category: "case_law",
        jurisdiction: "ACT",
        title: "ACT Courts — Supreme & Magistrates judgments",
        url: "https://www.courts.act.gov.au/",
        access: "user_only",
        note: "Crown copyright.",
    },
    {
        id: "case_nt",
        category: "case_law",
        jurisdiction: "NT",
        title: "Supreme Court of the Northern Territory — judgments",
        url: "https://supremecourt.nt.gov.au/",
        access: "user_only",
        note: "Selected judgments only.",
    },

    // ── Regulatory monitoring feeds (Regwatch, C018) ──────────────────────
    {
        id: "reg_frl",
        category: "regulatory_feed",
        jurisdiction: "Cth",
        title: "Federal Register of Legislation — latest Acts (RSS)",
        url: "https://www.legislation.gov.au/WhatsNew/rss",
        access: "ai_auto_fetched",
        note: "Polled automatically by Rose's Regwatch scanner (6-hourly).",
    },
    {
        id: "reg_asic",
        category: "regulatory_feed",
        jurisdiction: "Cth",
        title: "ASIC media releases (RSS)",
        url: "https://asic.gov.au/rss/asic-media-releases.xml",
        access: "ai_auto_fetched",
    },
    {
        id: "reg_accc",
        category: "regulatory_feed",
        jurisdiction: "Cth",
        title: "ACCC media releases (RSS)",
        url: "https://www.accc.gov.au/rss/media_releases.xml",
        access: "ai_auto_fetched",
    },
    {
        id: "reg_oaic",
        category: "regulatory_feed",
        jurisdiction: "Cth",
        title: "OAIC news (RSS)",
        url: "https://www.oaic.gov.au/rss/news",
        access: "ai_auto_fetched",
    },
    {
        id: "reg_apra",
        category: "regulatory_feed",
        jurisdiction: "Cth",
        title: "APRA news (RSS)",
        url: "https://www.apra.gov.au/rss.xml",
        access: "ai_auto_fetched",
    },
    {
        id: "reg_fwo",
        category: "regulatory_feed",
        jurisdiction: "Cth",
        title: "Fair Work Ombudsman media releases (RSS)",
        url: "https://www.fairwork.gov.au/rss/media-releases",
        access: "ai_auto_fetched",
    },
    {
        id: "reg_nz",
        category: "regulatory_feed",
        jurisdiction: "NZ",
        title: "New Zealand Legislation — latest (RSS)",
        url: "https://www.legislation.govt.nz/subscribe/rss.aspx",
        access: "ai_auto_fetched",
    },
];

export type ResolvedLegalResource = LegalResource & {
    aiAccessible: boolean;
    accessLabel: string;
};

/**
 * Resolve each resource's *current* AI-accessibility given the live
 * `jade_access_approved` app setting, so the Library page always reflects
 * reality rather than a snapshot.
 */
export function resolveLegalResources(
    jadeApproved: boolean,
): ResolvedLegalResource[] {
    return LEGAL_RESOURCES.map((r) => {
        if (r.access === "ai_auto_fetched") {
            return {
                ...r,
                aiAccessible: true,
                accessLabel: "AI-accessible — fetched automatically by Rose",
            };
        }
        if (r.access === "ai_when_jade_approved") {
            return jadeApproved
                ? {
                      ...r,
                      aiAccessible: true,
                      accessLabel: "AI-accessible — Jade.io (access approved)",
                  }
                : {
                      ...r,
                      aiAccessible: false,
                      accessLabel:
                          "User-only right now — Jade access is not approved; Rose falls back to an AustLII search link the user must open and verify themselves",
                  };
        }
        return {
            ...r,
            aiAccessible: false,
            accessLabel:
                "User-only — Rose never fetches this source; open it yourself and (for citations) record the verified/not-verified outcome",
        };
    });
}
