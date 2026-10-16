
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# Lightweight model for comparing sentence meanings.
# The model downloads automatically on first use.
_model = None


def get_model():
    global _model

    if _model is None:
        _model = SentenceTransformer(
            "sentence-transformers/all-MiniLM-L6-v2"
        )

    return _model


def calculate_drift(original_response: str,
                    counterfactual_response: str) -> dict:
    """Calculate semantic drift between two AI responses."""

    if not original_response.strip() or not counterfactual_response.strip():
        raise ValueError("Both responses must contain text.")

    model = get_model()

    embeddings = model.encode([
        original_response,
        counterfactual_response
    ])

    similarity = float(
        cosine_similarity(
            [embeddings[0]],
            [embeddings[1]]
        )[0][0]
    )

    # Clamp floating-point results to the expected range.
    similarity = max(0.0, min(1.0, similarity))
    score = round(1.0 - similarity, 4)

    # Initial project-defined thresholds; these can be calibrated later.
    if score < 0.20:
        level = "Low"
    elif score < 0.40:
        level = "Moderate"
    else:
        level = "High"

    return {
        "score": score,
        "level": level,
        "similarity": round(similarity, 4)
    }
