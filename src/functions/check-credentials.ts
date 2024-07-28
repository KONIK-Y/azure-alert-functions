/* eslint-disable prefer-const */
import { app, HttpResponseInit } from '@azure/functions';
import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { Application, PasswordCredential } from '@microsoft/microsoft-graph-types';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { WebClient } from '@slack/web-api';

interface willExpireCert {
  certName: string;
  expireDate: string;
}

function dateCheck(expire: string, alertBorder: number): boolean {
  const expireDate = new Date(expire);
  const today = new Date();
  const alertDate = new Date(today.setDate(today.getDate() + alertBorder));
  return expireDate < alertDate;
}

export async function httpTrigger1(): Promise<HttpResponseInit> {
  const ExpireDate = Number(
    process.env.EXPIRE_DATE !== null && process.env.EXPIRE_DATE !== undefined ? process.env.EXPIRE_DATE : 30,
  );
  const slackToken = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_DEFAULET_CHANNEL;
  if (!slackToken || !channel) {
    return {
      status: 500,
      body: 'Slack token or channel is not configured properly.',
    };
  }
  let graphClient;
  try {
    const credential = new ClientSecretCredential(process.env.TENANT_ID, process.env.CLIENT_ID, process.env.CLIENT_KEY);
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ['https://graph.microsoft.com/.default'],
    });
    graphClient = Client.initWithMiddleware({ authProvider: authProvider });
  } catch (error) {
    return {
      status: 500,
      body: error.message,
    };
  }

  let results = [];
  let ids = [];
  try {
    const applications = await graphClient.api('/applications').get();
    ids = applications.value.map((app) => app.id);
  } catch (error) {
    return {
      status: 500,
      body: error.message,
    };
  }

  for (let i = 0; i < ids.length; i++) {
    try {
      const app: Application = await graphClient.api(`/applications/${ids[i]}`).get();
      if (app.passwordCredentials.length > 0) {
        const certs: { appname: string; cert: willExpireCert[] } = { appname: '', cert: [] };
        certs.appname = app.displayName;
        let appCerts: willExpireCert[] = [];
        for (let i = 0; i < app.passwordCredentials.length; i++) {
          const cert: PasswordCredential = app.passwordCredentials[i];
          if (dateCheck(cert.endDateTime, ExpireDate)) {
            appCerts.push({ certName: cert.displayName, expireDate: cert.endDateTime });
          }
        }
        if (appCerts.length > 0) {
          results.push({ appname: app.displayName, certs: appCerts });
        }
      }
    } catch (error) {
      return {
        status: 500,
        body: error.message,
      };
    }
  }

  if (results.length > 0) {
    const blockText = {
      text: 'Certification Expiration Alert',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${ExpireDate}日以内に更新が必要な証明書があります。設定を確認して更新してください。*`,
          },
        },
        {
          type: 'divider',
        },
      ],
    };
    for (let i = 0; i < results.length; i++) {
      blockText.blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`アプリケーション名: ${results[i].appname}\``,
        },
      });
      blockText.blocks.push({
        type: 'divider',
      });
      for (let j = 0; j < results[i].certs.length; j++) {
        const today = new Date();
        const expire = new Date(results[i].certs[j].expireDate);
        blockText.blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `\n\t*証明書名:* ${results[i].certs[j].certName}\n
\t*有効期限:* ${results[i].certs[j].expireDate}(${expire.getDate() - today.getDate()}日後)${expire.getDate() - today.getDate() < 7 ? ':warning: 有効期限まで7日を切っています！' : ''}`,
          },
        });
      }
      blockText.blocks.push({
        type: 'divider',
      });
    }

    try {
      const client = new WebClient(slackToken);
      await client.chat.postMessage({
        channel: channel,
        text: blockText.text,
        blocks: blockText.blocks,
      });
    } catch (error) {
      return {
        status: 500,
        body: error.message,
      };
    }
  }
}

app.timer('timerTrigger1', {
  schedule: '0 30 9 * * 1-5',
  handler: httpTrigger1,
});

app.http('httpTrigger1', {
  methods: ['GET'],
  handler: httpTrigger1,
});
