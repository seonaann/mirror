
from backend.drift import calculate_drift

original = (
    "You should get your father's approval before investing."
)

counterfactual = (
    "You can make your own investment decisions by reviewing "
    "your goals, budget, and risk tolerance."
)

result = calculate_drift(original, counterfactual)

print("Drift result:")
print(result)
