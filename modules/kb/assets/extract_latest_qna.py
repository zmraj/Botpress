import glob
import json
import re

source_regex = re.compile(r'section:\/\/[a-zA-z0-9][^\\\"\'\n]+')

with open("./datas/latest-covid-content.json", "r") as file:
    raw_content = json.load(file)

kb_content = []
with open("./datas/latest_qna.json", "r") as file:
    entries = json.load(file)
entries = entries["qnas"]
# i = 0
for entry in entries:
    if "_" in entry["id"]:
        continue
    entry = entry["data"]
    sources = set(source_regex.findall(entry["answers"]["fr"][0]))
    # print(sources)
    for s in sources:
        if raw_content.get(s, None) is not None:
            if ((raw_content[s].get("title_fr", None) is not None)
                    and (raw_content[s].get("title_fr", None) is not None)):
                # i += 1
                kb_content.append({
                    "title": {
                        "fr": raw_content[s]["title_fr"]
                    },
                    "content": {
                        "fr": raw_content[s]["content_fr"]
                    },
                    "contexts": entry["contexts"],
                    "feedback": {
                        "fr": [{
                            "utterance": q,
                            "polarity": 1,
                            "approved": True
                        } for q in entry["questions"]["fr"]]
                    }
                })
# print(i)

with open("./datas/latest_clean_qna_fr.json", "w+") as file:
    json.dump(kb_content, file, indent=2, ensure_ascii=False)
