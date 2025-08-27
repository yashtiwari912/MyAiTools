import React, { useState } from "react";
import axios from "axios";
import { QrCode, Loader2, Download, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@clerk/clerk-react";

const QrGenerator = () => {
    const { getToken } = useAuth();

    const [text, setText] = useState("");
    const [size, setSize] = useState(512); // 128–1024
    const [margin, setMargin] = useState(2);
    const [errorCorrectionLevel, setECL] = useState("M"); // L M Q H
    const [format, setFormat] = useState("png"); // png | svg
    const [darkColor, setDarkColor] = useState("#000000");
    const [lightColor, setLightColor] = useState("#ffffff");

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null); // { format, dataUrl | svg }

    const onGenerate = async () => {
        if (!text.trim()) return toast.error("Enter text or URL to encode");
        try {
            setLoading(true);
            const { data } = await axios.post(
                "/api/ai/qr-generate",
                {
                    text,
                    size,
                    margin,
                    errorCorrectionLevel,
                    format,
                    darkColor,
                    lightColor,
                },
                { headers: { Authorization: `Bearer ${await getToken()}` } }
            );
            if (!data.success) return toast.error(data.message || "Failed");
            setResult(data);
        } catch (e) {
            console.error(e);
            toast.error("Error generating QR");
        } finally {
            setLoading(false);
        }
    };

    const downloadFile = () => {
        if (!result) return;
        if (result.format === "png") {
            const a = document.createElement("a");
            a.href = result.dataUrl; // data:image/png;base64,...
            a.download = "qr-code.png";
            a.click();
        } else {
            // svg
            const blob = new Blob([result.svg], { type: "image/svg+xml" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "qr-code.svg";
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    return (
        <div className="h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-4 text-slate-700">
            {/* Left col */}
            <div className="w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                    <Sparkles className="w-6 text-[#7C3AED]" />
                    <h1 className="text-xl font-semibold">QR Code Generator</h1>
                </div>

                <p className="mt-6 text-sm font-medium">Text / URL</p>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="https://myaitools.xyz or any text"
                    rows={3}
                    className="w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300 text-gray-700"
                />

                <div className="grid grid-cols-2 gap-3 mt-4">
                    <div>
                        <p className="text-sm font-medium mb-1">Size: {size}px</p>
                        <input
                            type="range"
                            min={128}
                            max={1024}
                            step={32}
                            value={size}
                            onChange={(e) => setSize(parseInt(e.target.value))}
                            className="w-full"
                        />
                    </div>
                    <div>
                        <p className="text-sm font-medium mb-1">Margin: {margin}</p>
                        <input
                            type="range"
                            min={0}
                            max={10}
                            step={1}
                            value={margin}
                            onChange={(e) => setMargin(parseInt(e.target.value))}
                            className="w-full"
                        />
                    </div>
                    <div>
                        <p className="text-sm font-medium mb-1">Error Correction</p>
                        <select
                            value={errorCorrectionLevel}
                            onChange={(e) => setECL(e.target.value)}
                            className="w-full p-2 border rounded-md text-sm"
                        >
                            <option value="L">L (Low)</option>
                            <option value="M">M (Medium)</option>
                            <option value="Q">Q (Quartile)</option>
                            <option value="H">H (High)</option>
                        </select>
                    </div>
                    <div>
                        <p className="text-sm font-medium mb-1">Format</p>
                        <select
                            value={format}
                            onChange={(e) => setFormat(e.target.value)}
                            className="w-full p-2 border rounded-md text-sm"
                        >
                            <option value="png">PNG</option>
                            <option value="svg">SVG</option>
                        </select>
                    </div>
                    <div>
                        <p className="text-sm font-medium mb-1">Foreground</p>
                        <input
                            type="color"
                            value={darkColor}
                            onChange={(e) => setDarkColor(e.target.value)}
                            className="w-full h-10 p-1 rounded-md border"
                        />
                    </div>
                    <div>
                        <p className="text-sm font-medium mb-1">Background</p>
                        <input
                            type="color"
                            value={lightColor}
                            onChange={(e) => setLightColor(e.target.value)}
                            className="w-full h-10 p-1 rounded-md border"
                        />
                    </div>
                </div>

                <button
                    disabled={loading}
                    onClick={onGenerate}
                    className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-[#7C3AED] to-[#4C1D95] text-white px-4 py-2 mt-6 text-sm rounded-lg cursor-pointer"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 my-1 animate-spin" />
                    ) : (
                        <QrCode className="w-5" />
                    )}
                    Generate QR
                </button>
            </div>

            {/* Right col */}
            <div className="w-full max-w-xl p-4 bg-white rounded-lg flex flex-col border border-gray-200 h-full overflow-hidden">
                <div className="flex items-center gap-3">
                    <QrCode className="w-5 h-5 text-[#7C3AED]" />
                    <h1 className="text-xl font-semibold">Preview & Download</h1>
                </div>

                {!result ? (
                    <div className="flex-1 flex justify-center items-center">
                        <div className="text-sm flex flex-col items-center gap-5 text-gray-400">
                            <QrCode className="w-9 h-9" />
                            <p>Enter details on the left and click “Generate QR”.</p>
                        </div>
                    </div>
                ) : (
                    <div className="mt-3 flex flex-col flex-1 min-h-0">
                        <div className="flex-1 overflow-y-auto p-4 bg-purple-50 border border-purple-200 rounded-lg">
                            {result.format === "png" ? (
                                <img
                                    src={result.dataUrl}
                                    alt="QR Preview"
                                    className="w-full h-auto max-w-full mx-auto"
                                />
                            ) : (
                                <div
                                    className="w-full h-auto max-w-full mx-auto"
                                    dangerouslySetInnerHTML={{ __html: result.svg }}
                                />
                            )}
                        </div>

                        <button
                            onClick={downloadFile}
                            className="mt-4 w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                        >
                            <Download className="w-5 h-5" />
                            Download {result.format.toUpperCase()}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QrGenerator;
