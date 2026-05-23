# Production Update Manual

This guide outlines the standard procedure for updating the TradeWatch repository on the Oracle Cloud VPS production server.

## Prerequisites
- You must have the SSH key available on your local machine: `ssh-key-2026-05-21.key`

## Update Procedure

Follow these steps in your local terminal to update the production environment with the latest code changes:

### 1. Connect to the VPS via SSH
Connect to the Oracle Cloud VPS using the appropriate SSH key:
```bash
ssh -i /Users/khandpv1/Desktop/.AntiGrav/TradeWatch/ssh-key-2026-05-21.key ubuntu@141.148.58.205
```

### 2. Navigate to the Application Directory
Once logged in, navigate to the TradeWatch project directory:
```bash
cd /home/ubuntu/tradewatch
```

### 3. Pull the Latest Changes
Fetch and pull the latest updates from the Git repository:
```bash
git pull origin main
```
*(If you deploy from a different branch, replace `main` with your branch name.)*

### 4. Install Dependencies
If any new packages were added to the `package.json` (in the root, server, or client), install them by running:
```bash
npm install
```

### 5. Rebuild the Frontend
Compile the React frontend with the latest changes:
```bash
npm run build
```

### 6. Restart the Backend Service
Restart the Node.js application managed by PM2 so that it picks up the latest backend code:
```bash
pm2 restart tradewatch
```

### 7. Verify the Deployment
Check the PM2 logs to ensure the application started successfully without errors:
```bash
pm2 logs tradewatch
```
*(Press `Ctrl+C` to exit the log view once verified.)*

## Additional Notes
- **Environment Variables**: If you added or modified any environment variables locally, remember to manually update the `.env` file on the server (`/home/ubuntu/tradewatch/server/.env`) before restarting the application.
- **Memory Issues**: If `npm run build` fails, the server might be running out of memory. If this occurs, you may need to temporarily stop PM2 (`pm2 stop tradewatch`) before building, and then start it again afterward.
