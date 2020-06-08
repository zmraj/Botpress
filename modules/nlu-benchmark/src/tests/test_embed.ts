// function cosine(a: number[], b: number[]) {
//   var ii = a.length
//   var p = 0
//   var p2 = 0
//   var q2 = 0
//   for (var i = 0; i < ii; i++) {
//     p += a[i] * b[i]
//     p2 += a[i] * a[i]
//     q2 += b[i] * b[i]
//   }
//   return p / (Math.sqrt(p2) * Math.sqrt(q2))
// }

// async function cosine_sim_test(phrase1: string, phrase2: string) {
//   const embed_p1: number[] = await embed(phrase1)
//   const embed_p2: number[] = await embed(phrase2)
//   console.log(cosine(embed_p1, embed_p2))
// }
