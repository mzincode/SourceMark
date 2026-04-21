"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import {
  FileText,
  Plus,
  X,
  ArrowDown,
  Crosshair,
  Sparkles,
  Loader2,
  Download,
  ArrowLeft,
} from "lucide-react";

const HIGHLIGHT_COLORS = [
  { id: "yellow", hex: "#E5FF00", name: "Yel" },
  { id: "green", hex: "#00FF66", name: "Grn" },
  { id: "pink", hex: "#FF00AA", name: "Pnk" },
  { id: "cyan", hex: "#00F0FF", name: "Cyn" },
];

type Topic = {
  id: number;
  name: string;
  desc: string;
  color: string;
  mode: "ai" | "exact";
};

type ResultItem = {
  topic: string;
  color: string;
  highlights: number;
};

export default function DashboardPage() {
  const [file, setFile] = useState<File | null>(null);
  const [topics, setTopics] = useState<Topic[]>([
    {
      id: 1,
      name: "Methodology",
      desc: "How the study was conducted, research design, sample size",
      color: "yellow",
      mode: "ai",
    },
  ]);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState("");
  const [results, setResults] = useState<ResultItem[] | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
    onDrop: (accepted) => {
      if (accepted.length > 0) {
        setFile(accepted[0]);
        setResults(null);
        setDownloadUrl(null);
      }
    },
  });

  const addTopic = () => {
    if (topics.length >= 4) return;
    const usedColors = topics.map((t) => t.color);
    const nextColor =
      HIGHLIGHT_COLORS.find((c) => !usedColors.includes(c.id))?.id || "yellow";

    setTopics([
      ...topics,
      { id: Date.now(), name: "", desc: "", color: nextColor, mode: "ai" },
    ]);
  };

  const removeTopic = (id: number) => {
    if (topics.length <= 1) return;
    setTopics(topics.filter((t) => t.id !== id));
  };

  const updateTopic = (id: number, field: keyof Topic, value: string) => {
    setTopics(topics.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const handleExtract = async () => {
    if (!file || processing) return;

    const validTopics = topics.filter((t) => t.desc.trim());
    if (validTopics.length === 0) return;

    setProcessing(true);
    setStatus("Uploading document...");
    setResults(null);
    setDownloadUrl(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "topics",
        JSON.stringify(
          validTopics.map((t) => ({
            name: t.name || "Untitled",
            description: t.desc,
            color: t.color,
            mode: t.mode,
          }))
        )
      );

      setStatus("AI is scanning your document...");

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/highlight`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Processing failed");
      }

      const totalHighlights = res.headers.get("X-Total-Highlights") || "0";
      const resultData = res.headers.get("X-Results");

      if (resultData) {
        setResults(JSON.parse(resultData));
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      setStatus(`Complete — ${totalHighlights} passages highlighted`);
        } catch (err: any) {
      const message = err?.message || "";
      if (message.includes("429") || message.includes("rate") || message.includes("quota")) {
        setStatus("⚡ Too many users right now. Please try again in a few minutes.");
      } else if (message.includes("Failed to fetch")) {
        setStatus("⚠️ Backend server is not running. Start it first.");
      } else {
        setStatus("❌ Something went wrong. Please try again.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl || !file) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `marked_${file.name}`;
    a.click();
  };

  return (
    <div className="relative z-10 min-h-screen">
      <nav className="border-b-2 border-black flex items-center justify-between px-6 py-4 bg-[#F4F3ED]">
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-60 transition-opacity"
        >
          <ArrowLeft size={16} />
          <span className="text-2xl font-black italic tracking-tighter">
            SourceMark.
          </span>
        </Link>
        <div className="text-xs uppercase tracking-widest opacity-60">
          Workspace Active
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="mb-12 border-b-4 border-black pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-5xl italic font-black">Workspace.</h1>
            <p className="text-sm uppercase tracking-widest mt-2 opacity-60">
              Upload → Define → Extract
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-black text-white px-4 py-2 font-bold uppercase text-sm inline-flex items-center gap-2">
              <ArrowDown size={16} /> Data Ingestion
            </div>

            <div
              {...getRootProps()}
              className={`border-4 border-black p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                isDragActive
                  ? "bg-[#00FF66] shadow-[6px_6px_0px_0px_rgba(13,13,13,1)]"
                  : "bg-white hover:shadow-[6px_6px_0px_0px_rgba(13,13,13,1)] hover:-translate-y-1 hover:-translate-x-1"
              } ${file ? "bg-[#E5FF00]" : ""}`}
            >
              <input {...getInputProps()} />
              {file ? (
                <div>
                  <FileText size={48} className="mb-4 text-black mx-auto" />
                  <p className="font-bold text-lg">{file.name}</p>
                  <p className="text-xs mt-2 opacity-70">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setResults(null);
                      setDownloadUrl(null);
                    }}
                    className="mt-4 text-xs uppercase underline underline-offset-4 hover:text-pink-600"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <Crosshair size={48} className="mb-4 opacity-40 mx-auto" />
                  <p className="font-bold uppercase tracking-widest">
                    Target Document
                  </p>
                  <p className="text-xs mt-2 opacity-60">
                    Click or drag PDF here (max 50MB)
                  </p>
                </div>
              )}
            </div>

            <AnimatePresence>
              {results && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(13,13,13,1)]"
                >
                  <h3 className="font-bold uppercase text-sm mb-4 bg-[#00FF66] inline-block px-2 py-1">
                    Extraction Report
                  </h3>
                  <div className="space-y-3 mt-4">
                    {results.map((r, i) => {
                      const colorInfo = HIGHLIGHT_COLORS.find(
                        (c) => c.id === r.color
                      );
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 border-2 border-black"
                              style={{
                                backgroundColor: colorInfo?.hex || "#ccc",
                              }}
                            />
                            <span className="text-sm font-bold uppercase">
                              {r.topic}
                            </span>
                          </div>
                          <span className="italic text-lg">{r.highlights}</span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleDownload}
                    className="btn-brutal w-full mt-6 px-4 py-3 bg-[#00F0FF] flex items-center justify-center gap-2"
                  >
                    <Download size={18} />
                    Download Marked PDF
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="flex justify-between items-center">
              <div className="bg-black text-white px-4 py-2 font-bold uppercase text-sm inline-flex items-center">
                Extraction Parameters
              </div>
              {topics.length < 4 && (
                <button
                  onClick={addTopic}
                  className="text-xs uppercase font-bold hover:underline underline-offset-4 flex items-center gap-1"
                >
                  <Plus size={14} /> Add Parameter
                </button>
              )}
            </div>

            <div className="space-y-4">
              <AnimatePresence>
                {topics.map((t) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="border-2 border-black bg-white flex shadow-[3px_3px_0px_0px_rgba(13,13,13,1)]"
                  >
                    <div className="w-12 border-r-2 border-black flex flex-col">
                      {HIGHLIGHT_COLORS.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => updateTopic(t.id, "color", c.id)}
                          style={{ backgroundColor: c.hex }}
                          className={`flex-1 transition-all ${
                            t.color === c.id
                              ? "opacity-100"
                              : "opacity-20 hover:opacity-60"
                          }`}
                        />
                      ))}
                    </div>

                    <div className="p-4 flex-1 space-y-3">
                      <div className="flex justify-between items-start">
                        <input
                          type="text"
                          placeholder="TAG NAME"
                          value={t.name}
                          onChange={(e) =>
                            updateTopic(t.id, "name", e.target.value)
                          }
                          className="font-bold uppercase tracking-wider text-lg focus:outline-none w-full bg-transparent placeholder:text-black/20"
                        />
                        {topics.length > 1 && (
                          <button
                            onClick={() => removeTopic(t.id)}
                            className="opacity-40 hover:opacity-100 hover:text-pink-600 transition-all ml-2"
                          >
                            <X size={20} />
                          </button>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => updateTopic(t.id, "mode", "ai")}
                          className={`text-xs font-bold uppercase tracking-wider px-2 py-1 border-2 border-black transition-all ${
                            t.mode === "ai"
                              ? "bg-black text-white"
                              : "bg-transparent text-black/40 hover:text-black"
                          }`}
                        >
                          AI
                        </button>
                        <button
                          onClick={() => updateTopic(t.id, "mode", "exact")}
                          className={`text-xs font-bold uppercase tracking-wider px-2 py-1 border-2 border-black transition-all ${
                            t.mode === "exact"
                              ? "bg-black text-white"
                              : "bg-transparent text-black/40 hover:text-black"
                          }`}
                        >
                          Exact
                        </button>
                      </div>
                      <textarea
                        placeholder={
                          t.mode === "exact"
                            ? "Enter exact text to search (e.g. a letter, word, or phrase)..."
                            : "Describe what to extract..."
                        }
                        value={t.desc}
                        onChange={(e) =>
                          updateTopic(t.id, "desc", e.target.value)
                        }
                        className="w-full text-sm resize-none focus:outline-none p-3 border-2 border-black/10 hover:border-black/30 focus:border-black transition-colors"
                        rows={3}
                      />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <button
              onClick={handleExtract}
              disabled={!file || processing || topics.every((t) => !t.desc.trim())}
              className={`w-full py-6 mt-4 text-xl border-4 transition-all duration-200 ${
                !file || topics.every((t) => !t.desc.trim())
                  ? "bg-black/10 border-black/20 text-black/30 cursor-not-allowed"
                  : processing
                  ? "bg-[#E5FF00] border-black text-black"
                  : "bg-[#00F0FF] border-black text-black shadow-[6px_6px_0px_0px_rgba(13,13,13,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none font-black uppercase cursor-pointer"
              }`}
            >
              {processing ? (
                <span className="flex items-center justify-center gap-3">
                  <Loader2 size={24} className="animate-spin" />
                  {status}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-3">
                  <Sparkles size={24} />
                  EXECUTE EXTRACTION
                </span>
              )}
            </button>

            <AnimatePresence>
              {status && !processing && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-sm uppercase tracking-widest mt-4 font-bold"
                >
                  {status}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}