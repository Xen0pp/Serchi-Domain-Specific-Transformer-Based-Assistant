import torch
import threading
import os
import re
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer
from dotenv import load_dotenv

load_dotenv()
MODEL_ID = os.getenv("MODEL_ID", "Xen0pp/SmolLM-ML-Planner-500-V3")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_CACHE_DIR = os.path.join(BASE_DIR, "models")

SYSTEM_PROMPT = "You are an expert ML project planning advisor. Provide clear, structured, well-formatted markdown answers with numbered lists, bullet points, and code blocks where appropriate."

app = FastAPI(title="Serchi Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
tokenizer = None
model_status = "downloading"
device = "cpu"

def detect_device() -> str:
    if torch.backends.mps.is_available():
        return "mps"
    elif torch.cuda.is_available():
        return "cuda"
    return "cpu"

def load_model():
    global model, tokenizer, model_status, device
    try:
        model_status = "downloading"
        print(f"📦 Model target: {MODEL_ID}")
        print(f"📂 Local project storage directory: {MODEL_CACHE_DIR}")

        os.makedirs(MODEL_CACHE_DIR, exist_ok=True)

        tokenizer = AutoTokenizer.from_pretrained(
            MODEL_ID,
            cache_dir=MODEL_CACHE_DIR
        )
        if tokenizer.pad_token_id is None:
            tokenizer.pad_token_id = tokenizer.eos_token_id

        model_status = "loading"
        device = detect_device()
        print(f"🚀 Initializing model parameters on hardware device: {device.upper()}")

        dtype = torch.float32 if device == "cpu" else torch.float16

        m = AutoModelForCausalLM.from_pretrained(
            MODEL_ID,
            torch_dtype=dtype,
            low_cpu_mem_usage=True,
            cache_dir=MODEL_CACHE_DIR,
        )
        if device in ("mps", "cuda"):
            model = m.to(device)
        else:
            model = m

        model.eval()

        print("🔥 Running model warm-up pass...")
        with torch.no_grad():
            dummy = tokenizer("Hello", return_tensors="pt")
            dummy_ids = dummy["input_ids"].to(device)
            _ = model.generate(dummy_ids, max_new_tokens=3, do_sample=False)
        print("✅ Warm-up complete! Model ready for inference.")

        model_status = "ready"
    except Exception as e:
        model_status = "error"
        print(f"❌ Model load error: {e}")

threading.Thread(target=load_model, daemon=True).start()

@app.get("/api/status")
def status():
    return {"status": model_status, "cache_dir": MODEL_CACHE_DIR}

@app.post("/api/chat")
async def chat(request: Request):
    if model_status != "ready" or model is None or tokenizer is None:
        return StreamingResponse(
            iter([f"data: [ERROR] Model is not ready (status: {model_status}).\n\n"]),
            media_type="text/event-stream",
        )

    body = await request.json()
    messages = body.get("messages", [])

    system = {"role": "system", "content": SYSTEM_PROMPT}
    full_messages = [system] + messages

    try:
        inputs = tokenizer.apply_chat_template(
            full_messages,
            return_tensors="pt",
            return_dict=True,
            add_generation_prompt=True,
        )
        if isinstance(inputs, torch.Tensor):
            input_ids = inputs.to(device)
            attention_mask = None
        else:
            input_ids = inputs["input_ids"].to(device)
            attn = inputs.get("attention_mask")
            attention_mask = attn.to(device) if attn is not None else None
    except Exception as e:
        print(f"⚠️ Chat template fallback: {e}")
        prompt_text = f"System: {SYSTEM_PROMPT}\n"
        for m in messages:
            role = m.get("role", "user").capitalize()
            content = m.get("content", "")
            prompt_text += f"{role}: {content}\n"
        prompt_text += "Assistant:"
        encoded = tokenizer(prompt_text, return_tensors="pt")
        input_ids = encoded["input_ids"].to(device)
        attention_mask = encoded["attention_mask"].to(device)

    streamer = TextIteratorStreamer(
        tokenizer, skip_prompt=True, skip_special_tokens=True
    )

    gen_kwargs = dict(
        input_ids=input_ids,
        attention_mask=attention_mask,
        max_new_tokens=1024,
        temperature=0.2,
        top_p=0.9,
        repetition_penalty=1.1,
        do_sample=True,
        eos_token_id=tokenizer.eos_token_id,
        pad_token_id=tokenizer.pad_token_id or tokenizer.eos_token_id,
        streamer=streamer,
    )

    def generate_worker():
        try:
            with torch.no_grad():
                model.generate(**gen_kwargs)
        except Exception as err:
            print(f"❌ generate() error: {err}")
            streamer.end()

    thread = threading.Thread(target=generate_worker, daemon=True)
    thread.start()

    def token_generator():
        for token in streamer:
            clean = re.sub(r"<\|im_(start|end)\|>|</?s>", "", token)
            if clean:
                escaped = clean.replace("\n", "\\n")
                yield f"data: {escaped}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        token_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
