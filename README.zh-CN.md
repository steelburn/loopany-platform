<div align="center">

<img alt="Loopany" src="docs/assets/logo.svg" width="50">

# Loopany

**可调度的 Agent 循环。让系统始终在掌控之中。**

描述一次会反复发生的任务。Loopany 用**你自己机器上的 coding agent** 按计划
执行它，并把每次结果呈现在共享仪表盘和团队通知渠道里。

[![npm](https://img.shields.io/npm/v/@crewlet/loopany)](https://www.npmjs.com/package/@crewlet/loopany)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/superdesigndev/loopany-platform?style=flat)](https://github.com/superdesigndev/loopany-platform/stargazers)
[![Deploy](https://img.shields.io/github/actions/workflow/status/superdesigndev/loopany-platform/deploy.yml?label=deploy)](https://github.com/superdesigndev/loopany-platform/actions/workflows/deploy.yml)

[Website](https://loopany.ai) · [npm](https://www.npmjs.com/package/@crewlet/loopany) · [Contributing](CONTRIBUTING.md) · [Architecture](AGENTS.md)

**[English](README.md) | 简体中文**

</div>

## 什么是 Loopany？

Loopany 是面向**周期性 Agent 工作**的基础设施。你描述一个 loop - 每日健康检查、
每周市场研究、或一个带终点的目标如「跟进到发布安静为止」- 一台你控制的机器上
的小型 daemon，会用你本地的 coding agent 按计划跑它。

服务端（TanStack Start）只负责调度、存储、鉴权与通知。**它从不跑 LLM，也从不
执行你的代码。** 执行是 BYOA：[`@crewlet/loopany`](https://www.npmjs.com/package/@crewlet/loopany)
跑在*你的*机器上，带着*你的*凭据、文件和工具。你选择同步回来的产物成为持久
内容家；其余内容从不离开本机。

Loop 可以保持**开放**（无限期运行的监控或摘要），也可以**闭合**（有终点：目标
达成后 loop 自己完成）。

大多数现代 coding agent 已经能自己按 cron 跑、或自己循环执行任务。那只是容易
的 5% - 计时器。真正的工作，是让你能走开、让它仍可靠运行的那套结构。Loopany
就是那套结构（名字里有一点 *kybernetes*「舵手」的影子 - 但产品是控制面，不是
词源学）。一个裸的 agent 循环默认给不了你：

- **跨次运行的持久结构** - state 与 logs，让它不重复劳动、越跑越聪明；verifier
  让结果有证据而不是感觉；contract 与边界决定你能不能安全走开。原始 cron 循环
  默认什么都没有。
- **自我改进（evolve）** - 定期改写 loop 本身（更紧的 contract、更便宜的
  trigger、把机械步骤折进脚本），跑得越久越锋利、越便宜。自己拼的 loop 会
  停在第一天的笨拙。
- **团队面，而不是终端** - 共享仪表盘、按团队的通知渠道、失败告警。结果出现在
  团队能看见的地方，而不是本地终端滚屏。
- **BYOA + 厂商中立** - 在*你的*机器上用*你的* agent 和凭据跑；不锁死在某一家
  的 agent。换 agent 不必重做整套东西。
- **安全、便宜的控制面** - 服务端零 LLM、零代码执行；只调度、存储、鉴权、通知。
  你不必把代码或密钥交给某家 SaaS，只为了拿到调度能力。

描述一次 loop。你机器上的 agent 按计划转曲柄 - 观察、消化、行动、汇报 - 你的
注意力留给判断，而不是摇把手。

## 功能特性

- **可调度的 agent loop** - cron 或单次；开放监控或目标达成后自己结束的闭合
  目标。
- **BYOA 执行** - 经 `@crewlet/loopany` 在你的机器上运行；服务端零 LLM、零代码
  执行。凭据和工具留在本地。
- **自我改进的 loop** - evolve 通读运行历史，收紧 brief、蒸馏 state、打磨生成式
  仪表盘。
- **确定性预阶段** - 可选 workflow 体处理便宜的机械工作；失败时回退到 agent 并
  附带上下文。
- **团队与通知** - 多用户仪表盘、按团队推送渠道（Telegram、飞书；Slack 作为
  投递传输支持）、带防刷的失败告警。
- **同步产物家** - loop 文件夹进、仪表盘出；带 front-matter 的产物（报告、看板
  卡、日历）渲染为生成式 UI。
- **模板** - React Doctor、Market Research、Follow-up Tracker、Docs Sweep、
  Housekeeper、Dependency Triage、Error Sweep - 意图种子，不是僵硬流程。
- **可自托管** - 单进程；本地默认嵌入式 pglite，生产用 Postgres + 对象存储；
  含 Docker 镜像。

## 好 loop 的解剖

描述任务只是容易的 5%。真正的工作，是让你能走开、让它仍跑着的那套结构。我们
见过的好 loop，都遵循同一本 playbook。

### 好 loop 的四个部分

| 部分 | 是什么 |
| --- | --- |
| **Contract** | Agent 每次运行重读的一个文件：目标、边界围栏、步骤。围栏决定你能不能走开。 |
| **State + logs** | 跨次运行的持久记忆，不重复劳动，教训会留下。第三个月比第一周更聪明。 |
| **Verifier** | 工作与校验循环，直到有人一眼能看的证据。没证明，就不算完成。 |
| **Trigger** | 最便宜、且合适的触发：持续推进目标、cron 计划，或带门控的事件，空跑不花钱。 |

### 认真的 loop 会拆成三种角色

简单的 loop 是一个 agent 包办一切。一旦 loop 要向真人交付真实工作，它会拆开：

1. **Orchestrator** - 找工作（读变化、挑出本次最值得做的一件事）。它自己不做
   活。
2. **Executor** - 在隔离通道里干活（每个任务一个新 worktree），通道互不碰你的
   checkout，也不碰彼此。
3. **Verifier** - 独立证明结果并附上证据。你审的是这份证明。

你批准的是证据，不是 diff。

### Evolve，否则 loop 会停在第一天的笨拙

脆弱的系统遇到坏运行就垮。健壮的能扛住。**反脆弱**的 loop 会因此更强：定期的
evolve 通读最近十几次运行，问钱浪费在哪、哪条边界太松、哪个错误在反复出现。

它的产出不是产品工作，而是对 loop 本身的改动 - 更紧的 contract、更便宜的
trigger、把机械步骤折进脚本与 skill。一个改进 loop 的 loop，所以跑得越久越
锋利、越便宜。

Loopany 默认带上护栏：每个 loop 自带 contract、state 与 logs；每次运行开头重读
边界；时间 / 事件 / 门控 trigger；通读自身历史的 evolve；每个 loop 有专门的
仪表盘，而不是一串要滚的日志。

---

## 快速开始（连接到服务器）

**托管应用：** 在 **[https://loopany.ai](https://loopany.ai)** 登录 - 或使用你
自己的自托管实例。你还需要一台你控制的机器来跑 loop。

1. **登录** Loopany Web 应用 [loopany.ai](https://loopany.ai)（或你的自托管
   实例）。
2. **创建 loop。** *New loop* 对话框会给你一段简短的 **connect snippet**，含
   服务器 URL 和一次性 connect-key。也可以从**模板**开始 - *New loop* 旁的卡片
   （如 *React Doctor*）会给你同样的 snippet，并填好任务描述。
3. **连接你的机器。** 把整段 snippet 贴进本地 coding agent - 它会连上机器并和你
   一起建 loop。也可以直接启动 daemon：

   ```bash
   npx @crewlet/loopany up --server-url <server-url> --connect-key <connect-key>
   ```

### Daemon 速查

`npx @crewlet/loopany --help` 看全部命令：

| 命令 | 作用 |
| --- | --- |
| `up` / `up --foreground` | 连接并启动轮询（后台 / 前台） |
| `status` / `down` | daemon 是否在跑 + 连接状态 / 停止 |
| `log` | 查看某 loop 最近的运行（`--transcript` 看全文） |
| `new` / `edit` | 创建或修补 loop（JSON 配置） |
| `@latest update` | 原地升级 daemon（仪表盘会标出过期的） |

---

## 工作原理

Loopany = 一个服务端进程 + 每台机器一个 daemon。服务端从不跑 LLM、从不执行你的
代码 - 只调度、存产物、鉴权、通知。执行发生在**你的**机器上，经
[`@crewlet/loopany`](https://www.npmjs.com/package/@crewlet/loopany) daemon 与
本地 coding agent 对话。

```
┌── Loopany server (TanStack Start · one process · zero code-exec · zero LLM) ──┐
│  dashboard + server fns · Better Auth · in-process Scheduler (croner)          │
│  machine routes: /api/machine/cli (unified CLI dispatch) · /api/machine/poll     │
│                  /machine/report · /api/machine/sync · /api/machine/blob/:hash    │
│                  /agent-api/loop · /api/machine/loop|log (legacy CLI aliases)     │
│  Postgres (Drizzle; embedded pglite by default) · artifact bytes in object store │
└───────────▲ HTTP poll (idle long-poll) ────────────────────────────────────────┘
            │
┌───────────┴── @crewlet/loopany (your machine · `npx`) ──────────────────────────┐
│  polls for due runs → runs the task with your local coding agent                 │
│  syncs artifacts + reports the result back via the `loopany` callback            │
└──────────────────────────────────────────────────────────────────────────────────┘
```

调度器 tick 创建一个 *pending run*；绑定机器的下次 poll 领取它，跑 agent，回报
结果（可推到 loop 的推送渠道）。因为 agent 在你机器上跑，凭据、文件和工具从不
离开本机 - 服务端只存你选择同步回来的字节。

---

## 自己跑服务端

### 前置条件

- Node.js >= 22
- pnpm 8.15（由根目录 `packageManager` 字段钉死；`corepack enable` 会自动
  选用）

### 本地开发

```bash
git clone https://github.com/superdesigndev/loopany-platform
cd loopany-platform
pnpm install
pnpm dev            # http://127.0.0.1:3000
```

开箱即用的完整服务端：鉴权关闭（应用开放运行），数据库是嵌入、文件持久化的
**pglite** Postgres，位于 `~/.loopany/pgdata`（零外部 DB - 启动时自迁移），产物
字节存在内存。用上面的快速开始，对着 `http://127.0.0.1:3000` 连机器即可。

配置全部走环境变量。**仅本地开发**时，把 [`.env.example`](.env.example) 复制到
`packages/server/.env` 并按需取消注释 - vite 会为 `pnpm dev` 加载该文件。
**`pnpm start` 与 Docker 不读 `.env`**：生产环境请传真实环境变量（Fly secrets、
`docker -e` / `--env-file`、或 systemd `Environment=`），不要提交 `.env`。

### 生产（任意 Node 主机）

```bash
pnpm install
pnpm build          # nitro build → packages/server/.output
pnpm start          # 应用待执行的 DB 迁移，然后在 $PORT 上服务
```

真实部署至少要设置：

- **Database** - 要么把 `DATABASE_URL` 指到 Postgres（如 Supabase；事务连接池
  `:6543`，再加 `DIRECT_DATABASE_URL` 指向直连 `:5432` 做迁移），要么两者都
  不设，并设 **`LOOPANY_DB=pglite`** 加持久的 `LOOPANY_DATA_DIR` - 嵌入式
  pglite 数据库在 `<dir>/pgdata`。构建后的服务端会把缺失的 `DATABASE_URL` 当作
  配置错误，除非 `LOOPANY_DB=pglite` 明确选择嵌入层（这样丢了数据库密钥会响亮
  失败，而不是默默启动一个空的临时 DB）；只有 `pnpm dev` 不需要这个 opt-in 也能
  跑 pglite。`pnpm start` 在服务前应用待执行迁移（托管层走直连 URL；pglite 层
  进程内迁移）。
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` + `LOOPANY_AUTH_SECRET`（一长串
  随机值）+ `LOOPANY_BASE_URL` + `LOOPANY_ALLOWED_LOGINS` - 用 GitHub 门禁登录。
  不设这些则应用**开放、无鉴权** - 本地可以，公网不行。
- `LOOPANY_R2_*` - S3 兼容对象存储（如 Cloudflare R2）存产物字节。不设则存在
  内存，重启即失。

> **对公网暴露服务端？请设鉴权变量。** `GITHUB_CLIENT_ID` /
> `GITHUB_CLIENT_SECRET` / `LOOPANY_AUTH_SECRET` / `LOOPANY_BASE_URL` /
> `LOOPANY_ALLOWED_LOGINS` 未设时，应用**开放、无需登录** - 能访问的人都进得去。
> 裸 Node 主机与下方 Docker 镜像同样适用。

> **只跑一个服务端进程。** 进程内调度器拥有 cron 循环；同一 DB 上两个进程会
> 双发每一次 run。

> **备份嵌入式 pglite 层。** `<LOOPANY_DATA_DIR>/pgdata` 是**在线**的 Postgres
> 数据目录。复制前先停服务端 - 热拷贝运行中的数据目录不保证崩溃一致性。若要
> 真正的在线备份，用托管层（`DATABASE_URL`/Supabase 提供时间点恢复）。

### Docker

附带的 [`Dockerfile`](Dockerfile) 构建服务端。嵌入式 pglite 需 `LOOPANY_DB=pglite`
并把 `/data` 挂到 volume；有 `DATABASE_URL`（Supabase/任意 Postgres）时容器无
状态、无需 volume。（opt-in 是故意的：否则丢了 `DATABASE_URL` 的容器会默默启动
空的临时库 - 现在会拒绝启动。）

```bash
docker build -t loopany .
# Embedded pglite (opt in + persist the DB on a volume):
docker run -p 3000:3000 -e LOOPANY_DB=pglite -v loopany-data:/data loopany
# Or against Postgres (stateless):
docker run -p 3000:3000 -e DATABASE_URL=... -e DIRECT_DATABASE_URL=... loopany
```

用 `-e KEY=value` 或 `--env-file` 传配置（变量同 [`.env.example`](.env.example)）。

### 团队

开启登录后，仪表盘的 *Teams* 按钮管理成员：创建、重命名或删除团队（仍有 loop
时不能删）、设置角色（owner 或 member）、用邮箱或一次性 7 天邀请链接
（`/invite/<token>`）加人。团队管理仅 owner；任何成员仍可创建 loop。邀请不会
扩大能登录的人 - 兑换者必须已通过 `LOOPANY_ALLOWED_LOGINS`。每人有一个不能删除、
不能退出、只能改名的个人团队。开放模式（无登录）完全隐藏这部分。

### 通知

推送渠道在仪表盘按团队配置（*Notifications* 弹窗）- Telegram 与飞书有添加表单；
Slack 是支持的投递传输。渠道密钥存在服务端、按团队，从不进环境变量。失败告警
走同一渠道：失败运行或机器离线会推送（防刷：第一次失败，之后每第 5 次）。

---

## 开发

```bash
pnpm dev            # server on http://127.0.0.1:3000
pnpm -r test        # all tests
pnpm -r typecheck   # both packages
```

贡献者指南见 [`CONTRIBUTING.md`](CONTRIBUTING.md)（迁移、发布、PR 流程），架构
说明见 [`AGENTS.md`](AGENTS.md)。

## 许可

[MIT](LICENSE) - 每个包都是 MIT：

- 机器侧 daemon [`@crewlet/loopany`](packages/daemon) 为
  [MIT](packages/daemon/LICENSE)。
- 平台服务端 [`@loopany/server`](packages/server) 为
  [MIT](packages/server/LICENSE)。

© 2026 Superdesign。贡献按 MIT 接受（inbound=outbound）- 无需 CLA，无需
sign-off。
