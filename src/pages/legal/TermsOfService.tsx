import React from 'react';
import { motion } from 'framer-motion';

export const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#030014] pt-28 md:pt-36 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Terms of Service
          </h1>
          <p className="text-slate-400 mb-8">Last updated: November 2024</p>

          <div className="prose prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
              <p className="text-slate-300 leading-relaxed">
                By accessing and using TenderTalks ("the Service"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">2. Description of Service</h2>
              <p className="text-slate-300 leading-relaxed">
                TenderTalks is a podcast streaming platform that provides access to audio and video content. We offer both free and premium content through subscription plans and individual purchases.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">3. User Accounts</h2>
              <p className="text-slate-300 leading-relaxed">
                To access certain features, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must provide accurate and complete information when creating your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">4. Subscriptions and Payments</h2>
              <p className="text-slate-300 leading-relaxed">
                Subscription plans are billed on a recurring basis (monthly or annually). By subscribing, you authorize us to charge your payment method automatically. You can cancel your subscription at any time, and you will retain access until the end of your billing period.
              </p>
              <ul className="list-disc list-inside text-slate-300 mt-2 space-y-1">
                <li>All prices are in Indian Rupees (INR)</li>
                <li>Payments are processed securely through Razorpay</li>
                <li>Subscription renewals occur automatically unless cancelled</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">5. Content Usage</h2>
              <p className="text-slate-300 leading-relaxed">
                All content on TenderTalks is protected by copyright. You may stream and download content for personal, non-commercial use only. You may not redistribute, modify, or use our content for commercial purposes without explicit permission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">6. Prohibited Activities</h2>
              <p className="text-slate-300 leading-relaxed">You agree not to:</p>
              <ul className="list-disc list-inside text-slate-300 mt-2 space-y-1">
                <li>Share your account credentials with others</li>
                <li>Attempt to bypass any access restrictions</li>
                <li>Use automated tools to access the Service</li>
                <li>Upload malicious content or engage in harmful activities</li>
                <li>Violate any applicable laws or regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">7. Intellectual Property</h2>
              <p className="text-slate-300 leading-relaxed">
                All content, trademarks, and intellectual property on TenderTalks are owned by us or our content creators. You are granted a limited, non-exclusive license to access and use the content for personal purposes only.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">8. Limitation of Liability</h2>
              <p className="text-slate-300 leading-relaxed">
                TenderTalks is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">9. Changes to Terms</h2>
              <p className="text-slate-300 leading-relaxed">
                We reserve the right to modify these terms at any time. We will notify users of significant changes via email or through the Service. Continued use after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">10. Contact</h2>
              <p className="text-slate-300 leading-relaxed">
                For questions about these Terms of Service, please contact us at legal@tendertalks.com
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
