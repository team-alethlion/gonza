"use client";

import Hero from "./index/Hero";
import DashboardShowcase from "./index/DashboardShowcase";
import AppShowcase from "./index/AppShowcase";
import StatsBar from "./index/StatsBar";
import Features from "./index/Features";
import WhySection from "./index/WhySection";
import ContactSection from "./index/ContactSection";
import CTA from "./index/CTA";
import Footer from "./index/Footer";
import Nav from "./index/Nav";
import GlobalStyles from "./index/GlobalStyles";
import { B } from "../public/constants";

export default function PublicLandingClient() {
  return (
    <div className="lp">
      <GlobalStyles />
      <Nav />
      <main>
        <Hero B={B} />
        <DashboardShowcase B={B} />
        <StatsBar B={B} />
        <AppShowcase B={B} />
        <Features B={B} />
        <WhySection B={B} />
        <ContactSection B={B} />
        <CTA B={B} />
      </main>
      <Footer B={B} />
    </div>
  );
}
