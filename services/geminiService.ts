import { GoogleGenAI } from "@google/genai";
import { AgingBucket, AuditFinding, GeneralLedgerSummary } from "../types";

export const generateAuditRiskAssessment = async (
    glData: GeneralLedgerSummary,
    agingData: AgingBucket[],
    findings: AuditFinding[]
): Promise<string> => {
    
    if (!process.env.API_KEY) {
        return "API Key is missing. Please configure the environment to use AI features.";
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const agingSummary = agingData.map(b => `${b.label}: $${b.amount.toLocaleString()} (Allowance: ${b.allowanceRate}%)`).join('\n');
    const findingSummary = findings.map(f => `- [${f.severity}] ${f.type}: ${f.description}`).join('\n');

    const prompt = `
    Act as an Expert Audit Partner. Review the following Accounts Receivable data for a client.
    
    context:
    Total AR Balance (GL): $${glData.balance.toLocaleString()}
    
    Aging Analysis:
    ${agingSummary}
    
    Audit Findings Identified by CAAT:
    ${findingSummary}
    
    Task:
    1. Provide a brief risk assessment of the Valuation & Allocation assertion.
    2. Comment on the adequacy of the allowance rates based on the aging profile.
    3. Suggest one specific additional substantive procedure based on the findings.
    
    Format the response in HTML (using simple tags like <p>, <ul>, <li>, <strong>) but do not include markdown code blocks.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "No analysis generated.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Unable to generate AI risk assessment at this time.";
    }
};