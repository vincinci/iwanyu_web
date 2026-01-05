import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <p className="text-sm text-gray-600 mb-8">Last Updated: January 6, 2026</p>
        
        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-gray-700">
              Welcome to iwanyu Marketplace ("we," "our," or "us"). We are committed to protecting your privacy and personal information.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our marketplace platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-medium mb-2">2.1 Personal Information</h3>
            <p className="text-gray-700 mb-4">
              When you create an account, we collect:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Full name</li>
              <li>Email address</li>
              <li>Phone number (for vendors)</li>
              <li>Business information (for vendors)</li>
              <li>Payment information (processed securely through Flutterwave)</li>
            </ul>

            <h3 className="text-xl font-medium mb-2 mt-4">2.2 Automatically Collected Information</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Device information</li>
              <li>Usage data and analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Process your orders and payments</li>
              <li>Communicate with you about your orders</li>
              <li>Provide customer support</li>
              <li>Improve our services</li>
              <li>Send marketing communications (with your consent)</li>
              <li>Prevent fraud and enhance security</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Sharing and Disclosure</h2>
            <p className="text-gray-700 mb-4">We may share your information with:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Vendors:</strong> When you make a purchase, we share necessary information with the vendor</li>
              <li><strong>Payment Processors:</strong> Flutterwave processes payments securely</li>
              <li><strong>Service Providers:</strong> Third-party services that help us operate our platform</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p className="text-gray-700">
              We implement industry-standard security measures to protect your personal information:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mt-2">
              <li>SSL/TLS encryption for data transmission</li>
              <li>Secure database storage with Supabase</li>
              <li>Row-level security policies</li>
              <li>Regular security audits</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
            <p className="text-gray-700 mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Export your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Cookies and Tracking</h2>
            <p className="text-gray-700">
              We use cookies and similar technologies to enhance your experience, analyze usage, and provide personalized content.
              You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Children's Privacy</h2>
            <p className="text-gray-700">
              Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. International Data Transfers</h2>
            <p className="text-gray-700">
              Your information may be transferred to and processed in countries other than Rwanda. We ensure adequate protection through
              appropriate safeguards and compliance with applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
            <p className="text-gray-700">
              We may update this Privacy Policy periodically. We will notify you of significant changes by posting the new policy on this page
              and updating the "Last Updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p className="text-gray-700">
              If you have questions about this Privacy Policy or how we handle your data, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700"><strong>Email:</strong> privacy@iwanyu.store</p>
              <p className="text-gray-700"><strong>Address:</strong> Kigali, Rwanda</p>
            </div>
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

export default PrivacyPolicy;
