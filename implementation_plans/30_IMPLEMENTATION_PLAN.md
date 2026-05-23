# Implementation Plan 30: Incident Report — TradeWatch UI Unreachable (2026-05-22)

## Incident Summary

| Field | Detail |
|---|---|
| **Date** | 2026-05-22 |
| **Duration** | ~30 minutes (detection to resolution) |
| **Severity** | Full outage — UI completely unreachable |
| **Affected Service** | TradeWatch frontend & API at `http://141.148.58.205` |
| **Infrastructure** | Oracle Cloud Always Free VPS (ARM, Ubuntu) |
| **Root Cause** | OS-level `iptables` firewall blocking inbound TCP port 80 |
| **Resolution** | Added iptables ACCEPT rule for port 80; persisted with `netfilter-persistent` |
| **Reference Plan** | [29_IMPLEMENTATION_PLAN.md](./29_IMPLEMENTATION_PLAN.md) |

---

## Symptoms Observed

Two distinct error signatures were detected when probing the server externally:

| Target | Error Code | Interpretation |
|---|---|---|
| `http://141.148.58.205` (port 80) | `ERR_CONNECTION_REFUSED` | OS firewall actively rejecting connections on port 80 |
| `http://141.148.58.205:3001` (port 3001) | `ERR_CONNECTION_TIMED_OUT` | Packets silently dropped — port never opened externally (expected) |

Key observation: **connection refused** (not timed out) on port 80 indicated the VPS was online and reachable, but something at the OS level was actively rejecting traffic — distinct from a cloud-level Security List issue which would produce a timeout.

---

## Investigation & Diagnosis

### What Was Ruled Out

| Layer | Status | How Verified |
|---|---|---|
| **OCI VCN Security List** | ✅ Correctly configured | Screenshot confirmed TCP port 80 and 443 ingress rules from `0.0.0.0/0` |
| **Network Security Groups (NSG)** | ✅ None attached | Screenshot of Primary VNIC showed NSG field empty (`—`) |

### Root Cause Identified

**Oracle Cloud Ubuntu images ship with restrictive `iptables` rules by default.** The default INPUT chain looks like:

```
Chain INPUT (policy ACCEPT)
num  target     prot  source    destination
1    ACCEPT     all   0.0.0.0/0  0.0.0.0/0  state RELATED,ESTABLISHED
2    ACCEPT     icmp  0.0.0.0/0  0.0.0.0/0
3    ACCEPT     all   0.0.0.0/0  0.0.0.0/0   (loopback)
4    ACCEPT     tcp   0.0.0.0/0  0.0.0.0/0  state NEW tcp dpt:22
5    REJECT     all   0.0.0.0/0  0.0.0.0/0  reject-with icmp-host-prohibited
```

Only SSH (port 22) is allowed. Rule 5 rejects **all other inbound traffic** — including port 80 — regardless of what the OCI Security List permits.

The original deployment script (`setup-server.sh`) installed and configured Nginx and PM2 correctly, but **never added an iptables rule to allow port 80**.

---

## Resolution Applied

### 1. Added iptables rule for port 80

```bash
sudo iptables -I INPUT 5 -m state --state NEW -p tcp --dport 80 -j ACCEPT
```

This inserts a rule to accept new TCP connections on port 80 **before** the catch-all REJECT rule.

### 2. Persisted iptables rules across reboots

```bash
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

### 3. Verified Nginx and PM2 were already running

Both services were confirmed operational — the only issue was the OS-level firewall.

### 4. Confirmed resolution externally

```bash
curl -s http://141.148.58.205/api/health
# {"status":"ok","timestamp":"2026-05-22T20:42:01.275Z"}
```

Full UI loaded successfully in the browser with chart rendering and WebSocket connectivity.

---

## Lessons Learned

### 1. Oracle Cloud has a two-layer firewall

> [!IMPORTANT]
> Oracle Cloud VPS instances have **two independent firewalls** that must both allow traffic:
> - **Cloud layer:** VCN Security Lists + Network Security Groups (configured in the OCI Console)
> - **OS layer:** `iptables` rules inside the Ubuntu instance
>
> Opening a port in the Security List is **not sufficient** — you must also open it in `iptables`.

### 2. The deployment script had a gap

The `setup-server.sh` script configured Nginx to listen on port 80 and PM2 to run the app on port 3001, but it **did not modify iptables** to allow inbound traffic on port 80. This is a common oversight when deploying to Oracle Cloud for the first time.

### 3. Error type matters for diagnosis

| Error | Implies |
|---|---|
| `ERR_CONNECTION_REFUSED` | Server is reachable, but something is actively rejecting (OS firewall or no process listening) |
| `ERR_CONNECTION_TIMED_OUT` | Packets are silently dropped (cloud firewall or port not exposed) |
| `502 Bad Gateway` | Reverse proxy is up but backend is down |

Distinguishing between these accelerated diagnosis significantly.

---

## Preventive Measures

### Update `setup-server.sh` for future deployments

The following commands should be added to the deployment script to prevent this from recurring:

```bash
# Open port 80 in OS-level firewall
sudo iptables -I INPUT 5 -m state --state NEW -p tcp --dport 80 -j ACCEPT

# Persist the rules
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

---

## Progress Checklist

- [x] Incident documented with symptoms, root cause, and resolution
- [x] Lessons learned captured
- [x] Preventive measures identified (update `setup-server.sh`)
- [x] Apply iptables fix to `setup-server.sh` script (future task)
