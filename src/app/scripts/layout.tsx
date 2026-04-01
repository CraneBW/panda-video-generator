import { Metadata } from "next";

export const metadata: Metadata = {
  title: "自动化向导 · Panda Video Generator",
  description:
    "分步完成：准备文稿 → 生成配音与字幕 → 渲染视频 → 各平台登录与上传。",
};

export default function ScriptsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
