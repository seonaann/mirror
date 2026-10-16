
import os
import json

from backend.drift import calculate_drift
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google import genai

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


LABELS = [
    "gender",
    "caregiver_role",
    "decision_authority",
    "socioeconomic_class",
    "none"
]

api_key = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL")

client = genai.Client(api_key=api_key) if api_key else None


def predict_bias_mock(text: str) -> dict:
    """Temporary placeholder until the trained classifier is available."""
    probabilities = {label: 0.0 for label in LABELS}
    probabilities["none"] = 1.0

    return {
        "bias_detected": False,
        "label": "none",
        "confidence": 0.0,
        "highlighted_cue": None,
        "probabilities": probabilities
    }


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
    prediction = predict_bias_mock(request.response)

    counterfactual = {
        "prompt": None,
        "response": None,
        "bias_detected": None,
        "label": None,
        "status": "pending"
    }

    drift_score = {
        "score": None,
        "level": "pending"
    }

    # Step 1: Generate the counterfactual using Gemini
    try:
        generated = generate_counterfactual(
            request.prompt,
            request.response
        )

        counterfactual = {
            "prompt": generated["prompt"],
            "response": generated["response"],
            "bias_detected": None,
            "label": None,
            "status": "generated_classifier_pending"
        }

    except Exception as exc:
        print("Counterfactual generation failed:", exc)
        counterfactual["status"] = "generation_failed"

    # Step 2: Calculate semantic drift if generation succeeded
    if counterfactual["status"] == "generated_classifier_pending":
        try:
            drift_result = calculate_drift(
                request.response,
                counterfactual["response"]
            )

            drift_score = {
                "score": drift_result["score"],
                "level": drift_result["level"]
            }

        except Exception as exc:
            print("Drift calculation failed:", exc)

    # Step 3: Return the complete API response
    return {
        "bias_detected": prediction["bias_detected"],
        "label": prediction["label"],
        "confidence": prediction["confidence"],
        "highlighted_cue": prediction["highlighted_cue"],
        "probabilities": prediction["probabilities"],
        "counterfactual": counterfactual,
        "drift_score": drift_score,
        "status": "mock",
        "message": (
            "Gemini counterfactual generation and semantic drift "
            "calculation are integrated. Real bias classification "
            "is pending the trained model."
        )
    }
