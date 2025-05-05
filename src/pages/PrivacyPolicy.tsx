import React from "react";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white shadow-sm rounded-lg p-8">
          <Link to="/" className="text-primary hover:underline mb-8 inline-block">
            &larr; Back to Home
          </Link>
          
          <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
          <p className="text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-slate max-w-none">
            <h2>1. Introduction</h2>
            <p>
              Welcome to Email Parser +. This Privacy Policy explains how we collect, use, disclose, 
              and safeguard your information when you use our email parsing service. Please read this 
              privacy policy carefully. If you do not agree with the terms of this privacy policy, 
              please do not access the application.
            </p>
            
            <h2>2. Information We Collect</h2>
            <p>
              We collect information that you provide directly to us when you:
            </p>
            <ul>
              <li>Connect your email account through OAuth</li>
              <li>Upload or paste email content for parsing</li>
              <li>Use our email analysis features</li>
            </ul>
            
            <h2>3. Email Data Processing</h2>
            <p>
              When you connect your Gmail account, we request limited access to read your emails. 
              We only access the emails you explicitly select for analysis. We do not:
            </p>
            <ul>
              <li>Store your emails on our servers</li>
              <li>Share your email content with third parties</li>
              <li>Use your email data for advertising purposes</li>
              <li>Read emails beyond what's necessary for the requested analysis</li>
            </ul>
            
            <h2>4. How We Use Your Information</h2>
            <p>
              We use the information we collect or receive:
            </p>
            <ul>
              <li>To provide and maintain our Service</li>
              <li>To analyze and parse email content as requested by you</li>
              <li>To improve our parsing algorithms and user experience</li>
              <li>To respond to your inquiries and solve any potential issues</li>
            </ul>
            
            <h2>5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to maintain the safety of your personal information. 
              However, no Internet or email transmission is ever fully secure or error-free.
            </p>
            
            <h2>6. Third-Party Services</h2>
            <p>
              Our service may use third-party services for email analysis and AI processing. These services 
              have their own privacy policies addressing how they use such information.
            </p>
            
            <h2>7. Your Data Rights</h2>
            <p>
              Depending on your location, you may have certain rights regarding your personal information, such as:
            </p>
            <ul>
              <li>The right to access information we have about you</li>
              <li>The right to request that we delete any personal information we have about you</li>
              <li>The right to object to processing of your personal information</li>
              <li>The right to data portability</li>
            </ul>
            
            <h2>8. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting 
              the new Privacy Policy on this page and updating the "Last Updated" date.
            </p>
            
            <h2>9. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
              <br />
              <a href="mailto:raufpokemon00@gmail.com" className="text-primary hover:underline">
                contact@emailparserplus.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;