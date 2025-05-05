
import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EmailParser from "@/components/EmailParser";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        <Header />
        <EmailParser />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
