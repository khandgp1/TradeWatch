# Implementation Plan 31: Add .env File to Oracle Cloud VPS

## Objective

To securely transfer the `server/.env` file containing Telegram API credentials from the local machine to the production Oracle Cloud VPS without committing it to the remote Git repository. This will restore the Telegram alert functionality on the production server.

## Step-by-Step Instructions

### Step 1: Securely Copy (SCP) the .env file to the VPS

The most straightforward and secure way to transfer the file without using Git is by using SCP (Secure Copy Protocol). We will securely copy your local `server/.env` file directly to the `tradewatch/server/` directory on the Oracle VPS.

1. Open your local terminal (ensure you are in the project root: `.../TradeWatch`).
2. Run the following exact SCP command to transfer the file:
   ```bash
   scp -i /Users/khandpv1/Desktop/.AntiGrav/TradeWatch/ssh-key-2026-05-21.key /Users/khandpv1/Desktop/.AntiGrav/TradeWatch/server/.env ubuntu@141.148.58.205:/home/ubuntu/tradewatch/server/.env
   ```

*Alternative (Manual Method via SSH):*
If the SCP command is giving you trouble, you can SSH into the VPS and create the file manually:
1. `ssh -i /Users/khandpv1/Desktop/.AntiGrav/TradeWatch/ssh-key-2026-05-21.key ubuntu@141.148.58.205`
2. `nano /home/ubuntu/tradewatch/server/.env`
3. Paste the contents of your local `server/.env` file into the editor.
4. Save the file (Ctrl+O, then Enter) and exit (Ctrl+X).

### Step 2: Restart the PM2 Process

Once the `.env` file is successfully in place on the server, the Node.js background process needs to be restarted so it can load the new environment variables into memory.

1. SSH into the server (if you aren't already connected):
   ```bash
   ssh -i /Users/khandpv1/Desktop/.AntiGrav/TradeWatch/ssh-key-2026-05-21.key ubuntu@141.148.58.205
   ```
2. Restart the TradeWatch application using PM2:
   ```bash
   pm2 restart tradewatch
   ```
3. (Optional) Check the PM2 logs to ensure the application started correctly and the Telegram service found the file:
   ```bash
   pm2 logs tradewatch --lines 20
   ```

---

## Progress Checklist

- [ ] **Step 1:** Transfer `server/.env` to `/home/ubuntu/tradewatch/server/.env` on the Oracle Cloud VPS (via `scp` or manual `nano`).
- [ ] **Step 2:** SSH into the Oracle Cloud VPS.
- [ ] **Step 3:** Restart the application using `pm2 restart tradewatch`.
- [ ] **Step 4:** Verify the PM2 logs to ensure no more "missing `.env`" Telegram errors are firing.
