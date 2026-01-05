import { Link } from 'react-router-dom';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <p className="text-sm text-gray-600 mb-8">Last Updated: January 6, 2026</p>
        
        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700">
              By accessing and using iwanyu Marketplace ("the Platform"), you accept and agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use our Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Eligibility</h2>
            <p className="text-gray-700">
              You must be at least 18 years old to use this Platform. By using the Platform, you represent and warrant that you meet this age requirement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <h3 className="text-xl font-medium mb-2">3.1 Registration</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>You must provide accurate and complete information when creating an account</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You must notify us immediately of any unauthorized use of your account</li>
              <li>You are responsible for all activities that occur under your account</li>
            </ul>

            <h3 className="text-xl font-medium mb-2 mt-4">3.2 Account Termination</h3>
            <p className="text-gray-700">
              We reserve the right to suspend or terminate your account at our discretion, including for violation of these Terms,
              fraudulent activity, or extended inactivity.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Vendor Terms</h2>
            <h3 className="text-xl font-medium mb-2">4.1 Vendor Application</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Vendors must complete the application process and provide accurate business information</li>
              <li>Vendors are automatically approved but subject to review and revocation</li>
              <li>We reserve the right to revoke vendor status at any time</li>
            </ul>

            <h3 className="text-xl font-medium mb-2 mt-4">4.2 Product Listings</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Vendors must provide accurate product descriptions and pricing</li>
              <li>Products must comply with all applicable laws and regulations</li>
              <li>Prohibited items include counterfeit goods, illegal items, and hazardous materials</li>
              <li>Images must be accurate representations of the product</li>
            </ul>

            <h3 className="text-xl font-medium mb-2 mt-4">4.3 Order Fulfillment</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Vendors are responsible for fulfilling orders promptly</li>
              <li>Vendors must handle customer service for their products</li>
              <li>Vendors must honor the prices and terms listed at the time of purchase</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Buyer Terms</h2>
            <h3 className="text-xl font-medium mb-2">5.1 Purchases</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>All purchases are subject to product availability</li>
              <li>Prices are in Rwandan Francs (RWF) unless otherwise stated</li>
              <li>Payment is processed securely through Flutterwave</li>
              <li>You agree to pay all charges incurred by you or on your behalf</li>
            </ul>

            <h3 className="text-xl font-medium mb-2 mt-4">5.2 Returns and Refunds</h3>
            <p className="text-gray-700">
              Return and refund policies are set by individual vendors. Please review the vendor's policy before making a purchase.
              General return period is 7 days from delivery for eligible items.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Prohibited Conduct</h2>
            <p className="text-gray-700 mb-4">You agree not to:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Transmit harmful code or malware</li>
              <li>Engage in fraudulent activities</li>
              <li>Harass or abuse other users</li>
              <li>Manipulate prices or reviews</li>
              <li>Scrape or mine data without permission</li>
              <li>Attempt to gain unauthorized access to the Platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
            <p className="text-gray-700">
              All content on the Platform, including logos, text, graphics, and software, is owned by iwanyu or its licensors and
              protected by copyright, trademark, and other intellectual property laws. You may not use our intellectual property
              without prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Payment Processing</h2>
            <p className="text-gray-700">
              Payments are processed through Flutterwave, a third-party payment processor. By making a purchase, you agree to
              Flutterwave's terms and conditions. We do not store full payment card details on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
            <p className="text-gray-700 mb-4">
              TO THE FULLEST EXTENT PERMITTED BY LAW:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>iwanyu acts as a marketplace platform connecting buyers and vendors</li>
              <li>We are not responsible for the quality, safety, or legality of products listed</li>
              <li>We are not liable for disputes between buyers and vendors</li>
              <li>Our total liability shall not exceed the amount paid for the specific transaction</li>
              <li>We are not liable for indirect, incidental, or consequential damages</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Indemnification</h2>
            <p className="text-gray-700">
              You agree to indemnify and hold harmless iwanyu, its officers, directors, employees, and agents from any claims,
              damages, losses, liabilities, and expenses arising from your use of the Platform or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Dispute Resolution</h2>
            <h3 className="text-xl font-medium mb-2">11.1 Governing Law</h3>
            <p className="text-gray-700">
              These Terms are governed by the laws of Rwanda, without regard to conflict of law principles.
            </p>

            <h3 className="text-xl font-medium mb-2 mt-4">11.2 Arbitration</h3>
            <p className="text-gray-700">
              Any disputes arising from these Terms or your use of the Platform shall be resolved through binding arbitration
              in Kigali, Rwanda, in accordance with Rwanda Arbitration and Conciliation Act.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Modifications to Terms</h2>
            <p className="text-gray-700">
              We reserve the right to modify these Terms at any time. Significant changes will be communicated via email or
              prominent notice on the Platform. Continued use after modifications constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Termination</h2>
            <p className="text-gray-700">
              We may terminate or suspend access to our Platform immediately, without prior notice, for any reason, including
              breach of these Terms. Upon termination, your right to use the Platform will cease immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Contact Information</h2>
            <p className="text-gray-700">
              For questions about these Terms of Service, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700"><strong>Email:</strong> legal@iwanyu.store</p>
              <p className="text-gray-700"><strong>Address:</strong> Kigali, Rwanda</p>
            </div>
          </section>

          <section className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Note:</strong> By clicking "I Agree" during registration or by using the Platform,
              you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t">
          <Link to="/" className="text-iwanyu-primary hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
