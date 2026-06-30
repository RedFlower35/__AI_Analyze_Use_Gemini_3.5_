import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "未檢測到 GEMINI_API_KEY，請先在專案根目錄建立 .env.local 檔案並設定 GEMINI_API_KEY。" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });

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

    // Call the Gemini API using gemini-3.5-flash with retry and fallback
    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    let replyText = "";
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: promptContext,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.3,
            }
          });
          if (response.text) {
            replyText = response.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`[Gemini Chat API] Model ${modelName} attempt ${attempt} failed:`, err?.message || err);
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
      if (replyText) break;
    }

    if (!replyText) {
      if (lastError?.status === 503 || lastError?.message?.includes("503") || lastError?.message?.includes("demand")) {
        return NextResponse.json(
          { error: "Google Gemini API 目前伺服器繁忙（高負載中）。請稍等數秒後重新嘗試。" },
          { status: 503 }
        );
      }
      throw lastError || new Error("Gemini API 未能生成任何回覆。");
    }

    return NextResponse.json({ reply: replyText });
  } catch (error: any) {
    console.error("Gemini Chat API Error:", error);
    return NextResponse.json(
      { error: error.message || "伺服器內部錯誤，無法完成對話分析。" },
      { status: 500 }
    );
  }
}
