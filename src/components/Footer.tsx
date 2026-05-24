import { ExternalLink, Github } from "lucide-react";

export default function Footer() {
  return (
    <footer className="container mx-auto mt-8 border-t border-white/[0.06] bg-gradient-to-b from-transparent to-black/40 px-4 py-10 sm:mt-16 sm:px-6 sm:py-14">
      <div className="text-center text-zinc-400 text-sm sm:text-base space-y-4">
        <p>Made with ❤️ by szhshp x 熊猫智研社</p>
        <div className="flex justify-center gap-6 sm:gap-8 flex-wrap items-center">
          <a
            href="https://github.com/szhshp/panda-video-generator"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-zinc-50 underline-offset-4 hover:underline"
          >
            <Github size={18} className="shrink-0" aria-hidden />
            <span>GitHub 仓库</span>
          </a>
          <a
            href="https://szhshp.org"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-zinc-50 underline-offset-4 hover:underline"
          >
            <ExternalLink size={16} className="shrink-0" aria-hidden />
            <span>开发者博客</span>
          </a>
        </div>
        <p className="text-xs sm:text-sm text-zinc-500">
          © {new Date().getFullYear()} Panda Video Generator. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
