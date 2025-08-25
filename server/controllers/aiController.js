import OpenAI from "openai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import pdf from "pdf-parse/lib/pdf-parse.js";
import FormData from "form-data";
import { YoutubeTranscript } from "youtube-transcript";
import ytdl from "ytdl-core";



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

/** Helper: fetch transcript text (with fallback) */


/** Helper: fetch transcript text (with fallback to metadata) */
export async function fetchTranscriptText(url) {
  // 1) Try transcripts in multiple langs
  const langs = ["en", "en-US", "en-GB"];
  for (const lang of langs) {
    try {
      const items = await YoutubeTranscript.fetchTranscript(url, { lang });
      if (items?.length) {
        return {
          text: items.map((i) => i.text).join(" "),
          source: "transcript",
        };
      }
    } catch {
      // ignore and try next
    }
  }

  // 2) Fallback: Try video metadata (title + description)
  try {
    const info = await ytdl.getBasicInfo(url); // lighter than getInfo
    const title = info.videoDetails?.title || "";
    const description = info.videoDetails?.description || "";

    // even if description empty, return title (better than error)
    if (title || description) {
      return {
        text: `Video Title: ${title}\n\nDescription:\n${description || "No description available."}`,
        source: "metadata",
      };
    }
  } catch (err) {
    console.error("ytdl-core metadata fetch error:", err.message);
  }

  // 3) Final fallback if nothing works
  return {
    text: "No transcript or description available for this video. Please provide context manually.",
    source: "none",
  };
}


/** Helper: chunk a long string into ~N chars */
function chunkText(text, size = 6000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

/** Map UI detail to instructions */
function detailToInstructions(detail, isFallback = false) {
  if (isFallback) {
    return "Transcript not available. Summarize based on the video title and description only. Be concise and informative.";
  }
  switch (detail) {
    case "short":
      return "Create ~5 crisp bullet points. Keep <120 words total.";
    case "medium":
      return "Create 8–12 bullet points with key ideas, definitions, numbers, and any action items.";
    case "detailed":
      return "Write a structured outline with sections & sub-bullets, include examples and important quotes (paraphrased). Length 300–600 words.";
    default:
      return "Create 8–12 bullet points.";
  }
}

/** Summarize long transcripts robustly (map-reduce style) */
async function summarizeTranscriptLong(transcript, detail, isFallback = false) {
  const chunks = chunkText(transcript, 7000); // safe per-call context
  const partials = [];

  for (const [idx, chunk] of chunks.entries()) {
    const stepPrompt = `You are a precise note-maker.
${isFallback ? "Transcript is missing. This is metadata text instead." : ""}
Chunk ${idx + 1}/${chunks.length} of a YouTube transcript is below.
Summarize ONLY this chunk into sharp bullet notes. Avoid repetition across bullets.

Chunk text:
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

  const combinePrompt = `You are combining chunk-wise notes into a single final summary for a YouTube video.
Combine, deduplicate, and order logically. ${detailToInstructions(detail, isFallback)}

Chunk notes to combine:
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

/** POST /api/ai/youtube-summary  { url, detail } */
export const youtubeSummarizer = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { url, detail = "medium" } = req.body;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is only available for premium subscriptions",
      });
    }
    if (!url) return res.json({ success: false, message: "Missing URL" });

    // 1) get transcript or fallback metadata
    const { text, source } = await fetchTranscriptText(url);

    // store transcript for chat
    ytContext[userId] = text;

    // 2) summarize (handles long vids + fallback mode)
    const content = await summarizeTranscriptLong(text, detail, source === "metadata");

    // 3) save
    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${url + " | " + detail}, ${content}, 'youtube-summary')
    `;

    res.json({ success: true, content, used: source });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

/** POST /api/ai/youtube-chat  { question } */
export const youtubeChat = async (req, res) => {
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
    if (!question?.trim())
      return res.json({ success: false, message: "Please provide a question" });

    const transcript = ytContext[userId];
    if (!transcript) {
      return res.json({
        success: false,
        message: "Please summarize a YouTube video first.",
      });
    }

    const prompt = `You are a helpful assistant that answers strictly from the given YouTube text.
This may be an actual transcript OR just title/description if transcript is missing.
If answer is not present, say you don't find it in the video.

Transcript/Metadata:
"""
${transcript}
"""

User question: "${question}"
Answer clearly, cite approximate moments if it's a transcript, otherwise say "based on description". Keep it concise.`;

    const response = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 900,
    });

    const content = response.choices[0].message.content;

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${question}, ${content}, 'youtube-chat')
    `;

    res.json({ success: true, answer: content });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};