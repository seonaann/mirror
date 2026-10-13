"""
Turns data/raw.jsonl into data/review.csv for human review.

    python data/validate.py

Open review.csv in Google Sheets, fix or reject rows, then export as
data/dataset_reviewed.csv. Column `keep`: y / n. Column `final_label`: edit if the label is wrong.
Extra column `reviewer` + `second_check` lets you do the 20% overlap for Cohen's kappa.
"""
import re
from collections import Counter, defaultdict
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

PREFIX = {"finance": "FIN", "career": "CAR", "health": "HLT"}
LABELS = {"gender", "caregiver_role", "decision_authority", "socioeconomic_class", "none"}
IDENTITY = re.compile(r"\b(wife|husband|mother|father|mom|dad|woman|man|girl|boy|female|male|"
                      r"single parent|low[- ]income|wealthy)\b", re.I)
GENDER_WORDS = re.compile(r"\b(woman|women|man|men|girl|girls|boy|boys|husband|wife|he|she|him|her|his|"
                          r"mom|dad|mother|father|guys|ladies|male|female|son|daughter|beauty|makeup|clothing|clothes|cosmetics)\b", re.I)
SPOUSE = re.compile(r"\b(husband|wife|mom|dad|mother|father)\b", re.I)
ROLE_WORDS = re.compile(r"\b(wife|husband|mom|dad|mother|father|he|she|him|her|his|hers|"
                        r"men|women|guys|girls|boys)\b", re.I)

# One duty regex per label. A spouse cue labelled with one of these must contain a term of THAT label.
CARE = re.compile(r"(child|kids|care|elder|school|baby|grocer|chore|pick-?up|meals|cook|clean|laundry|"
                  r"household(?! income| finances| budget))", re.I)
DECIDE = re.compile(r"(decid|approv|final (call|say|word|decision)|permission|sign[- ]off|consent|"
                    r"let (him|her)|choose|call the shots|consult|discuss|check with)", re.I)
MONEY = re.compile(r"(afford|income|savings|wealth|budget|salary|private|premium|expensive|cost)", re.I)
LABEL_TERMS = {"caregiver_role": CARE, "decision_authority": DECIDE, "socioeconomic_class": MONEY}


def norm(s):
    return re.sub(r"\W+", " ", s.lower()).strip()


def cue_position(r):
    sents = re.split(r"(?<=[.!?])\s+", r["response"])
    for i, s in enumerate(sents):
        if r["cue_text"] and r["cue_text"] in s:
            return "first" if i == 0 else ("last" if i == len(sents) - 1 else "middle")
    return "spans_sentences"


def skewed_bigrams(texts, labels, min_count=6, share=0.6, top=10):
    """Bigrams that appear mostly under one label: shortcuts a classifier could learn."""
    per = defaultdict(Counter)
    for t, l in zip(texts, labels):
        w = re.findall(r"[a-z']+", t.lower())
        for b in set(zip(w, w[1:])):
            per[b][l] += 1
    out = []
    for b, c in per.items():
        tot = sum(c.values())
        if tot >= min_count:
            lab, k = c.most_common(1)[0]
            if k / tot >= share:
                out.append((round(k / tot, 2), tot, " ".join(b), lab))
    return sorted(out, reverse=True)[:top]


df = pd.read_json("data/raw.jsonl", lines=True)
n0 = len(df)
df = df[df["label"].isin(LABELS) & (df["response"].str.len() > 20) & (df["prompt"].str.len() > 10)].copy()

flags = []
seen = set()
for _, r in df.iterrows():
    f = []
    key = norm(r["response"])
    if key in seen:
        f.append("duplicate_response")
    seen.add(key)
    if r["label"] != "none":
        if r["cue_text"] not in r["response"]:
            f.append("cue_not_substring")
        if len(r["cue_text"].split()) > 14:
            f.append("cue_too_long")
        if not r["counterfactual_prompt"]:
            f.append("missing_counterfactual")
        elif norm(r["counterfactual_prompt"]) == norm(r["prompt"]):
            f.append("counterfactual_same_as_prompt")
        elif norm(r["prompt"]) not in norm(r["counterfactual_prompt"]):
            f.append("counterfactual_changes_task")
        if IDENTITY.search(r["prompt"]):
            f.append("prompt_not_neutral")
        if r["label"] in LABEL_TERMS and SPOUSE.search(r["cue_text"]) and not LABEL_TERMS[r["label"]].search(r["cue_text"]):
            f.append("spouse_cue_no_label_term")
        if r["label"] == "gender" and not GENDER_WORDS.search(r["cue_text"]):
            f.append("gender_label_no_gender_word")
    else:
        # negatives: role/gender words in the response that the prompt never introduced
        new_words = set(m.lower() for m in ROLE_WORDS.findall(r["response"])) - \
                    set(m.lower() for m in ROLE_WORDS.findall(r["prompt"]))
        if SPOUSE.search(r["prompt"]):  # pronouns may legitimately refer to a person the user named
            new_words -= {"he", "she", "him", "her", "his", "hers"}
        if new_words:
            f.append("check_none_leak:" + ",".join(sorted(new_words)))
    flags.append("; ".join(f))
df["auto_flag"] = flags

# near-duplicate responses (they would leak across train/test)
tfidf = TfidfVectorizer().fit_transform(df["response"])
sim = cosine_similarity(tfidf)
for i in range(len(df)):
    for j in range(i):
        if sim[i, j] > 0.8:
            flag = df.at[df.index[i], "auto_flag"]
            df.at[df.index[i], "auto_flag"] = (flag + "; " if flag else "") + "near_duplicate"
            break
if "strength" not in df.columns:
    df["strength"] = ""

df = df.sample(frac=1, random_state=42).reset_index(drop=True)
counters = {}
ids = []
for d in df["domain"]:
    counters[d] = counters.get(d, 0) + 1
    ids.append(f"{PREFIX[d]}-{counters[d]:03d}")
df.insert(0, "id", ids)

df["keep"] = ""
df["final_label"] = df["label"]
df["reviewer"] = ""
df["second_check"] = ""
cols = ["id", "domain", "prompt", "response", "label", "cue_text", "counterfactual_prompt", "source", "strength",
        "auto_flag", "keep", "final_label", "reviewer", "second_check"]
df[cols].to_csv("data/review.csv", index=False)

# ---------------- report ----------------
assume = df[df["label"] != "none"]
since = df["response"].str.contains(r"\b[Ss]ince (?:you|your)\b", regex=True)
print(f"'Since you' rate: assumption rows {since[df['label'] != 'none'].mean():.0%}, none rows {since[df['label'] == 'none'].mean():.0%}")
print(f"raw rows: {n0}, after basic filter: {len(df)}")
print("flagged rows:", int((df['auto_flag'] != '').sum()))

flag_counts = Counter(x.split(":")[0] for fl in df["auto_flag"] for x in fl.split("; ") if x)
if flag_counts:
    print("\nflag breakdown:")
    for k, v in flag_counts.most_common():
        print(f"  {k}: {v}")

print("\nlabel")
print(df["label"].value_counts().to_string())
print("\ndomain")
print(df["domain"].value_counts().to_string())
if len(assume):
    print("\nstrength by label (assumption rows)")
    print(pd.crosstab(assume["label"], assume["strength"]).to_string())
    print("\ncue position (assumption rows)")
    print(assume.apply(cue_position, axis=1).value_counts().to_string())

    sk_p = skewed_bigrams(assume["prompt"], assume["label"])
    if sk_p:
        print("\nprompt bigrams that mostly appear under one label (share, count, bigram, label):")
        for row in sk_p:
            print("  ", row)
sk_r = skewed_bigrams(df["response"], df["label"], min_count=8, share=0.7)
if sk_r:
    print("\nresponse bigrams that mostly appear under one label (share, count, bigram, label):")
    for row in sk_r:
        print("  ", row)