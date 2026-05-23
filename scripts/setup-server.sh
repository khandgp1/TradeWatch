#!/bin/bash

# Secure the SSH key
chmod 400 /Users/khandpv1/Desktop/.AntiGrav/TradeWatch/ssh-key-2026-05-21.key

# Connect and run setup
ssh -o StrictHostKeyChecking=accept-new -i /Users/khandpv1/Desktop/.AntiGrav/TradeWatch/ssh-key-2026-05-21.key ubuntu@141.148.58.205 << 'EOF'
  set -e

  echo "1. Updating system and installing dependencies..."
  sudo apt update && sudo DEBIAN_FRONTEND=noninteractive apt upgrade -y
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs nginx git iptables-persistent
  sudo npm install -g pm2

  echo "1.5 Configuring OS Firewall (iptables)..."
  sudo iptables -I INPUT 5 -m state --state NEW -p tcp --dport 80 -j ACCEPT || true
  sudo netfilter-persistent save

  echo "2. Cloning the repository..."
  cd /home/ubuntu
  if [ -d "tradewatch" ]; then
    echo "Directory tradewatch already exists. Pulling latest changes..."
    cd tradewatch
    git pull
  else
    git clone https://github.com/khandgp1/TradeWatch.git tradewatch
    cd tradewatch
  fi
  
  # Checkout the deployment branch
  git checkout Public-Deployment-Phase-2

  echo "3. Installing NPM dependencies and building..."
  # Clean corrupted node_modules from previous attempts
  rm -rf /home/ubuntu/tradewatch/node_modules
  rm -rf /home/ubuntu/tradewatch/server/node_modules
  rm -rf /home/ubuntu/tradewatch/client/node_modules
  rm -rf /home/ubuntu/tradewatch/shared/node_modules
  npm install

  # Fix: drizzle-kit is in root/node_modules but drizzle-orm is in server/node_modules.
  # drizzle-kit resolves drizzle-orm from its own location, so symlink it up to root.
  ln -sf ../server/node_modules/drizzle-orm /home/ubuntu/tradewatch/node_modules/drizzle-orm

  # Ensure the SQLite database directory exists
  mkdir -p /home/ubuntu/tradewatch/server/data

  npm run db:push -w server
  npm run build

  echo "4. Starting app with PM2..."
  pm2 start ecosystem.config.cjs
  pm2 save
  sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu

  echo "5. Configuring Nginx Reverse Proxy..."
  sudo bash -c 'cat > /etc/nginx/sites-available/tradewatch << "NGINX"
server {
    listen 80;
    server_name 141.148.58.205;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX'

  sudo ln -sf /etc/nginx/sites-available/tradewatch /etc/nginx/sites-enabled/
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo systemctl reload nginx

  echo "Setup Complete!"
EOF
