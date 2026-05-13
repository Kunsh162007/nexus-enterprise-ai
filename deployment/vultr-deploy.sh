#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#   NEXUS Enterprise AI — Vultr Deployment Script
#   Ubuntu 22.04 LTS — Docker Compose deployment
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()    { echo -e "${BLUE}[NEXUS]${NC} $*"; }
ok()     { echo -e "${GREEN}[OK]${NC} $*"; }
warn()   { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()    { echo -e "${RED}[ERR]${NC} $*"; exit 1; }

echo -e "${BOLD}"
cat << 'EOF'
  ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗
  ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝
  ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗
  ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║
  ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║
  ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝
  Enterprise AI Command Center — Vultr Deploy
EOF
echo -e "${NC}"

# ── Prerequisites check ──────────────────────────────────────────
log "Checking prerequisites..."

if [ "$EUID" -ne 0 ]; then
  err "Please run as root (sudo bash vultr-deploy.sh)"
fi

if [ -z "${DOMAIN:-}" ]; then
  warn "DOMAIN not set. Using server IP. Set DOMAIN=yourdomain.com for HTTPS."
  DOMAIN=$(curl -s ifconfig.me 2>/dev/null || echo "localhost")
fi

# ── System Update ────────────────────────────────────────────────
log "Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq
ok "System updated"

# ── Install Docker ───────────────────────────────────────────────
log "Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  ok "Docker installed"
else
  ok "Docker already installed"
fi

# ── Install Docker Compose ───────────────────────────────────────
log "Installing Docker Compose..."
if ! command -v docker-compose &>/dev/null; then
  COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
  curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
    -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
  ok "Docker Compose installed"
else
  ok "Docker Compose already installed"
fi

# ── Install Nginx for reverse proxy (optional HTTPS) ─────────────
log "Installing Nginx..."
apt-get install -y nginx certbot python3-certbot-nginx -qq
ok "Nginx installed"

# ── Clone / Update Project ───────────────────────────────────────
APP_DIR="/opt/nexus"
log "Setting up application directory: ${APP_DIR}"

if [ -d "$APP_DIR" ]; then
  warn "Directory exists. Pulling latest..."
  cd "$APP_DIR" && git pull || true
else
  # Replace with your actual repo URL
  REPO_URL="${REPO_URL:-https://github.com/YOUR_USERNAME/nexus-enterprise-ai.git}"
  git clone "$REPO_URL" "$APP_DIR"
  ok "Repository cloned"
fi

cd "$APP_DIR"

# ── Environment Setup ────────────────────────────────────────────
log "Setting up environment..."
if [ ! -f .env ]; then
  cp .env.example .env
  warn "Created .env from template. Edit /opt/nexus/.env with your API keys!"
  warn "  nano /opt/nexus/.env"
  warn ""
  warn "Required keys:"
  warn "  GEMINI_API_KEY=..."
  warn "  FEATHERLESS_API_KEY=..."
  warn "  SPEECHMATICS_API_KEY=..."
fi

# Patch frontend URLs in env
sed -i "s|VITE_API_URL=.*|VITE_API_URL=http://${DOMAIN}|" .env
sed -i "s|VITE_WS_URL=.*|VITE_WS_URL=ws://${DOMAIN}/ws|" .env

# ── Nginx Reverse Proxy Config ───────────────────────────────────
log "Configuring Nginx reverse proxy..."
cat > /etc/nginx/sites-available/nexus << NGINX_EOF
server {
    listen 80;
    server_name ${DOMAIN};

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # WebSocket (critical for real-time agent streaming)
    location /ws {
        proxy_pass http://localhost:8000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:8000/health;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/nexus /etc/nginx/sites-enabled/nexus
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
ok "Nginx configured"

# ── Firewall ─────────────────────────────────────────────────────
log "Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow http
ufw allow https
ok "Firewall configured"

# ── Build & Start ────────────────────────────────────────────────
log "Building Docker containers (this may take 2-3 minutes)..."
docker-compose build --no-cache

log "Starting NEXUS services..."
docker-compose up -d
ok "Containers started"

# ── Health Check ─────────────────────────────────────────────────
log "Waiting for backend to be healthy..."
for i in {1..30}; do
  if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    ok "Backend healthy!"
    break
  fi
  sleep 2
  echo -n "."
done

# ── HTTPS Setup (optional) ───────────────────────────────────────
if [[ "${DOMAIN}" != *"."* ]]; then
  warn "Domain looks like an IP — skipping SSL setup."
  warn "To add HTTPS later: certbot --nginx -d yourdomain.com"
else
  log "Setting up HTTPS with Let's Encrypt..."
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos \
    --email "admin@${DOMAIN}" --redirect || warn "SSL setup failed — configure manually"
fi

# ── Docker Auto-restart ──────────────────────────────────────────
log "Creating systemd service for auto-restart..."
cat > /etc/systemd/system/nexus.service << SERVICE_EOF
[Unit]
Description=NEXUS Enterprise AI
After=docker.service
Requires=docker.service

[Service]
WorkingDirectory=/opt/nexus
ExecStart=/usr/local/bin/docker-compose up
ExecStop=/usr/local/bin/docker-compose down
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE_EOF

systemctl daemon-reload
systemctl enable nexus
ok "Auto-restart configured"

# ── Done! ────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  NEXUS deployed successfully on Vultr! 🚀     ${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "  🌐 Frontend:  http://${DOMAIN}"
echo -e "  🔌 API:       http://${DOMAIN}/health"
echo -e "  📋 Logs:      docker-compose -f /opt/nexus/docker-compose.yml logs -f"
echo ""
echo -e "${YELLOW}  ⚠️  Remember to add your API keys:${NC}"
echo -e "     nano /opt/nexus/.env"
echo -e "     docker-compose -f /opt/nexus/docker-compose.yml restart"
echo ""
