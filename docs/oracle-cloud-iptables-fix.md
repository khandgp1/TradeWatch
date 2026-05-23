# Oracle Cloud Port 80 Connection Refused Fix

**Symptom:** You've deployed a web server to an Oracle Cloud Ubuntu VPS. The cloud Security List allows port 80, but external requests get `ERR_CONNECTION_REFUSED`.

**Root Cause:** Oracle Cloud's default Ubuntu images come with strict `iptables` rules at the OS level that reject all inbound traffic except SSH (port 22). Opening the port in the Oracle Cloud Console is not enough.

## The Fix

SSH into your server and run the following commands to allow port 80 and save the configuration so it persists after reboots.

```bash
# 1. Insert a rule to allow incoming HTTP traffic on port 80
sudo iptables -I INPUT 5 -m state --state NEW -p tcp --dport 80 -j ACCEPT

# 2. (Optional) Insert a rule for HTTPS on port 443
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT

# 3. Install iptables-persistent to save the rules
sudo apt update
sudo DEBIAN_FRONTEND=noninteractive apt install -y iptables-persistent

# 4. Save the current iptables configuration
sudo netfilter-persistent save
```

### Verification

Run `sudo iptables -L INPUT -n --line-numbers`.

You should see your new `ACCEPT` rules listed **before** the `REJECT` rule.

```text
4    ACCEPT     tcp   0.0.0.0/0  0.0.0.0/0  state NEW tcp dpt:22
5    ACCEPT     tcp   0.0.0.0/0  0.0.0.0/0  state NEW tcp dpt:80
6    REJECT     all   0.0.0.0/0  0.0.0.0/0  reject-with icmp-host-prohibited
```
