import { FileText, Sparkles, Copy } from "lucide-react";
import React, { useState } from "react";
import toast from "react-hot-toast";
import Tesseract from "tesseract.js";
import axios from "axios"
import { useAuth } from '@clerk/clerk-react';

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const ImageToText = () => {

    const { getToken } = useAuth()
    const [loading, setLoading] = useState(false);
    const [content, setContent] = useState("");

    const onSubmitHandler = async (e) => {
        e.preventDefault();
        const file = e.target.image.files[0];
        if (!file) return;

        setLoading(true);
        setContent("");

        try {
            // OCR processing
            const {
                data: { text },
            } = await Tesseract.recognize(file, "eng", {

                langPath: `${window.location.origin}/tessdata`,
            });

            console.log(`${window.location.origin}/tessdata/eng.traineddata`);
            await axios.post(
                "/api/ai/extract-text",
                { text },
                {
                    headers: {
                        Authorization: `Bearer ${await getToken()}`,
                        "Content-Type": "application/json",
                    },
                }
            );
            setContent(text);
            toast.success("Text extracted!");
        } catch (error) {
            console.error(error);
            toast.error("OCR failed");
        }

        setLoading(false);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(content);
        toast.success("Copied to clipboard!");
    };

    return (
        <div className="h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-4 text-slate-700">
            {/* left col */}
            <form
                onSubmit={onSubmitHandler}
                className="w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200"
            >
                <div className="flex items-center gap-3">
                    <Sparkles className="w-6 text-[#FF4938]" />
                    <h1 className="text-xl font-semibold">Image to Text Extractor</h1>
                </div>
                <p className="mt-6 text-sm font-medium">Upload Image</p>

                <input
                    name="image"
                    type="file"
                    accept="image/*"
                    className="w-full p-2 px-3 mt-2 outline-none text-sm 
          rounded-md border border-gray-300 text-gray-600"
                    required
                />

                <p className="text-xs text-gray-500 font-light mt-1">
                    Supports JPG, PNG, and other image formats
                </p>

                <button
                    disabled={loading}
                    className="w-full flex justify-center items-center gap-2 
          bg-gradient-to-r from-[#F6AB41] to-[#FF4938] text-white 
          px-4 py-2 mt-6 text-sm rounded-lg cursor-pointer"
                >
                    {loading ? (
                        <span className="w-4 h-4 my-1 rounded-full border-2 border-t-transparent animate-spin"></span>
                    ) : (
                        <FileText className="w-5" />
                    )}
                    Extract Text
                </button>
            </form>

            {/* Right col */}
            <div
                className="w-full max-w-lg p-4 bg-white rounded-lg flex flex-col 
        border border-gray-200 min-h-96"
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#FF4938]" />
                        <h1 className="text-xl font-semibold">Extracted Text</h1>
                    </div>

                    {content && (
                        <button
                            onClick={copyToClipboard}
                            className="flex items-center gap-1 text-sm px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-100"
                        >
                            <Copy className="w-4 h-4" /> Copy
                        </button>
                    )}
                </div>

                {!content ? (
                    <div className="flex-1 flex justify-center items-center">
                        <div className="text-sm flex flex-col items-center gap-5 text-gray-400">
                            <FileText className="w-9 h-9" />
                            <p>Upload an image and click "Extract Text" to get started</p>
                        </div>
                    </div>
                ) : (
                    <textarea
                        readOnly
                        value={content}
                        className="mt-3 w-full flex-1 resize-none p-3 text-sm rounded-md border border-gray-200 outline-none"
                    />
                )}
            </div>
        </div>
    );
};

export default ImageToText;
