import "../../styles/global.css";
import { Analytics } from "@vercel/analytics/next";
import { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "熊猫视频自动化引擎 - Panda Video Generator",
  description: "全自动化的视频内容生成与发布平台，支持从网页内容提取、文本转视频到多平台发布的完整工作流",
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
      <body className="bg-background">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
