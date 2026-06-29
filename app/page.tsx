"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload,
  Database,
  LineChart,
  BarChart2,
  FileText,
  Sparkles,
  Copy,
  Check,
  Loader2,
  Play,
  Download,
  Search,
  MessageSquare,
  Send,
  Trash2,
  AlertCircle,
  HelpCircle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Info
} from "lucide-react";

// --- Types ---
interface CSVData {
  headers: string[];
  rows: string[][];
}

interface ColumnStat {
  sum: number;
  avg: number;
  min: number;
  max: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// --- Pre-defined CSV Templates ---
const PRESET_TEMPLATES = [
  {
    id: "sales",
    name: "💰 年度銷售與營收報表",
    description: "適合分析地區、產品類別、銷量與營業額趨勢",
    data: `日期,地區,產品類別,銷售數量,單價,營業額
2026-01-10,北部,消費電子,120,500,60000
2026-01-15,中部,家居生活,85,350,29750
2026-02-05,南部,美妝保養,210,180,37800
2026-02-18,北部,家居生活,95,350,33250
2026-03-02,東部,消費電子,45,500,22500
2026-03-22,南部,消費電子,160,500,80000
2026-04-05,中部,美妝保養,180,180,32400
2026-04-12,北部,美妝保養,250,180,45000
2026-05-15,南部,家居生活,130,350,45500
2026-05-20,中部,消費電子,110,500,55000
2026-06-01,東部,美妝保養,70,180,12600
2026-06-18,北部,消費電子,140,500,70000`
  },
  {
    id: "traffic",
    name: "📈 網站流量與轉換率指標",
    description: "分析流量來源、訪客留存、目標轉換次數與收益",
    data: `日期,流量來源,瀏覽量,不重複訪客,跳出率,轉換次數,轉換收益
2026-06-01,Google搜尋,15200,8400,0.42,320,96000
2026-06-02,社群媒體,8400,5100,0.58,110,22000
2026-06-03,付費廣告,6100,4300,0.35,210,84000
2026-06-04,直接流量,3200,2100,0.28,95,47500
2026-06-05,電子報,4500,3100,0.31,180,72000
2026-06-06,Google搜尋,16100,9100,0.41,340,102000
2026-06-07,社群媒體,9800,6200,0.55,140,28000
2026-06-08,付費廣告,5800,4100,0.37,195,78000
2026-06-09,直接流量,3400,2200,0.29,102,51000
2026-06-10,電子報,4200,2900,0.33,165,66000`
  },
  {
    id: "employee",
    name: "👥 員工滿意度與績效評估",
    description: "分析各部門員工的評分、完成專案數、培訓時數與滿意度",
    data: `員工姓名,所屬部門,績效評分,完成專案數,培訓時數,工作滿意度(1-5)
陳大明,研發部,4.8,12,40,5
林小華,市場部,4.2,8,24,4
黃春嬌,人事部,4.5,5,32,4
張志明,研發部,3.9,9,16,3
王美麗,客服部,4.6,15,20,5
劉協志,財務部,4.1,6,12,4
趙敏君,市場部,4.7,11,30,5
孫悟空,研發部,5.0,18,48,5
周杰倫,客服部,3.8,7,8,3
蔡依林,市場部,4.4,10,20,4`
  }
];

// --- Chart Padding Constant ---
const CHART_PADDING = { top: 20, right: 30, bottom: 50, left: 70 };

// --- Static Initial CSV Parser ---
function parseCSVStatic(text: string): CSVData {
  if (!text || text.trim() === "") {
    return { headers: [], rows: [] };
  }

  const lines = text.split(/\r?\n/);
  const rows: string[][] = [];
  let headers: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const row: string[] = [];
    let insideQuote = false;
    let entry = "";

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        row.push(entry.trim().replace(/^"|"$/g, ""));
        entry = "";
      } else {
        entry += char;
      }
    }
    row.push(entry.trim().replace(/^"|"$/g, ""));

    if (headers.length === 0) {
      headers = row;
    } else {
      if (row.length < headers.length) {
        while (row.length < headers.length) row.push("");
      } else if (row.length > headers.length) {
        row.splice(headers.length);
      }
      rows.push(row);
    }
  }
  return { headers, rows };
}

const INITIAL_CSV_CONTENT = PRESET_TEMPLATES[0].data;
const INITIAL_PARSED_DATA = parseCSVStatic(INITIAL_CSV_CONTENT);

// --- Analytical Captions for Loading state ---
const LOADING_PHASES = [
  "正在解析 CSV 資料結構...",
  "正在偵測特徵欄位與數據格式...",
  "正在載入 Google Gemini 3.5 分析模型...",
  "正在計算資料集之基礎統計與趨勢指標...",
  "正在解構隱含的數據洞察與商業規律...",
  "正在繪製視覺化圖表建議與撰寫具體行動方案...",
  "報告撰寫最後階段，即將呈現..."
];

export default function HomePage() {
  // --- States ---
  const [csvRaw, setCsvRaw] = useState<string>(INITIAL_CSV_CONTENT);
  const [parsedData, setParsedData] = useState<CSVData>(INITIAL_PARSED_DATA);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const rowsPerPage = 10;

  // Analysis focus configuration
  const [analysisType, setAnalysisType] = useState<string>("all");
  const [customPrompt, setCustomPrompt] = useState<string>("");

  // Chart configuration
  const [selectedXCol, setSelectedXCol] = useState<string>(INITIAL_PARSED_DATA.headers[1] || "");
  const [selectedYCol, setSelectedYCol] = useState<string>(INITIAL_PARSED_DATA.headers[5] || "");
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [hoveredDataIndex, setHoveredDataIndex] = useState<number | null>(null);

  // File drag & drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // API Call Status
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [loadingPhaseIndex, setLoadingPhaseIndex] = useState<number>(0);
  const [analysisReport, setAnalysisReport] = useState<string>("");
  const [apiError, setApiError] = useState<string>("");

  // Copy status
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // Follow-up Chat Companion States
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isChatSending, setIsChatSending] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string>("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- CSV Parser Logic ---
  const parseCSVContent = (text: string) => {
    if (!text || text.trim() === "") {
      setParsedData({ headers: [], rows: [] });
      return;
    }

    const lines = text.split(/\r?\n/);
    const rows: string[][] = [];
    let headers: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const row: string[] = [];
      let insideQuote = false;
      let entry = "";

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          row.push(entry.trim().replace(/^"|"$/g, ""));
          entry = "";
        } else {
          entry += char;
        }
      }
      row.push(entry.trim().replace(/^"|"$/g, ""));

      if (headers.length === 0) {
        headers = row;
      } else {
        if (row.length < headers.length) {
          while (row.length < headers.length) row.push("");
        } else if (row.length > headers.length) {
          row.splice(headers.length);
        }
        rows.push(row);
      }
    }

    setParsedData({ headers, rows });
    setCurrentPage(1);

    // Auto configure Chart defaults based on column type detection
    const colTypes = detectColumnTypes(headers, rows);
    const numericIndices: number[] = [];
    const textOrDateIndices: number[] = [];

    colTypes.forEach((type, idx) => {
      if (type === "number") {
        numericIndices.push(idx);
      } else {
        textOrDateIndices.push(idx);
      }
    });

    if (headers.length > 0) {
      // Find first string/date column for X-axis
      if (textOrDateIndices.length > 0) {
        setSelectedXCol(headers[textOrDateIndices[0]]);
      } else {
        setSelectedXCol(headers[0]);
      }

      // Find first numeric column for Y-axis
      if (numericIndices.length > 0) {
        setSelectedYCol(headers[numericIndices[0]]);
      } else {
        setSelectedYCol(headers[headers.length - 1] || "");
      }
    }
  };

  // --- Auto-detect column data types ---
  const detectColumnTypes = (headers: string[], rows: string[][]) => {
    const types: ("number" | "date" | "string")[] = [];

    for (let colIdx = 0; colIdx < headers.length; colIdx++) {
      let numberCount = 0;
      let dateCount = 0;
      let filledCount = 0;

      for (let rowIdx = 0; rowIdx < Math.min(rows.length, 50); rowIdx++) {
        const val = rows[rowIdx][colIdx]?.trim();
        if (!val) continue;
        filledCount++;

        const cleanNum = val.replace(/[%$,]/g, "");
        if (!isNaN(Number(cleanNum)) && cleanNum !== "") {
          numberCount++;
        }

        const dateParsed = Date.parse(val);
        if (!isNaN(dateParsed) && (val.includes("-") || val.includes("/"))) {
          dateCount++;
        }
      }

      if (filledCount === 0) {
        types.push("string");
      } else if (numberCount / filledCount > 0.7) {
        types.push("number");
      } else if (dateCount / filledCount > 0.7) {
        types.push("date");
      } else {
        types.push("string");
      }
    }
    return types;
  };

  const columnTypes = useMemo(() => {
    return detectColumnTypes(parsedData.headers, parsedData.rows);
  }, [parsedData]);

  // --- Calculation of stats for numeric columns ---
  const numericStats = useMemo(() => {
    const stats: { [key: string]: ColumnStat } = {};
    if (parsedData.headers.length === 0 || parsedData.rows.length === 0) return stats;

    parsedData.headers.forEach((header, colIdx) => {
      if (columnTypes[colIdx] === "number") {
        let sum = 0;
        let min = Infinity;
        let max = -Infinity;
        let validCount = 0;

        parsedData.rows.forEach(row => {
          const rawVal = row[colIdx];
          if (rawVal) {
            const num = Number(rawVal.replace(/[%$,]/g, ""));
            if (!isNaN(num)) {
              sum += num;
              if (num < min) min = num;
              if (num > max) max = num;
              validCount++;
            }
          }
        });

        if (validCount > 0) {
          stats[header] = {
            sum,
            avg: sum / validCount,
            min: min === Infinity ? 0 : min,
            max: max === -Infinity ? 0 : max
          };
        }
      }
    });

    return stats;
  }, [parsedData, columnTypes]);

  // --- Filter and Search logic for Table ---
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return parsedData.rows;
    return parsedData.rows.filter(row =>
      row.some(cell => cell.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [parsedData, searchTerm]);

  // --- Paginated Rows for Table ---
  const paginatedRows = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(startIdx, startIdx + rowsPerPage);
  }, [filteredRows, currentPage]);

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;

  // --- Preset Template Loader ---
  const loadTemplate = (templateData: string) => {
    setCsvRaw(templateData);
    parseCSVContent(templateData);
  };

  // --- File Uploader drag & drop events ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === "text/csv" || file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          loadTemplate(text);
        };
        reader.readAsText(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        loadTemplate(text);
      };
      reader.readAsText(file);
    }
  };

  // --- Loading quotes rotation ---
  useEffect(() => {
    if (!isAnalyzing) return;
    const interval = setInterval(() => {
      setLoadingPhaseIndex((prev) => (prev + 1) % LOADING_PHASES.length);
    }, 2000);
    return () => {
      clearInterval(interval);
      setLoadingPhaseIndex(0);
    };
  }, [isAnalyzing]);

  // --- API Call: Analyze ---
  const triggerAIAnalysis = async () => {
    if (!csvRaw || csvRaw.trim() === "") {
      setApiError("請先輸入或上傳 CSV 資料內容。");
      return;
    }

    setIsAnalyzing(true);
    setApiError("");
    setAnalysisReport("");
    setChatHistory([]); // Reset chat history for new report context

    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvData: csvRaw,
          analysisType,
          customPrompt
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "連線至 AI 引擎時發生錯誤");
      }

      setAnalysisReport(data.report || "無分析結果。");
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "分析失敗，請檢查網路連線或稍後再試。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- API Call: Chat Follow-up ---
  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatSending) return;

    const userMessageContent = chatInput;
    setChatInput("");
    setChatError("");

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userMessageContent
    };

    const updatedHistory = [...chatHistory, newMsg];
    setChatHistory(updatedHistory);
    setIsChatSending(true);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvData: csvRaw,
          history: chatHistory.map(msg => ({ role: msg.role, content: msg.content })),
          latestMessage: userMessageContent
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "對話失敗");
      }

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply
      };

      setChatHistory([...updatedHistory, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      setChatError(err.message || "發生錯誤，無法傳送訊息。");
    } finally {
      setIsChatSending(false);
    }
  };

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isChatSending]);

  // --- Report Helpers ---
  const copyReportToClipboard = () => {
    if (!analysisReport) return;
    navigator.clipboard.writeText(analysisReport);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const downloadReportAsText = () => {
    if (!analysisReport) return;
    const element = document.createElement("a");
    const file = new Blob([analysisReport], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `AI_數據分析洞察報告_${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // --- Simple and robust client-side custom HTML Markdown formatter ---
  const renderMarkdownToHTML = (text: string) => {
    if (!text) return null;

    const lines = text.split("\n");
    let inList = false;
    let listHTML: React.ReactNode[] = [];
    const elements: React.ReactNode[] = [];

    const parseInlineStyles = (lineStr: string) => {
      // Match bold **text**
      const parts = [];
      let lastIndex = 0;
      const boldRegex = /\*\*(.*?)\*\*/g;
      let match;

      while ((match = boldRegex.exec(lineStr)) !== null) {
        if (match.index > lastIndex) {
          parts.push(lineStr.substring(lastIndex, match.index));
        }
        parts.push(
          <strong key={match.index} className="font-semibold text-slate-900 dark:text-white">
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < lineStr.length) {
        parts.push(lineStr.substring(lastIndex));
      }

      // If no bold matches, just check for simple inline code blocks `code`
      return parts.length > 0 ? (
        parts.map((p, idx) => {
          if (typeof p === "string") {
            const subParts = [];
            let subLastIndex = 0;
            const codeRegex = /`(.*?)`/g;
            let codeMatch;
            while ((codeMatch = codeRegex.exec(p)) !== null) {
              if (codeMatch.index > subLastIndex) {
                subParts.push(p.substring(subLastIndex, codeMatch.index));
              }
              subParts.push(
                <code key={codeMatch.index} className="px-1.5 py-0.5 mx-0.5 font-mono text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 rounded">
                  {codeMatch[1]}
                </code>
              );
              subLastIndex = codeRegex.lastIndex;
            }
            if (subLastIndex < p.length) {
              subParts.push(p.substring(subLastIndex));
            }
            return subParts.length > 0 ? subParts : p;
          }
          return p;
        })
      ) : (
        lineStr
      );
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Heading 1 (# title)
      if (trimmed.startsWith("# ")) {
        if (inList) {
          elements.push(<ul key={`ul-${index}`} className="list-disc pl-6 mb-4 space-y-2 text-slate-700 dark:text-slate-300">{...listHTML}</ul>);
          listHTML = [];
          inList = false;
        }
        elements.push(
          <h1 key={`h1-${index}`} className="text-2xl font-bold text-slate-800 dark:text-white mt-6 mb-3 border-b pb-2 flex items-center gap-2">
            {trimmed.substring(2)}
          </h1>
        );
      }
      // Heading 2 (## title)
      else if (trimmed.startsWith("## ")) {
        if (inList) {
          elements.push(<ul key={`ul-${index}`} className="list-disc pl-6 mb-4 space-y-2 text-slate-700 dark:text-slate-300">{...listHTML}</ul>);
          listHTML = [];
          inList = false;
        }
        elements.push(
          <h2 key={`h2-${index}`} className="text-lg font-bold text-slate-800 dark:text-white mt-5 mb-2.5 flex items-center gap-1.5 border-l-4 border-teal-500 pl-2.5">
            {trimmed.substring(3)}
          </h2>
        );
      }
      // Heading 3 (### title)
      else if (trimmed.startsWith("### ")) {
        if (inList) {
          elements.push(<ul key={`ul-${index}`} className="list-disc pl-6 mb-4 space-y-2 text-slate-700 dark:text-slate-300">{...listHTML}</ul>);
          listHTML = [];
          inList = false;
        }
        elements.push(
          <h3 key={`h3-${index}`} className="text-base font-semibold text-slate-800 dark:text-white mt-4 mb-2">
            {trimmed.substring(4)}
          </h3>
        );
      }
      // Bullet list item (- or *)
      else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        inList = true;
        const itemContent = trimmed.substring(2);
        listHTML.push(<li key={`li-${index}`}>{parseInlineStyles(itemContent)}</li>);
      }
      // Paragraphs or empty lines
      else {
        if (inList) {
          elements.push(<ul key={`ul-${index}`} className="list-disc pl-6 mb-4 space-y-2 text-slate-700 dark:text-slate-300">{...listHTML}</ul>);
          listHTML = [];
          inList = false;
        }

        if (trimmed === "") {
          elements.push(<div key={`space-${index}`} className="h-2"></div>);
        } else if (trimmed.startsWith("---")) {
          elements.push(<hr key={`hr-${index}`} className="my-6 border-slate-200 dark:border-slate-800" />);
        } else {
          elements.push(
            <p key={`p-${index}`} className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3 text-[14.5px]">
              {parseInlineStyles(trimmed)}
            </p>
          );
        }
      }
    });

    if (inList) {
      elements.push(<ul key={`ul-final`} className="list-disc pl-6 mb-4 space-y-2 text-slate-700 dark:text-slate-300">{...listHTML}</ul>);
    }

    return elements;
  };

  // --- Interactive SVG Chart Coordinates calculation ---
  const chartData = useMemo(() => {
    if (!parsedData.headers.length || !parsedData.rows.length || !selectedXCol || !selectedYCol) {
      return [];
    }

    const xIdx = parsedData.headers.indexOf(selectedXCol);
    const yIdx = parsedData.headers.indexOf(selectedYCol);

    if (xIdx === -1 || yIdx === -1) return [];

    // Map rows to x-label and numeric-y. Limit to first 25 rows to look beautiful and not overcrowded
    return parsedData.rows.slice(0, 25).map((row, idx) => {
      const xLabel = row[xIdx] || `第 ${idx + 1} 筆`;
      const yValStr = row[yIdx]?.replace(/[%$,]/g, "") || "0";
      const yVal = parseFloat(yValStr) || 0;
      return { xLabel, yVal, originalIdx: idx };
    });
  }, [parsedData, selectedXCol, selectedYCol]);

  // SVG Chart rendering specifications
  const svgWidth = 800;
  const svgHeight = 320;

  const { minChartY, maxChartY, yGridTicks, points } = useMemo(() => {
    if (chartData.length === 0) {
      return { minChartY: 0, maxChartY: 100, yGridTicks: [], points: [] };
    }

    const yVals = chartData.map(d => d.yVal);
    let maxY = Math.max(...yVals, 0);
    let minY = Math.min(...yVals, 0);

    // Give some upper margin
    if (maxY === 0 && minY === 0) {
      maxY = 100;
    } else {
      const range = maxY - minY;
      maxY = maxY + (range * 0.12 || 10);
      minY = minY < 0 ? minY - (range * 0.1 || 10) : 0;
    }

    // Grid ticks (5 lines)
    const yGridTicks = [];
    const step = (maxY - minY) / 4;
    for (let i = 0; i <= 4; i++) {
      yGridTicks.push(minY + step * i);
    }

    // Calculate (x, y) coordinates for SVG mapping
    const availableWidth = svgWidth - CHART_PADDING.left - CHART_PADDING.right;
    const availableHeight = svgHeight - CHART_PADDING.top - CHART_PADDING.bottom;

    const points = chartData.map((d, idx) => {
      // Distribute evenly across X axis
      const cx = CHART_PADDING.left + (idx * availableWidth) / Math.max(chartData.length - 1, 1);
      const cy = svgHeight - CHART_PADDING.bottom - ((d.yVal - minY) * availableHeight) / (maxY - minY);
      return { ...d, cx, cy };
    });

    return { minChartY: minY, maxChartY: maxY, yGridTicks, points };
  }, [chartData]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/10 selection:text-indigo-400 transition-colors duration-200" id="app_container">
      
      {/* --- Top Banner / Navigation --- */}
      <header className="border-b border-slate-800 bg-slate-900/40 backdrop-blur sticky top-0 z-40" id="app_header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                AI 數據分析與洞察工具
                <span className="text-[11px] font-normal px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">Gemini-3.5-Flash</span>
              </h1>
              <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">Intelligent Data Analysis Engine v3.5</p>
            </div>
          </div>

          {/* Time & Creator Metadata */}
          <div className="flex items-center gap-4">
            <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              系統已就緒 (2026-06-29)
            </div>
            <div className="text-slate-400 text-xs border-l border-slate-800 pl-4 font-mono hidden sm:block">
              <span>wangcbstudy@gmail.com</span>
            </div>
          </div>
        </div>
      </header>

      {/* --- Main Workspace --- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8" id="app_main">
        
        {/* Row 1: Preset quick select */}
        <section id="presets_section" className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
            <Sparkles className="w-4.5 h-4.5 text-indigo-400" />
            <span>選擇範例資料快速體驗</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRESET_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => loadTemplate(tpl.data)}
                id={`preset_btn_${tpl.id}`}
                className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                  csvRaw === tpl.data
                    ? "bg-indigo-950/40 border-indigo-500/40 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/20 text-slate-100"
                    : "bg-slate-900 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700 text-slate-300"
                }`}
              >
                <div className="font-semibold text-slate-200 text-[14.5px]">{tpl.name}</div>
                <div className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">{tpl.description}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Row 2: Two Columns for Input (Left) and Interactive Stats/Preview (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="data_input_grid">
          
          {/* Left Column (5/12) - CSV input & controls */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 flex flex-col h-full justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-200 text-[15px]">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                    <span>CSV 原始數據輸入</span>
                  </div>
                  
                  {csvRaw && (
                    <button
                      onClick={() => {
                        setCsvRaw("");
                        setParsedData({ headers: [], rows: [] });
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 transition flex items-center gap-1 font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>清除資料</span>
                    </button>
                  )}
                </div>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-5 text-center transition duration-200 relative ${
                    isDragging
                      ? "border-indigo-500 bg-indigo-950/20"
                      : "border-slate-800 bg-slate-950 hover:bg-slate-950/80"
                  }`}
                >
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="csv_file_input"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="p-2 bg-slate-900 rounded-full border border-slate-800 shadow-md">
                      <Upload className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-xs font-semibold text-slate-300">拖放你的 .csv 或 .txt 檔案至此處，或 <span className="text-indigo-400">點擊瀏覽</span></p>
                    <p className="text-[10px] text-slate-500">支援標準 UTF-8 編碼 CSV 資料格式</p>
                  </div>
                </div>

                {/* Textarea for CSV edit */}
                <div className="space-y-1.5">
                  <label htmlFor="csv_textarea" className="text-xs font-semibold text-slate-400">或在此貼上/編輯 CSV 原始資料 (逗號分隔)：</label>
                  <textarea
                    id="csv_textarea"
                    value={csvRaw}
                    onChange={(e) => {
                      setCsvRaw(e.target.value);
                      parseCSVContent(e.target.value);
                    }}
                    placeholder="請在此處貼上您的 CSV 資料，或者點選上方範例快速載入..."
                    className="w-full h-56 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-all leading-relaxed"
                  ></textarea>
                </div>

                {/* Config Parameters */}
                <div className="border-t border-slate-800 pt-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">🎯 AI 分析聚焦方向：</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "all", label: "綜合剖析" },
                        { id: "summary", label: "摘要與統計" },
                        { id: "trends", label: "趨勢與週期" },
                        { id: "anomaly", label: "異常與優化" },
                        { id: "business", label: "商業決策建議" }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setAnalysisType(item.id)}
                          type="button"
                          className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition text-center ${
                            analysisType === item.id
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20"
                              : "bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-400"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="custom_prompt" className="text-xs font-bold text-slate-300 flex items-center gap-1">
                      💡 額外指定分析重點（選填）：
                      <span title="例如：請深入探討五月份的銷售額為什麼下滑，或是幫我挑出表現最差的部門分析原因" className="cursor-help flex items-center justify-center">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                      </span>
                    </label>
                    <input
                      type="text"
                      id="custom_prompt"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="例如：請著重剖析美妝保養在北部的表現與優化建議..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Start button */}
              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={triggerAIAnalysis}
                  disabled={isAnalyzing || !csvRaw}
                  className={`w-full py-3.5 rounded-xl text-white font-bold text-sm transition flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-indigo-600/20 ${
                    isAnalyzing || !csvRaw
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed shadow-none border border-slate-800"
                      : "bg-indigo-600 hover:bg-indigo-500"
                  }`}
                  id="start_analysis_btn"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>AI 精準分析中...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span>開始 AI 智慧數據分析</span>
                    </>
                  )}
                </button>
                {apiError && (
                  <p className="text-xs text-rose-400 mt-2.5 text-center flex items-center justify-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{apiError}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column (7/12) - Parsed Table & Visualization Dashboard */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* If no data loaded */}
            {!parsedData.headers.length && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center h-full flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 bg-slate-950 border border-slate-800 text-slate-500 rounded-2xl flex items-center justify-center">
                  <Database className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-300">尚未載入 CSV 數據報表</h3>
                  <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                    請在左側輸入區貼上 CSV 資料、拖放上傳 CSV 檔案，或是點選最上方的預設範例資料進行載入。
                  </p>
                </div>
              </div>
            )}

            {/* If data loaded */}
            {parsedData.headers.length > 0 && (
              <div className="space-y-6">
                
                {/* 1. Quick Stats Overview Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="stats_overview">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">總資料筆數</div>
                      <div className="text-lg font-bold text-slate-200 font-mono mt-0.5">{parsedData.rows.length} <span className="text-[10px] font-normal text-slate-500">筆</span></div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">數據特徵欄位</div>
                      <div className="text-lg font-bold text-slate-200 font-mono mt-0.5">{parsedData.headers.length} <span className="text-[10px] font-normal text-slate-500">個</span></div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md flex items-center gap-3 col-span-2">
                    <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        數值指標速覽
                        <span className="px-1.5 py-0.2 bg-slate-950 text-[9px] text-slate-400 rounded border border-slate-800 font-normal">平均值</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-2 gap-y-1">
                        {Object.keys(numericStats).slice(0, 2).map(key => (
                          <span key={key} className="bg-slate-950 border border-slate-800/80 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-300">
                            {key}: <strong className="font-mono text-indigo-400">{numericStats[key].avg.toLocaleString(undefined, {maximumFractionDigits: 1})}</strong>
                          </span>
                        ))}
                        {Object.keys(numericStats).length > 2 && (
                          <span className="text-[9px] text-slate-500">+{Object.keys(numericStats).length - 2}個其餘數值</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Dynamic Interactive Data Table Tab */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl" id="interactive_table_card">
                  <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></div>
                      <span className="font-bold text-slate-200 text-[14.5px]">CSV 資料表 Live 預覽</span>
                      <span className="text-[10px] text-slate-500 font-mono">({filteredRows.length} / {parsedData.rows.length} 筆符合)</span>
                    </div>

                    {/* Search Field */}
                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        placeholder="搜尋資料單值..."
                        className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-950 hover:bg-slate-800/50 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Table Element */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-slate-800">
                          {parsedData.headers.map((header, colIdx) => (
                            <th key={header} className="p-3.5 font-semibold text-slate-400 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span>{header}</span>
                                <span className={`text-[9px] font-normal px-1 py-0.2 rounded border uppercase font-mono ${
                                  columnTypes[colIdx] === "number"
                                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                    : columnTypes[colIdx] === "date"
                                      ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                      : "bg-slate-950 text-slate-500 border-slate-800"
                                }`}>
                                  {columnTypes[colIdx] === "number" ? "123" : columnTypes[colIdx] === "date" ? "日期" : "abc"}
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {paginatedRows.length > 0 ? (
                          paginatedRows.map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-slate-800/40 transition duration-150">
                              {row.map((cell, cellIdx) => (
                                <td key={cellIdx} className="p-3.5 font-mono truncate max-w-[180px]" title={cell}>
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={parsedData.headers.length} className="p-8 text-center text-slate-500">
                              無相符資料結果。
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Pagination */}
                  {totalPages > 1 && (
                    <div className="px-5 py-3 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between">
                      <div className="text-[11px] text-slate-400">
                        顯示第 <span className="font-semibold text-slate-200">{(currentPage - 1) * rowsPerPage + 1}</span> 至{" "}
                        <span className="font-semibold text-slate-200">
                          {Math.min(currentPage * rowsPerPage, filteredRows.length)}
                        </span>{" "}
                        筆，共 <span className="font-semibold text-slate-200">{filteredRows.length}</span> 筆
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="p-1 rounded hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                          <ChevronLeft className="w-4 h-4 text-slate-400" />
                        </button>
                        <span className="text-xs text-slate-400 font-medium px-2.5">
                          {currentPage} / {totalPages} 頁
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="p-1 rounded hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Custom SVG Interactive Visualization Engine */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl" id="visualization_card">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                        <LineChart className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-200 text-[14.5px]">動態交互式數據圖表</span>
                        <p className="text-[10px] text-slate-500">自動分析序列特徵並渲染向量視覺圖表</p>
                      </div>
                    </div>

                    {/* Chart visual controller */}
                    <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800/80">
                      <button
                        onClick={() => setChartType("bar")}
                        className={`px-2.5 py-1 text-xs rounded-md font-medium flex items-center gap-1 transition ${
                          chartType === "bar"
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                        <span>直條圖</span>
                      </button>
                      <button
                        onClick={() => setChartType("line")}
                        className={`px-2.5 py-1 text-xs rounded-md font-medium flex items-center gap-1 transition ${
                          chartType === "line"
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <LineChart className="w-3.5 h-3.5" />
                        <span>折線圖</span>
                      </button>
                    </div>
                  </div>

                  {/* Chart Configurations */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="space-y-1.5">
                      <label htmlFor="x_axis_select" className="text-xs font-bold text-slate-400 flex items-center gap-1">
                        X 軸欄位 (類別/維度)：
                        <span className="px-1.5 py-0.2 bg-slate-900 border border-slate-800 text-[9px] rounded font-mono text-slate-400">X-Axis</span>
                      </label>
                      <select
                        id="x_axis_select"
                        value={selectedXCol}
                        onChange={(e) => setSelectedXCol(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-medium text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 outline-none"
                      >
                        {parsedData.headers.map((header) => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="y_axis_select" className="text-xs font-bold text-slate-400 flex items-center gap-1">
                        Y 軸欄位 (數值/指標)：
                        <span className="px-1.5 py-0.2 bg-indigo-500/10 border border-indigo-500/20 text-[9px] rounded font-mono text-indigo-400">Y-Axis</span>
                      </label>
                      <select
                        id="y_axis_select"
                        value={selectedYCol}
                        onChange={(e) => setSelectedYCol(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-medium text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 outline-none"
                      >
                        {parsedData.headers.map((header, idx) => (
                          <option key={header} value={header} disabled={columnTypes[idx] !== "number"}>
                            {header} {columnTypes[idx] !== "number" ? "(非數值)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* SVG Chart Drawing Canvas */}
                  <div className="relative border border-slate-800 rounded-xl p-2 md:p-4 bg-slate-950/40 overflow-x-auto">
                    {points.length === 0 ? (
                      <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
                        欄位對應錯誤，請更換 X 或 Y 軸指標欄位
                      </div>
                    ) : (
                      <div className="min-w-[650px]">
                        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height={svgHeight} className="overflow-visible font-mono">
                          <defs>
                            {/* Gradients */}
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.85" />
                              <stop offset="100%" stopColor="#4338ca" stopOpacity="0.95" />
                            </linearGradient>
                            <linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                            </linearGradient>
                            <linearGradient id="barHoverGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.95" />
                              <stop offset="100%" stopColor="#6d28d9" stopOpacity="1" />
                            </linearGradient>
                          </defs>

                          {/* Y-Axis Grid Lines & Ticks */}
                          {yGridTicks.map((tick, idx) => {
                            const yPos = svgHeight - CHART_PADDING.bottom - ((tick - minChartY) * (svgHeight - CHART_PADDING.top - CHART_PADDING.bottom)) / (maxChartY - minChartY);
                            return (
                              <g key={`grid-${idx}`} className="opacity-40">
                                <line
                                  x1={CHART_PADDING.left}
                                  y1={yPos}
                                  x2={svgWidth - CHART_PADDING.right}
                                  y2={yPos}
                                  stroke="#334155"
                                  strokeDasharray="4,4"
                                  strokeWidth="1"
                                />
                                <text
                                  x={CHART_PADDING.left - 12}
                                  y={yPos + 4}
                                  textAnchor="end"
                                  className="fill-slate-500 text-[10px]"
                                >
                                  {tick.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                </text>
                              </g>
                            );
                          })}

                          {/* X-Axis Ticks (Labels) */}
                          {points.map((pt, idx) => {
                            // Only show every Nth label if too many points to avoid crowding
                            const showLabel = points.length <= 15 || idx % Math.ceil(points.length / 12) === 0;
                            return (
                              <g key={`x-tick-${idx}`}>
                                <line
                                  x1={pt.cx}
                                  y1={svgHeight - CHART_PADDING.bottom}
                                  x2={pt.cx}
                                  y2={svgHeight - CHART_PADDING.bottom + 5}
                                  stroke="#334155"
                                  strokeWidth="1"
                                />
                                {showLabel && (
                                  <text
                                    x={pt.cx}
                                    y={svgHeight - CHART_PADDING.bottom + 18}
                                    textAnchor="middle"
                                    className="fill-slate-400 text-[9.5px] select-none"
                                    transform={`rotate(12, ${pt.cx}, ${svgHeight - CHART_PADDING.bottom + 18})`}
                                  >
                                    {pt.xLabel.length > 10 ? `${pt.xLabel.substring(0, 9)}...` : pt.xLabel}
                                  </text>
                                )}
                              </g>
                            );
                          })}

                          {/* Base axes lines */}
                          <line
                             x1={CHART_PADDING.left}
                             y1={svgHeight - CHART_PADDING.bottom}
                             x2={svgWidth - CHART_PADDING.right}
                             y2={svgHeight - CHART_PADDING.bottom}
                             stroke="#334155"
                             strokeWidth="1.5"
                          />
                          <line
                            x1={CHART_PADDING.left}
                            y1={CHART_PADDING.top}
                            x2={CHART_PADDING.left}
                            y2={svgHeight - CHART_PADDING.bottom}
                            stroke="#334155"
                            strokeWidth="1.5"
                          />

                          {/* --- Render Chart Type: Straight Bar Chart --- */}
                          {chartType === "bar" && (
                            <g>
                              {points.map((pt, idx) => {
                                const barWidth = Math.max(
                                  Math.min((svgWidth - CHART_PADDING.left - CHART_PADDING.right) / points.length * 0.65, 36),
                                  6
                                );
                                const barHeight = svgHeight - CHART_PADDING.bottom - pt.cy;
                                return (
                                  <rect
                                    key={`bar-${idx}`}
                                    x={pt.cx - barWidth / 2}
                                    y={pt.cy}
                                    width={barWidth}
                                    height={Math.max(barHeight, 1.5)}
                                    fill={hoveredDataIndex === idx ? "url(#barHoverGradient)" : "url(#barGradient)"}
                                    rx={Math.min(barWidth / 4, 3)}
                                    className="transition-all duration-200 cursor-pointer"
                                    onMouseEnter={() => setHoveredDataIndex(idx)}
                                    onMouseLeave={() => setHoveredDataIndex(null)}
                                  />
                                );
                              })}
                            </g>
                          )}

                          {/* --- Render Chart Type: Curvy / Linear Area Chart --- */}
                          {chartType === "line" && (
                            <g>
                              {/* Filled Area path */}
                              {(() => {
                                if (points.length < 2) return null;
                                let areaPathStr = `M ${points[0].cx} ${svgHeight - CHART_PADDING.bottom} `;
                                points.forEach(pt => {
                                  areaPathStr += `L ${pt.cx} ${pt.cy} `;
                                });
                                areaPathStr += `L ${points[points.length - 1].cx} ${svgHeight - CHART_PADDING.bottom} Z`;
                                return (
                                  <path
                                    d={areaPathStr}
                                    fill="url(#lineAreaGradient)"
                                    className="transition-all duration-300"
                                  />
                                );
                              })()}

                              {/* Main Line path */}
                              {(() => {
                                if (points.length < 2) return null;
                                let linePathStr = `M ${points[0].cx} ${points[0].cy} `;
                                for (let i = 1; i < points.length; i++) {
                                  linePathStr += `L ${points[i].cx} ${points[i].cy} `;
                                }
                                return (
                                  <path
                                    d={linePathStr}
                                    fill="none"
                                    stroke="#4f46e5"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="transition-all duration-300"
                                  />
                                );
                              })()}

                              {/* Glowing data nodes */}
                              {points.map((pt, idx) => (
                                <circle
                                  key={`circle-${idx}`}
                                  cx={pt.cx}
                                  cy={pt.cy}
                                  r={hoveredDataIndex === idx ? 6.5 : 4}
                                  fill={hoveredDataIndex === idx ? "#4f46e5" : "#ffffff"}
                                  stroke="#4f46e5"
                                  strokeWidth={hoveredDataIndex === idx ? 2.5 : 1.5}
                                  className="transition-all duration-200 cursor-pointer"
                                  onMouseEnter={() => setHoveredDataIndex(idx)}
                                  onMouseLeave={() => setHoveredDataIndex(null)}
                                />
                              ))}
                            </g>
                          )}
                        </svg>
                      </div>
                    )}

                    {/* Dynamic Tooltip */}
                    <AnimatePresence>
                      {hoveredDataIndex !== null && points[hoveredDataIndex] && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute bg-slate-900/95 text-white p-3 rounded-lg text-xs space-y-1 shadow-md pointer-events-none border border-slate-700/50"
                          style={{
                            left: `${Math.min(points[hoveredDataIndex].cx * 0.95, svgWidth - 160)}px`,
                            top: `${Math.max(points[hoveredDataIndex].cy - 65, 10)}px`,
                          }}
                        >
                          <div className="font-semibold border-b border-slate-700 pb-1 flex items-center gap-1.5 text-slate-300">
                            <span className="w-1.5 h-1.5 bg-teal-400 rounded-full"></span>
                            {selectedXCol}: {points[hoveredDataIndex].xLabel}
                          </div>
                          <div className="pt-0.5">
                            {selectedYCol}:{" "}
                            <span className="font-bold text-amber-300 font-mono text-sm">
                              {points[hoveredDataIndex].yVal.toLocaleString()}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Mini-guide helper */}
                  <div className="text-[11px] text-slate-400 bg-slate-950 px-3.5 py-2.5 rounded-lg border border-slate-800 flex items-start gap-2 leading-relaxed">
                    <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>交互說明：</strong>
                      可以自由在上方欄位選單切換要繪製的 X 軸與 Y 軸指標，直條圖/折線圖將會即時完成重繪。將滑鼠懸停於圖表資料點上可以查看精確的數據資訊。AI 報告中的圖表建議即是基於此資料集推薦設計。
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* --- Loading Status Card --- */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-slate-100 rounded-3xl border border-slate-800 p-8 shadow-2xl text-center flex flex-col items-center justify-center space-y-5"
              id="analysis_loading_card"
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-4 border-indigo-500/30 border-t-indigo-400 animate-spin flex items-center justify-center"></div>
                <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                  <Sparkles className="w-5.5 h-5.5 text-indigo-300" />
                </div>
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <h3 className="text-base font-bold text-indigo-300 tracking-wide">正在運算大數據特徵與生成分析報告</h3>
                
                {/* Cycling Phase Text */}
                <div className="h-6 flex items-center justify-center">
                  <span className="text-xs font-mono text-slate-400 tracking-wider">
                    {LOADING_PHASES[loadingPhaseIndex]}
                  </span>
                </div>

                {/* Animated Simulated Progress bar */}
                <div className="w-64 h-1.5 bg-slate-950 rounded-full mx-auto overflow-hidden border border-slate-800">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 15, ease: "linear", repeat: Infinity }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- AI Analysis Result Card & Chat Companion --- */}
        {(analysisReport || apiError) && !isAnalyzing && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="analysis_result_section">
            
            {/* Left Result View (7/12) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl p-6 md:p-8 space-y-6" id="report_display_card">
                
                {/* Result header controller */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20 shadow-sm">
                      <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-200 text-base flex items-center gap-2">AI 數據分析與洞察報告</h2>
                      <p className="text-xs text-slate-500">由 Google Gemini 3.5 AI 深度解析並實時生成</p>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyReportToClipboard}
                      className={`px-3 py-1.5 text-xs rounded-lg border font-semibold flex items-center gap-1.5 transition ${
                        copiedReport
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300"
                      }`}
                      id="copy_report_btn"
                    >
                      {copiedReport ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>複製成功</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>一鍵複製</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={downloadReportAsText}
                      className="px-3 py-1.5 text-xs rounded-lg border bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300 font-semibold flex items-center gap-1.5 transition"
                      id="download_report_btn"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>下載報告</span>
                    </button>
                  </div>
                </div>

                {/* Markdown content container */}
                <article className="prose prose-slate prose-invert max-w-none text-slate-300" id="report_markdown_body">
                  {renderMarkdownToHTML(analysisReport)}
                </article>
              </div>
            </div>

            {/* Right Dialogue Chat Companion (5/12) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl p-6 h-[650px] flex flex-col justify-between" id="chat_companion_card">
                
                {/* Chat Header */}
                <div className="border-b border-slate-800 pb-4 flex items-center gap-2.5">
                  <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-indigo-400">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-100">💬 AI 數據隨身助手</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">針對此 CSV 報表資料進行自由深度對話與提問</p>
                  </div>
                </div>

                {/* Chat Log Message Area */}
                <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                  {chatHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-full text-indigo-400 animate-pulse">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-300">深度探詢與追問</p>
                        <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
                          您可以詢問如：「哪一個地區對整體營收貢獻最大？」、「幫我找出特定轉換率低於 4% 的日期」或「請幫我寫一份簡單的簡報大綱」
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chatHistory.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            msg.role === "user" ? "items-end" : "items-start"
                          }`}
                        >
                          <div className="text-[10px] text-slate-500 mb-1 px-1 font-mono">
                            {msg.role === "user" ? "您" : "AI 分析助理"}
                          </div>
                          <div
                            className={`p-3 rounded-xl text-xs max-w-[90%] leading-relaxed ${
                              msg.role === "user"
                                ? "bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/10"
                                : "bg-slate-950 text-slate-300 rounded-tl-none border border-slate-800"
                            }`}
                          >
                            <div className="prose prose-sm prose-invert max-w-none">
                              {msg.role === "user" ? (
                                msg.content
                              ) : (
                                renderMarkdownToHTML(msg.content)
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Assistant loading typing state */}
                      {isChatSending && (
                        <div className="flex flex-col items-start">
                          <div className="text-[10px] text-slate-500 mb-1 px-1 font-mono">AI 分析助理</div>
                          <div className="bg-slate-950 p-3 rounded-xl rounded-tl-none border border-slate-800 text-slate-300 text-xs flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce delay-100"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce delay-200"></span>
                            <span className="text-[10px] text-slate-500 ml-1 font-mono">思考計算中...</span>
                          </div>
                        </div>
                      )}

                      {chatError && (
                        <p className="text-xs text-rose-400 font-medium text-center bg-rose-950/20 py-2 rounded-lg border border-rose-900/40">
                          {chatError}
                        </p>
                      )}
                      
                      <div ref={chatEndRef} />
                    </div>
                  )}
                </div>

                {/* Input box */}
                <div className="border-t border-slate-800 pt-4 space-y-3">
                  <div className="flex gap-2 relative">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                      disabled={isChatSending || !csvRaw}
                      placeholder={
                        csvRaw
                          ? "輸入對此 CSV 報表的追加問題..."
                          : "請先載入資料以解鎖隨身對話助手"
                      }
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition disabled:opacity-45 disabled:cursor-not-allowed"
                    />
                    <button
                      onClick={sendChatMessage}
                      disabled={!chatInput.trim() || isChatSending || !csvRaw}
                      className={`p-2.5 rounded-xl text-white transition flex items-center justify-center ${
                        chatInput.trim() && !isChatSending && csvRaw
                          ? "bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
                          : "bg-slate-950 text-slate-600 cursor-not-allowed border border-slate-850"
                      }`}
                      id="send_chat_btn"
                    >
                      <Send className="w-4.5 h-4.5" />
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500/60" />
                    <span>對話時已自動嵌入當前 CSV 資料集以確保回覆實事求是</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

      </main>

      {/* --- Simple Clean Footer --- */}
      <footer className="border-t border-slate-900 bg-slate-950 mt-16 py-6" id="app_footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
          <p className="text-xs text-slate-500">© 2026 AI 數據分析與洞察工具. 採用 Google Gemini 專利多模態分析技術.</p>
          <p className="text-[10px] text-slate-600 font-mono">所有數據皆於伺服器端進行安全代理，保障商業機密不洩漏。</p>
        </div>
      </footer>

    </div>
  );
}
