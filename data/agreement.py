import pandas as pd
from sklearn.metrics import cohen_kappa_score, accuracy_score

def get_label_col(df):
    """Finds the column containing label annotations dynamically."""
    possible_names = ['label', 'final_label', 'labels', 'category', 'your_label', 'annotation']
    for col in df.columns:
        if col.strip().lower() in possible_names:
            return col
    # Fallback to the second column if no match found
    return df.columns[1] if len(df.columns) > 1 else df.columns[0]

# 1. Load the Gold Dataset and Friend Files
try:
    gold_df = pd.read_csv("data/mirror_dataset_final.csv")
    friend_a = pd.read_csv("data/friend_a.csv")
    friend_b = pd.read_csv("data/friend_b.csv")
except Exception as e:
    print(f"Error loading CSV files: {e}")
    exit()

# Clean column names
for df in [gold_df, friend_a, friend_b]:
    df.columns = df.columns.str.strip().str.lower()

# Drop corrupt rows
corrupt_ids = ["FIN-066", "HLT-165", "CAR-044"]
gold_df = gold_df[~gold_df['id'].isin(corrupt_ids)]

# Identify ID and Label columns for each dataframe
gold_label_col = get_label_col(gold_df)
a_label_col = get_label_col(friend_a)
b_label_col = get_label_col(friend_b)

print(f"Detected Label Columns -> Gold: '{gold_label_col}' | Friend A: '{a_label_col}' | Friend B: '{b_label_col}'")

# Merge datasets on 'id'
merged = gold_df[['id', gold_label_col]].merge(
    friend_a[['id', a_label_col]], on='id', suffixes=('_gold', '_a')
)
merged = merged.merge(
    friend_b[['id', b_label_col]].rename(columns={b_label_col: 'label_b'}), on='id'
)

# Rename for clean access
merged = merged.rename(columns={gold_label_col: 'label_gold', a_label_col: 'label_a'})

# Clean label strings and fill invalid/typos with 'none'
valid_labels = ["gender", "caregiver_role", "decision_authority", "socioeconomic_class", "none"]
for col in ['label_gold', 'label_a', 'label_b']:
    merged[col] = merged[col].astype(str).str.strip().str.lower()
    merged[col] = merged[col].apply(lambda x: x if x in valid_labels else "none")

# 2. Calculate Cohen's Kappa & Raw Accuracy Scores
kappa_gold_a = cohen_kappa_score(merged['label_gold'], merged['label_a'])
kappa_gold_b = cohen_kappa_score(merged['label_gold'], merged['label_b'])
kappa_a_b = cohen_kappa_score(merged['label_a'], merged['label_b'])

raw_acc_gold_a = accuracy_score(merged['label_gold'], merged['label_a'])
raw_acc_gold_b = accuracy_score(merged['label_gold'], merged['label_b'])
raw_acc_a_b = accuracy_score(merged['label_a'], merged['label_b'])

print("\n================ INTER-ANNOTATOR AGREEMENT REPORT ================")
print(f"Total Evaluated Overlapping Rows: {len(merged)}")
print(f"Gold vs Friend A  --> Kappa: {kappa_gold_a:.3f} | Accuracy: {raw_acc_gold_a * 100:.1f}%")
print(f"Gold vs Friend B  --> Kappa: {kappa_gold_b:.3f} | Accuracy: {raw_acc_gold_b * 100:.1f}%")
print(f"Friend A vs Friend B (Human-to-Human) --> Kappa: {kappa_a_b:.3f} | Accuracy: {raw_acc_a_b * 100:.1f}%")
print("==================================================================\n")