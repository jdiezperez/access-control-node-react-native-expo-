# Running the Access Control System

This project is divided into three main parts: `backend`, `web`, and `mobile`.

## 1. Backend (Node.js + SQLite)
The backend manages all data and authentication.

```bash
cd backend
npm install
node index.js
```
- **Default Admin**: `admin@example.com` / `admin123`
- **Port**: `5000`

## 2. Web Frontend (React + Vite + Tailwind)
The web interface for Admins to manage events and Attendees to confirm registration.

```bash
cd web
npm install
npm run dev
```
- **Port**: `5173` (default Vite)
- **Admin Section**: `/admin`
- **Public Confirmation**: `/confirm/:invitation_code`

## 3. Mobile App (Expo + NativeWind)
The mobile app for Admins to scan QR codes at event entrances.

```bash
cd mobile
npm install
npx expo start
```
- **Note**: If testing on a physical device, update the API URLs in `LoginScreen.tsx`, `EventSelectionScreen.tsx`, and `ScannerScreen.tsx` to your machine's local IP (e.g., `http://192.168.1.XX:5000`).

## Testing the Flow
1. **Login as Admin** on the Web App (`/admin`).
2. **Update Company Info** in the Dashboard.
3. **Create an Event** in the Events page.
4. **Add an Attendee** (You can do this via the Database or I can add a UI for it in the next step).
5. **Invite the Attendee**: The backend will generate an invitation code.
6. **Confirm Attendance**: Open `http://localhost:5173/confirm/<CODE>` in your browser. Fill in the data and download the badge.
7. **Scan Badge**: Open the Mobile app, select the event, and scan the QR code from the badge.
