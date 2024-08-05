## Overview
This is a Slack Bot I created to simplify server monitoring for my personal use. Here are its functions:

| Name              | Description                                                |
| ----------------- | ---------------------------------------------------------- |
| check-credentials | Notifies and lists client secrets that are nearing expiration. |
| alert-capacity    | Notifies when servers exceed thresholds, along with CPU and memory usage over the last 30 minutes. |

## Scopes
The following API permissions need to be granted through EntraID for the application:

| Name              | Scope               |
| ----------------- | -------------------- |
| check-credentials | Application.Read.All |

## Role Assignments
The following functions need the appropriate roles assigned:

| Name              | Role               |
| ----------------- | -------------------- |
| alert-capacity    | reader (*/read)     |

## Environment
The required environment variables for this function are:

| Key                  | Description                                                |
| -------------------- | ---------------------------------------------------------- |
| SLACK_BOT_TOKEN      | The Slack Bot token                                        |
| SLACK_DEFAULT_CHANNEL| The channel to send notifications to                      |
| CLIENT_ID            | Client ID of the application with scopes set in EntraID    |
| CLIENT_KEY           | Client secret of the application with scopes set in EntraID |
| TENANT_ID            | Tenant ID of the application with scopes set in EntraID    |

## Bicep
Usage:

```bash
az deployment group create --name <deployment-name> --resource-group <rg-name> --template-file <bicep-path>
```
