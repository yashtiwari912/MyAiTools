import OpenAI from "openai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import pdf from "pdf-parse/lib/pdf-parse.js";
import QRCode from "qrcode";
import sharp from "sharp";


const AI = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export const generateArticle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, length } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "Free usage limit exceeded. Upgrade to continue.",
      });
    }

    const response = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: length,
    });
    const content = response.choices[0].message.content;
    await sql`INSERT INTO creations (user_id,prompt,content,type) VALUES (${userId},${prompt},${content},'article')`;

    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }
    res.json({ success: true, content });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};
export const generateBlogTitle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "Free usage limit exceeded. Upgrade to continue.",
      });
    }

    const response = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 100,
    });
    const content = response.choices[0].message.content;

    await sql`INSERT INTO creations (user_id,prompt,content,type) VALUES (${userId},${prompt},${content},'blog-title')`;

    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }
    res.json({ success: true, content });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};


export const generateImage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, publish } = req.body;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({ success: false, message: "This feature is only available for premium subscriptions" });
    }
    // Call HuggingFace FLUX.1-schnell API
    const response = await axios.post(
      "https://router.huggingface.co/together/v1/images/generations",
      {
        prompt,
        response_format: "base64",
        model: "black-forest-labs/FLUX.1-schnell",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    // HuggingFace returns base64 string
    const base64Image = `data:image/png;base64,${response.data.data[0].b64_json}`;

    // Upload to Cloudinary
    const { secure_url } = await cloudinary.uploader.upload(base64Image);

    // Save in DB
    await sql`
            INSERT INTO creations (user_id, prompt, content, type, publish)
            VALUES (${userId}, ${prompt}, ${secure_url}, 'blog-title', ${publish ?? false})
        `;

    res.json({ success: true, content: secure_url });

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.json({ success: false, message: error.message });
  }
};

export const removeImageBackground = async (req, res) => {
  try {
    const { userId } = req.auth();
    const image = req.file;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        sucess: false,
        message: "This feature is only available for premium subscriptions",
      });
    }

    const { secure_url } = await cloudinary.uploader.upload(image.path, {
      transformation: [
        {
          effect: "background_removal",
          background_removal: "remove_the_background",
        },
      ],
    });

    await sql`INSERT INTO creations (user_id, prompt, content, type)
        VALUES (${userId}, 'Remove background from image', ${secure_url}, 'image')`;

    res.json({ success: true, content: secure_url });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
export const removeImageObject = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { object } = req.body;
    const image = req.file;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        sucess: false,
        message: "This feature is only available for premium subscriptions",
      });
    }

    const { public_id } = await cloudinary.uploader.upload(image.path);

    const imageUrl = cloudinary.url(public_id, {
      secure: true,
      transformation: [{ effect: `gen_remove:${object}` }],
      resource_type: "image",
    });

    await sql`INSERT INTO creations (user_id, prompt, content, type)
        VALUES (${userId}, ${`Removed ${object} from image`}, ${imageUrl}, 'image')`;

    res.json({ success: true, content: imageUrl });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};



export const compressResizeImage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { width, height, quality, format } = req.body;
    const image = req.file;

    if (!image) {
      return res.json({ success: false, message: "No image uploaded" });
    }


    let transformer = sharp(image.path);
    transformer = transformer.rotate();

    // Resize if width/height given
    if (width || height) {
      transformer = transformer.resize(
        width ? parseInt(width) : null,
        height ? parseInt(height) : null,
        { fit: "inside", withoutEnlargement: true }
      );
    }

    // Ensure format
    let outputFormat = format ? format.toLowerCase() : "jpeg";
    let processedBuffer;

    if (outputFormat === "jpeg" || outputFormat === "jpg") {
      processedBuffer = await transformer
        .jpeg({ quality: parseInt(quality) || 80, mozjpeg: true })
        .toBuffer();
      outputFormat = "jpg"; // cloudinary prefers "jpg"
    } else if (outputFormat === "png") {
      processedBuffer = await transformer
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();
    } else if (outputFormat === "webp") {
      processedBuffer = await transformer
        .webp({ quality: parseInt(quality) || 80 })
        .toBuffer();
    } else {
      processedBuffer = await transformer.toBuffer();
    }

    //  Upload buffer directly to Cloudinary
    const uploaded = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "image", format: outputFormat },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(processedBuffer);
    });

    //  Save in DB
    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${"Compressed/Resized image"}, ${uploaded.secure_url}, 'image')
    `;

    res.json({ success: true, content: uploaded.secure_url });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};


export const resumeReview = async (req, res) => {
  try {
    const { userId } = req.auth();
    const resume = req.file;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        sucess: false,
        message: "This feature is only available for premium subscriptions",
      });
    }

    if (resume.size > 5 * 1024 * 1024) {
      return res.json({
        success: false,
        message: "Resume file size exceeds allowed size (5MB).",
      });
    }

    const dataBuffer = fs.readFileSync(resume.path);
    const pdfData = await pdf(dataBuffer);

    const prompt = `Review the following resume and provide constructive feedback on its strengths, 
        weaknesses, and areas of improvement. ResumeContent:\n\n${pdfData.text}`;

    const response = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;

    await sql` INSERT INTO creations (user_id, prompt, content, type) 
        VALUES (${userId}, 'Review the uploaded resume', ${content}, 'resume-review')`;

    res.json({ success: true, content });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
let pdfContext = {};
export const pdfSummarizer = async (req, res) => {
  try {
    const { userId } = req.auth();
    const pdfFile = req.file;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is only available for premium subscriptions",
      });
    }

    if (pdfFile.size > 5 * 1024 * 1024) {
      return res.json({
        success: false,
        message: "PDF file size exceeds allowed size (5MB).",
      });
    }

    const dataBuffer = fs.readFileSync(pdfFile.path);
    const pdfData = await pdf(dataBuffer);

    // store context for chat later
    pdfContext[userId] = pdfData.text;

    const prompt = `Summarize the following PDF content into key points:\n\n${pdfData.text}`;

    const response = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
    });

    const content = response.choices[0].message.content;

    await sql`
      INSERT INTO creations (user_id, prompt, content, type) 
      VALUES (${userId}, 'Summarize uploaded PDF', ${content}, 'pdf-summarizer')
    `;

    res.json({ success: true, content });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};

/**
 * Chat
 */
export const pdfChat = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { question } = req.body;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is only available for premium subscriptions",
      });
    }

    if (!question) {
      return res.json({ success: false, message: "Please provide a question" });
    }

    if (!pdfContext[userId]) {
      return res.json({
        success: false,
        message: "Please upload & summarize a PDF first.",
      });
    }

    const prompt = `You are an assistant answering questions from a PDF. 
    PDF Content:\n\n${pdfContext[userId]}\n\n
    User Question: ${question}\n
    Answer clearly and concisely:`;

    const response = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;

    await sql`
      INSERT INTO creations (user_id, prompt, content, type) 
      VALUES (${userId}, ${question}, ${content}, 'pdf-chat')
    `;

    res.json({ success: true, answer: content });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};



export const extractTextFromImage = async (req, res) => {
  try {

    const { userId } = req.auth();
    const { text } = req.body;

    if (!text) {
      return res.json({ success: false, message: "No text provided" });
    }

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${"Extracted text from image"}, ${text}, 'text')
    `;

    res.json({ success: true, content: text });
  } catch (error) {
    console.error("DB Save Error:", error);
    res.json({ success: false, message: error.message });
  }
};


// transient store for chat context
let ytContext = {};

const YT_API = "https://www.googleapis.com/youtube/v3";
const YT_KEY = process.env.YT_API_KEY;

/** --------- Helper: Extract Video ID from URL --------- */
function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "shorts" || parts[0] === "embed") return parts[1];
    return parts[parts.length - 1];
  } catch {
    return url; // already ID
  }
}

/** --------- Helper: Get video details from YouTube API --------- */
async function fetchVideoMetadata(videoId) {
  const { data } = await axios.get(`${YT_API}/videos`, {
    params: {
      id: videoId,
      part: "snippet,contentDetails,statistics",
      key: YT_KEY,
    },
  });
  if (!data.items?.length) throw new Error("Video not found.");
  return data.items[0];
}

/** --------- Helper: Get top comments (best effort) --------- */
async function fetchTopComments(videoId, max = 20) {
  try {
    const { data } = await axios.get(`${YT_API}/commentThreads`, {
      params: {
        videoId,
        part: "snippet",
        maxResults: max,
        order: "relevance",
        key: YT_KEY,
      },
    });
    return (
      data.items
        ?.map(
          (c) =>
            c.snippet?.topLevelComment?.snippet?.textDisplay
              ?.replace(/<\/?[^>]+(>|$)/g, "")
              .trim()
        )
        .filter(Boolean) || []
    );
  } catch {
    return [];
  }
}

/** --------- Helper: Duration ISO8601 → readable --------- */
function isoToReadable(iso) {
  if (!iso) return "";
  const h = /(\d+)H/.exec(iso)?.[1];
  const m = /(\d+)M/.exec(iso)?.[1];
  const s = /(\d+)S/.exec(iso)?.[1];
  return [h ? `${h}h` : "", m ? `${m}m` : "", s ? `${s}s` : ""]
    .filter(Boolean)
    .join(" ");
}

/** --------- Helper: Build context string --------- */
async function fetchTranscriptText(url) {
  const videoId = extractVideoId(url);
  const meta = await fetchVideoMetadata(videoId);
  const comments = await fetchTopComments(videoId, 20);

  const title = meta.snippet?.title || "";
  const description = meta.snippet?.description || "";
  const channel = meta.snippet?.channelTitle || "";
  const tags = meta.snippet?.tags?.slice(0, 15) || [];
  const duration = isoToReadable(meta.contentDetails?.duration);
  const stats = meta.statistics || {};

  let text = `Video Title: ${title}
Channel: ${channel}
Duration: ${duration}
Published: ${meta.snippet?.publishedAt}
Views: ${stats.viewCount || "—"}, Likes: ${stats.likeCount || "—"}, Comments: ${stats.commentCount || "—"}
Tags: ${tags.join(", ") || "—"}

Description:
${description || "No description available."}`;

  if (comments.length) {
    text += `

Top Comments:
- ${comments.join("\n- ")}`;
  }

  return { text, source: "youtube-data-api" };
}

/** --------- Helper: chunk text --------- */
function chunkText(text, size = 6000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  return chunks;
}

/** --------- Map UI detail → summarization style --------- */
function detailToInstructions(detail) {
  switch (detail) {
    case "short":
      return "Create ~5 crisp bullet points. Keep <120 words total.";
    case "medium":
      return "Create 8–12 bullet points with key ideas, numbers, and action items.";
    case "detailed":
      return "Write a structured outline with sections & sub-bullets, include examples. 300–600 words.";
    default:
      return "Create 8–12 bullet points.";
  }
}

/** --------- Summarize (map-reduce style) --------- */
async function summarizeTranscriptLong(transcript, detail) {
  const chunks = chunkText(transcript, 7000);
  const partials = [];

  for (const [idx, chunk] of chunks.entries()) {
    const stepPrompt = `You are a precise note-maker.
Chunk ${idx + 1}/${chunks.length} of YouTube metadata is below.
Summarize ONLY this chunk into sharp bullet notes. Avoid repetition.

Chunk:
"""
${chunk}
"""
Return bullets only.`;

    const r = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: stepPrompt }],
      temperature: 0.5,
      max_tokens: 800,
    });
    partials.push(r.choices[0].message.content);
  }

  const combinePrompt = `You are combining notes into a final YouTube video summary.
${detailToInstructions(detail)}

Chunk notes:
${partials.join("\n\n---\n\n")}

Final summary:`;

  const final = await AI.chat.completions.create({
    model: "gemini-2.0-flash",
    messages: [{ role: "user", content: combinePrompt }],
    temperature: 0.5,
    max_tokens: 1200,
  });
  return final.choices[0].message.content;
}

/** --------- POST /api/ai/youtube-summary --------- */
export const youtubeSummarizer = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { url, detail = "medium" } = req.body;

    if (req.plan !== "premium")
      return res.json({ success: false, message: "Premium only" });
    if (!url) return res.json({ success: false, message: "Missing URL" });
    if (!YT_KEY) return res.json({ success: false, message: "Server missing YT_API_KEY" });

    // 1) metadata fetch
    const { text, source } = await fetchTranscriptText(url);

    // 2) store context
    ytContext[userId] = text;

    // 3) summarize
    const content = await summarizeTranscriptLong(text, detail);

    // 4) save in DB
    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${url + " | " + detail}, ${content}, 'youtube-summary')
    `;

    res.json({ success: true, content, used: source });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
};

/** --------- POST /api/ai/youtube-chat --------- */
export const youtubeChat = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { question } = req.body;

    if (req.plan !== "premium")
      return res.json({ success: false, message: "Premium only" });
    if (!question?.trim())
      return res.json({ success: false, message: "Please provide a question" });

    const transcript = ytContext[userId];
    if (!transcript)
      return res.json({ success: false, message: "Please summarize first." });

    const prompt = `You are a helpful assistant that answers strictly from the given YouTube metadata (title, description, tags, stats, and top comments).
If an answer is not found in metadata, say so.

Metadata:
"""
${transcript}
"""

User question: "${question}"
Answer clearly and concisely.`;

    const r = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 900,
    });

    const answer = r.choices[0].message.content;

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${question}, ${answer}, 'youtube-chat')
    `;

    res.json({ success: true, answer });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
};



/**
 * POST /api/ai/qr-generate
 * body: { text, size=512, margin=2, errorCorrectionLevel='M', format='png'|'svg', darkColor='#000', lightColor='#fff' }
 */
export const generateQr = async (req, res) => {
  try {
    const { userId } = req.auth();
    const plan = req.plan; // optional: can gate by plan if you want
    // if (plan !== "premium") return res.json({ success:false, message:"Premium only" });

    const {
      text,
      size = 512,
      margin = 2,
      errorCorrectionLevel = "M",
      format = "png",
      darkColor = "#000000",
      lightColor = "#ffffff",
    } = req.body || {};

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.json({ success: false, message: "Text/URL is required" });
    }

    const clampedSize = Math.max(128, Math.min(1024, parseInt(size) || 512));
    const clampedMargin = Math.max(0, Math.min(10, parseInt(margin) || 2));
    const ecl = ["L", "M", "Q", "H"].includes(errorCorrectionLevel)
      ? errorCorrectionLevel
      : "M";
    const fmt = ["png", "svg"].includes(format) ? format : "png";

    const options = {
      errorCorrectionLevel: ecl,
      margin: clampedMargin,
      color: { dark: darkColor, light: lightColor },
      width: clampedSize,
    };

    if (fmt === "png") {
      const pngBuffer = await QRCode.toBuffer(text, options);
      const base64 = pngBuffer.toString("base64");
      const dataUrl = `data:image/png;base64,${base64}`;

      // store meta (avoid storing giant image in DB)
      await sql`
        INSERT INTO creations (user_id, prompt, content, type)
        VALUES (${userId}, ${JSON.stringify({ text, options })}, ${"qr_generated_png"}, 'qr-code')
      `;

      return res.json({ success: true, format: "png", dataUrl });
    } else {
      const svg = await QRCode.toString(text, { ...options, type: "svg" });

      await sql`
        INSERT INTO creations (user_id, prompt, content, type)
        VALUES (${userId}, ${JSON.stringify({ text, options })}, ${"qr_generated_svg"}, 'qr-code')
      `;

      return res.json({ success: true, format: "svg", svg });
    }
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: error.message });
  }
};
