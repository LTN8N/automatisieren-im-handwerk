import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const audio = formData.get("audio");

  if (!audio || !(audio instanceof Blob)) {
    return NextResponse.json(
      { error: "Keine Audiodatei übermittelt" },
      { status: 400 },
    );
  }

  if (audio.size === 0) {
    return NextResponse.json(
      { error: "Audiodatei ist leer" },
      { status: 400 },
    );
  }

  // Max 25 MB (Whisper API Limit)
  if (audio.size > 25 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Audiodatei zu groß (max. 25 MB)" },
      { status: 400 },
    );
  }

  try {
    const file = new File([audio], "aufnahme.webm", { type: "audio/webm" });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "de",
      response_format: "text",
    });

    return NextResponse.json({ text: transcription });
  } catch (err) {
    console.error("Whisper API Fehler:", err);
    return NextResponse.json(
      { error: "Transkription fehlgeschlagen. Versuch es nochmal." },
      { status: 500 },
    );
  }
}
