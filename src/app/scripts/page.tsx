"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { ErrorComp } from "../../components/Error";
import { Spacing } from "../../components/Spacing";
import { InputContainer } from "../../components/Container";

type ScriptStatus = "idle" | "running" | "success" | "error";

export default function ScriptsPage() {
  const [zhihuUrl, setZhihuUrl] = useState("");
  const [renderStatus, setRenderStatus] = useState<ScriptStatus>("idle");
  const [generateStatus, setGenerateStatus] = useState<ScriptStatus>("idle");
  const [renderOutput, setRenderOutput] = useState<string>("");
  const [generateOutput, setGenerateOutput] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleRenderVideo = async () => {
    setRenderStatus("running");
    setRenderOutput("");
    setError("");

    try {
      const response = await fetch("/api/scripts/render-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.type === "error") {
        setRenderStatus("error");
        setError(data.message);
        setRenderOutput(data.stderr || data.stdout || "");
      } else {
        setRenderStatus("success");
        setRenderOutput(data.data.stdout || "");
      }
    } catch (err) {
      setRenderStatus("error");
      setError((err as Error).message);
    }
  };

  const handleGenerateVideo = async () => {
    if (!zhihuUrl) {
      setError("Please enter a Zhihu URL");
      return;
    }

    setGenerateStatus("running");
    setGenerateOutput("");
    setError("");

    try {
      const response = await fetch("/api/scripts/generate-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: zhihuUrl }),
      });

      const data = await response.json();

      if (data.type === "error") {
        setGenerateStatus("error");
        setError(data.message);
        setGenerateOutput(data.stderr || data.stdout || "");
      } else {
        setGenerateStatus("success");
        setGenerateOutput(data.data.stdout || "");
      }
    } catch (err) {
      setGenerateStatus("error");
      setError((err as Error).message);
    }
  };

  return (
    <div className="max-w-screen-md m-auto mb-5">
      <div className="mt-16 mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Script Runner</h1>
          <p className="text-gray-600">
            Execute video generation scripts from the web interface
          </p>
        </div>
        <Link
          href="/"
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          ← Back to Home
        </Link>
      </div>

      {/* Render Video Section */}
      <InputContainer>
        <h2 className="text-xl font-semibold mb-4">Render Video</h2>
        <p className="text-gray-600 mb-4 text-sm">
          Generate video from existing input.txt file (includes TTS + Render)
        </p>
        <Button
          onClick={handleRenderVideo}
          disabled={renderStatus === "running"}
          loading={renderStatus === "running"}
        >
          {renderStatus === "running"
            ? "Rendering..."
            : renderStatus === "success"
              ? "Render Again"
              : "Render Video"}
        </Button>

        {renderStatus === "success" && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
            ✅ Video rendered successfully! Check out/video.mp4
          </div>
        )}

        {renderOutput && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">Output:</h3>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64">
              {renderOutput}
            </pre>
          </div>
        )}
      </InputContainer>

      <Spacing />

      {/* Generate Video Section */}
      <InputContainer>
        <h2 className="text-xl font-semibold mb-4">Generate Video from Zhihu</h2>
        <p className="text-gray-600 mb-4 text-sm">
          Extract content from Zhihu question and generate video automatically
        </p>
        <div className="mb-4">
          <input
            type="text"
            value={zhihuUrl}
            onChange={(e) => setZhihuUrl(e.target.value)}
            placeholder="https://www.zhihu.com/question/316150890"
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={generateStatus === "running"}
          />
        </div>
        <Button
          onClick={handleGenerateVideo}
          disabled={generateStatus === "running" || !zhihuUrl}
          loading={generateStatus === "running"}
        >
          {generateStatus === "running"
            ? "Generating..."
            : generateStatus === "success"
              ? "Generate Again"
              : "Generate Video"}
        </Button>

        {generateStatus === "success" && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
            ✅ Video generated successfully! Check out/video.mp4
          </div>
        )}

        {generateOutput && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">Output:</h3>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64">
              {generateOutput}
            </pre>
          </div>
        )}
      </InputContainer>

      {error && (
        <div className="mt-4">
          <ErrorComp message={error} />
        </div>
      )}
    </div>
  );
}
