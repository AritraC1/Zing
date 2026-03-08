import Badge from "../../utils/Badge";
import FeatureCard from "../FeatureCard";

const features = [
  {
    icon: "⚡",
    title: "Real-Time Messages",
    desc: "Sub-100ms delivery powered by WebSockets. Your words arrive before you even finish typing.",
  },
  {
    icon: "🔐",
    title: "End-to-End Encrypted",
    desc: "Military-grade encryption on every message, call, and file. Only you and your recipient can read it.",
  },
  {
    icon: "📞",
    title: "HD Voice & Video",
    desc: "Crystal-clear calls with adaptive bitrate. Stay connected even on weak networks.",
  },
  {
    icon: "📂",
    title: "File & Media Sharing",
    desc: "Share photos, videos, docs up to 2GB. Preview everything right inside the chat.",
  },
  {
    icon: "🌐",
    title: "Works Everywhere",
    desc: "Native apps for iOS & Android, plus a full-featured web app — all perfectly in sync.",
  },
  {
    icon: "🤝",
    title: "Group Spaces",
    desc: "Channels, threads, and polls for up to 1,000 members. Communities built for real conversation.",
  },
];

const FeatureSection = () => {
  return (
    <section id="features" className="py-24 px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Badge>Everything You Need</Badge>
          <h2
            className="mt-5 text-4xl sm:text-5xl font-black text-slate-900 tracking-tight"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            Built for real conversations
          </h2>
          <p className="mt-4 text-slate-500 text-lg max-w-xl mx-auto">
            Every feature is crafted to feel instant, secure, and effortlessly
            human.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <FeatureCard key={f.title} {...f} delay={i * 80} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;
