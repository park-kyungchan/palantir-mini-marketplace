---
source: https://www.palantir.com/docs/foundry/observability/overview
fetched: 2026-04-20
section: architecture-overviews
doc_title: Observability
---

- Documentation

  * [Documentation](/docs/foundry/)
  * [Apollo](/docs/apollo/)
  * [Gotham](/docs/gotham/)

Search

+

K

[API Reference ↗](/docs/foundry/api-reference/)Send feedback

en

enjpkrzh

ABXY

ABXYABXYABXYABXYABXYABXY

* Capabilities

  + [AI Platform (AIP)](/docs/foundry/aip/overview/)
  + [Data connectivity & integration](/docs/foundry/data-integration/overview/)
  + [Model connectivity & development](/docs/foundry/model-integration/overview/)
  + [Ontology building](/docs/foundry/ontology/overview/)
  + [Developer toolchain](/docs/foundry/dev-toolchain/overview/)
  + [Use case development](/docs/foundry/app-building/overview/)
  + [Observability](/docs/foundry/observability/overview/)
  + [Analytics](/docs/foundry/analytics/overview/)
  + [Product delivery](/docs/foundry/devops/overview/)
  + [Security & governance](/docs/foundry/security/overview/)
  + [Management & enablement](/docs/foundry/administration/overview/)
* [Getting started](/docs/foundry/getting-started/overview/)
* [Architecture center](/docs/foundry/architecture-center/overview/)
* Platform updates

  + [Announcements](/docs/foundry/announcements/)
  + [Release notes](/docs/foundry/announcements/release-notes/)

Observability
-------------

* [Overview](/docs/foundry/observability/overview/)
* [Release notes ↗](/docs/foundry/announcements/release-notes/?filters=observability)
* Monitoring
* [Data Health](/docs/foundry/observability/data-health/)
* Monitoring views

  + [Overview](/docs/foundry/monitoring-views/overview/)
  + [Core concepts](/docs/foundry/monitoring-views/core-concepts/)
  + [Sending alerts to external systems](/docs/foundry/monitoring-views/external-systems/)
  + [Monitoring rules reference](/docs/foundry/monitoring-views/rules-reference/)
  + [Monitoring FAQ](/docs/foundry/monitoring-views/monitoring-faq/)
  + [Check groups [Sunset]](/docs/foundry/monitoring-views/check-groups/)
* Health checks

  + [Overview](/docs/foundry/health-checks/overview/)
  + [Types of checks](/docs/foundry/health-checks/check-types/)
  + [Check evaluation](/docs/foundry/health-checks/check-evaluation/)
  + [Watching checks](/docs/foundry/health-checks/watching-checks/)
  + [Notifications and issues](/docs/foundry/health-checks/notifications/)
  + [Add health checks to a Marketplace product](/docs/foundry/health-checks/marketplace-data-health/)
  + [Builds and checks FAQ](/docs/foundry/health-checks/builds-checks-faq/)
  + [Checks reference](/docs/foundry/health-checks/checks-reference/)
* Debugging
* AIP observability

  + [Overview](/docs/foundry/aip-observability/overview/)
  + [Execution history](/docs/foundry/aip-observability/run-history/)
  + [Tracing](/docs/foundry/aip-observability/trace-view/)
  + [Logging and debugging](/docs/foundry/aip-observability/service-logs-and-debugging/)
  + [Log search](/docs/foundry/aip-observability/log-search/)
  + [Log permissions](/docs/foundry/aip-observability/log-permissioning/)
  + [Metrics](/docs/foundry/aip-observability/metrics/)
  + [Performance monitoring and optimization](/docs/foundry/aip-observability/performance-monitoring-and-optimization/)

[Observability](/docs/foundry/observability/overview/)[Overview](/docs/foundry/observability/overview/)

Observability
=============

The Palantir platform provides built-in tools to monitor the health of your resources, debug issues in development and production, trace execution across services, and analyze telemetry at scale.

![Searching across logs in Workflow Lineage.](/docs/resources/foundry/observability/workflow-lineage-log-search.png)

**[Monitor](#monitoring):** You can use the [Data Health](/docs/foundry/observability/data-health/) tool to monitor the platform. With Data Health, you can set up rules and define thresholds for failures, latency and more; configure monitors per resource or at scale across projects; receive alerts through PagerDuty, Slack, webhooks, or Foundry notifications; and view execution counts and P95 latency [metrics](/docs/foundry/aip-observability/metrics/) for the last 30 days.

**[Debug](#debugging):** The [Workflow Lineage](/docs/foundry/workflow-lineage/overview/) tool lets you explore and investigate platform history and logs. You can view seven days of [execution history](/docs/foundry/aip-observability/run-history/), filter by status, user, duration, or version, and pinpoint exactly which executions need attention. Workflow Lineage also enables you to [search across logs](/docs/foundry/aip-observability/log-search/) from all executions for a source executor to find specific log messages, errors, or patterns.

**[Trace](#debugging):** To visualize the full request journey across functions, actions, and LLM calls, you can use [trace views](/docs/foundry/aip-observability/trace-view/). Trace views enable you to drill into any operation to see duration, inputs, outputs, and errors.

**[Analyze](#log-export):** To conduct further analysis on log data, you can [export](/docs/foundry/administration/configure-logging/) Foundry logs, metrics, and traces to a streaming dataset to power your own dashboards, pipelines, or custom observability workflows.

Monitoring
----------

Monitoring tools help you track the health and stability of your resources over time, detect issues proactively, and receive alerts when problems occur.

[Data Health](/docs/foundry/observability/data-health/) is the primary application for monitoring the health of your platform resources. Data Health provides two feature sets:

* **[Monitoring views](/docs/foundry/monitoring-views/overview/):** You can monitor Foundry resources at scale using scope-based monitoring rules across projects, folders, applications, or individual resources.
* **[Health checks](/docs/foundry/health-checks/overview/):** Detailed health checks can be configured on individual resources, including content and schema validation for datasets, schedules, and tables.

Both monitoring views and health checks generate alerts when issues are detected. Alerts can be delivered through Foundry notifications or through [external systems](/docs/foundry/monitoring-views/external-systems/) such as PagerDuty or Slack.

### Metrics

Foundry provides metrics across multiple resource types to help you monitor health and performance over time.

* **[Functions](/docs/foundry/functions/function-metrics/), [actions](/docs/foundry/action-types/action-metrics/), and [AIP Logic](/docs/foundry/logic/logic-metrics/):** View near real-time success/failure counts and P95 execution duration over the last 30 days through [Ontology Manager](/docs/foundry/ontology-manager/overview/) or [Workflow Lineage](/docs/foundry/workflow-lineage/overview/).
* **Streams and compute modules:** Access metrics in the **Metrics** tab to monitor the health and stability of long-running compute workloads.

![Metrics tab.](/docs/resources/foundry/observability/metrics-tab.png)

Debugging
---------

Debugging tools help you investigate issues during development and in production by providing visibility into execution details, logs, and traces.

### AIP observability

[AIP observability](/docs/foundry/aip-observability/overview/) features in [Workflow Lineage](/docs/foundry/workflow-lineage/overview/) enable you to gain comprehensive insights into your AIP and Ontology workflow executions. Use AIP observability features to understand the performance of your agents, functions, language models, automations, actions, and Ontology.

AIP observability features can be used to gain visibility into [metrics](/docs/foundry/aip-observability/metrics/), [execution history](/docs/foundry/aip-observability/run-history/), [distributed tracing](/docs/foundry/aip-observability/trace-view/), [logging](/docs/foundry/aip-observability/service-logs-and-debugging/), and [log search](/docs/foundry/aip-observability/log-search/).

### Logs

You can view logs from both third-party libraries being used to run your code (such as Kafka when using streams), as well as logs emitted by your code. Logs are available on several types of jobs:

* **[Batch and streaming transforms](/docs/foundry/data-integration/builds/#live-logs):** Live logs can be viewed on the transform's job report.
* **[Compute modules](/docs/foundry/compute-modules/overview/):** Logs can be viewed in the Compute Module overview page.
* **[Functions](/docs/foundry/aip-observability/service-logs-and-debugging/):** Logs can be viewed in Workflow Lineage.

You can also [search across logs](/docs/foundry/aip-observability/log-search/) from all executions for a source executor to find specific log messages, errors, or patterns. A source executor is the first executable resource in the call chain, such as a function, action, automation, AIP Logic, or AIP agent.

Log export
----------

Log exporting may not be available in your enrollment. Contact Palantir Support for more information.

To allow for arbitrary processing outside the current capabilities of in-platform tools, you can create a stream in a specified folder containing all telemetry for an organization. This includes logs, metrics, and traces. Data in this stream can be analyzed using Foundry's suite of data analysis tools or [exported to third-party systems](/docs/foundry/data-connection/export-overview/).

![Log exporting through Control Panel.](/docs/resources/foundry/observability/log-exporting.png)

[Learn more about exporting logs to a stream on the Configure logging page.](/docs/foundry/administration/configure-logging/)

[NEXTMonitoring / Data Health

→](/docs/foundry/observability/data-health/)

© 2026 Palantir Technologies Inc. All rights reserved.

[Cookies Statement ↗](https://www.palantir.com/cookie-statement/)[Privacy Statement ↗](https://www.palantir.com/privacy-and-security/)

Cookie Settings

Contents
--------

* [Observability](#observability)
  + [Monitoring](#monitoring)
  + [Debugging](#debugging)
  + [Log export](#log-export)
