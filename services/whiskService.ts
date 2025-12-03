import { AppConfig, AspectRatio, UploadMediaResponse, WhiskGenerationResponse } from '../types';

// Points to the Vercel Serverless Function paths
const API_BASE = '/api';

const getProxyHeaders = (config: AppConfig) => {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.bearerToken}`,
    // We send the session token in a custom header so the Proxy can build the Cookie
    'X-Session-Token': config.sessionToken 
  };
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const uploadReferenceImage = async (
  file: File,
  config: AppConfig
): Promise<string> => {
  const base64Data = await fileToBase64(file);
  const sessionId = Date.now().toString();

  const payload = {
    json: {
      clientContext: {
        workflowId: config.workflowId,
        sessionId: sessionId,
      },
      uploadMediaInput: {
        mediaCategory: "MEDIA_CATEGORY_SUBJECT",
        rawBytes: base64Data,
        caption: "",
      },
    },
  };

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: getProxyHeaders(config),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || `Upload failed: ${response.status}`);
  }

  const data = (await response.json()) as UploadMediaResponse;
  try {
    return data.result.data.json.result.uploadMediaGenerationId;
  } catch (e) {
    throw new Error("Failed to parse upload response structure");
  }
};

export const generateImageTextOnly = async (
  prompt: string,
  aspectRatio: AspectRatio,
  config: AppConfig
): Promise<string> => {
  const sessionId = Date.now().toString();

  const payload = {
    clientContext: {
      workflowId: config.workflowId,
      tool: "BACKBONE",
      sessionId: sessionId,
    },
    imageModelSettings: {
      imageModel: "IMAGEN_3_5",
      aspectRatio: aspectRatio,
    },
    prompt: prompt,
    mediaCategory: "MEDIA_CATEGORY_BOARD",
  };

  const response = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: getProxyHeaders(config),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || `Generation failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.image) return data.image;
  
  throw new Error("No image data returned from proxy");
};

export const generateImageWithRecipe = async (
  prompt: string,
  mediaGenerationId: string,
  aspectRatio: AspectRatio,
  config: AppConfig
): Promise<string> => {
  const sessionId = Date.now().toString();

  const payload = {
    clientContext: {
      workflowId: config.workflowId,
      tool: "BACKBONE",
      sessionId: sessionId,
    },
    imageModelSettings: {
      imageModel: "GEM_PIX",
      aspectRatio: aspectRatio,
    },
    userInstruction: prompt,
    recipeMediaInputs: [
      {
        caption: mediaGenerationId,
        mediaInput: {
          mediaCategory: "MEDIA_CATEGORY_SUBJECT",
          mediaGenerationId: mediaGenerationId,
        },
      },
    ],
  };

  const response = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: getProxyHeaders(config),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || `Recipe generation failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.image) return data.image;

  throw new Error("No image data returned from proxy");
};
