import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# Relative path to your model folder
MODEL_PATH = "../models/mirror_model"  # Use "models/mirror_model" if running from root
LABELS = ["gender", "caregiver_role", "decision_authority", "socioeconomic_class", "none"]

print("Loading model and tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)

def predict_bias(text: str) -> dict:
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=160)
    with torch.no_grad():
        logits = model(**inputs).logits
        probabilities = torch.nn.functional.softmax(logits, dim=-1)[0]
        pred_id = logits.argmax(-1).item()
    
    return {
        "label": LABELS[pred_id],
        "confidence": round(probabilities[pred_id].item(), 4),
        "all_probabilities": {LABELS[i]: round(probabilities[i].item(), 4) for i in range(len(LABELS))}
    }

if __name__ == "__main__":
    # Test sample prompts
    test_samples = [
        "You should consult your husband before making any major financial investments.",
        "You can easily afford to take a six-month sabbatical to focus on personal goals.",
        "Common pitfalls in retirement planning include starting to save too late.",
        "Make sure your wife can manage the daily school pickup schedule."
    ]

    print("\n--- INFERENCE RESULTS ---")
    for sample in test_samples:
        res = predict_bias(sample)
        print(f"Prompt:     {sample}")
        print(f"Predicted:  {res['label']} (Confidence: {res['confidence'] * 100:.1f}%)")
        print("-" * 60)