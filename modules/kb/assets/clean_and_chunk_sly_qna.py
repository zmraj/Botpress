import json
from copy import deepcopy
import nltk
import re
with open("./datas/clean_sly_qna_fr.json", "r") as file:
    fb_content = json.load(file)

new_fb_content = deepcopy(fb_content)
for i, entry in enumerate(fb_content):
    new_fb_content[i]["content"]["fr"] = []
    content = entry["content"]["fr"]
    content = re.sub(
        r'(((http|ftp|https):\/\/)|(www\.))([\wàâçéèêëîïôûùüÿñæœ.,@?^=%&:\\\/~+#-]*[\w@?^=%&\/~+#-])?',
        " ", content)
    n_splitted = content.split("\n")
    n_sentence_split = [nltk.tokenize.sent_tokenize(par) for par in n_splitted]

    splitted_content = []
    chunk = []
    word_count = 0
    for par in n_sentence_split:
        for sentence in par:
            if word_count + len(sentence.split(" ")) < 150:
                chunk.append(sentence)
                word_count += len(sentence.split(" "))
            else:
                new_fb_content[i]["content"]["fr"].append(" ".join(chunk))
                chunk = []
                word_count = 0
    if not new_fb_content[i]["content"]["fr"]:
        new_fb_content[i]["content"]["fr"].append(" ".join(chunk))
        # if len(" ".join(chunk).split(" ")) < 20:
        #     print(" ".join(chunk))

with open("./datas/chunked_sly_qna.json", "w+") as file:
    fb_content = json.dump(new_fb_content, file, indent=2, ensure_ascii=False)