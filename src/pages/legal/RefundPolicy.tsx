import React from 'react';
import { motion } from 'framer-motion';

export const RefundPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#030014] pt-28 md:pt-36 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Refund Policy
          </h1>
          <p className="text-slate-400 mb-8">Last updated: November 2024</p>

          <div className="prose prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-bold text-white mb-3">Subscription Refunds</h2>
              <p className="text-slate-300 leading-relaxed">
                We offer a 7-day money-back guarantee for new subscriptions. If you're not satisfied with your subscription within the first 7 days, you can request a full refund.
              </p>
              <ul className="list-disc list-inside text-slate-300 mt-2 space-y-1">
                <li>Refund requests must be made within 7 days of purchase</li>
                <li>Refunds are processed within 5-7 business days</li>
                <li>After 7 days, subscriptions are non-refundable</li>
                <li>You can cancel anytime to prevent future charges</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">Individual Podcast Purchases</h2>
              <p className="text-slate-300 leading-relaxed">
                Individual podcast purchases are generally non-refundable once you have accessed the content. However, we may consider refunds in the following cases:
              </p>
              <ul className="list-disc list-inside text-slate-300 mt-2 space-y-1">
                <li>Technical issues preventing access to purchased content</li>
                <li>Duplicate purchases made in error</li>
                <li>Content significantly different from description</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">Merchandise Refunds</h2>
              <p className="text-slate-300 leading-relaxed">
                For physical merchandise:
              </p>
              <ul className="list-disc list-inside text-slate-300 mt-2 space-y-1">
                <li>Returns accepted within 14 days of delivery</li>
                <li>Items must be unused and in original packaging</li>
                <li>Customer is responsible for return shipping costs</li>
                <li>Refund processed within 7-10 business days after receiving the return</li>
              </ul>
              <p className="text-slate-300 leading-relaxed mt-3">
                For digital merchandise, all sales are final unless there are technical issues with delivery.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">How to Request a Refund</h2>
              <p className="text-slate-300 leading-relaxed">
                To request a refund:
              </p>
              <ol className="list-decimal list-inside text-slate-300 mt-2 space-y-1">
                <li>Email us at support@tendertalks.com</li>
                <li>Include your order/transaction ID</li>
                <li>Provide the reason for your refund request</li>
                <li>We will respond within 2 business days</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">Refund Processing</h2>
              <p className="text-slate-300 leading-relaxed">
                Approved refunds will be credited to your original payment method. Processing times vary by payment provider:
              </p>
              <ul className="list-disc list-inside text-slate-300 mt-2 space-y-1">
                <li>Credit/Debit Cards: 5-7 business days</li>
                <li>UPI: 2-3 business days</li>
                <li>Net Banking: 5-7 business days</li>
                <li>Wallets: 1-2 business days</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">Cancellation Policy</h2>
              <p className="text-slate-300 leading-relaxed">
                You can cancel your subscription at any time from your account settings. Upon cancellation:
              </p>
              <ul className="list-disc list-inside text-slate-300 mt-2 space-y-1">
                <li>You retain access until the end of your current billing period</li>
                <li>No further charges will be made</li>
                <li>Downloaded content remains accessible offline</li>
                <li>You can resubscribe at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">Contact Us</h2>
              <p className="text-slate-300 leading-relaxed">
                For refund inquiries or assistance, contact our support team at support@tendertalks.com
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
