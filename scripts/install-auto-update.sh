#!/usr/bin/env bash
# Таймер systemd: раз в 10 минут проверять origin и выкатывать новые коммиты —
# как у InstaWorker, но со сдвигом по времени, чтобы две сборки Next не
# стартовали одновременно. Запуск: sudo bash scripts/install-auto-update.sh
set -Eeuo pipefail

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Run this installer with sudo."
  exit 1
fi

APP_DIR="${AILSHAN_APP_DIR:-/opt/ailshan/app}"
DEPLOY_SCRIPT="$APP_DIR/scripts/deploy.sh"

if [[ ! -f "$DEPLOY_SCRIPT" ]]; then
  echo "Deploy script not found: $DEPLOY_SCRIPT"
  exit 1
fi

cat > /etc/systemd/system/ailshan-update.service <<EOF
[Unit]
Description=Update and health-check Ailshan
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=$APP_DIR
Environment=AILSHAN_APP_DIR=$APP_DIR
ExecStart=/usr/bin/bash $DEPLOY_SCRIPT
TimeoutStartSec=1200
EOF

cat > /etc/systemd/system/ailshan-update.timer <<'EOF'
[Unit]
Description=Check Ailshan Git updates every 10 minutes

[Timer]
OnBootSec=6min
OnUnitActiveSec=10min
RandomizedDelaySec=120
Persistent=true
Unit=ailshan-update.service

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now ailshan-update.timer
systemctl start ailshan-update.service
systemctl status ailshan-update.timer --no-pager
