import glob
import json
import re

with open("./datas/sly-covid-content.json", "r") as file:
    raw_content = json.load(file)

print(raw_content.get("section://Z2wooYS", None))

kb_content = []
for entry_file in glob.iglob("./sly_qna/*.json"):
    with open(entry_file, "r") as file:
        entry = json.load(file)
    s = entry["data"]["answers"]["fr"][0].split("\n")[-1].split(
        "=")[-1].strip()
    if raw_content.get(s, None) is not None:
        title = raw_content[s].get("title_fr", None)
        content = raw_content[s].get("content_fr", None)
        if title is not None and content is not None:
            kb_content.append({
                "title": {
                    "fr": title
                },
                "content": {
                    "fr": content
                },
                "contexts": entry["data"]["contexts"],
                "feedback": {
                    "fr": [{
                        "utterance": q,
                        "polarity": 1,
                        "approved": True
                    } for q in entry["data"]["questions"]["fr"]]
                }
            })

with open("./datas/clean_sly_qna_fr.json", "w+") as file:
    json.dump(kb_content, file, indent=2, ensure_ascii=False)
