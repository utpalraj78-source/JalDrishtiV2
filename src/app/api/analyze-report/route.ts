
import { NextRequest, NextResponse } from "next/server";

const AZURE_KEY = process.env.AZURE_CV_KEY || "7IQzPwYPk9LtggN9vubmw9hrdfQoVEPJxSX2ukFShF3lLQ9xNNRqJQQJ99CAACGhslBXJ3w3AAAFACOGCnud";
const AZURE_ENDPOINT = process.env.AZURE_CV_ENDPOINT || "https://jaldrishti.cognitiveservices.azure.com/";

// Ensure endpoint doesn't have trailing slash for URL construction
const ENDPOINT = AZURE_ENDPOINT.endsWith("/") ? AZURE_ENDPOINT.slice(0, -1) : AZURE_ENDPOINT;

// Features we want from Azure (Caption not supported in all regions)
const FEATURES = "Tags,Objects";
const API_URL = `${ENDPOINT}/computervision/imageanalysis:analyze?api-version=2023-10-01&features=${FEATURES}&language=en`;

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        console.log(`Analyzing image: ${file.name} (${file.size} bytes)`);

        // Convert file to ArrayBuffer for Azure API
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Ocp-Apim-Subscription-Key": AZURE_KEY,
                "Content-Type": "application/octet-stream"
            },
            body: buffer
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Azure API Error:", response.status, errorText);
            return NextResponse.json({ error: `Azure API Failed: ${errorText}` }, { status: response.status });
        }

        const data = await response.json();

        // Process Azure Response to determine if it's a flood/waterlogging incident
        // Check Tags and Caption for keywords
        const keywords = ["water", "flood", "rain", "puddle", "road", "street", "submerged", "river", "lake", "swimming"];

        const tags = data.tagsResult?.values.map((t: any) => t.name.toLowerCase()) || [];
        const caption = data.captionResult?.text.toLowerCase() || "";

        // Determine verification status
        let isWaterRelated = false;
        let severityScore = 0;

        // Check tags
        tags.forEach((tag: string) => {
            if (keywords.some(k => tag.includes(k))) {
                isWaterRelated = true;
                severityScore += 1;
            }
            if (["flood", "submerged", "disaster"].includes(tag)) {
                severityScore += 3; // Boost for strong keywords
            }
        });

        // Check caption
        if (keywords.some(k => caption.includes(k))) {
            isWaterRelated = true;
            severityScore += 2;
        }

        // Calculate confidence
        // Azure gives a confidence score, but we create our own "Verification Confidence"
        // based on relevance to waterlogging.
        let confidence = Math.min(98, 50 + (severityScore * 10));

        if (!isWaterRelated) {
            confidence = Math.max(10, 100 - (data.captionResult?.confidence * 100 || 0));
        }

        const analysisResult = {
            verified: isWaterRelated && confidence > 60,
            confidence: Math.round(confidence),
            tags: tags.slice(0, 10), // Top 10 tags
            description: caption,
            severity: severityScore > 5 ? "Critical" : severityScore > 2 ? "High" : "Moderate",
            estimated_depth: severityScore > 5 ? "> 2 feet" : "> 6 inches", // Mock estimation based on severity
            raw_azure: {
                caption: data.captionResult,
                tags: data.tagsResult
            }
        };

        return NextResponse.json(analysisResult);

    } catch (error: any) {
        console.error("Analysis Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
