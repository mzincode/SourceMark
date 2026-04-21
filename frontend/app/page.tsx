"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, FileText, ScanEye, Download } from "lucide-react";

export default function LandingPage() {
  const container: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 },
    },
  };

  const item: any = {
    hidden: { y: 40, opacity: 0 },
    show: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 80 },
    },
  };

  return (
    <div className="relative z-10">
      {/* Navbar */}
      <nav
        style={{
          borderBottom: "2px solid var(--color-ink)",
          backgroundColor: "var(--color-paper)",
        }}
        className="flex items-center justify-between px-6 py-4"
      >
        <div
          style={{
            fontFamily: "var(--font-serif), Georgia, serif",
            fontSize: "1.5rem",
            fontWeight: 900,
            fontStyle: "italic",
            letterSpacing: "-0.05em",
          }}
        >
          SourceMark
        </div>
        <div className="flex gap-6 items-center text-sm font-bold uppercase">
          <button
            className="hover:underline underline-offset-4"
            style={{ transition: "color 150ms" }}
          >
            Tariffs
          </button>
          <Link
            href="/dashboard"
            className="btn-brutal px-6 py-2"
            style={{ backgroundColor: "var(--color-highlight-yellow)" }}
          >
            Initialize
          </Link>
        </div>
      </nav>

      <motion.main
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-7xl mx-auto px-6 pt-24 pb-32"
      >
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
          <motion.div variants={item} className="col-span-1 lg:col-span-8">
            <h1
              style={{
                fontFamily: "var(--font-serif), Georgia, serif",
                fontSize: "clamp(3.5rem, 10vw, 7.5rem)",
                lineHeight: 0.85,
                letterSpacing: "-0.04em",
                color: "var(--color-ink)",
              }}
            >
              Highlight <br />
              in{" "}
              <span style={{ position: "relative", display: "inline-block" }}>
                <span
                  style={{
                    position: "relative",
                    zIndex: 10,
                    fontStyle: "italic",
                  }}
                >
                  seconds
                </span>
                <span
                  style={{
                    position: "absolute",
                    bottom: "0.3rem",
                    left: 0,
                    width: "100%",
                    height: "45%",
                    backgroundColor: "var(--color-highlight-pink)",
                    zIndex: 1,
                    transform: "rotate(-2deg)",
                  }}
                />
              </span>
            </h1>
          </motion.div>

          <motion.div variants={item} className="col-span-1 lg:col-span-4 pb-4">
            <p
              style={{
                borderLeft: "4px solid var(--color-highlight-yellow)",
                paddingLeft: "1rem",
                fontSize: "0.875rem",
                lineHeight: 1.7,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "rgba(13, 13, 13, 0.8)",
                fontWeight: 500,
              }}
            >
              Stop reading blindly. Upload dense academic literature, legal
              contracts, or medical journals. Define your parameters, and we'll extract
              and highlight the exact intelligence you need.
            </p>
            <div style={{ marginTop: "2.5rem" }}>
              <Link
                href="/dashboard"
                className="btn-brutal"
                style={{
                  padding: "1rem 2rem",
                  backgroundColor: "var(--color-ink)",
                  color: "var(--color-paper)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  width: "100%",
                  justifyContent: "center",
                }}
              >
                Commence Extraction <ArrowRight size={18} />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* How It Works Grid */}
        <motion.div
          variants={item}
          style={{
            marginTop: "8rem",
            borderTop: "2px solid var(--color-ink)",
            borderLeft: "2px solid var(--color-ink)",
            display: "grid",
            gridTemplateColumns: "repeat(1, 1fr)",
          }}
          className="md:!grid-cols-3"
        >
          {[
            {
              step: "01",
              icon: FileText,
              title: "Ingest",
              desc: "Feed the system any PDF up to 50MB. Text is parsed instantly.",
            },
            {
              step: "02",
              icon: ScanEye,
              title: "Target",
              desc: "Define conceptual targets. AI scans semantic meaning, not just keywords.",
            },
            {
              step: "03",
              icon: Download,
              title: "Extract",
              desc: "Download the marked dossier. Color-coded. Ready for citation.",
            },
          ].map((block, i) => (
            <div
              key={i}
              style={{
                borderRight: "2px solid var(--color-ink)",
                borderBottom: "2px solid var(--color-ink)",
                padding: "2rem",
                transition: "background-color 300ms",
                cursor: "default",
              }}
              className="group"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "var(--color-highlight-cyan)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "3rem",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-serif), Georgia, serif",
                    fontSize: "2rem",
                    fontStyle: "italic",
                    opacity: 0.4,
                  }}
                >
                  {block.step}
                </span>
                <block.icon size={32} />
              </div>
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  marginBottom: "0.5rem",
                  backgroundColor: "var(--color-ink)",
                  color: "var(--color-paper)",
                  display: "inline-block",
                  padding: "0.25rem 0.5rem",
                }}
              >
                {block.title}
              </h3>
              <p
                style={{
                  fontSize: "0.875rem",
                  opacity: 0.8,
                  fontWeight: 500,
                  lineHeight: 1.6,
                  marginTop: "1rem",
                }}
              >
                {block.desc}
              </p>
            </div>
          ))}
        </motion.div>
      </motion.main>
    </div>
  );
}