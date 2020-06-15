import json

from polyglot.detect import Detector

with open("./datas/latest-feedback.json", "r") as file:
    feedback_list = json.load(file)

# Remove bad entries in the feedback
# => keep only french, remove small talk, remove links ,remove oos and no bot answers
clean_feedback = []
for entry in feedback_list:
    if ((entry["bot_message"][:32] != "Vous trouverez de l'information ") and
        (entry["bot_message"] !=
         "Désolé. Je ne suis pas un robot de conversation. Mon rôle est de répondre le plus efficacement possible à vos questions sur la COVID-19."
         ) and (entry["bot_message"] != "De rien")
            and (entry["bot_message"][0] != "#")
            and (len(entry["nlu_name"].split("_")) == 5)
            and (entry["bot_message"] != "N/A")):
        clean_feedback.append(entry)

    # try:
    # detector = Detector(entry["user_message"])
    # if detector.language.code == "fr":
    # clean_feedback.append(entry)
    # except BaseException:
    # print(entry["user_message"])

with open("./datas/latest-covid-content.json", "r") as file:
    raw_content = json.load(file)

# Get title from bot answer
kb_content = []
for entry in clean_feedback:
    bot_message = entry["bot_message"][:-6]  # remove [...]
    for sub_dic in raw_content.values():
        if ((bot_message in sub_dic.get("content_fr", ""))
                and (sub_dic.get("title_fr", None) is not None)):
            # Get kb_content for this title :
            idx = next((i for i, item in enumerate(kb_content)
                        if item["content"]["fr"] == sub_dic["content_fr"]),
                       None)

            if idx is None:
                new_kb_entry = {
                    "title": {
                        "fr": sub_dic["title_fr"]
                    },
                    "content": {
                        "fr": sub_dic["content_fr"]
                    },
                    "bot_message": bot_message,
                    "feedback": {
                        "fr": [{
                            "utterance": entry["user_message"],
                            "polarity": entry["user_feedback"],
                            "approved": False
                        }]
                    }
                }
                kb_content.append(new_kb_entry)
            else:
                if next((item for item in kb_content[idx]["feedback"]["fr"]
                         if item["utterance"] == entry["user_message"]),
                        None) is None:
                    kb_content[idx]["feedback"]["fr"].append({
                        "utterance":
                        entry["user_message"],
                        "polarity":
                        entry["user_feedback"],
                        "approved":
                        False
                    })

with open("./datas/latest-clean_feedback_fr.json", "w+") as file:
    json.dump(kb_content, file, indent=2, ensure_ascii=False)
