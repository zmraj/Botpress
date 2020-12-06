#! /bin/bash

trap "exit" INT TERM ERR
trap "kill 0" EXIT

echo "What did you change?"
read changes

echo "" >> logs.txt
echo "" >> logs.txt
echo "--------------------" >> logs.txt
echo "Changes: $changes" >> logs.txt
echo "--------------------" >> logs.txt
echo "" >> logs.txt
echo "" >> logs.txt
echo "GIT DIFF" >> logs.txt
echo "" >> logs.txt
echo "" >> logs.txt

git diff -- ':!' >> logs.txt
git add -A
git commit -m "run - $changes"

echo "Starting botpress..."
echo "Starting botpress | $(date)" >> logs.txt
yarn start &
sleep 10

echo "" >> logs.txt

echo "Before"

echo "BEFORE MEMORY" >> logs.txt
http --print=b :3000/heap/stats >> logs.txt
echo "" >> logs.txt

echo "Starting warmup | $(date)" >> logs.txt
k6 run --vus 20 --duration 10s load.js
echo "Warmup done | $(date)" >> logs.txt

sleep 2
echo "" >> logs.txt
http --print=b :3000/heap/gc >> logs.txt
echo "" >> logs.txt
sleep 2

echo "Snapshot memory" >> logs.txt
http --print=b :3000/heap/start >> logs.txt
echo "" >> logs.txt
echo "Snapshot done | $(date)" >> logs.txt

sleep 2

echo "Bench"
echo "Sending requests | $(date)" >> logs.txt
k6 run --vus 150 --duration 60s load.js
echo "Requests done | $(date)" >> logs.txt

sleep 60

echo "Capture"
echo "Finishing snapshot | $(date)" >> logs.txt
echo "" >> logs.txt
http --print=b :3000/heap/end >> logs.txt
echo "" >> logs.txt
echo "" >> logs.txt
echo "Wrapping up.."

echo "" >> logs.txt
http --print=b :3000/heap/gc >> logs.txt
echo "" >> logs.txt
echo "" >> logs.txt
echo "FINAL MEMORY" >> logs.txt
http --print=b :3000/heap/stats >> logs.txt
echo "" >> logs.txt
echo "" >> logs.txt
echo "Done! $(date)"
