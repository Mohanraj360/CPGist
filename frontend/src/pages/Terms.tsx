import { LegalPageLayout } from "@/components/site/LegalPageLayout";

export default function Terms() {
  return (
    <LegalPageLayout
      content={{
        title: "Terms of Service",
        description:
          "The terms governing use of the CPGist service: acceptable use, uploaded data, AI output limitations, availability, payments, and liability.",
        path: "/terms",
        version: "0.9-draft",
        effectiveDate: "October 11, 2026",
        intro:
          "These Terms of Service govern your use of the CPGist website and, once available, the CPGist analytics workspace. They are a working draft that will be reviewed by legal counsel before launch.",
        sections: [
          {
            id: "agreement",
            heading: "1. Agreement and contact",
            paragraphs: [
              "By using the CPGist website or service you agree to these Terms. If you use the service on behalf of an organisation, you confirm you have authority to bind that organisation.",
              "The contracting entity, its registration details, and notices contact are configured before launch — placeholders appear until then. The effective date of this version is shown above.",
            ],
          },
          {
            id: "accounts",
            heading: "2. Accounts and security",
            paragraphs: [
              "Once sign-in is available, you are responsible for the confidentiality of your credentials and for activity under your account. Notify us promptly of any unauthorised use.",
              "You must provide accurate account information and keep it current. We may suspend an account where these Terms are breached or where security requires it.",
            ],
          },
          {
            id: "acceptable-use",
            heading: "3. Acceptable and prohibited use",
            bullets: [
              "Do not use the service unlawfully, to infringe others' rights, or to process data you are not authorised to process.",
              "Do not attempt to access non-public systems, disrupt the service, probe vulnerabilities without authorisation, or circumvent usage limits.",
              "Do not upload malicious code, scrape the service at abusive rates, or misrepresent AI-generated output as independently verified fact.",
            ],
          },
          {
            id: "uploaded-data",
            heading: "4. Your uploaded data",
            paragraphs: [
              "You retain ownership of data you upload. You grant CPGist a limited licence to process it to provide the service — to host, analyse, and display it back to you — and for no other purpose.",
              "You are responsible for having the authorisation to upload the data, including any licences from data providers or retailers, and for ensuring uploads comply with this Terms and our Privacy Policy.",
            ],
          },
          {
            id: "ai-output",
            heading: "5. AI-generated output",
            paragraphs: [
              "AI Analyst responses are analytical assistance, not professional advice. Responses distinguish observed metrics, calculated comparisons, estimates, possible explanations, and missing evidence — but they can still be incomplete or wrong.",
              "You are responsible for verifying important business decisions independently. CPGist supports human decision-making and does not replace business judgment.",
            ],
          },
          {
            id: "availability",
            heading: "6. Service availability",
            paragraphs: [
              "We aim to keep the service available and to communicate planned maintenance, but the service is provided subject to reasonable operational limits. Features may change during early access.",
              "We don't guarantee uninterrupted operation, and we may modify or discontinue a feature where reasonably necessary; material changes to paid features (once any exist) will be communicated in advance.",
            ],
          },
          {
            id: "payments",
            heading: "7. Subscriptions, payment, cancellation, and refunds",
            paragraphs: [
              "No paid plans or payments are available yet. When payments are introduced, the price, billing frequency, applicable taxes, renewal terms, cancellation process, and refund eligibility will be disclosed clearly before any purchase, and the Refund Policy will apply.",
              "Until then, you cannot incur charges through this website, and no payment information is collected.",
            ],
          },
          {
            id: "ip",
            heading: "8. Intellectual property",
            paragraphs: [
              "The CPGist name, product, and site content are owned by CPGist or its licensors and are protected by applicable intellectual-property law. You may use the service and your outputs as these Terms allow.",
              "You may not copy competitor branding into the service or use CPGist branding without permission.",
            ],
          },
          {
            id: "suspension",
            heading: "9. Suspension and termination",
            paragraphs: [
              "You can stop using the service at any time. We may suspend or terminate access for breach of these Terms, legal risk, or security concerns, with notice where reasonable.",
              "On termination, your uploaded data is handled per the Privacy Policy and applicable deletion requests; records we must keep by law are retained as required.",
            ],
          },
          {
            id: "liability",
            heading: "10. Liability and disputes",
            paragraphs: [
              "To the maximum extent permitted by applicable law, CPGist's aggregate liability arising from the service is limited to the amounts you paid for the service in the twelve months before the claim (zero while the service is free).",
              "These Terms don't exclude liability that can't be excluded under applicable law. Dispute provisions, including governing law and venue, are configured with legal counsel before launch and will appear here.",
            ],
          },
          {
            id: "contact",
            heading: "11. Contact",
            paragraphs: [
              "Questions about these Terms: use the contact form at /contact. The legal contact email and registered entity details are configured before launch.",
            ],
          },
        ],
      }}
    />
  );
}
