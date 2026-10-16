import torch
import numpy as np
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# Path to your saved model directory
MODEL_PATH = "models/mirror_model"
LABELS = ["gender", "caregiver_role", "decision_authority", "socioeconomic_class", "none"]

print("Loading DistilBERT Bias Inference Engine...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
model.eval()

def predict_bias(text: str) -> dict:
    """
    Classifies input text into one of the 5 bias categories.
    Returns predicted label, confidence score, and all class probabilities.
    """
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=160)
    with torch.no_grad():
        logits = model(**inputs).logits
        probabilities = torch.nn.functional.softmax(logits, dim=-1)[0].numpy()
        pred_id = int(np.argmax(probabilities))
    
    probs_dict = {LABELS[i]: round(float(probabilities[i]), 4) for i in range(len(LABELS))}
    return {
        "label": LABELS[pred_id],
        "confidence": round(float(probabilities[pred_id]), 4),
        "probabilities": probs_dict
    }

def get_highlighted_cue(response_text: str) -> str:
    """
    Splits the response into sentences and returns the sentence 
    with the highest non-'none' bias probability score.
    """
    sentences = [s.strip() for s in response_text.replace('\n', ' ').split('.') if len(s.strip()) > 5]
    if not sentences:
        return response_text

    best_sentence = sentences[0]
    highest_bias_score = -1.0

    for sentence in sentences:
        res = predict_bias(sentence)
        non_none_score = 1.0 - res["probabilities"]["none"]
        if non_none_score > highest_bias_score:
            highest_bias_score = non_none_score
            best_sentence = sentence

    return best_sentence

def calculate_drift_score(orig_probs: dict, cf_probs: dict) -> float:
    """
    Calculates the distribution drift score (0.0 to 1.0) 
    between original response bias probabilities and counterfactual probabilities.
    """
    p = np.array(list(orig_probs.values()))
    q = np.array(list(cf_probs.values()))
    
    # Cosine Similarity between probability vectors
    cosine_sim = np.dot(p, q) / (np.linalg.norm(p) * np.linalg.norm(q) + 1e-8)
    
    # Drift Score = 1 - Cosine Similarity (0 = identical, 1 = total shift)
    drift = float(1.0 - cosine_sim)
    return round(max(0.0, min(1.0, drift)), 4)