import Link from "next/link";
import { SiteLogo } from "@/app/components/site-logo";

const h2 = "text-xl font-medium font-serif text-gray-950 mt-10 mb-3";
const p = "text-[0.9375rem] text-gray-700 leading-relaxed mb-4";
const ul = "list-disc pl-5 space-y-1.5 text-[0.9375rem] text-gray-700 leading-relaxed mb-4";

export const metadata = {
    title: "Terms of Use — Rose",
};

export default function TermsPage() {
    return (
        <div className="min-h-dvh bg-gray-50/80">
            <div className="mx-auto max-w-3xl px-6 pt-16 pb-24">
                <div className="mb-10">
                    <SiteLogo size="md" asLink />
                </div>

                <h1 className="text-3xl font-medium font-serif text-gray-950 mb-2">
                    Terms of Use
                </h1>
                <p className="text-sm text-gray-500 mb-10">
                    Last updated: 25 July 2026
                </p>

                <p className={p}>
                    Rose is a research and educational tool that demonstrates
                    how artificial intelligence can be applied to Australian
                    and New Zealand legal work. It is developed and operated
                    by Peter Dombkins, Adjunct Associate Professor in Legal
                    Transformation at UNSW, as an open-source project. By
                    creating an account or otherwise using Rose (the
                    &ldquo;Service&rdquo;), you agree to these Terms of Use.
                    If you do not agree, please do not use the Service.
                </p>

                <h2 className={h2}>1. Research and educational purpose only</h2>
                <p className={p}>
                    Rose exists to teach students and researchers how AI-assisted
                    legal tools are built and how they behave — including their
                    limitations. It is <strong>not a commercial product</strong>,
                    is not offered as a substitute for engaging a qualified
                    lawyer, and is not intended for use in live client matters,
                    real litigation, or any setting where a mistaken output
                    could cause real-world legal or financial harm. Access may
                    be limited to enrolled students, course participants, or
                    other approved users at the operator&rsquo;s discretion.
                </p>

                <h2 className={h2}>2. Not legal advice</h2>
                <p className={p}>
                    Nothing produced by Rose — including AI-generated text,
                    document drafts, summaries, citations, tabular analysis,
                    or agent output — constitutes legal advice, and no
                    solicitor-client or other professional relationship is
                    created by using the Service. Rose is a large-language-model
                    based system and, like all such systems, can produce
                    incomplete, outdated, or incorrect statements of law
                    (including citations that look plausible but are wrong).
                    You must independently verify any output before relying on
                    it for any purpose, and you should seek advice from a
                    qualified, currently-practising lawyer for any real legal
                    question.
                </p>

                <h2 className={h2}>3. Accounts and eligibility</h2>
                <p className={p}>
                    You must provide accurate information when creating an
                    account and keep your login credentials confidential. You
                    are responsible for activity that occurs under your
                    account. Course instructors or administrators may create,
                    group, or remove accounts belonging to their own students
                    for teaching purposes.
                </p>

                <h2 className={h2}>4. Acceptable use</h2>
                <p className={p}>You agree not to:</p>
                <ul className={ul}>
                    <li>
                        use the Service for any actual legal matter, real
                        client, or real litigation, or to generate documents
                        intended to be relied upon outside a teaching or
                        research context;
                    </li>
                    <li>
                        upload personal, confidential, or client information
                        that you are not authorised to share, or any
                        information relating to a real ongoing legal dispute;
                    </li>
                    <li>
                        attempt to circumvent rate limits, access controls,
                        or the citation-verification safeguards described
                        below;
                    </li>
                    <li>
                        use the Service to automatically scrape, harvest, or
                        bulk-download third-party legal databases (including
                        Jade.io or AustLII) other than through the
                        Service&rsquo;s own permitted integrations; or
                    </li>
                    <li>
                        use the Service in any way that breaches applicable
                        Australian law or infringes the rights of a third
                        party.
                    </li>
                </ul>

                <h2 className={h2}>5. AI-generated content and citation verification</h2>
                <p className={p}>
                    Rose is built around a &ldquo;human verifies&rdquo;
                    principle: it is designed to make it easy to check AI
                    output rather than to make AI output automatically
                    trustworthy. Where the Service surfaces legal citations or
                    factual assertions, it will indicate whether a source has
                    been checked, and by what method, so you can make an
                    informed judgment about how much weight to give it. You
                    remain responsible for reviewing and verifying any
                    citation, quote, or factual claim before relying on it or
                    passing it on to anyone else.
                </p>

                <h2 className={h2}>6. Legal research sources</h2>
                <p className={p}>
                    Rose can reference Australian legal materials through two
                    channels, and clearly labels which one produced a given
                    result:
                </p>
                <ul className={ul}>
                    <li>
                        <strong>Jade.io</strong> — used only where the
                        operator has enabled it and BarNet&rsquo;s written
                        permission for automated (AI content-check) access is
                        in place. Where this is not enabled, the Service does
                        not query Jade.io automatically.
                    </li>
                    <li>
                        <strong>AustLII</strong> — the Service never fetches,
                        scrapes, or submits AustLII content to an AI model.
                        Instead, it generates a plain search link to AustLII
                        that opens in your own browser; you review the result
                        yourself and record your own verification verdict.
                        This reflects AustLII&rsquo;s published acceptable use
                        policy, which prohibits automated or AI use of its
                        content.
                    </li>
                </ul>

                <h2 className={h2}>7. Intellectual property and open source</h2>
                <p className={p}>
                    Rose is distributed as open-source software under the GNU
                    Affero General Public License, version 3 (AGPL-3.0). The
                    source code, including any modifications, is available at{" "}
                    <a
                        href="https://github.com/pdombkins/mikeOSS_Australia"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                    >
                        github.com/pdombkins/mikeOSS_Australia
                    </a>
                    , and your use of the underlying code is governed by that
                    licence. Documents, notes, or other content you upload or
                    create within Rose remain yours; you grant the operator
                    only the licence needed to store and process that content
                    in order to provide the Service to you.
                </p>

                <h2 className={h2}>8. Third-party services</h2>
                <p className={p}>
                    Rose relies on third-party infrastructure and AI model
                    providers to operate, including Supabase (authentication
                    and database), Cloudflare (file storage and hosting),
                    Anthropic, Google, and Moonshot AI (language models), and
                    Resend (transactional email). Details of what information
                    is shared with these providers and why are set out in our{" "}
                    <Link href="/privacy" className="text-blue-600 hover:underline">
                        Privacy Policy
                    </Link>
                    .
                </p>

                <h2 className={h2}>9. Suspension and termination</h2>
                <p className={p}>
                    The operator may suspend or terminate your access to the
                    Service at any time, including where an account is
                    inactive, misused, or where a course or research
                    engagement has ended. You may stop using the Service and
                    request deletion of your account at any time by contacting
                    us as set out below.
                </p>

                <h2 className={h2}>10. Disclaimers and limitation of liability</h2>
                <p className={p}>
                    The Service is provided &ldquo;as is&rdquo; and
                    &ldquo;as available&rdquo;, for research and educational
                    purposes, without warranties of any kind, express or
                    implied, including as to accuracy, completeness,
                    availability, or fitness for a particular purpose. To the
                    maximum extent permitted by Australian law, the operator
                    excludes all liability for any loss or damage arising from
                    your use of, or reliance on, the Service or its output.
                    Nothing in these Terms excludes, restricts, or modifies
                    any consumer guarantee or other right that cannot lawfully
                    be excluded under the Australian Consumer Law.
                </p>

                <h2 className={h2}>11. Changes to these Terms</h2>
                <p className={p}>
                    We may update these Terms from time to time, for example
                    as the Service&rsquo;s features or underlying legal
                    research architecture change. The &ldquo;Last
                    updated&rdquo; date above will reflect the most recent
                    revision. Continued use of the Service after an update
                    means you accept the revised Terms.
                </p>

                <h2 className={h2}>12. Governing law</h2>
                <p className={p}>
                    These Terms are governed by the laws of New South Wales,
                    Australia, and you submit to the non-exclusive
                    jurisdiction of its courts.
                </p>

                <h2 className={h2}>13. Contact</h2>
                <p className={p}>
                    Questions about these Terms can be sent to{" "}
                    <a
                        href="mailto:pdombkins@gmail.com"
                        className="text-blue-600 hover:underline"
                    >
                        pdombkins@gmail.com
                    </a>
                    .
                </p>
            </div>
        </div>
    );
}
