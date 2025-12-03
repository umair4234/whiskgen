export interface AppConfig {
  bearerToken: string;
  sessionToken: string;
  workflowId: string;
}

export enum AspectRatio {
  LANDSCAPE = "IMAGE_ASPECT_RATIO_LANDSCAPE",
  PORTRAIT = "IMAGE_ASPECT_RATIO_PORTRAIT",
  SQUARE = "IMAGE_ASPECT_RATIO_SQUARE",
}

export enum JobStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  SUCCESS = "success",
  FAILED = "failed",
}

export interface GenerationJob {
  id: string;
  prompt: string;
  status: JobStatus;
  imageUrl?: string; // Base64 or URL
  error?: string;
  timestamp: number;
}

export interface WhiskImageSettings {
  imageModel: string;
  aspectRatio: AspectRatio;
}

export interface WhiskClientContext {
  workflowId: string;
  tool: string;
  sessionId: string;
}

// API Response Types (simplified for internal use)
export interface WhiskGenerationResponse {
  imagePanels?: {
    generatedImages?: {
      encodedImage: string;
    }[];
  }[];
}

export interface UploadMediaResponse {
  result: {
    data: {
      json: {
        result: {
          uploadMediaGenerationId: string;
        };
      };
    };
  };
}