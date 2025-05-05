
import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="py-6 mt-12 border-t border-gray-100">
      <div className="container mx-auto">
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-gray-600 text-sm">
          <span>By <a href="https://rauf-psi.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Abdul Rauf Jatoi</a></span>
          <span className="hidden sm:block">•</span>
          <span className="text-gray-500">Icreativiz Technology</span>
          <span className="hidden sm:block">•</span>
          <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
          <span className="hidden sm:block">•</span>
          <Link to="/terms-of-service" className="text-primary hover:underline">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

