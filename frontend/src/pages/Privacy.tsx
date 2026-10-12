import { LegalPageLayout } from "@/components/site/LegalPageLayout";

export default function Privacy() {
  return (
    <LegalPageLayout
      content={{
        title: "Privacy Policy",
        description:
          "How CPGist collects, uses, retains, and protects personal information, and how to exercise your privacy rights.",
        path: "/privacy",
        version: "0.9-draft",
        effectiveDate: "October 11, 2026",
        intro:
          "This Privacy Policy explains what personal information CPGist collects, why we collect it, how long we keep it, and the choices and rights you have. It is written in plain language and will be reviewed by legal counsel before launch.",
        sections: [
          {
            id: "who-we-are",
            heading: "1. Who we are",
            paragraphs: [
              "CPGist is an AI-powered CPG analytics product operated as an early-access service. The responsible business entity, its registration details, and its business address are configured before launch and are not invented here — placeholders appear wherever these details are required.",
              "For privacy questions or requests, contact the privacy request channel once configured: [privacy contact email — placeholder]. Until then, use the contact form at /contact and mark your message “Privacy request”.",
            ],
          },
          {
            id: "what-we-collect",
            heading: "2. What information we collect and why",
            bullets: [
              "Contact and demo-request information: your name, work email, company, job title, business type, primary challenge, and any optional message you provide. Used solely to respond to your enquiry and prepare a relevant demo.",
              "Marketing consent: whether you asked to receive occasional product updates (a separate, optional checkbox that is never pre-selected), recorded with a timestamp, policy version, and source page.",
              "Uploaded dataset content (workspace): files you choose to upload for analysis. This is business analytics data you direct us to process on your behalf; you should not include consumer personal data (see section 4).",
              "Account information (workspace): email address and authentication credentials once sign-in is connected to an identity provider. Sign-in is not connected yet, so no account data is collected today.",
              "Technical information: standard server logs (such as request timestamps) needed to operate and secure the service. We avoid logging uploaded data, credentials, tokens, or personal information unnecessarily.",
              "Usage information: once, and only if, an analytics provider is enabled after consent, aggregated usage measurement. No analytics or advertising providers are active today.",
            ],
          },
          {
            id: "legal-bases",
            heading: "3. Processing purposes and legal bases (where applicable)",
            bullets: [
              "Responding to enquiries and providing demos: steps taken at your request or under a contract with you.",
              "Marketing emails: your consent, which you can withdraw at any time via unsubscribe links.",
              "Operating and securing the service: our legitimate interest in running a safe, functioning product.",
            ],
            paragraphs: [
              "Where local law recognises these categories, they apply only to the extent consistent with that law; nothing here overrides your mandatory local rights.",
            ],
          },
          {
            id: "data-minimisation",
            heading: "4. Analytics data and what to exclude from uploads",
            paragraphs: [
              "CPGist processes business analytics data. Features are designed so that consumer names, personal email addresses, household identifiers, children's information, and other personal data are not needed — please do not include them in uploaded files.",
              "Uploads are validated and unsupported formats are rejected. Before uploading, remove any information your organisation is not authorised to share with us, and make sure you have the rights to upload the data.",
            ],
          },
          {
            id: "retention",
            heading: "5. Data retention and deletion",
            paragraphs: [
              "Contact and demo-request records are kept while the enquiry is active and for a reasonable period afterwards to document the relationship, then deleted or anonymised. Consent records are kept to demonstrate the choice you made.",
              "You can request deletion of your data at any time via /data-deletion. Requests are verified before any deletion or disclosure, and we don't claim data is deleted until the underlying storage and relevant retention systems have actually been handled. Backups roll off on their normal schedule, and we may retain records that law requires us to keep.",
            ],
          },
          {
            id: "providers",
            heading: "6. Service providers and third-party integrations",
            paragraphs: [
              "The service runs on application hosting, a managed database, and — when configured — an identity provider, an email delivery provider, and AI model providers. Each provider can access only the information needed to perform its function under contract.",
              "We do not run advertising trackers, session-replay tools, or unnecessary analytics. The current dependency inventory is documented in the Cookie Policy, and it will be updated before any new provider is activated.",
            ],
          },
          {
            id: "ai-disclosure",
            heading: "7. What is sent to AI providers",
            paragraphs: [
              "When AI-assisted analysis is configured, questions and the data needed to answer them may be sent to AI model providers to generate a response. Confidential dataset content is not sent to third parties without the necessary configuration, disclosures, and authorisation.",
              "Customer uploads are never used to train models unless that practice is explicitly disclosed and appropriately authorised.",
            ],
          },
          {
            id: "security",
            heading: "8. Security practices and their limitations",
            paragraphs: [
              "We use measures appropriate to an early-stage service, such as encryption in transit, access controls, and least-privilege handling of credentials (which live only on the server).",
              "No security practice guarantees absolute protection, and we don't claim certifications we haven't obtained. If a security issue affects you, we will notify you as required by applicable law.",
            ],
          },
          {
            id: "your-rights",
            heading: "9. Your privacy rights",
            paragraphs: [
              "Depending on where you live, you may have rights to access, correct, export, or delete your personal information, and to object to or restrict certain processing. To submit a request, use /data-deletion for deletion requests or the contact form for other requests.",
              "We verify the identity of requesters before disclosing or deleting account information, respond within the timeframes applicable law provides, and explain if (and why) a request is lawfully declined.",
            ],
          },
          {
            id: "transfers",
            heading: "10. International data transfers",
            paragraphs: [
              "The service is hosted in a data centre that may be outside your jurisdiction. Where personal information is transferred internationally, appropriate transfer safeguards are applied once configured; the hosting region will be disclosed before launch.",
            ],
          },
          {
            id: "children",
            heading: "11. Children's data",
            paragraphs: [
              "CPGist is a business analytics product and is not directed at children. We do not knowingly collect personal information from children, and no children's profiles or data-collection features exist.",
            ],
          },
          {
            id: "changes",
            heading: "12. Changes to this policy",
            paragraphs: [
              "Material changes will be announced on this page with a new version number and effective date. Continued use of the service after an effective date constitutes acceptance of the updated policy, to the extent permitted by law.",
            ],
          },
        ],
      }}
    />
  );
}
