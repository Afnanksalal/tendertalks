import React from 'react';
import { motion } from 'framer-motion';
import { SEO } from '../../components/SEO';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#030014] pt-28 md:pt-36 pb-20 px-4">
      <SEO 
        title="Privacy Policy"
        description="Learn how TenderTalks collects, uses, and protects your personal information."
        url="/privacy"
        noIndex
      />
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-slate-400 mb-8">Last updated: November 2024</p>

          <div className="prose prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-bold text-white mb-3">1. Information We Collect</h2>
              <p className="text-slate-300 leading-relaxed">We collect information you provide directly:</p>
              <ul className="list-disc list-inside text-slate-300 mt-2 space-y-1">
                <li>Account information (name, email, profile picture)</li>
                <li>Payment information (processed securely by Razorpay)</li>
                <li>Usage data (listening history, preferences)</li>
                <li>Communications with our support team</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">2. How We Use Your Information</h2>
              <p className="text-slate-300 leading-relaxed">We use your information to:</p>
              <ul className="list-disc list-inside text-slate-300 mt-2 space-y-1">
                <li>Provide and improve our services</li>
                <li>Process payments and manage subscriptions</li>
                <li>Personalize your experience and recommendations</li>
                <li>Send important updates and promotional content (with consent)</li>
                <li>Ensure security and prevent fraud</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">3. Data Storage and Security</h2>
              <p className="text-slate-300 leading-relaxed">
                Your data is stored securely using industry-standard encryption. We use Supabase for authentication and Neon PostgreSQL for data storage, both of which employ robust security measures. Payment information is handled exclusively by Razorpay and is never stored on our servers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">4. Data Sharing</h2>
              <p className="text-slate-300 leading-relaxed">We do not sell your personal information. We may share data with:</p>
              <ul className="list-disc list-inside text-slate-300 mt-2 space-y-1">
                <li>Service providers (payment processors, hosting services)</li>
                <li>Legal authorities when required by law</li>
                <li>Business partners with your explicit consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">5. Cookies and Tracking</h2>
              <p className="text-slate-300 leading-relaxed">
                We use cookies and similar technologies to maintain your session, remember preferences, and analyze usage patterns. You can control cookie settings through your browser.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">6. Your Rights</h2>
              <p className="text-slate-300 leading-relaxed">You have the right to:</p>
              <ul className="list-disc list-inside text-slate-300 mt-2 space-y-1">
                <li>Access your personal data</li>
                <li>Correct inaccurate information</li>
                <li>Delete your account and associated data</li>
                <li>Export your data in a portable format</li>
                <li>Opt out of marketing communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">7. Data Retention</h2>
              <p className="text-slate-300 leading-relaxed">
                We retain your data for as long as your account is active or as needed to provide services. After account deletion, we may retain certain data for legal compliance or legitimate business purposes for up to 90 days.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">8. Children's Privacy</h2>
              <p className="text-slate-300 leading-relaxed">
                Our Service is not intended for children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">9. Changes to This Policy</h2>
              <p className="text-slate-300 leading-relaxed">
                We may update this Privacy Policy periodically. We will notify you of significant changes via email or through the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">10. Contact Us</h2>
              <p className="text-slate-300 leading-relaxed">
                For privacy-related questions or to exercise your rights, contact us at privacy@tendertalks.com
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
