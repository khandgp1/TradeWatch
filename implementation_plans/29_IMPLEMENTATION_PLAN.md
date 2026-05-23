# Implementation Plan 29: Fix TradeWatch UI Unreachable at 141.148.58.205

## Problem Summary

The TradeWatch UI is completely unreachable at `http://141.148.58.205`. Two distinct failure signatures were observed:

| Target | Error | Meaning |
|---|---|---|
| `:80` (Nginx) | `ERR_CONNECTION_REFUSED` | Port is reachable at IP level but **nothing is listening**, or the OS firewall is actively rejecting |
| `:3001` (Node direct) | `ERR_CONNECTION_TIMED_OUT` | Packets are being **silently dropped** — a firewall is blocking |

The VPS itself is online (connection refused ≠ unreachable). The issue is one or more of: **OCI firewall**, **OS-level iptables**, **Nginx down**, or **Node.js app crashed**.

---

## Phase 1: Oracle Cloud Console — Verify Network/Firewall Rules

> [!IMPORTANT]
> Oracle Cloud has **two layers** of firewall: the **VCN Security List** (cloud-level) and **iptables** (OS-level). Both must allow traffic on port 80.

### Step 1.1 — Verify the VCN Security List allows port 80 ingress (VERIFIED)

Based on the provided Security List screenshot, the ingress rules for **port 80** and **port 443** are already correctly configured in the Oracle Cloud Console:

- **Port 80 (HTTP):** Allowed from `0.0.0.0/0` (TCP, Stateless: No)
- **Port 443 (HTTPS):** Allowed from `0.0.0.0/0` (TCP, Stateless: No)

No manual changes are needed in the Oracle Cloud Console Security List. We can proceed directly to check other areas if needed or skip to Phase 2 (OS-level diagnostics).


### Step 1.2 — Check for Network Security Groups (NSG) (VERIFIED)

Based on the provided Primary VNIC screenshot, the **Network security groups** field is empty (`—`). 

No Network Security Groups (NSGs) are attached to this VNIC, meaning there are no additional cloud-level firewall rules blocking traffic here. Only the subnet's Security List rules (verified in Step 1.1) apply.


---

## Phase 2: SSH Into the Server — Diagnose Everything

### Step 2.1 — SSH in

```bash
ssh -i /Users/khandpv1/Desktop/.AntiGrav/TradeWatch/ssh-key-2026-05-21.key ubuntu@141.148.58.205
```

### Step 2.2 — Fix OS-level iptables (most likely root cause)

Oracle Cloud Ubuntu images ship with **iptables rules that DROP all inbound traffic by default**, even when the OCI Security List allows it. This is the #1 cause of "connection refused" on Oracle Cloud.

**Check current rules:**
```bash
sudo iptables -L INPUT -n --line-numbers
```

You will likely see something like:
```
Chain INPUT (policy ACCEPT)
num  target     prot  source    destination
1    ACCEPT     all   0.0.0.0/0  0.0.0.0/0  state RELATED,ESTABLISHED
2    ACCEPT     icmp  0.0.0.0/0  0.0.0.0/0
3    ACCEPT     all   0.0.0.0/0  0.0.0.0/0   (loopback)
4    ACCEPT     tcp   0.0.0.0/0  0.0.0.0/0  state NEW tcp dpt:22
5    REJECT     all   0.0.0.0/0  0.0.0.0/0  reject-with icmp-host-prohibited
```

Notice: **port 80 is NOT listed**, and rule 5 **rejects everything else**.

**Fix — Add port 80 BEFORE the reject rule:**
```bash
sudo iptables -I INPUT 5 -m state --state NEW -p tcp --dport 80 -j ACCEPT
```

**Make it persistent across reboots:**
```bash
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

**Verify the new rules:**
```bash
sudo iptables -L INPUT -n --line-numbers
```

You should now see port 80 accepted BEFORE the reject rule:
```
4    ACCEPT     tcp   0.0.0.0/0  0.0.0.0/0  state NEW tcp dpt:22
5    ACCEPT     tcp   0.0.0.0/0  0.0.0.0/0  state NEW tcp dpt:80   <-- NEW
6    REJECT     all   0.0.0.0/0  0.0.0.0/0  reject-with icmp-host-prohibited
```

### Step 2.3 — Check if Nginx is running

```bash
sudo systemctl status nginx
```

**If it says `inactive` or `failed`:**
```bash
# Check what went wrong
sudo journalctl -u nginx --no-pager -n 30

# Try starting it
sudo systemctl start nginx

# If it fails, test the config
sudo nginx -t
```

**If the config test fails**, re-create it:
```bash
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
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Step 2.4 — Check if the Node.js app is running via PM2

```bash
pm2 list
```

**If it shows `stopped`, `errored`, or nothing:**
```bash
# Check the logs for why it crashed
pm2 logs tradewatch --lines 50

# Attempt to restart
cd /home/ubuntu/tradewatch
pm2 restart tradewatch

# If that fails, try starting fresh
pm2 delete tradewatch
pm2 start ecosystem.config.cjs
pm2 save
```

**If PM2 itself is not found:**
```bash
sudo npm install -g pm2
cd /home/ubuntu/tradewatch
pm2 start ecosystem.config.cjs
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

### Step 2.5 — Verify ports are actually being listened on

```bash
sudo ss -tlnp | grep -E '80|3001'
```

You should see output like:
```
LISTEN  0  511  0.0.0.0:80    0.0.0.0:*  users:(("nginx", ...))
LISTEN  0  511  :::3001       :::*       users:(("node", ...))
```

If port 80 is missing → Nginx is down (go back to Step 2.3).
If port 3001 is missing → Node app is down (go back to Step 2.4).

### Step 2.6 — Test the full chain locally on the server

```bash
# Test Node.js directly
curl -s http://127.0.0.1:3001/api/health

# Test through Nginx
curl -s http://127.0.0.1:80/api/health
```

Both should return: `{"status":"ok","timestamp":"..."}`.

---

## Phase 3: Verify from External Machine

### Step 3.1 — Test from your Mac

After completing all fixes above, test from your local machine:

```bash
curl -s http://141.148.58.205/api/health
```

Expected: `{"status":"ok","timestamp":"..."}`

### Step 3.2 — Load the full UI

Open in your browser: `http://141.148.58.205`

Verify:
- The React frontend loads
- The candlestick chart renders with data
- WebSocket connections work (check for live updates)

---

## Quick Reference: Common Failure Scenarios

| Symptom | Likely Cause | Fix |
|---|---|---|
| Port 80 `CONNECTION_REFUSED` | iptables blocking OR Nginx down | Step 2.2 + Step 2.3 |
| Port 80 `TIMED_OUT` | OCI Security List missing rule | Step 1.1 |
| Port 80 `502 Bad Gateway` | Nginx is up but Node app is down | Step 2.4 |
| Port 80 shows Nginx welcome page | Nginx default site not removed | Re-run Step 2.3 config |
| Port 3001 `TIMED_OUT` | Expected — iptables only opens 80 | Not a problem |

---

## Progress Checklist

### Phase 1: Oracle Cloud Console
- [x] **1.1** Verify VCN Security List has port 80 ingress rule (Verified via screenshot)
- [x] **1.2** Check for Network Security Groups blocking traffic (Verified none attached via screenshot)

### Phase 2: SSH Server Diagnostics & Fixes
- [x] **2.1** SSH into the server successfully
- [x] **2.2** Fix iptables — add port 80 ACCEPT rule & persist it
- [x] **2.3** Verify/restart Nginx — ensure config is correct
- [x] **2.4** Verify/restart PM2 Node.js app
- [x] **2.5** Confirm both ports 80 and 3001 are listening
- [x] **2.6** Test the full chain locally on the server (`curl` both ports)

### Phase 3: External Verification
- [x] **3.1** `curl` health endpoint from local Mac
- [x] **3.2** Load full UI in browser — chart renders, WebSocket works
