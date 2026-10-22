// Turns OpenCode's prompt attachments into Claude content blocks. OpenCode inlines plain-text files itself and passes
// images and PDFs as file parts, base64 encoded.
import type { LanguageModelV3FilePart } from "@ai-sdk/provider";
import type { Content } from "./runtime.js";

type Block = Content[number];

type ImageType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

const IMAGE_TYPES: ReadonlyArray<ImageType> = ["image/png", "image/jpeg", "image/gif", "image/webp"];

export function attachmentBlock(part: LanguageModelV3FilePart): Block {
  const name = part.filename ?? "attachment";
  const image = IMAGE_TYPES.find((type) => type === part.mediaType);

  if (image !== undefined) {
    return {
      type: "image",
      source: part.data instanceof URL ? { type: "url", url: part.data.href } : { type: "base64", media_type: image, data: base64(part.data) },
    };
  }

  if (part.mediaType === "application/pdf") {
    return {
      type: "document",
      title: name,
      source: part.data instanceof URL ? { type: "url", url: part.data.href } : { type: "base64", media_type: "application/pdf", data: base64(part.data) },
    };
  }

  return { type: "text", text: `[Attachment ${name} (${part.mediaType}) could not be passed to Claude Code]` };
}

function base64(data: string | Uint8Array) {
  return data instanceof Uint8Array ? Buffer.from(data).toString("base64") : data;
}
