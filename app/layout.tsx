import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'AI 數據分析與洞察工具',
  description: '上傳或貼上 CSV 報表資料，智慧生成全方位數據分析報告與互動對話洞察。',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="zh-TW">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
