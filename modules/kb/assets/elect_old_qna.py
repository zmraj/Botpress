import numpy as np
import json
import csv

with open("./datas/clean_qna_fr.json", "r") as file:
    qna = json.load(file)

per_context = {ctx: [] for ctx in set(entry["contexts"][0] for entry in qna)}

for entry in qna:
    ctx = entry["contexts"][0]
    for fb in entry["feedback"]["fr"]:
        per_context[ctx].append({
            "utterance": fb["utterance"],
            "polarity": fb["polarity"],
            "context": ctx
        })

utt_per_context = 500 // len(per_context)

choosen_per_context = []
for entry in per_context.values():
    choosen_per_context.extend(
        np.random.choice(entry, utt_per_context, replace=False).tolist())

with open("./datas/qna_500.csv", "w") as file:
    writer = csv.writer(file)
    writer.writerow(["Question", "Bot"])
    for entry in choosen_per_context:
        writer.writerow(
            [entry['context'], entry['utterance'].replace("\n", " "), "plop"])
