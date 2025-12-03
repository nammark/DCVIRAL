
import { GoogleGenAI, Type } from "@google/genai";
import { Slide, ViralContent } from "../types";

const COOKIE_NAME = 'user_gemini_api_key';

export const getStoredApiKey = (): string | null => {
  const match = document.cookie.match(new RegExp('(^| )' + COOKIE_NAME + '=([^;]+)'));
  if (match) return match[2];
  return null;
};

export const setStoredApiKey = (key: string) => {
  // Set cookie for 7 days
  document.cookie = `${COOKIE_NAME}=${key}; path=/; max-age=${60 * 60 * 24 * 7}`;
};

export const removeStoredApiKey = () => {
  document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
};

// Helper to ensure we have an API key
const getClient = () => {
  // Priority: 1. User Custom Key (Cookie), 2. System Env Key
  const customKey = getStoredApiKey();
  const envKey = process.env.API_KEY;
  const apiKey = customKey || envKey;

  if (!apiKey) {
    throw new Error("Thiếu API Key. Vui lòng nhập API Key cá nhân trong phần Cài đặt (biểu tượng chìa khóa) để sử dụng.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateViralPlan = async (topic: string, referenceImages: string[] = []): Promise<ViralContent> => {
  const ai = getClient();

  const basePrompt = `
    Bạn là một chuyên gia sáng tạo nội dung Viral trên mạng xã hội (Facebook, Instagram, LinkedIn).
    Nhiệm vụ: Tạo nội dung cho chủ đề: "${topic}".
    
    ${referenceImages.length > 0 ? "Tôi có đính kèm các ảnh mẫu tham khảo. Hãy phân tích phong cách, tone mood hoặc nội dung của ảnh (nếu có thể nhìn thấy text) để tạo nội dung phù hợp với phong cách đó." : ""}

    Yêu cầu đầu ra (JSON):
    1. caption: Viết một caption Facebook ngắn gọn (khoảng 5-6 dòng), cực kỳ thu hút (hook), gây tò mò, sử dụng emoji phù hợp, văn phong tự nhiên, kích thích tương tác (Like, Share, Comment).
    2. slides: Một danh sách các slide cho dạng bài viết Carousel (ảnh trượt).
       - Slide đầu tiên PHẢI là slide tiêu đề (type='intro'). Tiêu đề phải ngắn, giật gân, hoặc hứa hẹn giá trị lớn.
       - Các slide tiếp theo (type='content') là hướng dẫn chi tiết hoặc các bước thực hiện. Mỗi slide có tiêu đề và nội dung dạng gạch đầu dòng ngắn gọn.
       - Nội dung trong mỗi slide cần cô đọng, súc tích để đảm bảo hiển thị đẹp trên ảnh vuông.
       - Tổng số slide nên từ 4 đến 8 slide.
  `;

  // Define the schema for structured JSON output
  const schema = {
    type: Type.OBJECT,
    properties: {
      caption: {
        type: Type.STRING,
        description: "Nội dung caption cho bài đăng, 5-6 dòng, hấp dẫn.",
      },
      slides: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Tiêu đề của slide ảnh" },
            content: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Các ý chính trong slide (gạch đầu dòng)",
            },
            type: { 
                type: Type.STRING, 
                enum: ["intro", "content"],
                description: "Loại slide: 'intro' cho bìa, 'content' cho nội dung" 
            },
          },
          required: ["title", "content", "type"],
        },
      },
    },
    required: ["caption", "slides"],
  };

  try {
    let requestContents: any;

    if (referenceImages.length > 0) {
      // Multimodal Request
      const parts = referenceImages.map(base64Data => ({
        inlineData: {
          mimeType: 'image/png', // Assuming PNG or JPEG, GenAI handles standard types well
          data: base64Data.split(',')[1] || base64Data // Remove data URL prefix if present
        }
      }));
      
      parts.push({ text: basePrompt } as any);
      
      requestContents = { parts };
    } else {
      // Text only request
      requestContents = basePrompt;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: requestContents,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7, // Slightly creative
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const parsedData = JSON.parse(text);
    
    // Add IDs to slides for React keys and initialize images array
    const slidesWithIds = parsedData.slides.map((s: any, index: number) => ({
      ...s,
      id: `slide-${Date.now()}-${index}`,
      images: [] // Initialize empty images array
    }));

    return {
      caption: parsedData.caption,
      slides: slidesWithIds,
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
