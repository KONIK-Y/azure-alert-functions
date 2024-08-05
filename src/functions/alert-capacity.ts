// Docs:
// https://learn.microsoft.com/ja-jp/javascript/api/overview/azure/monitor-query-readme?view=azure-node-latest#metrics-query
// https://learn.microsoft.com/ja-jp/javascript/api/@azure/arm-monitor/monitorclient?view=azure-node-latest
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { WebClient } from '@slack/web-api';
import { DefaultAzureCredential } from '@azure/identity';
import { MetricsListOptionalParams, MonitorClient } from '@azure/arm-monitor';

interface ResourceInfo {
  resourceGroup: string;
  resourceProvider?: string | null;
  resourceName?: string | null;
}
export const resourceUriPurser = (rawUri: string): ResourceInfo => {
  const resourceGroupPattern = /resourceGroups\/([^/]*)/;
  const providerPattern = /\/providers\/([^/]+\/[^/]+)/;

  const resourceGroupMatch = rawUri.match(resourceGroupPattern);
  const providerMatch = rawUri.match(providerPattern);

  const resourceGroup = resourceGroupMatch ? resourceGroupMatch[1] : null;
  const provider = providerMatch ? providerMatch[1] : null;

  const segments = rawUri.split('/');
  const resourceName = segments[segments.length - 1];
  const pursed: ResourceInfo = {
    resourceGroup: resourceGroup,
    resourceProvider: provider,
    resourceName: resourceName,
  };
  return pursed;
};

export async function httpTrigger1(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const slackToken = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_DEFAULET_CHANNEL;
  const json = await request.json();
  const targetId = json['data']['essentials']['alertTargetIDs'][0];
  const credential = new DefaultAzureCredential();
  const client = new MonitorClient(credential, process.env.SUBSCRIPTION_ID);

  const metaData = resourceUriPurser(targetId);

  const end = new Date().toISOString();
  const start = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  // INFO: 運用や対象リソースによって値を変更する. リソースが対応しているメトリクスはmetricDefinitionsで取得可能.
  const cpuOptions: MetricsListOptionalParams = {
    metricnamespace: metaData.resourceProvider,
    metricnames: 'CpuPercentage',
    interval: 'PT5M',
    aggregation: 'Average',
    timespan: `${start}/${end}`,
  };
  const memoryOptions: MetricsListOptionalParams = {
    metricnamespace: metaData.resourceProvider,
    metricnames: 'MemoryPercentage',
    interval: 'PT5M',
    aggregation: 'Average',
    timespan: `${start}/${end}`,
  };
  const cpuMetrics = await client.metrics.list(targetId, cpuOptions);
  const memoryMetrics = await client.metrics.list(targetId, memoryOptions);
  const cpuInfo = {
    resourceGroup: metaData.resourceGroup,
    resourceName: metaData.resourceName,
    resorceType: cpuMetrics.namespace,
    resion: cpuMetrics.resourceregion,
    values: cpuMetrics.value[0].timeseries[0].data,
  };
  const memInfo = {
    resourceGroup: metaData.resourceGroup,
    resourceName: metaData.resourceName,
    resorceType: memoryMetrics.namespace,
    resion: memoryMetrics.resourceregion,
    values: memoryMetrics.value[0].timeseries[0].data,
  };
  let cpuBlocks = '';
  let memBlocks = '';
  cpuInfo.values.forEach((val) => {
    cpuBlocks += `${val.timeStamp} : ${val.average}%\n`;
  });
  memInfo.values.forEach((val) => {
    memBlocks += `${val.timeStamp} : ${val.average}%\n`;
  });

  const blockText = {
    text: `※※ [緊急]:閾値を超えたリソースがあります！※※`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*※※ 緊急: 閾値を超えたリソースがあります！※※*\n *(${metaData.resourceGroup}/${metaData.resourceName})*`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `- *リソース名* : ${metaData.resourceName} \n- *リソースタイプ* : ${metaData.resourceProvider} \n- *リージョン* : ${cpuInfo.resion}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*CPU使用率(%)*:\n \`\`\` ${cpuBlocks} \`\`\` \n *メモリ使用率(%)*:\n \`\`\` ${memBlocks}\`\`\``,
        },
      },
    ],
  };

  const web = new WebClient(slackToken);
  const result = await web.chat.postMessage({
    channel: channel,
    text: blockText.text,
    blocks: blockText.blocks,
  });

  if (result.ok) {
    return { body: 'Success' };
  } else {
    return { body: 'Failed' };
  }
}

app.http('httpTrigger1', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: httpTrigger1,
});
