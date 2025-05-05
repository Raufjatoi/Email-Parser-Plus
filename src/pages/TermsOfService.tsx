import React from "react";
import { Link } from "react-router-dom";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white shadow-sm rounded-lg p-8">
          <Link to="/" className="text-primary hover:underline mb-8 inline-block">
            &larr; Back to Home
          </Link>
          
          <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
          <p className="text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-slate max-w-none">
            <h2>1. Agreement to Terms</h2>
            <p>
              By accessing or using Email Parser +, you agree to be bound by these Terms of Service and all applicable 
              laws and regulations. If you do not agree with any of these terms, you are prohibited from using or 
              accessing this site.
            </p>
            
            <h2>2. Use License</h2>
            <p>
              Permission is granted to temporarily use Email Parser + for personal, non-commercial transitory viewing only. 
              This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul>
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose</li>
              <li>Attempt to decompile or reverse engineer any software contained in Email Parser +</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
              <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
            </ul>
            
            <h2>3. Email Access and Processing</h2>
            <p>
              When you connect your Gmail account to Email Parser +, you grant us limited permission to:
            </p>
            <ul>
              <li>Read emails that you explicitly select for analysis</li>
              <li>Process email content to extract information as requested by you</li>
              <li>Display parsed results to you</li>
            </ul>
            <p>
              We do not store your emails on our servers beyond what's necessary for the immediate processing 
              requested by you.
            </p>
            
            <h2>4. User Responsibilities</h2>
            <p>
              You are responsible for:
            </p>
            <ul>
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Ensuring that your use of the service complies with all applicable laws and regulations</li>
              <li>Obtaining proper consent if you upload or process emails containing information about other individuals</li>
            </ul>
            
            <h2>5. Service Limitations</h2>
            <p>
              Email Parser + is provided on an "as is" and "as available" basis. We do not guarantee that:
            </p>
            <ul>
              <li>The service will meet your specific requirements</li>
              <li>The service will be uninterrupted, timely, secure, or error-free</li>
              <li>The results obtained from using the service will be accurate or reliable</li>
              <li>Any errors in the service will be corrected</li>
            </ul>
            
            <h2>6. Disclaimer</h2>
            <p>
              The materials on Email Parser + are provided on an 'as is' basis. We make no warranties, expressed or implied, 
              and hereby disclaim and negate all other warranties including, without limitation, implied warranties or 
              conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property.
            </p>
            
            <h2>7. Limitations</h2>
            <p>
              In no event shall Email Parser + or its suppliers be liable for any damages (including, without limitation, 
              damages for loss of data or profit, or due to business interruption) arising out of the use or inability to 
              use Email Parser +, even if we or an authorized representative has been notified orally or in writing of the 
              possibility of such damage.
            </p>
            
            <h2>8. Termination</h2>
            <p>
              We may terminate or suspend your access to Email Parser + immediately, without prior notice or liability, 
              for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
            
            <h2>9. Changes to Terms</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing 
              to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
            </p>
            
            <h2>10. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at:
              <br />
              <a href="raufpokemon00@icloud.com" className="text-primary hover:underline">
                contact@emailparserplus.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;