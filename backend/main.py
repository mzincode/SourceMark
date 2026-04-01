"""
SourceMark Backend — AI PDF Highlighter
Uses Google Gemini (primary) + Groq (backup)
Both are free.
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF
import google.generativeai as genai
import json
import os
import time
import uuid
import httpx
from pathlib import Path
from dotenv import load_dotenv

# Load API keys
load_dotenv()
gemini_key = os.getenv("GEMINI_API_KEY")
groq_key = os.getenv("GROQ_API_KEY")

# Set up Gemini
if gemini_key:
    genai.configure(api_key=gemini_key)
    gemini_model = genai.GenerativeModel("gemini-2.5-flash")
    print("✅ Gemini API connected")
else:
    gemini_model = None
    print("⚠️  No Gemini key found")

# Set up Groq
groq_client = None
if groq_key:
    from groq import Groq
    groq_client = Groq(api_key=groq_key)
    print("✅ Groq API connected")
else:
    print("⚠️  No Groq key found")

if not gemini_model and not groq_client:
    print("⚠️ No API keys found. API calls will fail, but server will run.")

# Set up OpenRouter
openrouter_key = os.getenv("OPENROUTER_API_KEY")
if openrouter_key:
    print("✅ OpenRouter API connected")
else:
    print("⚠️  No OpenRouter key found")
# set up mistral
mistral_key = os.getenv("MISTRAL_API_KEY")
if mistral_key:
    print("✅ Mistral API connected")
else:
    print("⚠️  No Mistral key found")
# Track which API to use

current_api = "gemini" if gemini_model else "groq"

# Create the app
app = FastAPI(title="SourceMark API")

app.add_middleware(
    CORSMiddleware,
allow_origins=[
    "http://localhost:3000",
    "https://sourcemark.vercel.app",
    "https://sourcemark-production.up.railway.app",
],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Highlights", "X-Results"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR = Path("outputs")
OUTPUT_DIR.mkdir(exist_ok=True)

COLOR_MAP = {
    "yellow": (1, 1, 0),
    "green": (0, 1, 0.4),
    "pink": (1, 0, 0.67),
    "cyan": (0, 0.94, 1),
}


def extract_and_chunk(pdf_path, max_chars=20000):
    """Pull text out of a PDF and split into chunks."""
    doc = fitz.open(pdf_path)
    chunks = []
    current = ""
    current_pages = []

    for i in range(len(doc)):
        text = doc[i].get_text()
        if not text.strip():
            continue
        header = f"\n--- PAGE {i + 1} ---\n"
        if len(current) + len(header) + len(text) > max_chars:
            if current:
                chunks.append({"text": current, "pages": current_pages[:]})
            current = header + text
            current_pages = [i]
        else:
            current += header + text
            current_pages.append(i)

    if current:
        chunks.append({"text": current, "pages": current_pages[:]})

    doc.close()
    return chunks


def call_gemini(prompt):
    """Send a prompt to Gemini and return the text response."""
    response = gemini_model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.1,
            max_output_tokens=2000,
        ),
    )
    return response.text.strip()


def call_groq(prompt):
    """Send a prompt to Groq and return the text response."""
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "You find exact phrases in academic text. Return only valid JSON arrays.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.1,
        max_tokens=2000,
    )
    return response.choices[0].message.content.strip()

def call_openrouter(prompt):
    """Send a prompt to OpenRouter and return the text response."""
    response = httpx.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {openrouter_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": "qwen/qwen3.6-plus-preview",
            "messages": [
                {
                    "role": "system",
                    "content": "You find exact phrases in academic text. Return only valid JSON arrays.",
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.1,
            "max_tokens": 2000,
        },
        timeout=30,
    )
    data = response.json()
    if "choices" not in data:
        raise Exception(f"OpenRouter error: {data}")
    return data["choices"][0]["message"]["content"].strip()

def call_mistral(prompt):
    response = httpx.post(
        "https://api.mistral.ai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {mistral_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": "mistral-small-latest",
            "messages": [
                {"role": "system", "content": "You find exact phrases in academic text. Return only valid JSON arrays."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.1,
            "max_tokens": 2000,
        },
        timeout=30,
    )
    return response.json()["choices"][0]["message"]["content"].strip()

def call_ai(prompt):
    """Try Gemini first, then Groq, then OpenRouter."""
    global current_api

    if gemini_model and current_api == "gemini":
        try:
            return call_gemini(prompt)
        except Exception as e:
            error_str = str(e).lower()
            if "429" in str(e) or "quota" in error_str or "resource" in error_str:
                print("  ⚡ Gemini rate limited, switching to Groq")
                current_api = "groq"
            else:
                print(f"  ⚠️ Gemini error: {e}")
                if groq_client:
                    current_api = "groq"
                else:
                    raise

    if groq_client and current_api == "groq":
        try:
            result = call_groq(prompt)
            return result
        except Exception as e:
            error_str = str(e).lower()
            if "429" in str(e) or "rate" in error_str:
                print("  ⚡ Groq rate limited, switching to Mistral")
                current_api = "mistral"
            else:
                raise

    if openrouter_key and current_api == "openrouter":
        try:
            result = call_openrouter(prompt)
            print("  ✅ OpenRouter responded")
            return result
        except Exception as e:
            print(f"  ❌ OpenRouter error: {e}")
            raise
    if mistral_key and current_api == "mistral":
        try:
            result = call_mistral(prompt)
            print("  ✅ Mistral responded")
            return result
        except Exception as e:
            print(f"  ❌ Mistral error: {e}")
            raise
    raise Exception("No AI API available")


def find_phrases(chunk_text, topic_description, retry=0):
    """Ask AI to find exact phrases matching a topic."""
    prompt = f"""Find EXACT phrases from the text below that relate to:

{topic_description}

RULES:
1. Return ONLY phrases that appear EXACTLY in the text
2. Each phrase: 8-30 words long
3. Do NOT paraphrase or change any words
4. Return a JSON array of strings
5. If nothing relevant exists, return: []

TEXT:
{chunk_text}

Return ONLY the JSON array:"""

    try:
        content = call_ai(prompt)

        # Find the JSON array
        start = content.find("[")
        end = content.rfind("]") + 1
        if start != -1 and end > start:
            content = content[start:end]

        phrases = json.loads(content)
        return [p for p in phrases if isinstance(p, str) and len(p) > 15]

    except json.JSONDecodeError:
        if retry < 2:
            time.sleep(2)
            return find_phrases(chunk_text, topic_description, retry + 1)
        return []
    except Exception as e:
        if retry < 2:
            time.sleep(5)
            return find_phrases(chunk_text, topic_description, retry + 1)
        print(f"  ❌ API error: {e}")
        return []


def verify_phrases(doc, phrases):
    """Check which phrases exist in the PDF. Try multiple strategies."""
    verified = []

    for phrase in phrases:
        found = False

        # Strategy 1: Try the exact phrase
        for page_num in range(len(doc)):
            if doc[page_num].search_for(phrase):
                verified.append(phrase)
                found = True
                break

        if found:
            continue

        # Strategy 2: Try progressively shorter fragments from the start
        words = phrase.split()
        for length in range(min(len(words), 15), 3, -1):
            fragment = " ".join(words[:length])
            for page_num in range(len(doc)):
                if doc[page_num].search_for(fragment):
                    verified.append(fragment)
                    found = True
                    break
            if found:
                break

        if found:
            continue

        # Strategy 3: Try fragments from the end
        for length in range(min(len(words), 15), 3, -1):
            fragment = " ".join(words[-length:])
            for page_num in range(len(doc)):
                if doc[page_num].search_for(fragment):
                    verified.append(fragment)
                    found = True
                    break
            if found:
                break

        if found:
            continue

        # Strategy 4: Try middle fragments
        if len(words) > 8:
            mid = len(words) // 2
            for length in range(min(len(words), 10), 3, -1):
                start_idx = max(0, mid - length // 2)
                fragment = " ".join(words[start_idx : start_idx + length])
                for page_num in range(len(doc)):
                    if doc[page_num].search_for(fragment):
                        verified.append(fragment)
                        found = True
                        break
                if found:
                    break

    return list(set(verified))


def highlight_pdf(doc, phrases, color):
    """Add colored highlights to the PDF."""
    count = 0
    for page_num in range(len(doc)):
        page = doc[page_num]
        for phrase in phrases:
            for rect in page.search_for(phrase):
                annot = page.add_highlight_annot(rect)
                annot.set_colors(stroke=color)
                annot.update()
                count += 1
    return count


# ── API Endpoints ─────────────────────────────────────

@app.get("/")
def root():
    return {
        "name": "SourceMark API",
        "status": "running",
        "active_api": current_api,
    }


@app.post("/api/highlight")
async def highlight_document(
    file: UploadFile = File(...),
    topics: str = Form(...),
):
    """Upload PDF + topics, get highlighted PDF back."""
    global current_api

    print(f"\n{'='*50}")
    print(f"📄 Processing: {file.filename}")
    print(f"🤖 Using: {current_api}")

    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files accepted")

    try:
        topic_list = json.loads(topics)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid topics format")

    if not topic_list:
        raise HTTPException(400, "At least one topic required")

    job_id = str(uuid.uuid4())[:8]
    input_path = UPLOAD_DIR / f"{job_id}_{file.filename}"
    output_path = OUTPUT_DIR / f"{job_id}_highlighted_{file.filename}"

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 50MB)")

    with open(input_path, "wb") as f:
        f.write(content)

    try:
        print("📖 Extracting text...")
        chunks = extract_and_chunk(str(input_path))
        print(f"   {len(chunks)} chunks")

        if not chunks:
            raise HTTPException(400, "Could not extract text from PDF")

        doc = fitz.open(str(input_path))
        total_highlights = 0
        results = []

        for topic in topic_list:
            topic_name = topic.get("name", "Unknown")
            topic_desc = topic.get("description", "")
            color_name = topic.get("color", "yellow")
            color = COLOR_MAP.get(color_name, COLOR_MAP["yellow"])

            if not topic_desc:
                continue

            print(f"\n  🎯 {topic_name} ({color_name})")

            all_phrases = []
            for i, chunk in enumerate(chunks):
                print(f"    Chunk {i + 1}/{len(chunks)}...", end=" ")
                phrases = find_phrases(chunk["text"], topic_desc)
                print(f"{len(phrases)} found [{current_api}]")
                all_phrases.extend(phrases)
                time.sleep(4)

            unique = list(set(all_phrases))
            print(f"    Unique: {len(unique)}")
            verified = verify_phrases(doc, unique)
            print(f"    Verified: {len(verified)}")

            count = 0
            if verified:
                count = highlight_pdf(doc, verified, color)
                total_highlights += count
                print(f"    ✅ Highlighted: {count}")

            results.append({
                "topic": topic_name,
                "color": color_name,
                "highlights": count,
            })

        doc.save(str(output_path))
        doc.close()

        print(f"\n📊 Total: {total_highlights} highlights")

        return FileResponse(
            path=str(output_path),
            filename=f"highlighted_{file.filename}",
            media_type="application/pdf",
            headers={
                "X-Total-Highlights": str(total_highlights),
                "X-Results": json.dumps(results),
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        error_str = str(e).lower()
        if "429" in str(e) or "quota" in error_str or "rate" in error_str:
            print("⚡ Rate limited across all APIs")
            raise HTTPException(
                429,
                "Too many users are currently running this. Come back in a few minutes!"
            )
        print(f"❌ Error: {e}")
        raise HTTPException(500, f"Processing error: {str(e)}")
    finally:
        if input_path.exists():
            input_path.unlink()


@app.post("/api/detect-topics")
async def detect_topics(file: UploadFile = File(...)):
    """Auto-detect what topics a PDF covers."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files accepted")

    job_id = str(uuid.uuid4())[:8]
    temp_path = UPLOAD_DIR / f"{job_id}_{file.filename}"

    with open(temp_path, "wb") as f:
        f.write(await file.read())

    try:
        chunks = extract_and_chunk(str(temp_path))
        sample = chunks[0]["text"][:8000]

        prompt = f"""What topics does this academic paper cover?
Return a JSON array of short topic descriptions (max 8).
Example: ["sleep quality and circadian rhythms", "eye strain from screens"]

TEXT:
{sample}

JSON array:"""

        content = call_ai(prompt)
        start = content.find("[")
        end = content.rfind("]") + 1
        topics = json.loads(content[start:end])

        return {"filename": file.filename, "detected_topics": topics}

    except Exception as e:
        raise HTTPException(500, f"Detection failed: {str(e)}")
    finally:
        if temp_path.exists():
            temp_path.unlink()