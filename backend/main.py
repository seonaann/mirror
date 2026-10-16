import os
import re
import json
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google import genai

from backend.drift import calculate_drift, get_model
from backend.inference import predict_bias

load_dotenv()

app = FastAPI(
    title="MIRROR API",
    description="Detect implicit demographic assumptions in AI responses",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=10000)
    response: str = Field(min_length=1, max_length=20000)


CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.35"))
MAX_CUE_SENTENCES = 12

api_key = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL")

client = genai.Client(api_key=api_key) if api_key else None

# Load the drift model at startup so the first request is not slow.
try:
    get_model()
except Exception as exc:
    print("Drift model warm-up failed:", exc)


def split_sentences(text: str) -> list:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [p.strip() for p in parts if len(p.strip()) >= 10]


def classify(text: str) -> dict:
    """Run the trained classifier and apply the confidence threshold."""
    result = predict_bias(text)
    label = result["label"]
    confidence = result["confidence"]
    detected = label != "none" and confidence >= CONFIDENCE_THRESHOLD

    return {
        "bias_detected": detected,
        "label": label if detected else "none",
        "confidence": confidence,
        "probabilities": result["probabilities"],
    }

def classify_long(text: str) -> dict:
    """Classify in chunks of 4 sentences; keep the most biased chunk."""
    sentences = split_sentences(text)
    chunks = [" ".join(sentences[i:i + 4]) for i in range(0, len(sentences), 4)]
    results = [classify(c) for c in (chunks[:6] or [text])]
    return max(results, key=lambda r: 1.0 - r["probabilities"]["none"])


def find_cue(text: str, label: str) -> Optional[str]:
    """Return the sentence the classifier most strongly ties to the label."""
    sentences = split_sentences(text)[:MAX_CUE_SENTENCES]

    if not sentences:
        return None
    if len(sentences) == 1:
        return sentences[0]

    best, best_score = None, 0.0
    for sentence in sentences:
        score = predict_bias(sentence)["probabilities"].get(label, 0.0)
        if score > best_score:
            best, best_score = sentence, score

    return best


def generate_counterfactual(prompt: str, response: str) -> dict:
    """Use Gemini to generate a counterfactual prompt and response."""

    if client is None or not GEMINI_MODEL:
        raise RuntimeError("Gemini configuration is missing.")

    instruction = f"""
You are helping generate a counterfactual for a research project
about implicit demographic assumptions in AI responses.

Original user prompt:
{prompt}

Original AI response:
{response}

Create a counterfactual that changes or removes the demographic,
family-role, socioeconomic, or decision-authority assumption
in the original response, where appropriate.

Requirements:
- Preserve the user's underlying goal.
- Do not introduce a new stereotype.
- Write a revised user prompt.
- Write a plausible, helpful AI response to that revised prompt.
- Return only a valid JSON object with exactly these string fields:
  "prompt" and "response".
"""

    result = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=instruction,
        config={
            "response_mime_type": "application/json"
        }
    )

    data = json.loads(result.text)

    if not isinstance(data.get("prompt"), str):
        raise ValueError("Gemini returned an invalid counterfactual prompt.")

    if not isinstance(data.get("response"), str):
        raise ValueError("Gemini returned an invalid counterfactual response.")

    if not data["prompt"].strip() or not data["response"].strip():
        raise ValueError("Gemini returned an empty counterfactual.")

    return data


@app.get("/")
def health_check():
    return {
        "status": "running",
        "message": "MIRROR backend is working!"
    }


@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    prediction = classify_long(request.response)

    cue = None
    if prediction["bias_detected"]:
        cue = find_cue(request.response, prediction["label"])

    counterfactual = {
        "prompt": None,
        "response": None,
        "bias_detected": None,
        "label": None,
        "status": "skipped_no_bias"
    }

    drift_score = {
        "score": None,
        "level": "pending"
    }

    if prediction["bias_detected"]:
        generated = None

        # Step 1: generate the counterfactual with Gemini
        try:
            generated = generate_counterfactual(
                request.prompt,
                request.response
            )
        except Exception as exc:
            print("Counterfactual generation failed:", exc)
            counterfactual["status"] = "generation_failed"

        if generated:
            counterfactual = {
                "prompt": generated["prompt"],
                "response": generated["response"],
                "bias_detected": None,
                "label": None,
                "status": "generated"
            }

            # Step 2: classify the counterfactual response
            try:
                cf_prediction = classify(generated["response"])
                counterfactual["bias_detected"] = cf_prediction["bias_detected"]
                counterfactual["label"] = cf_prediction["label"]
            except Exception as exc:
                print("Counterfactual classification failed:", exc)

            # Step 3: semantic drift between the two responses
            try:
                drift_result = calculate_drift(
                    request.response,
                    generated["response"]
                )
                drift_score = {
                    "score": drift_result["score"],
                    "level": drift_result["level"]
                }
            except Exception as exc:
                print("Drift calculation failed:", exc)

    return {
        "bias_detected": prediction["bias_detected"],
        "label": prediction["label"],
        "confidence": prediction["confidence"],
        "highlighted_cue": cue,
        "probabilities": prediction["probabilities"],
        "counterfactual": counterfactual,
        "drift_score": drift_score,
        "status": "ok"
    }