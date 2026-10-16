"""
MIRROR baseline: TF-IDF + logistic regression, 5-fold cross-validation.

    python data/train_baseline.py

Reads data/mirror_dataset_final.csv (uses its `fold` column), prints the scores,
then trains on all rows and saves models/baseline.joblib.
"""
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from sklearn.pipeline import make_pipeline

df = pd.read_csv("data/mirror_dataset_final.csv")
LABELS = ["gender", "caregiver_role", "decision_authority", "socioeconomic_class", "none"]


def make_model():
    return make_pipeline(
        TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True),
        LogisticRegression(max_iter=3000, class_weight="balanced"),
    )


oof = pd.Series(index=df.index, dtype=object)
scores = []
for k in sorted(df["fold"].unique()):
    train, test = df[df["fold"] != k], df[df["fold"] == k]
    model = make_model().fit(train["response"], train["label"])
    pred = model.predict(test["response"])
    oof.loc[test.index] = pred
    f1 = f1_score(test["label"], pred, average="macro")
    scores.append(f1)
    print(f"fold {k}: macro-F1 {f1:.3f}")

print(f"\nmacro-F1 over 5 folds: {np.mean(scores):.3f} +- {np.std(scores):.3f}")
print("\nPer-class results (all folds pooled):")
print(classification_report(df["label"], oof, labels=LABELS, digits=3))
print("Confusion matrix (rows = true, columns = predicted):")
print(pd.DataFrame(confusion_matrix(df["label"], oof, labels=LABELS), index=LABELS, columns=LABELS).to_string())
print("\nmacro-F1 by domain:")
for dom, g in df.groupby("domain"):
    print(f"  {dom}: {f1_score(g['label'], oof.loc[g.index], average='macro'):.3f}")

os.makedirs("models", exist_ok=True)
final = make_model().fit(df["response"], df["label"])
joblib.dump(final, "models/baseline.joblib")
print("\nSaved models/baseline.joblib")