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

    const { csvData, analysisType, customPrompt } = await req.json();

    if (!csvData || typeof csvData !== "string") {
      return NextResponse.json(
        { error: "請提供有效的 CSV 資料內容。" },
        { status: 400 }
      );
    }

    // Dynamic focus based on selected analysis type
    let focusInstruction = "";
    switch (analysisType) {
      case "summary":
        focusInstruction = "本次分析重點請放在：『資料集整體結構、核心摘要與基礎統計指標』。";
        break;
      case "trends":
        focusInstruction = "本次分析重點請放在：『時間序列變化、關鍵趨勢、週期性規律與成長率分析』。";
        break;
      case "anomaly":
        focusInstruction = "本次分析重點請放在：『異常數據、離群值偵測、極值分析以及潛在的數據不合理點』。";
        break;
      case "business":
        focusInstruction = "本次分析重點請放在：『商業價值最大化、具體營運建議、痛點剖析與具備高可執行性的行政策略』。";
        break;
      default:
        focusInstruction = "本次分析重點請放在：『全方位的綜合性分析』。";
    }

    if (customPrompt && customPrompt.trim() !== "") {
      focusInstruction += `\n使用者特別指定之額外分析指令：『${customPrompt}』。請務必在報告中優先且深入探討此項要求。`;
    }

    const systemInstruction = `你是一位資深的資料分析師、商業智慧專家以及卓越的數據科學家。你的任務是深入分析使用者所提供之 CSV 格式資料，並以專業、清晰、結構化且具備高度商業決策價值的繁體中文（台灣，zh-TW）輸出分析報告。

當進行資料分析時，請務必遵循以下準則：
1. 【嚴謹與真實】：所有分析、數字與趨勢皆須嚴格基於使用者提供的 CSV 數據。絕對不可憑空捏造或想像數據。
2. 【結構化呈現】：使用優美的 Markdown 格式進行排版，多用粗體、條列、表格或代碼區塊來提升可讀性。
3. 【商業導向】：不只要指出「數據是什麼」，更要解釋「為什麼這重要」以及「後續應採取何種商業行動」。

請根據以下結構，為使用者撰寫一份完整的「AI 數據分析與洞察報告」：

# 📊 AI 數據分析與洞察報告

## 一、 📂 資料集概述與品質評估
- **數據規模**：指出資料集的總列數 (Rows)、欄位數 (Columns)，並列出所有偵測到的欄位名稱與推斷資料類型。
- **資料特性**：指出資料集的核心屬性、時間跨度或主體類別。
- **資料品質**：評估是否有缺失值、重複值或明顯的異常值（如負數的價格、極端離群值），並給予資料品質評分（滿分 100 分）。

## 二、 💡 核心發現與數據洞察 (最少 3-4 個關鍵點)
*請列出你從資料中發掘的最重要商業洞察，並務必附帶具體數據佐證。每一點需包含【現象】與【商業含意】。*
- **[洞察主題 1]**：詳細描述趨勢、佔比或規律。例如：「在 X 欄位中，XX 類別佔了總和的 XX%，是主要的營收來源...」
- **[洞察主題 2]**：指出特定時間點或類別的異常與高峰，並分析潛在原因。
- **[洞察主題 3]**：分析欄位之間的關聯性（例如：Visits 與 Revenue 的轉換率關係，或特定數值欄位的相關性）。

## 三、 📈 推薦圖表視覺化建議
*針對這份資料，推薦 2-3 個最適合繪製的圖表，並說明如何配置：*
1. **圖表類型 1（例如：折線圖 / 堆疊條形圖）**：
   - **X 軸**：[欄位 A]
   - **Y 軸**：[欄位 B 或 多個指標]
   - **分析目的**：說明為什麼這個圖表能幫助決策者看清趨勢。
2. **圖表類型 2（例如：圓餅圖 / 散佈圖）**：
   - **配置細節**、**主要維度**與**分析目的**。

## 四、 🚀 具體行動方案與優化決策
*基於上述發現，提供 2-3 個可立即執行的商業決策與優化策略，並為每個方案設定優先級（高/中/低）與預期效益。*
1. **[方案 A]**：具體步驟、優先級、預期改善指標。
2. **[方案 B]**：具體步驟、優先級、預期改善指標。

---
報告產生時間：${new Date().toISOString().split('T')[0]} | AI 分析引擎：Gemini 3.5`;

    const userPrompt = `
以下是需要分析的 CSV 資料內容：
\`\`\`csv
${csvData}
\`\`\`

分析任務與重點方向：
${focusInstruction}

請開始進行分析並輸出完整的繁體中文報告：
`;

    // Call the Gemini API with retry and model fallback support
    const modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
    let responseText = "";
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: userPrompt,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.2,
            }
          });
          if (response.text) {
            responseText = response.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`[Gemini API] Model ${modelName} attempt ${attempt} failed:`, err?.message || err);
          // Wait 1.5 seconds before retrying
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
      if (responseText) break;
    }

    if (!responseText) {
      if (lastError?.status === 503 || lastError?.message?.includes("503") || lastError?.message?.includes("demand")) {
        return NextResponse.json(
          { error: "Google Gemini API 目前伺服器繁忙（高負載中）。請稍等數秒後重新點擊分析按鈕重試。" },
          { status: 503 }
        );
      }
      throw lastError || new Error("Gemini API 未能生成任何回覆內容。");
    }

    return NextResponse.json({ report: responseText });
  } catch (error: any) {
    console.error("Gemini API Route Error:", error);
    return NextResponse.json(
      { error: error.message || "伺服器內部錯誤，無法完成 AI 分析。" },
      { status: 500 }
    );
  }
}
