# Models for benchmark

## Config

All models must be constructed in a certain way to fit in the benchmark

- Skills : A dictionary with all the skills the model have

```
{
    embed : true    // Can the model be tested to compute embeddings ?
    qa : true       // Should the model be tested on question answering ?
    intents : true       // Should the model be tested on intent detection ?
}
```

- Methods :

  - embed(tokenized-sentence: string[])
  - detect_intent(sentence: string) // The model will need to tokenize embed and predict intent

- Attributes :
  - embedder
  - intent_detector

The qa test will be run with the embed method.
