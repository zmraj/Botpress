// let full = require("../datas/benchmark/data_full.json");
// let wiki = require("../datas/benchmark/binary_wiki_aug.json");
// let imbalanced = require("../datas/benchmark/data_imbalanced.json");
// let oos = require("../datas/benchmark/data_oos_plus.json");
// let undersample = require("../datas/benchmark/binary_undersample.json");
// let small = require("../datas/benchmark/data_small.json");

// import { DeepEmbedder } from "./embedder";
// import { Data, DataSet } from "./typings";
// const cliProgress = require("cli-progress");
// import _ from "lodash";

// async function keep_n_intents_each(
//   array,
//   intents,
//   nb_utt_per_intent,
//   embedder
// ) {
//   const intent_names = intents.map((o) => o.intent);
//   // Filter only desired n intents
//   const elected_intents = array
//     .filter((o) => intent_names.includes(o[1]))
//     .sort(() => Math.random() - 0.5);

//   // Take k intents among the n intents selected
//   const log_intents = {};
//   const prunned_array = [];
//   for (const entry of elected_intents) {
//     if (
//       Object.values(log_intents).length &&
//       Object.values(log_intents).every((o) => o > nb_utt_per_intent)
//     ) {
//       break;
//     }
//     let count = _.get(log_intents, entry[1], 0);
//     if (count < nb_utt_per_intent) {
//       prunned_array.push(entry);
//       log_intents[entry[1]] = count + 1;
//     }
//   }

//   // Compute embeddings of elected sentences
//   const bar1 = new cliProgress.SingleBar(
//     {},
//     cliProgress.Presets.shades_classic
//   );

//   bar1.start(prunned_array.length, 0);
//   const datas = [];
//   for (const entry of prunned_array) {
//     const embed = await embedder.embed(entry[0]);
//     datas.push({
//       question: entry[0],
//       embed: embed,
//       intent: entry[1],
//     });
//     bar1.increment();
//   }
//   bar1.stop();
//   return datas;
// }

// export async function load_benchmark(
//   embedder,
//   nb_intents: number,
//   nb_utt_per_intent: number
// ) {
//   const intents = Array.from(
//     new Set(
//       small.train
//         .map((o) => o[1])
//         .concat(
//           small.val.map((o) => o[1]),
//           small.test.map((o) => o[1])
//         )
//     )
//   )
//     .sort(() => Math.random() - 0.5)
//     .slice(0, nb_intents)
//     .map((intent, id) => {
//       return { intent, id };
//     });

//   console.log("INTENTS", intents, nb_intents, intents.length);

//   const train = await keep_n_intents_each(
//     small.train,
//     intents,
//     nb_utt_per_intent,
//     embedder
//   );

//   const val = await keep_n_intents_each(
//     small.val,
//     intents,
//     nb_utt_per_intent,
//     embedder
//   );

//   const test = await keep_n_intents_each(
//     small.test,
//     intents,
//     nb_utt_per_intent,
//     embedder
//   );

//   const meta_datas = {
//     nb_intents,
//     nb_utt_per_intent,
//     embed_size: embedder.embed_size,
//   };

//   const dataset: DataSet = { train, val, test };
//   return { dataset, meta_datas };
// }

// export function load_covid_id() { }
// export function load_covid_ctx() { }

export function preprocessDatas(intents, entities, embedder) {
  return [{ embed: [0, 0, 0], intent: 4 }]
}

export interface Datas {
  input: number[],
  labels: number[]
}
