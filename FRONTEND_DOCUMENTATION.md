# Kairox Leather Intelligence & Traceability Platform
## Frontend Architecture & Documentation

### 1. Project Overview
The Kairox Leather Platform is a modern, responsive, web-based dashboard designed for real-time tracking of leather factory production, wage management, and quality control traceability. It is built specifically with a mobile-first approach to ensure shop floor managers and workers can interact with the system seamlessly via tablets and mobile devices.

### 2. Technology Stack
*   **Framework:** Next.js (App Router)
*   **UI Library:** React 19
*   **Styling:** Tailwind CSS v4 (configured via `globals.css` with inline theme tokens)
*   **Typography:** Google Font 'Lato' (optimized for readability under factory lighting)
*   **Icons:** Lucide-React
*   **State Management:** React Context API (`AuthContext`, `DataContext`)
*   **Language:** Pure JavaScript (No TypeScript)

### 3. Folder Structure & Architecture
The application strictly follows the Next.js App Router (`src/app`) methodology.

```text
src/
├── app/
│   ├── globals.css                # Tailwind v4 theme tokens, custom scrollbars, and base styles
│   ├── layout.js                  # Root layout containing global Context Providers & Font settings
│   ├── page.js                    # Dispatcher route (Redirects based on auth state)
│   ├── login/page.js              # Role-based Persona Selector screen
│   └── dashboard/                 # Protected routes shell
│       ├── layout.js              # Dashboard layout (Sidebar, Mobile Menu, Header, Air Freight Alert)
│       ├── page.js                # Main KPI metrics and live Shop Floor Stream
│       ├── entry/page.js          # Production Logger form (Role-gated)
│       ├── progress/page.js       # Stage-Spread Progress table for piece conservation tracking
│       ├── orders/page.js         # Interactive Client -> PO -> SKU Collapsible Tree Browser
│       ├── wages/page.js          # Piece-Rate Wage Calculator and Payroll Freezer
│       ├── simulator/page.js      # Interactive Delay Impact & Profit Margin Simulator
│       └── tracer/page.js         # Garment QC Barcode/QR tracing timeline
├── components/                    # Reusable UI widgets
│   ├── MetricCard.jsx             # KPI statistic card with trend indicators
│   ├── OrderProgressBar.jsx       # Dynamic progress bar altering colors based on freight risk
│   └── TimelineItem.jsx           # Vertical stepper node for the QC Tracer
├── context/                       # Global State Management
│   ├── AuthContext.js             # Manages user session, active roles, and operational permissions
│   └── DataContext.js             # LocalStorage-backed reactive database state (events, orders, wages)
└── hooks/
    └── useMockData.js             # Constants serving as the initial seed for the mock database
```

### 4. Core Features & Business Logic

#### A. Role-Based Access Control (RBAC)
The application handles permissions dynamically via `AuthContext.js`.
*   **Direct Manager:** Full read/write access. Can log any operation, access all screens, and execute/freeze payroll computations.
*   **Cutting Floor Manager:** Can only log pieces for the "Cutting" operation.
*   **Stitching Floor Manager:** Can log assembly operations (Fusing, Pasting, Shell stitch, Lining attach, etc.).
*   **Auditor / Viewer:** Read-only access. The Production Logger displays a restricted access lock screen.

#### B. Live Local Database (State Management)
To simulate a real backend environment without a database, `DataContext.js` manages state globally.
*   Initializes from `useMockData.js`.
*   Synchronizes actively with the browser's `localStorage` so data persists across page refreshes.
*   Automatically recalculates order progress percentages and Air Freight risk statuses whenever a new shop floor event is logged.

#### C. Delay Impact Simulator
A mathematical modeling screen (`/dashboard/simulator`) utilizing interactive sliders:
*   Calculates **Total Overrun Days** based on Material Delays, QC Defect Rates, and Worker Absenteeism.
*   Automatically triggers an **Air Freight Alert** if the delay exceeds 2 days past the deadline.
*   Dynamically projects the gross profit margin drop (Base 50% dropping down to 15% under Air Freight penalties) and expected net earnings in INR (₹).

#### D. Piece Conservation & Stage Progress
The `/dashboard/progress` screen handles piece counting discrepancies as *signals* rather than errors. It allows managers to visualize how many pieces are at each stage (Cutting vs. Final Finish) and computes the variance against the target order quantity.

#### E. Traceability & QC Tracker
The `/dashboard/tracer` screen allows auditing of specific garment barcodes (e.g., `LTH-BLK-009`). It utilizes the reusable `TimelineItem.jsx` component to render a vertical stepper showing exactly which operator handled the garment at what time, along with Pass/Rework statuses.

### 5. UI/UX & Responsive Design Principles
*   **Mobile-First Grids:** Heavy utilization of Tailwind CSS utility classes (`grid-cols-1 md:grid-cols-3`) to stack cards vertically on mobile devices and horizontally on wider screens.
*   **Fluid Layouts:** Avoided fixed pixel widths in favor of relative sizing (`w-full`, `max-w-7xl`) to prevent horizontal scrolling issues.
*   **Touch Optimization:** Critical action buttons and form inputs enforce a minimum height of `48px` (`min-h-[48px]`) to accommodate thick factory gloves and fast-paced mobile interaction.
*   **Glassmorphism & Gradients:** Utilizes sophisticated linear blue gradients (`bg-gradient-brand`, `bg-gradient-sidebar`) and soft drop-shadows to present a highly premium, professional interface.

### 6. Local Setup & Deployment

**Prerequisites:** Node.js (v18 or higher recommended).

**Installation:**
```bash
# Navigate to the project directory
cd leatherproject

# Install dependencies (Next.js, React, Tailwind v4, Lucide-React)
npm install

# Run the local development server
npm run dev
```

**Production Build:**
```bash
# Create an optimized static build
npm run build

# Start the production server
npm run start
```

The application is completely static-compatible and is designed for seamless deployment on platforms like Vercel.

---

### 7. Mobile App Roadmap (Future Reference)

Since the Kairox Leather Platform is built with a mobile-first design philosophy, it can be converted into a fully functional Android/iOS mobile app using one of the three approaches below. No UI redesign is required in any of the options — the existing Tailwind CSS layouts, 48px touch targets, and fluid grids are already optimized for mobile screens.

---

#### Option A: PWA — Progressive Web App *(Easiest — No App Store Required)*

**What it is:** A PWA allows users to install the existing Vercel-hosted website directly onto their mobile home screen, making it behave exactly like a native app — with an app icon, full-screen mode, and offline support.

**Steps to implement:**
1. Create a `public/manifest.json` file with the app name, icons, and theme color.
2. Add a `next-pwa` package to the Next.js project to auto-generate a Service Worker.
3. Deploy. Users visiting the site on mobile will see an **"Add to Home Screen"** prompt.

**Best for:** Quick internal factory rollout without needing a Google Play Store account.

```bash
# Install next-pwa
npm install next-pwa
```

---

#### Option B: Capacitor.js *(Recommended — Full Play Store App)*

**What it is:** Capacitor.js wraps the existing Next.js web app inside a native Android/iOS shell, converting it into a real `.apk` / `.aab` file that can be submitted to the Google Play Store or Apple App Store.

**Key advantages:**
- Zero UI rewrite needed — uses the same HTML, CSS, and JavaScript code as the web app.
- Can access native mobile features: **Camera** (for QR/Barcode scanning), **Bluetooth**, **Push Notifications**, **File System**.
- The output `.apk` file can also be shared directly via WhatsApp or a pen drive for internal factory distribution (no Play Store required for internal use).

**Steps to implement:**
```bash
# Step 1: Build the Next.js app as a static export
# In next.config.mjs, add: output: 'export'
npm run build

# Step 2: Install Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init

# Step 3: Add Android platform
npm install @capacitor/android
npx cap add android

# Step 4: Copy the built web files into Capacitor
npx cap copy android

# Step 5: Open in Android Studio to build the .apk
npx cap open android
```

**Play Store Submission:** The `.aab` file generated from Android Studio can be uploaded directly to the **Google Play Console** (requires a one-time $25 developer account fee).

---

#### Option C: React Native + Expo *(Full Native Rewrite — Maximum Performance)*

**What it is:** A complete rewrite of the frontend using React Native and Expo, replacing HTML/Tailwind with native `<View>`, `<Text>`, and `StyleSheet` components. This approach delivers the highest performance and deepest device integration.

**What can be reused from the current project (no rewrite needed):**
- `src/context/AuthContext.js` — Role-based authentication logic
- `src/context/DataContext.js` — State management and localStorage sync (replace with AsyncStorage)
- `src/hooks/useMockData.js` — All mock data constants

**What needs to be rewritten:**
- All UI pages (`dashboard/`, `login/`, etc.) using React Native components
- CSS styles replaced with `StyleSheet.create({})` objects
- Tailwind classes replaced with React Native flex-based layout

**Steps to start:**
```bash
# Create a new Expo project
npx create-expo-app@latest LeatherMobileApp

# Install navigation (equivalent of Next.js App Router)
npx expo install expo-router

# Copy AuthContext.js and DataContext.js directly from the web project
# Begin rebuilding screens using React Native components
```

**Best for:** A production-grade, high-performance factory app with deep hardware access (barcode scanners, Bluetooth label printers, etc.).

---

#### Comparison Summary

| Feature | PWA | Capacitor.js | React Native + Expo |
|---|---|---|---|
| Code Reuse | 100% | 100% | ~40% (logic only) |
| Play Store Ready | No (Home Screen only) | ✅ Yes | ✅ Yes |
| Native Camera/BT | Limited | ✅ Yes (plugins) | ✅ Yes (full access) |
| Development Time | 1–2 days | 3–5 days | 4–8 weeks |
| Recommended For | Internal quick rollout | Play Store launch | Long-term product |

> **Recommendation:** For the current phase of this project, **Capacitor.js (Option B)** is the most practical choice. It requires no UI rewrite, produces a genuine Play Store-ready APK, and can leverage the existing Vercel deployment as its web base.
