import Navbar from "../components/sections/Navbar";
import HeroSection from "../components/sections/HeroSection";
import StatSection from "../components/sections/StatSection";
import FeatureSection from "../components/sections/FeatureSection";
import SecuritySection from "../components/sections/SecuritySection";
import DownloadSection from "../components/sections/DownloadSection";
import Footer from "../components/sections/Footer";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <StatSection />
      <FeatureSection />
      <SecuritySection />
      <DownloadSection />
      <Footer />
    </div>
  );
};

export default LandingPage;
