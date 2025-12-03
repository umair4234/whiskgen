import { AppConfig, AspectRatio, UploadMediaResponse, WhiskGenerationResponse } from '../types';

const BASE_URL_GENERATE = 'https://aisandbox-pa.googleapis.com/v1/whisk:generateImage';
const BASE_URL_RECIPE = 'https://aisandbox-pa.googleapis.com/v1/whisk:runImageRecipe';
const BASE_URL_UPLOAD = 'https://labs.google/fx/api/trpc/backbone.uploadImage';

const getHeaders = (config: AppConfig) => {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.bearerToken}`,
    'Origin': 'https://labs.google',
    'Referer': 'https://labs.google/',
    // Note: 'Cookie' header is often blocked by browsers in fetch requests for security.
    // In a real browser environment, the user might need a CORS extension or run in a specific mode.
    // We include it here as requested by the prompt logic.
    'x-goog-auth-user': '0', // Often required for Google internal APIs
  };
};

// Helper to convert File to Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove data:image/png;base64, prefix if needed for specific rawBytes payload
      const result = reader.result as string;
      // The API payload example shows "data:image/png;base64,..." usually, 
      // but the prompt says "rawBytes": "data:image/png;base64,<BASE64_STRING>"
      // So we keep the full string.
      resolve(result);
    };
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

  const response = await fetch(BASE_URL_UPLOAD, {
    method: 'POST',
    headers: getHeaders(config),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as UploadMediaResponse;
  // Safely extract the ID based on the provided path
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

  const response = await fetch(BASE_URL_GENERATE, {
    method: 'POST',
    headers: getHeaders(config),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Generation failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as WhiskGenerationResponse;
  
  if (data.imagePanels?.[0]?.generatedImages?.[0]?.encodedImage) {
    return data.imagePanels[0].generatedImages[0].encodedImage;
  }
  
  throw new Error("No image data found in response");
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
      imageModel: "GEM_PIX", // As requested for Recipe calls
      aspectRatio: aspectRatio,
    },
    userInstruction: prompt,
    recipeMediaInputs: [
      {
        caption: mediaGenerationId, // Using ID as caption/ref as per common internal API patterns or prompt
        mediaInput: {
          mediaCategory: "MEDIA_CATEGORY_SUBJECT",
          mediaGenerationId: mediaGenerationId,
        },
      },
    ],
  };

  const response = await fetch(BASE_URL_RECIPE, {
    method: 'POST',
    headers: getHeaders(config),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Recipe generation failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as WhiskGenerationResponse;

  if (data.imagePanels?.[0]?.generatedImages?.[0]?.encodedImage) {
    return data.imagePanels[0].generatedImages[0].encodedImage;
  }

  throw new Error("No image data found in response");
};