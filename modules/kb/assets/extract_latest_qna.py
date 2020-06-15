import glob
import json
import re

source_regex = re.compile(r'')

with open("./datas/latest-covid-content.json", "r") as file:
    raw_content = json.load(file)

kb_content = []
for entry_file in glob.iglob("./latest_qna/*.json"):
    with open(entry_file, "r") as file:
        entry = json.load(file)
    sources = set(source_regex.findall(entry["data"]["answers"]["fr"][0]))
    for s in sources:
        if raw_content.get(s, None) is not None:
            kb_content.append({
                "title": {
                    "fr": raw_content[s]["title_fr"]
                },
                "content": {
                    "fr": raw_content[s]["content_fr"]
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

with open("./datas/latest_clean_qna_fr.json", "w+") as file:
    json.dump(kb_content, file, indent=2, ensure_ascii=False)
