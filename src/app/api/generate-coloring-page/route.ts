import { respData, respErr } from "@/lib/resp";

const API_KEY = "f2d873bf3ff6738325f1d67896c6287d";
const API_BASE_URL = "https://api.kie.ai/api/v1";

// 创建生成任务
export async function POST(req: Request) {
  try {
    const { prompt, aspect_ratio } = await req.json();

    if (!prompt) {
      return respErr("prompt is required");
    }

    // 构建完整的 prompt
    const fullPrompt = `Black & white refined lineart ${prompt}, elegant mood, 6–8 detailed elements, crisp high-contrast outlines, coloring-book style. --stylize 750 --no watermarks --no signature`;

    const response = await fetch(`${API_BASE_URL}/jobs/createTask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-image/1.5-text-to-image",
        input: {
          prompt: fullPrompt,
          aspect_ratio: aspect_ratio || "3:2",
          quality: "medium",
        },
      }),
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      return respErr(
        `API request failed with status: ${response.status}. Failed to parse response.`
      );
    }

    if (!response.ok) {
      return respErr(
        data.msg || data.message || `API request failed with status: ${response.status}`
      );
    }

    if (data.code !== 200) {
      return respErr(data.msg || data.message || "Failed to create task");
    }

    return respData({
      taskId: data.data.taskId,
    });
  } catch (e) {
    console.error("create task failed:", e);
    return respErr("Failed to create task");
  }
}

// 查询任务状态
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return respErr("taskId is required");
    }

    const response = await fetch(
      `${API_BASE_URL}/jobs/recordInfo?taskId=${taskId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );

    let data;
    try {
      data = await response.json();
    } catch (e) {
      return respErr(
        `API request failed with status: ${response.status}. Failed to parse response.`
      );
    }

    if (!response.ok) {
      return respErr(
        data.msg || data.message || `API request failed with status: ${response.status}`
      );
    }

    if (data.code !== 200) {
      return respErr(data.msg || data.message || "Failed to query task");
    }

    const taskData = data.data;
    let resultUrls: string[] = [];

    // 解析 resultJson
    if (taskData.state === "success" && taskData.resultJson) {
      try {
        const resultJson = JSON.parse(taskData.resultJson);
        resultUrls = resultJson.resultUrls || [];
      } catch (e) {
        console.error("Failed to parse resultJson:", e);
      }
    }

    return respData({
      taskId: taskData.taskId,
      state: taskData.state,
      resultUrls,
      failCode: taskData.failCode || null,
      failMsg: taskData.failMsg || null,
    });
  } catch (e) {
    console.error("query task failed:", e);
    return respErr("Failed to query task");
  }
}

