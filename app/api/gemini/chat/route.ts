import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Initialize the Google Gen AI SDK on the server side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export async function POST(req: NextRequest) {
  try {
    const { csvData, history, latestMessage } = await req.json();

    if (!csvData) {
      return NextResponse.json(
        { error: "請先提供 CSV 資料以便 AI 回答相關問題。" },
        { status: 400 }
      );
    }

    if (!latestMessage || typeof latestMessage !== "string") {
      return NextResponse.json(
        { error: "請輸入您的問題內容。" },
        { status: 400 }
      );
    }

    // Prepare system instructions with CSV data context
    const systemInstruction = `你是一位資深的 AI 數據分析助理。
你現在的任務是協助使用者理解、查詢、篩選與診斷以下提供之 CSV 格式數據：

[CSV 數據開始]
${csvData}
[CSV 數據End]

請遵循以下指南：
1. 【繁體中文】：一律使用繁體中文（台灣，zh-TW）回答。
2. 【實事求是】：所有數據引用、百分比、加總、平均或篩選，都必須與提供的 CSV 內容完全吻合。絕不可編造。
3. 【簡單易懂】：如果使用者要求複雜的運算（例如「找出銷售額最高的前三名並計算其總和」），請在回答中列出具體推導步驟和計算式，讓人一目了然。
4. 【Markdown 支援】：使用 Markdown 格式渲染回應，善用表格、列表及粗體字型，使閱讀體驗更加流暢舒適。
`;

    // Map conversation history to parts for multi-turn style or compact context
    // We can compile history into a single structured prompt for maximum reliability and to prevent model format strictness issues
    let promptContext = "以下是我們的對話歷史，請根據對話歷史與上面的 CSV 數據，回答使用者的最新問題。\n\n";

    if (history && Array.isArray(history)) {
      history.forEach((msg: { role: string; content: string }) => {
        const displayRole = msg.role === "user" ? "使用者" : "助理";
        promptContext += `【${displayRole}】：${msg.content}\n\n`;
      });
    }

    promptContext += `【使用者最新問題】：${latestMessage}\n\n【助理回覆】：`;

    // Call the Gemini API using gemini-3.5-flash
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptContext,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
      }
    });

    const reply = response.text;

    if (!reply) {
      throw new Error("Gemini API 未能生成任何回覆。");
    }

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Gemini Chat API Error:", error);
    return NextResponse.json(
      { error: error.message || "伺服器內部錯誤，無法完成對話分析。" },
      { status: 500 }
    );
  }
}
