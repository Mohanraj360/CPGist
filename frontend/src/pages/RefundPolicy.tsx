import { LegalPageLayout } from "@/components/site/LegalPageLayout";

export default function RefundPolicy() {
  return (
    <LegalPageLayout
      content={{
        title: "Refund Policy",
        description:
          "CPGist's refund, cancellation, and payment terms. No paid plans or payments are available yet, so no charges or refunds apply today.",
        path: "/refund-policy",
        version: "0.9-draft",
        effectiveDate: "October 11, 2026",
        intro:
          "This policy explains where refunds, cancellations, and payments stand for CPGist. We publish what is actually true today rather than inventing prices, refund windows, or non-refundable terms.",
        sections: [
          {
            id: "current-status",
            heading: "1. Current status: no payments are accepted",
            paragraphs: [
              "CPGist is in early access and does not offer paid plans yet. This website cannot take payments, does not collect payment information, and no subscription charges can occur — so there is nothing to refund at this time.",
              "If you were ever asked to pay for CPGist through this website, that did not come from us; please report it via the contact form.",
            ],
          },
          {
            id: "when-payments-launch",
            heading: "2. When payments are introduced",
            bullets: [
              "Pricing and billing frequency will be displayed completely before you commit to a purchase.",
              "Applicable taxes, renewal terms, and any recurring charges will be disclosed at checkout.",
              "Cancellation will be available through your account or by contacting us, without obstructive flows.",
              "Refund eligibility, any non-refundable components, and how to request a refund will be published here before launch.",
            ],
          },
          {
            id: "consumer-rights",
            heading: "3. Your statutory rights",
            paragraphs: [
              "Nothing in this policy limits consumer rights that applicable law grants you and that cannot be waived, including statutory withdrawal or refund rights where they apply.",
            ],
          },
          {
            id: "contact-refunds",
            heading: "4. Contact about refunds",
            paragraphs: [
              "When payments exist, refund requests go through the contact form at /contact with the subject “Refund”. The responsible billing entity and its registration details are configured before launch.",
            ],
          },
        ],
      }}
    />
  );
}
