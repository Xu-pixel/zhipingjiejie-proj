# syntax=docker/dockerfile:1

# 固定版本，避免构建不一致
ARG BUN_VERSION=1.3

# ============================
# 构建阶段
# ============================
FROM oven/bun:${BUN_VERSION}-slim AS builder

WORKDIR /app

# 先复制依赖清单，利用缓存层
COPY package.json bun.lock ./

# 安装依赖（忽略脚本，避免在 builder 中跑原生构建）
RUN bun install --frozen-lockfile

# 复制源码
COPY . .

# 构建 Next.js（standalone 输出）
RUN bun run build

# ============================
# 运行阶段
# ============================
FROM oven/bun:${BUN_VERSION}-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

#  standalone 产物只包含运行所需文件
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

# Next.js standalone 入口在 server.js
CMD ["bun", "server.js"]
