import numpy as np
import json
import csv

with open("./datas/latest_clean_qna_fr.json", "r") as file:
    qna = json.load(file)

per_context = []

for entry in qna:
    ctx = entry["contexts"][0]
    for fb in entry["feedback"]["fr"]:
        per_context.append({
            "utterance": fb["utterance"],
            "polarity": fb["polarity"],
            "context": ctx
        })

choosen_per_context = np.random.choice(per_context, 500,
                                       replace=False).tolist()

with open("./datas/latest_qna_500.csv", "w") as file:
    writer = csv.writer(file)
    writer.writerow(["Question", "Bot"])
    for entry in choosen_per_context:
        writer.writerow(
            [entry['context'], entry['utterance'].replace("\n", " "), "N/A"])
