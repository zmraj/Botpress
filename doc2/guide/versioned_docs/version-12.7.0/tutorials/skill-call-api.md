---
id: skill-call-api
title: How to use Call API Skill
---

import useBaseUrl from '@docusaurus/useBaseUrl';

## Overview

The Call API skill is meant to help the users to easily call an API within their flow.

<img alt="From Flow Editor" src={useBaseUrl('img/call-api-skill-flow.png')} />

## Request Options

### Body

The request body can be set here.

<img alt="Main View" src={useBaseUrl('img/call-api-skill.png')} />

### Headers

The request headers can be set here and should respect the JSON format.

<img alt="Headers" src={useBaseUrl('img/call-api-skill-headers.png')} />

## Response

### Memory

To save the response, we use [Memory](../main/memory). By default the response will be saved in `temp.response`, but you can use the memory of your choice.

<img alt="Memory" src={useBaseUrl('img/call-api-skill-memory.png')} />

The saved response object should look like this:

```json
{
  "body": <Response Body>,
  "status": 200
}
```

### Success / Failure

When a response return a status code `400` and above, the request will result in a failure and will execute the `On failure` transition. All other status codes will result in a success and will execute the `On success` transition.

## Templating

Templating is supported in the `body` and the `headers` to get access to your variables stored in [Memory](../main/memory). All `bot`, `user`, `session`, `temp`, `event` are accessible via templating.

<img alt="Template" src={useBaseUrl('img/call-api-skill-template.png')} />
