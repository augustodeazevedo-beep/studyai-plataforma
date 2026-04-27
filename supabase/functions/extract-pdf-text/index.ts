import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.25.76";

class SafeDOMMatrix {
  a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
  constructor(init?: number[]) {
    if (Array.isArray(init) && init.length >= 6) [this.a, this.b, this.c, this.d, this.e, this.f] = init;
  }
  multiply() { return this; }
  translate() { return this; }
  scale() { return this; }
  rotate() { return this; }
}

(globalThis as any).DOMMatrix ??= SafeDOMMatrix;
(globalThis as any).ImageData ??= class SafeImageData { constructor(public data: Uint8ClampedArray, public width: number, public height: number) {} };
(globalThis as any).Path2D ??= class SafePath2D {};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024;
const BUCKET = "study-materials";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const requestSchema = z.object({
  submissionId: z.string().uuid(),
  storagePath: z.string().trim().min(20).max(500),
  fileHash: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
});

const safeError = (code: string, message: string, stage = "backend_extraction") => ({
  success: false,
  code,
  stage,
  error: message,
});

const logFlow = (submissionId: string, userId: string, stage: string, status: string, metadata: Record<string, unknown> = {}, errorCode?: string, safeMessage?: string) => {
  console.log("pdf-processing", JSON.stringify({ submissionId, userId, stage, status, errorCode, safeMessage, metadata }));
};

const validatePdfBytes = (bytes: Uint8Array) => {
  if (bytes.byteLength <= 0) return safeError("empty_file", "O PDF está vazio.", "backend_validation");
  if (bytes.byteLength > MAX_PDF_SIZE_BYTES) return safeError("file_too_large", "O PDF excede o limite de 20MB.", "backend_validation");

  const header = new TextDecoder().decode(bytes.slice(0, 5));
  if (header !== "%PDF-") return safeError("invalid_signature", "O arquivo enviado não possui assinatura válida de PDF.", "backend_validation");

  const tailWindow = bytes.slice(Math.max(0, bytes.byteLength - 4096));
  const tail = new TextDecoder("latin1").decode(tailWindow);
  if (!tail.includes("%%EOF")) return safeError("corrupted_pdf", "O PDF parece estar corrompido ou incompleto.", "backend_validation");

  return null;
};

const sha256Hex = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let submissionId = "unknown";
  let userId = "unknown";

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse(safeError("unauthenticated", "Sessão não autenticada.", "auth"), 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return jsonResponse(safeError("invalid_session", "Sessão inválida.", "auth"), 401);
    userId = user.id;

    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success) return jsonResponse({ ...safeError("invalid_payload", "Dados inválidos para extrair o PDF.", "validation"), details: parsed.error.flatten().fieldErrors }, 400);

    const { storagePath, fileHash } = parsed.data;
    submissionId = parsed.data.submissionId;
    const expectedPath = `${user.id}/edital-submissions/${submissionId}.pdf`;
    const pathParts = storagePath.split("/");

    if (storagePath !== expectedPath || pathParts[0] !== user.id || pathParts[1] !== "edital-submissions" || pathParts[2] !== `${submissionId}.pdf`) {
      logFlow(submissionId, user.id, "ownership_check", "blocked", { storagePath, expectedPath }, "owner_mismatch", "Arquivo fora do caminho permitido.");
      return jsonResponse(safeError("owner_mismatch", "Este arquivo não pertence à sua submissão.", "ownership_check"), 403);
    }

    const { data: listedFiles, error: listError } = await supabase.storage.from(BUCKET).list(`${user.id}/edital-submissions`, { search: `${submissionId}.pdf`, limit: 2 });
    const matchingFile = listedFiles?.find((file) => file.name === `${submissionId}.pdf`);
    if (listError || !matchingFile) {
      logFlow(submissionId, user.id, "ownership_check", "blocked", { storagePath }, "file_not_owned_or_missing", "Arquivo não localizado no caminho do usuário.");
      return jsonResponse(safeError("file_not_found", "Não foi possível confirmar o arquivo da sua submissão.", "ownership_check"), 404);
    }

    logFlow(submissionId, user.id, "backend_extraction_started", "started", { storagePath, fileHash });

    const { data: fileData, error: downloadError } = await supabase.storage.from(BUCKET).download(storagePath);
    if (downloadError || !fileData) {
      logFlow(submissionId, user.id, "storage_download", "failed", { storagePath }, "file_not_found", "Não foi possível acessar o PDF.");
      return jsonResponse(safeError("file_not_found", "Não foi possível acessar o PDF enviado.", "storage_download"), 404);
    }

    const bytes = new Uint8Array(await fileData.arrayBuffer());
    const computedHash = await sha256Hex(bytes);
    if (fileHash && computedHash.toLowerCase() !== fileHash.toLowerCase()) {
      logFlow(submissionId, user.id, "hash_check", "blocked", { storagePath, expectedHash: fileHash, computedHash }, "hash_mismatch", "Hash do arquivo não confere com a submissão.");
      return jsonResponse(safeError("hash_mismatch", "O arquivo enviado não corresponde à submissão original.", "hash_check"), 409);
    }
    logFlow(submissionId, user.id, "hash_check", "success", { storagePath, fileHash: computedHash });
    const validationError = validatePdfBytes(bytes);
    if (validationError) {
      logFlow(submissionId, user.id, validationError.stage, "failed", { size: bytes.byteLength }, validationError.code, validationError.error);
      return jsonResponse(validationError, 400);
    }

    const pdfjsLib = await import("npm:pdfjs-dist@5.6.205/legacy/build/pdf.mjs");
    const loadingTask = pdfjsLib.getDocument({ data: bytes, useWorkerFetch: false, isEvalSupported: false, disableFontFace: true });
    const pdf = await loadingTask.promise;
    const pageTexts = [];

    for (let index = 1; index <= pdf.numPages; index += 1) {
      const page = await pdf.getPage(index);
      const content = await page.getTextContent();
      pageTexts.push(content.items.map((item: any) => item.str || "").join(" "));
    }

    const text = pageTexts.join("\n").replace(/\s+/g, " ").trim().slice(0, 15000);
    if (text.length < 20) {
      logFlow(submissionId, user.id, "backend_extraction_completed", "failed", { pages: pdf.numPages, textLength: text.length }, "no_text", "PDF sem texto extraível.");
      return jsonResponse(safeError("no_text", "Não encontrei texto suficiente no PDF. Ele pode estar escaneado ou protegido.", "backend_extraction"), 422);
    }

    logFlow(submissionId, user.id, "backend_extraction_completed", "success", { pages: pdf.numPages, textLength: text.length });
    return jsonResponse({ success: true, editalText: text, pages: pdf.numPages, textLength: text.length, submissionId });
  } catch (error) {
    console.error("extract-pdf-text error", { submissionId, userId, error });
    return jsonResponse(safeError("backend_unavailable", "Não foi possível extrair o PDF no backend. Tente novamente ou use Colar Texto.", "backend_extraction"), 500);
  }
});
