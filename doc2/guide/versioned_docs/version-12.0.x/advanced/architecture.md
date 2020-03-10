---
id: architecture
title: Architecture Overview
---

import useBaseUrl from '@docusaurus/useBaseUrl';

## Cluster Overview

<img alt="High-Level Diagram" src={useBaseUrl('img/bp-cluster.png')} />

### Prerequisite

To deploy Botpress in production, you'll need the following software:

- A Load Balancer (F5) such as Nginx or Apache
- Postgres (9.5+)
- Redis (2.8+)

## Interfaces Overview

<img alt="HTTP Interfaces" src={useBaseUrl('img/http-interfaces.png')} />
