import csv
questions = []
with open("./datas/qna_500.csv", "r") as file:
    csvreader = csv.reader(file)
    next(csvreader, None)  # Remove Headers
    for row in csvreader:
        questions.append(("QnA", row[0], row[1], row[2]))

with open("./datas/feedback_500.csv", "r") as file:
    csvreader = csv.reader(file)
    next(csvreader, None)  # Remove Headers
    for row in csvreader:
        questions.append(("Feedback", row[0], row[1], row[2]))

with open("./datas/historique_1000.csv", "w+") as file:
    writer = csv.writer(file)
    writer.writerow(["Type", "Source", "Question", "Reponse"])
    for entry in questions:
        writer.writerow([*entry])
