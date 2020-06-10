import csv
import json
from collections import Counter
from rich.progress import track
import numpy as np
from scipy.special import softmax
from polyglot.detect import Detector
with open("./historique_messages.json", "r") as file:
    histo_list = json.load(file)

with open("./")


def choose_datas(plus_ones, minus_ones, neutrals):
    best_hist_1000 = []
    best_nb_intents = 0
    for _ in range(1000):
        choosen_minus_ones = np.random.choice(
            minus_ones,
            len(plus_ones),
            #   p=minus_one_count,
            replace=False).tolist()
        choosen_neutrals = np.random.choice(
            neutrals,
            1000 - (len(plus_ones) + len(choosen_minus_ones)),
            # p=neutral_count,
            replace=False).tolist()
        hist_1000 = choosen_neutrals + plus_ones + choosen_minus_ones

        # print(f"Nombre de plus un : {len(plus_ones)}")
        # print(f"Nombre de moins un : {len(choosen_minus_ones)}")
        # print(f"Nombre de neutres : {len(choosen_neutrals)}")
        # print(f"Nombre total d'entrées : {len(hist_1000)}")

        count = Counter([h["nlu_name"] for h in hist_1000])
        # print(f"Intent plus frequent : {max(count, key=count.get)} :", end=" ")
        # print(f"{count[max(count, key=count.get)]} occurences")
        # print(f"{len(count)} different intents")
        if len(count) > best_nb_intents:
            best_nb_intents = len(count)
            best_hist_1000 = hist_1000
    return best_hist_1000, best_nb_intents


clean_hist = []
for fb_entry in track(histo_list):
    if ((fb_entry["nlu_name"][-5:] != "hello") and
        (fb_entry["bot_message"][:32] != "Vous trouverez de l'information ")
            and (fb_entry["nlu_name"] != "none")
            and (fb_entry["bot_message"] != "N/A")):
        try:
            detector = Detector(fb_entry["user_message"])
            if detector.language.code == "fr":
                clean_hist.append(fb_entry)
        except BaseException:
            print(fb_entry["user_message"])

        # if not detector.reliable:
        #     print(fb_entry["user_message"])
        #     print(detector.language.code)
        #     print("\n")

plus_ones = [entry for entry in clean_hist if entry["user_feedback"] == 1]
minus_ones = [entry for entry in clean_hist if entry["user_feedback"] == -1]
neutrals = [entry for entry in clean_hist if entry["user_feedback"] == 0]

# minus_one_count = Counter([m["nlu_name"] for m in minus_ones])
# neutral_count = Counter([n["nlu_name"] for n in neutrals])
# minus_one_count = softmax(
# [1 / minus_one_count[e["nlu_name"]] for e in minus_ones])
# neutral_count = softmax([1 / neutral_count[e["nlu_name"]] for e in neutrals])

hist_1000, best_nb_intents = choose_datas(plus_ones, minus_ones, neutrals)
print(best_nb_intents)

with open("./historique_clean.json", "w+") as file:
    json.dump(clean_hist, file)

with open("./historique_1000.csv", "w") as file:
    writer = csv.writer(file)
    writer.writerow(["Question", "Golden reponse"])
    for entry in hist_1000:
        writer.writerow([entry["user_message"], entry["bot_message"]])
