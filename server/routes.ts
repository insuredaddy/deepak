import type { Express } from "express";
import type { Server } from "http";
import multer from "multer";
import fs from "fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SUFFICIENCY_PROMPT } from "./promptTemplate";
import { POLICY_EXTRACTION_PROMPT } from "./policyExtractionPrompt";
import { transformRawExtraction } from "./utils/policyTransformer";
import type { RawPolicyExtraction } from "./types/policy";

const upload = multer({ dest: "uploads/" });

/* ---------- TEXT EXTRACTION HELPERS ---------- */

async function extractTextFromPDF(filePath: string): Promise<string> {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const pdf = await pdfjs.getDocument({ data }).promise;

  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it: any) => it.str).join(" ") + "\n";
  }

  return text;
}

async function extractTextFromPlain(filePath: string): Promise<string> {
  return fs.readFileSync(filePath, "utf-8");
}

async function extractTextFromImage(
  file: Express.Multer.File,
  apiKey: string
): Promise<string> {
  const buffer = fs.readFileSync(file.path);

  const genAI = new GoogleGenerativeAI(apiKey);
  // UPDATED: Changed to gemini-3-pro-preview
  const model = genAI.getGenerativeModel({
    model: "gemini-3-pro-preview",
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              "Transcribe all readable text from this insurance policy image. " +
              "Return plain text only. No formatting. No summaries.",
          },
          {
            inlineData: {
              data: buffer.toString("base64"),
              mimeType: file.mimetype || "image/png",
            },
          },
        ],
      },
    ],
  });

  return result.response.text();
}

async function extractPolicyText(
  file: Express.Multer.File
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  if (file.mimetype.includes("pdf")) {
    return extractTextFromPDF(file.path);
  }

  if (file.mimetype.startsWith("image/")) {
    return extractTextFromImage(file, apiKey);
  }

  if (file.mimetype === "text/plain") {
    return extractTextFromPlain(file.path);
  }

  throw new Error(`Unsupported file type: ${file.mimetype}`);
}

/* ---------- ROUTES ---------- */

export async function registerRoutes(
  _httpServer: Server,
  app: Express
): Promise<Server> {
  // Handle multer errors
  app.post(
    "/api/analyze",
    (req, res, next) => {
      upload.single("file")(req, res, (err: any) => {
        if (err) {
          console.error("MULTER ERROR:", err);
          return res.status(400).json({ 
            error: "File upload failed: " + (err.message || "Unknown error") 
          });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        console.log("FILE RECEIVED:", req.file.originalname);

        const policyText = await extractPolicyText(req.file);
        fs.unlinkSync(req.file.path);

        if (!policyText.trim()) {
          return res
            .status(400)
            .json({ error: "No text extracted from file" });
        }

        console.log("EXTRACTED TEXT LENGTH:", policyText.length);

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return res
            .status(500)
            .json({ error: "GEMINI_API_KEY not set" });
        }

        console.log("CALLING GEMINI 3 PRO PREVIEW...");

        const genAI = new GoogleGenerativeAI(apiKey);
        // UPDATED: Changed to gemini-3-pro-preview
        // Set temperature to 0 for more deterministic results
        const model = genAI.getGenerativeModel({
          model: "gemini-3-pro-preview",
          generationConfig: {
            temperature: 0, // More deterministic
            topP: 0.95,
          },
        });

        // Add timeout to prevent hanging (5 minutes max)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Request timeout: Gemini API took too long to respond (5 minutes)")), 5 * 60 * 1000);
        });

        const generatePromise = model.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text:
                    SUFFICIENCY_PROMPT +
                    "\n\n" +
                    policyText,
                },
              ],
            },
          ],
        });

        const result = await Promise.race([generatePromise, timeoutPromise]) as any;

        const rawText = result.response.text();
        console.log("GEMINI RAW RESPONSE:", rawText);

        const cleanedText = rawText
          .replace(/```json|```/g, "")
          .trim();

        let parsed;
        try {
          parsed = JSON.parse(cleanedText);
        } catch {
          return res.status(500).json({
            error: "Invalid AI response format",
            raw: cleanedText,
          });
        }

        // Enforce deterministic verdict calculation on backend
        if (parsed.metadata && parsed.metadata.extractedFields && parsed.page1) {
          const { sum_insured, copay, room_rent } = parsed.metadata.extractedFields;
          const city = parsed.policyholderInfo?.city || "Not mentioned";
          const seriousGaps = parsed.details?.gaps?.serious || [];
          const hasSeriousGaps = seriousGaps.length > 0;
          
          // Determine city tier
          const metroCities = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune"];
          const tier2Cities = ["Ahmedabad", "Jaipur", "Chandigarh", "Lucknow", "Kochi"];
          const isMetro = metroCities.some(c => city.toLowerCase().includes(c.toLowerCase()));
          const isTier2 = tier2Cities.some(c => city.toLowerCase().includes(c.toLowerCase()));
          
          // Apply deterministic verdict rules
          let enforcedVerdict = parsed.page1.verdict;
          const sumInsuredNum = typeof sum_insured === 'number' ? sum_insured : 
                                typeof sum_insured === 'string' ? parseFloat(sum_insured.replace(/[₹,]/g, '')) : 0;
          
          // Rule 1: Sum Insured < ₹3L in metro OR < ₹2L in tier-2 = "Insufficient"
          if (isMetro && sumInsuredNum < 300000) {
            enforcedVerdict = "Insufficient";
          } else if (isTier2 && sumInsuredNum < 200000) {
            enforcedVerdict = "Insufficient";
          } else if (!isMetro && !isTier2 && sumInsuredNum < 200000) {
            // Tier-3 or unknown
            enforcedVerdict = "Insufficient";
          }
          // Rule 2: Serious gaps present = Maximum "Sufficient, with gaps"
          else if (hasSeriousGaps) {
            enforcedVerdict = "Sufficient, with gaps";
          }
          // Rule 3: Sum Insured ≥ ₹10L in metros (₹7L tier-2) + no serious gaps = "Sufficient"
          else if (isMetro && sumInsuredNum >= 1000000 && !hasSeriousGaps) {
            enforcedVerdict = "Sufficient";
          } else if (isTier2 && sumInsuredNum >= 700000 && !hasSeriousGaps) {
            enforcedVerdict = "Sufficient";
          } else if (!isMetro && !isTier2 && sumInsuredNum >= 700000 && !hasSeriousGaps) {
            enforcedVerdict = "Sufficient";
          }
          // Rule 4: Everything else = "Borderline"
          else {
            enforcedVerdict = "Borderline";
          }
          
          // Override the AI's verdict with the enforced one
          if (enforcedVerdict !== parsed.page1.verdict) {
            console.log(`⚠️ Verdict mismatch: AI said "${parsed.page1.verdict}", enforcing "${enforcedVerdict}"`);
            console.log(`   - Sum Insured: ₹${sumInsuredNum.toLocaleString()}`);
            console.log(`   - City: ${city} (${isMetro ? 'Metro' : isTier2 ? 'Tier-2' : 'Tier-3/Unknown'})`);
            console.log(`   - Serious Gaps: ${hasSeriousGaps ? 'Yes' : 'No'}`);
            parsed.page1.verdict = enforcedVerdict;
            if (parsed.metadata) {
              parsed.metadata.verdictEnforced = true;
              parsed.metadata.verdictReasoning = `Enforced based on: SI=₹${sumInsuredNum.toLocaleString()}, City=${city}, SeriousGaps=${hasSeriousGaps}`;
            }
          }
        }

        return res.json(parsed);
      } catch (err: any) {
        console.error("ANALYZE ERROR:", err);
        console.error("Error stack:", err.stack);
        
        // Clean up uploaded file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (unlinkErr) {
            console.error("Failed to delete uploaded file:", unlinkErr);
          }
        }
        
        // Provide more helpful error messages
        let errorMessage = err.message || "Unknown error";
        let statusCode = 500;
        
        if (errorMessage.includes("404") || errorMessage.includes("not found")) {
          errorMessage = `Model 'gemini-3-pro-preview' not found or not available. This could mean: 1) The model name is incorrect, 2) Your API key doesn't have access to this model, 3) The model is not available in your region. Please check your GEMINI_API_KEY and verify model availability.`;
        } else if (errorMessage.includes("fetch failed") || errorMessage.includes("ECONNREFUSED") || errorMessage.includes("ENOTFOUND")) {
          errorMessage = "Network error: Unable to connect to Gemini API. Please check your internet connection and try again.";
        } else if (errorMessage.includes("API_KEY") || errorMessage.includes("401") || errorMessage.includes("403")) {
          errorMessage = "API authentication failed. Please check your GEMINI_API_KEY in the .env.local file.";
          statusCode = 401;
        } else if (errorMessage.includes("quota") || errorMessage.includes("429")) {
          errorMessage = "API quota exceeded. Please check your Gemini API usage limits.";
          statusCode = 429;
        }
        
        return res
          .status(statusCode)
          .json({ 
            error: "Analysis failed: " + errorMessage,
            details: process.env.NODE_ENV === "development" ? err.stack : undefined
          });
      }
    }
  );

  // Policy extraction endpoint for comparison feature
  app.post(
    "/api/extract-policy",
    (req, res, next) => {
      upload.single("policy_pdf")(req, res, (err: any) => {
        if (err) {
          console.error("MULTER ERROR:", err);
          return res.status(400).json({ 
            error: "File upload failed: " + (err.message || "Unknown error") 
          });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        console.log("POLICY EXTRACTION - REQUEST RECEIVED");
        console.log("POLICY EXTRACTION - req.file:", req.file ? "EXISTS" : "MISSING");
        console.log("POLICY EXTRACTION - req.body:", Object.keys(req.body));
        
        if (!req.file) {
          console.error("POLICY EXTRACTION - No file in request!");
          return res.status(400).json({ error: "No file uploaded" });
        }

        console.log("POLICY EXTRACTION - FILE RECEIVED:", req.file.originalname);
        console.log("POLICY EXTRACTION - File size:", req.file.size, "bytes");
        console.log("POLICY EXTRACTION - File mimetype:", req.file.mimetype);
        console.log("POLICY EXTRACTION - File path:", req.file.path);

        // Step 1: Extract text from PDF using existing parser
        console.log("POLICY EXTRACTION - Starting text extraction...");
        let policyText: string;
        try {
          policyText = await extractPolicyText(req.file);
          console.log("POLICY EXTRACTION - Text extraction successful, length:", policyText.length);
        } catch (extractError: any) {
          console.error("POLICY EXTRACTION - Text extraction failed:", extractError);
          fs.unlinkSync(req.file.path);
          return res.status(500).json({ 
            error: "Failed to extract text from PDF: " + extractError.message 
          });
        }
        
        fs.unlinkSync(req.file.path);

        if (!policyText.trim()) {
          console.error("POLICY EXTRACTION - Extracted text is empty!");
          return res
            .status(400)
            .json({ error: "No text extracted from file" });
        }

        console.log("POLICY EXTRACTION - TEXT LENGTH:", policyText.length);
        console.log("POLICY EXTRACTION - TEXT PREVIEW:", policyText.substring(0, 200));

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return res
            .status(500)
            .json({ error: "GEMINI_API_KEY not set" });
        }

        console.log("POLICY EXTRACTION - CALLING GEMINI...");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-3-pro-preview",
          generationConfig: {
            temperature: 0,
            topP: 0.95,
          },
        });

        // Step 2: Send to Gemini with extraction prompt
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Request timeout: Gemini API took too long to respond (5 minutes)")), 5 * 60 * 1000);
        });

        const generatePromise = model.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: POLICY_EXTRACTION_PROMPT + "\n\n" + policyText,
                },
              ],
            },
          ],
        });

        const result = await Promise.race([generatePromise, timeoutPromise]) as any;
        const responseText = result.response.text();

        console.log("POLICY EXTRACTION - GEMINI RESPONSE RECEIVED");

        // Step 3: Parse JSON response
        let rawExtraction: RawPolicyExtraction;
        try {
          // Try to extract JSON from markdown code blocks if present
          const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                          responseText.match(/(\{[\s\S]*\})/);
          const jsonText = jsonMatch ? jsonMatch[1] : responseText;
          rawExtraction = JSON.parse(jsonText);
        } catch (parseError: any) {
          console.error("POLICY EXTRACTION - JSON PARSE ERROR:", parseError);
          return res.status(500).json({
            error: "Failed to parse extraction response",
            details: "Gemini returned invalid JSON. Please try again or verify the PDF is readable.",
            raw_response_preview: responseText.substring(0, 500),
          });
        }

        // Step 4: Validate critical fields
        const missingFields: string[] = [];
        if (!rawExtraction.basic_info?.insurer) missingFields.push("insurer");
        if (!rawExtraction.basic_info?.plan_name) missingFields.push("plan_name");
        if (!rawExtraction.coverage?.base_si) missingFields.push("base_si");
        if (!rawExtraction.coverage?.annual_premium) missingFields.push("annual_premium");

        if (missingFields.length > 0) {
          console.warn("POLICY EXTRACTION - Missing critical fields:", missingFields);
        }

        // Step 5: Transform to full policy structure
        const policyData = transformRawExtraction(rawExtraction, req.file.originalname);

        // Step 6: Return extracted policy
        return res.json({
          policy_id: policyData.policy_id,
          extracted_data: policyData,
          extraction_metadata: {
            confidence: policyData.extraction_metadata.extraction_confidence,
            missing_fields: policyData.extraction_metadata.missing_fields,
            needs_verification: policyData.extraction_metadata.manual_verification_needed,
          },
        });

      } catch (err: any) {
        console.error("POLICY EXTRACTION ERROR:", err);
        console.error("POLICY EXTRACTION ERROR STACK:", err.stack);
        
        let errorMessage = err.message || "Unknown error occurred";
        let statusCode = 500;

        if (errorMessage.includes("timeout")) {
          errorMessage = "Extraction timed out. The PDF may be too large or complex. Please try again.";
          statusCode = 408;
        } else if (errorMessage.includes("GEMINI_API_KEY")) {
          errorMessage = "API key not configured";
          statusCode = 500;
        } else if (errorMessage.includes("quota") || errorMessage.includes("429")) {
          errorMessage = "API quota exceeded. Please check your Gemini API usage limits.";
          statusCode = 429;
        }
        
        // Clean up file if it still exists
        if (req.file && fs.existsSync(req.file.path)) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (unlinkErr) {
            console.error("Failed to clean up file:", unlinkErr);
          }
        }
        
        return res
          .status(statusCode)
          .json({ 
            error: "Policy extraction failed: " + errorMessage,
            details: process.env.NODE_ENV === "development" ? err.stack : undefined
          });
      }
    }
  );

  return _httpServer;
}