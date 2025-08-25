import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Youtube, Loader2, FileText, Send, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@clerk/clerk-react";
import Markdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";

const YouTubeSummarizer = () => {
    const { getToken } = useAuth();
    const [url, setUrl] = useState("");
    const [detail, setDetail] = useState("short"); // short | medium | detailed
    const [summary, setSummary] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [question, setQuestion] = useState("");
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [loadingChat, setLoadingChat] = useState(false);
    const [activeTab, setActiveTab] = useState("analysis");
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

    const handleSummarize = async () => {
        if (!url.trim()) return toast.error("Please paste a YouTube URL");
        try {
            setLoadingSummary(true);
            const { data } = await axios.post(
                "/api/ai/youtube-summary",
                { url, detail },
                { headers: { Authorization: `Bearer ${await getToken()}` } }
            );
            if (data.success) {
                setSummary(data.content);
                setActiveTab("analysis");
                setChatHistory([]); // reset chat for new video
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to summarize video");
        } finally {
            setLoadingSummary(false);
        }
    };

    const handleAsk = async (e) => {
        e?.preventDefault();
        if (!question.trim()) return;
        try {
            setLoadingChat(true);
            const { data } = await axios.post(
                "/api/ai/youtube-chat",
                { question },
                { headers: { Authorization: `Bearer ${await getToken()}` } }
            );
            if (data.success) {
                setChatHistory((prev) => [
                    ...prev,
                    { role: "user", text: question },
                    { role: "ai", text: data.answer },
                ]);
                setQuestion("");
                setActiveTab("chat");
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            console.error(err);
            toast.error("Error asking question");
        } finally {
            setLoadingChat(false);
        }
    };

    return (
        <div className="h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-4 text-slate-700">
            {/* Left col */}
            <div className="w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                    <Sparkles className="w-6 text-[#7C3AED]" />
                    <h1 className="text-xl font-semibold">YouTube Summarizer</h1>
                </div>

                <p className="mt-6 text-sm font-medium">Paste YouTube Video Link</p>
                <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300 text-gray-600"
                />

                {/* Summary length control */}
                <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Summary length</p>
                    <div className="grid grid-cols-3 gap-2">
                        {["short", "medium", "detailed"].map((opt) => (
                            <button
                                key={opt}
                                onClick={() => setDetail(opt)}
                                className={`py-2 rounded-lg text-sm font-medium transition ${detail === opt
                                        ? "bg-purple-600 text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                            >
                                {opt[0].toUpperCase() + opt.slice(1)}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Short ≈ 5 bullets • Medium ≈ 8–12 bullets • Detailed = structured,
                        longer notes.
                    </p>
                </div>

                <button
                    disabled={loadingSummary}
                    onClick={handleSummarize}
                    className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-[#7C3AED] to-[#4C1D95] text-white px-4 py-2 mt-6 text-sm rounded-lg cursor-pointer"
                >
                    {loadingSummary ? (
                        <Loader2 className="w-4 h-4 my-1 animate-spin" />
                    ) : (
                        <Youtube className="w-5" />
                    )}
                    Summarize Video
                </button>
            </div>

            {/* Right col */}
            <div className="w-full max-w-xl p-4 bg-white rounded-lg flex flex-col border border-gray-200 h-full overflow-hidden">
                <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#7C3AED]" />
                    <h1 className="text-xl font-semibold">Analysis & Chat</h1>
                </div>

                {!summary ? (
                    <div className="flex-1 flex justify-center items-center">
                        <div className="text-sm flex flex-col items-center gap-5 text-gray-400">
                            <Youtube className="w-9 h-9" />
                            <p>Paste a YouTube link and click “Summarize Video” to get started</p>
                        </div>
                    </div>
                ) : (
                    <div className="mt-3 flex flex-col flex-1 min-h-0">
                        {/* Tabs */}
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setActiveTab("analysis")}
                                className={`flex-1 py-2 rounded-lg font-medium transition ${activeTab === "analysis"
                                        ? "bg-purple-600 text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                            >
                                Analysis
                            </button>
                            <button
                                onClick={() => setActiveTab("chat")}
                                className={`flex-1 py-2 rounded-lg font-medium transition ${activeTab === "chat"
                                        ? "bg-purple-600 text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                            >
                                Chat
                            </button>
                        </div>

                        {/* Animated tab content */}
                        <div className="flex-1 min-h-0 relative">
                            <AnimatePresence mode="wait">
                                {activeTab === "analysis" && (
                                    <motion.div
                                        key="analysis"
                                        initial={{ opacity: 0, x: -30 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 30 }}
                                        transition={{ duration: 0.3 }}
                                        className="p-3 bg-purple-50 border border-purple-200 rounded-lg h-full overflow-y-auto text-sm text-gray-700"
                                    >
                                        <h3 className="font-semibold text-purple-700 mb-2">
                                            📌 Summary:
                                        </h3>
                                        <Markdown>{summary}</Markdown>
                                    </motion.div>
                                )}

                                {activeTab === "chat" && (
                                    <motion.div
                                        key="chat"
                                        initial={{ opacity: 0, x: 30 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -30 }}
                                        transition={{ duration: 0.3 }}
                                        className="flex flex-col h-full"
                                    >
                                        {/* Chat messages */}
                                        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                                            {chatHistory.map((msg, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`p-3 rounded-lg max-w-[80%] break-words ${msg.role === "user"
                                                            ? "ml-auto bg-purple-600 text-white"
                                                            : "mr-auto bg-gray-200 text-gray-800"
                                                        }`}
                                                >
                                                    <strong className="block mb-1 text-xs opacity-70">
                                                        {msg.role === "user" ? "You" : "AI"}
                                                    </strong>
                                                    <Markdown>{msg.text}</Markdown>
                                                </div>
                                            ))}
                                            <div ref={messagesEndRef} />
                                        </div>

                                        {/* Input */}
                                        <form onSubmit={handleAsk} className="mt-3 flex gap-2 flex-shrink-0">
                                            <input
                                                type="text"
                                                value={question}
                                                onChange={(e) => setQuestion(e.target.value)}
                                                placeholder="Ask anything about this video..."
                                                className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-400"
                                            />
                                            <button
                                                type="submit"
                                                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                                                disabled={loadingChat || !question.trim()}
                                            >
                                                {loadingChat ? (
                                                    <Loader2 className="animate-spin w-5 h-5" />
                                                ) : (
                                                    <Send className="w-5 h-5" />
                                                )}
                                            </button>
                                        </form>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default YouTubeSummarizer;
