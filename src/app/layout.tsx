import "../../styles/global.css";
import { Analytics } from "@vercel/analytics/next";
import { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "熊猫视频自动化引擎 - Panda Video Generator",
  description:
    "全自动化的视频内容生成与发布引擎：内容提取, AI 整理、一键成片与多平台自动上传. 对开发者友好、使用简单、功能强大。",
  verification: {
    other: {
      "msvalidate.01": "FFFE3E3280889E0058410FD735227147",
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
