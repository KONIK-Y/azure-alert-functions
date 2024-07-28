## Scopes
The following functions need to be granted API permissions through EntraID for the application:

| Name              | Scope               |
| ----------------- | -------------------- |
| check-credentials | Application.Read.All |

## Environment
The environment variables required to use this function are as follows:

| Key                  | Description                                                |
| -------------------- | ---------------------------------------------------------- |
| SLACK_BOT_TOKEN      | Slack Bot token                                            |
| SLACK_DEFAULT_CHANNEL| The channel to send notifications to                      |
| CLIENT_ID            | Client ID of the application with scopes set in EntraID    |
| CLIENT_KEY           | Client secret of the application with scopes set in EntraID |
| TENANT_ID            | Tenant ID of the application with scopes set in EntraID    |

## bicep
usege:

```
az deployment group creat --name <deployment-name> --resource-group <rg-name> --template-file <bicep-path>
```
