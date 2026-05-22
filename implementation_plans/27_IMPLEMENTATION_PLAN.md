# Implementation Plan 27: Oracle Cloud VPS Setup

## Objective
This plan outlines the steps required to provision the Oracle Cloud VPS instance, configure networking, and prepare the SSH access needed to deploy the TradeWatch application.

## Step-by-Step Instructions

### Step 1: Provision Oracle Cloud VPS Instance
1. Go to [cloud.oracle.com](https://cloud.oracle.com) and sign in or create an account.
2. Navigate to **Compute -> Instances** and click **Create Instance**.
3. **Important settings for the Always Free tier:**
   - **Shape:** Click "Edit" on Shape and select `Ampere` -> `VM.Standard.A1.Flex` (ARM). Select at least 1 OCPU and 6 GB RAM (up to 4 OCPUs and 24 GB RAM max).
   - **Image:** Click "Edit" on Image and select **Ubuntu 22.04** (or the latest Ubuntu LTS available).
4. **SSH Keys:** Under the "Add SSH keys" section, make sure to click **Save private key** and download it to your local machine.

### Step 2: Configure Networking (Open Ports)
Once the instance is running, open the necessary ports:
1. Click on the attached **Subnet**.
2. Click on the **Default Security List**.
3. Add two **Ingress Rules**:
   - Rule 1: Destination Port: `80` (for HTTP), Source CIDR: `0.0.0.0/0`
   - Rule 2: Destination Port: `443` (for HTTPS), Source CIDR: `0.0.0.0/0`

### Step 3: Provide Access Details
Once the instance is set up, provide the following to the AI Dev Agent to automate the rest of the server setup:
1. The **Public IP Address** of your new instance.
2. The **absolute path to the private SSH key file** you downloaded (e.g., `/Users/khandpv1/Downloads/ssh-key-2026-05-21.key`).

---

## Progress Checklist

- [x] **Step 1:** Provision Oracle Cloud VPS Instance (Ubuntu 22.04, Ampere A1).
- [x] **Step 2:** Download and save the SSH Private Key locally.
- [x] **Step 3:** Configure Networking (Open Ports 80 and 443 in Ingress Rules).
- [x] **Step 4:** Provide the Public IP Address and SSH Key path to the agent.
