#!/bin/bash
# 数据库备份脚本
# 用法: ./scripts/backup-db.sh

set -e

# 配置
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_PATH="${DATABASE_URL:-./data/aidos.db}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="aidos_backup_$TIMESTAMP.db"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 检查数据库文件是否存在
if [ ! -f "$DB_PATH" ]; then
    echo "❌ 数据库文件不存在: $DB_PATH"
    exit 1
fi

# 执行备份
echo "📦 开始备份数据库..."
cp "$DB_PATH" "$BACKUP_DIR/$BACKUP_FILE"

# 压缩备份
echo "📦 压缩备份文件..."
gzip "$BACKUP_DIR/$BACKUP_FILE"

# 清理旧备份
echo "🧹 清理过期备份 (保留 $RETENTION_DAYS 天)..."
find "$BACKUP_DIR" -name "aidos_backup_*.db.gz" -mtime +$RETENTION_DAYS -delete

# 显示备份信息
BACKUP_SIZE=$(du -h "$BACKUP_DIR/${BACKUP_FILE}.gz" | cut -f1)
echo "✅ 备份完成: ${BACKUP_FILE}.gz ($BACKUP_SIZE)"

# 列出最近备份
echo "📋 最近备份:"
ls -lh "$BACKUP_DIR" | tail -5
