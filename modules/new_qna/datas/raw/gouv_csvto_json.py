import csv
import json

with open("gouv_results.csv", "r") as f:
    reader = csv.reader(f)
    next(reader)
    plop = []
    for row in reader:
        plop.append({
            "Provenance": row[0],
            "Categorie": row[1],
            "Question": row[2],
            "botpress": row[3],
            "deep": row[4],
            "eval1": row[5],
            "eval2": row[6],
            "eval3": row[7],
            "eval4": row[8],
            "doublon": row[10]
        })
with open("gouv_results.json", "w+") as file:
    json.dump(plop, file, ensure_ascii=False, indent=2)
