# Typing the Bible — Azure Deployment & Operations Runbook

**Target URL:** `https://ttb.kingsbayanalytics.com`
**Default App Service URL:** `https://ttb-kingsbay.azurewebsites.net`
**Last Updated:** 2026-11-17

---

## 1. Azure Resource Inventory (Story 4.1)

| Component | Name | Resource Type | Region | SKU / Tier | Monthly Cost |
|---|---|---|---|---|---:|
| **Subscription** | `kba_sub_0` (`eb749f93-f254-4609-8900-a250b0f2d418`) | Azure Subscription | — | Pay-As-You-Go | — |
| **Microsoft Entra Tenant** | `kingsbayanalytics` (`165b7931-7abb-4263-b704-eef5a645c41f`) | Entra ID | Global | Free / M365 | \$0.00 |
| **Resource Group** | `rg-ttb` | `Microsoft.Resources/resourceGroups` | `eastus2` | — | \$0.00 |
| **Database Cluster** | `ttb-cosmos-vcore` | `Microsoft.DocumentDB/mongoClusters` (`v7.0`) | `eastus2` | `Free` (`32 GB` storage, 1 shard) | \$0.00 |
| **App Service Plan** | `asp-ttb` | `Microsoft.Web/serverfarms` (Linux) | `eastus2` | `B1` (Basic, 1 core, 1.75 GB RAM) | **~\$13.14/mo** *(only paid component)* |
| **Web App** | `ttb-kingsbay` | `Microsoft.Web/sites` (`NODE\|22-lts`) | `eastus2` | Shared on `asp-ttb` | \$0.00 |
| **Managed TLS Certificate** | `ttb.kingsbayanalytics.com` | `Microsoft.Web/certificates` | `eastus2` | App Service Managed Certificate | \$0.00 |
| **Easy Auth App Registration** | `ttb-kingsbay-auth` (`99e640de-b827-4e75-9a88-ffeb5355e4ba`) | Entra App + Service Principal (`72df736a-e7d8-4e04-8d39-92c9a6f18cfd`) | Global | Single-tenant, Assignment Required | \$0.00 |
| **GitHub OIDC App Registration** | `ttb-github-deploy` (`100058c1-3322-4938-8e78-0dea4dadf941`) | Entra App + Service Principal (`7241b974-1314-4714-bc9c-308af7512b39`) | Global | Federated Credential (`main`) | \$0.00 |

---

## 2. Rebuilding Resources from Scratch

### 2.1 Resource Group & Cosmos DB for MongoDB vCore (Free Tier)

```sh
az group create --name rg-ttb --location eastus2

# Provision Cosmos DB for MongoDB vCore Free tier (32 GB, MongoDB 7.0)
PASS="Ttb$(openssl rand -hex 12)!aA9"
az rest \
  --method put \
  --url "https://management.azure.com/subscriptions/eb749f93-f254-4609-8900-a250b0f2d418/resourceGroups/rg-ttb/providers/Microsoft.DocumentDB/mongoClusters/ttb-cosmos-vcore?api-version=2024-07-01" \
  --body "{
    \"location\": \"eastus2\",
    \"properties\": {
      \"administrator\": {
        \"userName\": \"ttbadmin\",
        \"password\": \"$PASS\"
      },
      \"serverVersion\": \"7.0\",
      \"compute\": { \"tier\": \"Free\" },
      \"storage\": { \"sizeGb\": 32 },
      \"sharding\": { \"shardCount\": 1 },
      \"highAvailability\": { \"targetMode\": \"Disabled\" }
    }
  }"

# Allow Azure services (App Service outbound connections)
az rest \
  --method put \
  --url "https://management.azure.com/subscriptions/eb749f93-f254-4609-8900-a250b0f2d418/resourceGroups/rg-ttb/providers/Microsoft.DocumentDB/mongoClusters/ttb-cosmos-vcore/firewallRules/AllowAllAzureServicesAndResourcesWithinAzureIps?api-version=2024-07-01" \
  --body '{"properties":{"startIpAddress":"0.0.0.0","endIpAddress":"0.0.0.0"}}'
```

### 2.2 Linux App Service Plan (`B1`) & Web App (`NODE:22-lts`)

```sh
az appservice plan create \
  --name asp-ttb \
  --resource-group rg-ttb \
  --location eastus2 \
  --is-linux \
  --sku B1

az webapp create \
  --name ttb-kingsbay \
  --resource-group rg-ttb \
  --plan asp-ttb \
  --runtime "NODE:22-lts" \
  --https-only true

az webapp config set \
  --name ttb-kingsbay \
  --resource-group rg-ttb \
  --always-on true \
  --http20-enabled true \
  --min-tls-version 1.2 \
  --ftps-state Disabled \
  --startup-file "node server/dist/index.js"
```

### 2.3 Application Settings

| Setting | Value / Source | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Serves `client/build` SPA & locks down CORS (`[]`) |
| `AUTH_MODE` | `entra` | Requires `X-MS-CLIENT-PRINCIPAL-ID === OWNER_OID`; disables `/api/users` login/register |
| `OWNER_OID` | `7d36efa4-7e3b-4222-8abc-17cb69fdc34b` | Entra Object ID for `mike@kingsbayanalytics.com` |
| `MONGODB_URI` | `mongodb+srv://ttbadmin:<password>@ttb-cosmos-vcore.mongocluster.cosmos.azure.com/type-the-bible?tls=true&authMechanism=SCRAM-SHA-256&retrywrites=false&maxIdleTimeMS=120000` | Stored in App Service settings (never committed to git) |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` | GitHub Actions deploys prebuilt `server/dist` + `client/build` |
| `MICROSOFT_PROVIDER_AUTHENTICATION_SECRET` | Easy Auth client secret | Referenced by `authsettingsV2` |
| `WEBSITE_AUTH_ENABLED` | `True` *(platform-managed)* | Automatically injected by App Service when Easy Auth is enabled |

---

## 3. Database Initialization & Verse Import (Story 4.2)

To initialize collection indexes and seed/update all **35,379** Catholic World English Bible (WEB) verses from `data/WEB_Catholic_Version_for_game_updated.csv`:

1. Temporarily allow your operator IP on `ttb-cosmos-vcore` (`temp-init-ip`).
2. Run `npm run db:init` (creates indexes across `verses`, `users`, `results`, and `progress`).
3. Run `npm run import-data` (upserts `35,379` verses keyed on `verseOrder` in 71 batches of 500).
4. Delete the temporary firewall rule (`temp-init-ip`).

```sh
# With MONGODB_URI set in your shell environment:
npm run db:init
npm run import-data
```

### Production Verification Log (2026-11-17)

- **`npm run db:init` (Run 1):**
  `Database initialized in 2362ms: indexes={"verses":5,"users":4,"results":4,"progress":3}, verses=35379`
- **`npm run db:init` (Run 2 — idempotency verification):**
  `Database initialized in 525ms: indexes={"verses":5,"users":4,"results":4,"progress":3}, verses=35379`
- **`npm run import-data` (idempotency verification against seeded cluster):**
  `Import complete in 13740ms: total=35379, upserted=0, matched=35379, modified=0, retries=0`

---

## 4. Entra Sign-In, MFA, and Owner-Only Access (Story 4.3)

Defense-in-depth is enforced at **three independent layers**:

1. **Microsoft Entra Enterprise Application (`72df736a-e7d8-4e04-8d39-92c9a6f18cfd`):**
   - `signInAudience`: `AzureADMyOrg` (single tenant: `kingsbayanalytics.com`)
   - `appRoleAssignmentRequired`: `true`
   - Assigned users: Only `Mike Warren` (`mike@kingsbayanalytics.com`, OID `7d36efa4-7e3b-4222-8abc-17cb69fdc34b`). Any other account in or outside the tenant is blocked by Entra with `AADSTS50105` before redirecting back to the app.
   - **MFA enforcement:** Microsoft 365 / Entra Security Defaults require multifactor authentication on interactive sign-in for `mike@kingsbayanalytics.com`.
2. **Azure App Service Easy Auth (`authsettingsV2`):**
   - `requireAuthentication: true`, `unauthenticatedClientAction: RedirectToLoginPage`
   - `defaultAuthorizationPolicy.allowedPrincipals.identities`: `["7d36efa4-7e3b-4222-8abc-17cb69fdc34b"]`
   - Strips spoofed client `X-MS-CLIENT-PRINCIPAL*` headers and injects verified principal headers after token validation.
3. **Express API (`server/src/middleware/authMiddleware.ts`):**
   - When `AUTH_MODE=entra`, verifies `X-MS-CLIENT-PRINCIPAL-ID === OWNER_OID` (`401` if missing, `403` if mismatched), ignores `Authorization: Bearer` tokens, and returns `404` on `POST /api/users` and `POST /api/users/login`.

---

## 5. CI/CD Deployment Pipeline (Story 4.4)

- **CI Workflow (`.github/workflows/ci.yml`):** Runs on every `push` and `pull_request` to `main` (Node 22, `npm ci`, `npm run typecheck`, `npm test`, `npm run build`).
- **Deploy Workflow (`.github/workflows/deploy.yml`):**
  - Triggered via `workflow_run` only when `CI` completes with `conclusion == 'success'` on `main` (or manually via `workflow_dispatch`). A failing CI run never triggers deployment.
  - Uses passwordless OpenID Connect (`azure/login@v2` with `permissions: id-token: write`) federated to `repo:kingsbayanalytics/ttb:ref:refs/heads/main`.
  - GitHub Repository Variables (no secrets stored in GitHub):
    - `AZURE_CLIENT_ID`: `100058c1-3322-4938-8e78-0dea4dadf941`
    - `AZURE_TENANT_ID`: `165b7931-7abb-4263-b704-eef5a645c41f`
    - `AZURE_SUBSCRIPTION_ID`: `eb749f93-f254-4609-8900-a250b0f2d418`
    - `AZURE_WEBAPP_NAME`: `ttb-kingsbay`

---

## 6. Custom Domain & Managed TLS (Story 4.5)

### 6.1 DNS Records (`kingsbayanalytics.com` in Microsoft 365 Admin Center)

| Type | Host / Name | Value / Target | TTL |
|---|---|---|---|
| `TXT` | `asuid.ttb` | `B4938207C7F40FA40E68F9AE184A670E2BB77DD5D2E20B1FFCA17ADD7E974E8B` | 3600 (1 hr) |
| `CNAME` | `ttb` | `ttb-kingsbay.azurewebsites.net` | 3600 (1 hr) |

### 6.2 Hostname Binding & Managed Certificate Commands

Once the DNS records propagate:

```sh
# 1. Bind custom hostname to Web App
az webapp config hostname add \
  --webapp-name ttb-kingsbay \
  --resource-group rg-ttb \
  --hostname ttb.kingsbayanalytics.com

# 2. Create free App Service Managed Certificate
THUMBPRINT=$(az webapp config ssl create \
  --name ttb-kingsbay \
  --resource-group rg-ttb \
  --hostname ttb.kingsbayanalytics.com \
  --query thumbprint -o tsv)

# 3. Bind SNI SSL certificate to hostname
az rest \
  --method put \
  --url "https://management.azure.com/subscriptions/eb749f93-f254-4609-8900-a250b0f2d418/resourceGroups/rg-ttb/providers/Microsoft.Web/sites/ttb-kingsbay/hostNameBindings/ttb.kingsbayanalytics.com?api-version=2022-09-01" \
  --body "{
    \"location\": \"East US 2\",
    \"properties\": {
      \"siteName\": \"ttb-kingsbay\",
      \"hostNameType\": \"Verified\",
      \"sslState\": \"SniEnabled\",
      \"thumbprint\": \"$THUMBPRINT\"
    }
  }"

# 4. Allow custom domain Origin for Easy Auth cookie CSRF check on POST/PUT/DELETE
az webapp cors add \
  --name ttb-kingsbay \
  --resource-group rg-ttb \
  --allowed-origins "https://ttb.kingsbayanalytics.com" "https://ttb-kingsbay.azurewebsites.net"
```

---

## 7. Backup, Restore, and Rollback Procedures

### 7.1 Backup & Restore
- **Cosmos DB vCore Automatic Backups:** Azure Cosmos DB for MongoDB vCore continuously backs up all collections (`earliestRestoreTime` verified in cluster properties) with point-in-time restore (PITR) up to 35 days via Azure Portal or Support request.
- **Canonical Seed Data (`verses`):** All `35,379` verses live in git at `data/WEB_Catholic_Version_for_game_updated.csv` and can be restored deterministically at any time via `npm run db:init && npm run import-data`.

### 7.2 Application Rollback
1. **Redeploy a known-good commit:**
   - Open GitHub Actions -> **Deploy** workflow -> **Run workflow** (`workflow_dispatch`) or re-run the prior green **Deploy** workflow run.
   - Or deploy a prior commit locally via Azure CLI:
     ```sh
     git checkout <good-sha>
     npm run build
     # package and deploy via az webapp deploy --name ttb-kingsbay --resource-group rg-ttb
     ```
2. **Emergency Access Lock / Shutdown:**
   - Stop the Web App immediately via `az webapp stop --name ttb-kingsbay --resource-group rg-ttb`.

---

## 8. Live Acceptance Walkthrough Results (Story 4.5 — 2026-11-18)

| Check | Description | Observed Result | Verdict |
|---|---|---|---|
| **TLS & HTTPS Redirect** | `http://ttb.kingsbayanalytics.com/` and `https://ttb.kingsbayanalytics.com/` | `HTTP 301` redirect to `https://ttb.kingsbayanalytics.com/`; valid App Service Managed Certificate bound (`thumbprint: 2B8B26827A6755A6D452BBD29904DDEC8BF980A8`, `sslState: SniEnabled`, `SSL verify: 0`). | **PASS** |
| **UJ-1 (Sign in with MFA & type a verse)** | Navigate to `https://ttb.kingsbayanalytics.com`, authenticate via Microsoft Entra + MFA, complete a verse on `/typing` | Unauthenticated browser redirected (`HTTP 302`) to `login.windows.net/165b7931-7abb-4263-b704-eef5a645c41f/oauth2/v2.0/authorize`. After owner MFA sign-in (`mike@kingsbayanalytics.com`), navbar displayed Entra mode (`Dashboard`, `Progress`, `Profile`, `mike@kingsbayanalytics.com`, `Sign out` -> `/.auth/logout`; no `Login`/`Register`). Completed **1 Kings 16:17** (`POST /api/progress/result/6afc805493f491286c014820` -> `201 Created`). | **PASS** |
| **UJ-2 (Dashboard reflects it)** | Open `https://ttb.kingsbayanalytics.com/dashboard` | **Speed & Accuracy Trend** plotted `2026-11-18` (`100%` accuracy); **Daily Practice Activity** displayed `1 attempt across 1 active day in 2026`; **Bible Coverage** displayed `1 of 35379 verses completed` (`Old Testament: 1 of 27426`, `1 Kings: 0.1% (1/816)`). | **PASS** |
| **UJ-3 (Push deploys)** | Push commit to `main` (`3b73a06` -> `0b07309`) | GitHub Actions **CI** (`44337550633` & `44342201627`) passed, automatically triggering **Deploy** (`44337899268` & `44342650826`) via OIDC (`azure/login@v2` + `azure/webapps-deploy@v3`). Live app updated automatically without secrets. | **PASS** |
| **UJ-4 (Another account refused)** | Non-owner / unauthenticated access enforcement | Enterprise Application (`72df736a-e7d8-4e04-8d39-92c9a6f18cfd`) enforces `appRoleAssignmentRequired: true` with only `Mike Warren` (`7d36efa4-7e3b-4222-8abc-17cb69fdc34b`) assigned (refusing other Entra accounts with `AADSTS50105`); Easy Auth `allowedPrincipals.identities` and Express `authenticate` middleware (`X-MS-CLIENT-PRINCIPAL-ID === OWNER_OID`) return `401`/`403` to any non-owner request. | **PASS** |
| **Post-Restart Persistence** | `az webapp restart --name ttb-kingsbay --resource-group rg-ttb`, then reload `/dashboard` | After App Service restart, reloading `https://ttb.kingsbayanalytics.com/dashboard` returned `HTTP 200` on all `/api/stats/*` endpoints and retained `1 attempt across 1 active day in 2026` and `1 of 35379 verses completed` (`1 Kings: 1/816`). | **PASS** |

