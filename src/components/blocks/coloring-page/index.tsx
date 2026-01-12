"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Loader2, Sparkles } from "lucide-react";
import Image from "next/image";

const DEFAULT_IMAGE_URL = "https://gencolor.ai/images/home/case/result_01.webp";

type AspectRatio = "1:1" | "2:3" | "3:2";

const SUGGESTIONS = [
  { key: "bluey", prompt: "Bluey holding gifts" },
  { key: "spiderman", prompt: "Spiderman reading books" },
  { key: "farm", prompt: "Busy farm" },
];

export default function ColoringPageGenerator() {
  const t = useTranslations("coloring_page");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("3:2");
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(
    null
  );
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(
    null
  );
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // 轮询查询任务状态
  const pollTaskStatus = async (taskId: string) => {
    try {
      const response = await fetch(
        `/api/generate-coloring-page?taskId=${taskId}`
      );

      if (!response.ok) {
        throw new Error(`Query failed with status: ${response.status}`);
      }

      const { code, message, data } = await response.json();

      if (code !== 0) {
        throw new Error(message || "Failed to query task");
      }

      const { state, resultUrls, failMsg, failCode } = data;

      if (state === "success") {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setLoading(false);
        if (resultUrls && resultUrls.length > 0) {
          setImageUrl(resultUrls[0]);
          setError(null);
          setImageAspectRatio(null); // 重置宽高比，等待新图片加载
          toast.success(t("success"));
        } else {
          throw new Error("No image URL in result");
        }
      } else if (state === "fail") {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setLoading(false);
        const errorMessage = failMsg || failCode || "Generation failed";
        setError(errorMessage);
        toast.error(errorMessage);
      }
      // waiting 状态继续轮询
    } catch (e: any) {
      console.error("Poll task status failed:", e);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setLoading(false);
      setError(e.message || "Failed to query task status");
      toast.error(e.message || t("query_failed"));
    }
  };

  // 开始轮询
  const startPolling = (taskId: string) => {
    // 立即查询一次
    pollTaskStatus(taskId);

    // 每 2 秒轮询一次
    pollingIntervalRef.current = setInterval(() => {
      pollTaskStatus(taskId);
    }, 2000);
  };

  // 创建生成任务
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error(t("prompt_required"));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setImageUrl(null);
      setTaskId(null);

      // 清理之前的轮询
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      const response = await fetch("/api/generate-coloring-page", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspect_ratio: aspectRatio,
        }),
      });

      let result;
      try {
        result = await response.json();
      } catch (e) {
        throw new Error(
          `Request failed with status: ${response.status}. Failed to parse response.`
        );
      }

      if (!response.ok) {
        throw new Error(result.message || `Request failed with status: ${response.status}`);
      }

      const { code, message, data } = result;

      if (code !== 0) {
        throw new Error(message || "Failed to create task");
      }

      const newTaskId = data.taskId;
      setTaskId(newTaskId);

      // 开始轮询
      startPolling(newTaskId);
    } catch (e: any) {
      console.error("Generate failed:", e);
      setLoading(false);
      setError(e.message || "Failed to generate coloring page");
      toast.error(e.message || t("generate_failed"));
    }
  };

  // 使用建议提示词
  const handleSuggestionClick = (suggestion: typeof SUGGESTIONS[0]) => {
    const translatedPrompt = t(`suggestions.${suggestion.key}`);
    setPrompt(translatedPrompt);
    setSelectedSuggestion(suggestion.key);
  };

  // 渲染比例图标
  const renderAspectRatioIcon = (ratio: AspectRatio) => {
    const iconSize = 16;
    const cornerRadius = 1.5; // 圆角半径
    switch (ratio) {
      case "3:2":
        // 横向长方形
        return (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mr-1"
          >
            <rect
              x="2"
              y="5"
              width="12"
              height="6"
              rx={cornerRadius}
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        );
      case "1:1":
        // 正方形
        return (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mr-1"
          >
            <rect
              x="4"
              y="4"
              width="8"
              height="8"
              rx={cornerRadius}
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        );
      case "2:3":
        // 竖向长方形
        return (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mr-1"
          >
            <rect
              x="5"
              y="2"
              width="6"
              height="12"
              rx={cornerRadius}
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  // 处理图片加载完成，计算实际宽高比
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      const ratio = img.naturalWidth / img.naturalHeight;
      setImageAspectRatio(ratio);
    }
  };

  const displayImageUrl = imageUrl || DEFAULT_IMAGE_URL;
  const isDefaultImage = !imageUrl;
  
  // 根据图片宽高比或默认值设置容器样式
  const containerStyle: React.CSSProperties = imageAspectRatio
    ? { aspectRatio: imageAspectRatio.toString() }
    : {};

  return (
    <div className="container py-8 md:py-16">
      <div className="mb-8 text-center">
        <h1 className="mb-3 text-3xl font-bold md:text-4xl lg:text-5xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground/70 text-lg">{t("description")}</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* 左侧：图片展示区 */}
        <div className="order-1 md:order-1">
          <div
            className="relative w-full overflow-hidden rounded-lg border bg-muted"
            style={{
              ...containerStyle,
              minHeight: imageAspectRatio ? "auto" : "400px",
              aspectRatio: imageAspectRatio
                ? imageAspectRatio.toString()
                : "1 / 1",
            }}
          >
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">{t("loading")}</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center p-8">
                <div className="text-center">
                  <p className="mb-4 text-destructive">{error}</p>
                  <Button onClick={handleGenerate} variant="outline">
                    {t("try_again")}
                  </Button>
                </div>
              </div>
            ) : (
              <Image
                src={displayImageUrl}
                alt="Coloring page"
                fill
                className="object-contain"
                unoptimized={!isDefaultImage}
                onLoad={handleImageLoad}
              />
            )}
          </div>

          {/* 建议提示词 */}
          <div className="mt-6 flex flex-wrap gap-3">
            {SUGGESTIONS.map((suggestion) => (
              <Button
                key={suggestion.key}
                variant={
                  selectedSuggestion === suggestion.key ? "default" : "outline"
                }
                size="sm"
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={loading}
                className={
                  selectedSuggestion === suggestion.key
                    ? "bg-primary text-primary-foreground"
                    : ""
                }
              >
                {t(`suggestions.${suggestion.key}`)}
              </Button>
            ))}
          </div>
        </div>

        {/* 右侧：输入控制区 */}
        <div className="order-2 md:order-2">
          <div className="space-y-4">
            {/* 提示词输入容器 - 包含输入框和按钮 */}
            <div className="relative flex flex-col rounded-md border-2 border-input bg-background shadow-xs focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
              <Textarea
                id="prompt"
                placeholder={t("prompt_placeholder")}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !loading) {
                    handleGenerate();
                  }
                }}
                disabled={loading}
                className="min-h-[168px] resize-none border-0 bg-transparent px-3 pt-3 pb-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0 md:text-sm"
              />
              
              {/* 图片比例选择 */}
              <div className="flex gap-2 px-3 pb-3">
                <Button
                  type="button"
                  variant={aspectRatio === "3:2" ? "default" : "outline"}
                  onClick={() => setAspectRatio("3:2")}
                  disabled={loading}
                  size="sm"
                  className="h-8 w-auto px-3"
                >
                  {renderAspectRatioIcon("3:2")}
                  {t("aspect_ratio_default")}
                </Button>
                <Button
                  type="button"
                  variant={aspectRatio === "1:1" ? "default" : "outline"}
                  onClick={() => setAspectRatio("1:1")}
                  disabled={loading}
                  size="sm"
                  className="h-8 w-auto px-3"
                >
                  {renderAspectRatioIcon("1:1")}
                  {t("aspect_ratio_square")}
                </Button>
                <Button
                  type="button"
                  variant={aspectRatio === "2:3" ? "default" : "outline"}
                  onClick={() => setAspectRatio("2:3")}
                  disabled={loading}
                  size="sm"
                  className="h-8 w-auto px-3"
                >
                  {renderAspectRatioIcon("2:3")}
                  {t("aspect_ratio_portrait")}
                </Button>
              </div>
            </div>

            {/* 生成按钮 */}
            <div className="flex justify-center">
              <Button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                size="lg"
                className="w-auto px-6"
              >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("generating")}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t("generate_button")}
                </>
              )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

