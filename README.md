<p align="center">
  <img src="https://github.com/dhruvakashyap73/FoodBridge/blob/main/public/FoodBridgeLogo.png" alt="Logo" width="350" height="250">
</p>

**FoodBridge is a purpose-built, full-stack web platform engineered to combat food waste by intelligently connecting donors (businesses, households) with recipient organizations (food banks, shelters). It features geospatial matching, a modern React/Tailwind frontend, and a Python microservice utilising the Gemini API for AI-assisted image analysis of food quality and type.**

---
## 📋 Table of Contents

- [📂 Project Goals and Purpose](#-project-goals-and-purpose)
- [📂 Core Features](#-core-features)
- [📂 Technology Stack](#-technology-stack)
- [📂 Architecture & Data Flow](#-architecture--data-flow)
- [📂 Getting Started](#%EF%B8%8F-getting-started)
- [📂 Key Files & Where To Look](#-key-files--where-to-look)
- [📂 Roadmap & Future Scope](#-roadmap--future-scope)
---

## 📂 Project Goals and Purpose

FoodBridge's primary mission is to reduce food insecurity and environmental waste by creating a highly efficient, low-friction digital platform for food redistribution.

### Core Objectives:
1.  **Reduce Friction:** Provide a quick, low-friction interface for donors to post surplus food.
2.  **Maximize Match Quality:** Use **nearest-neighbor spatial matching** to connect donors and recipients based on proximity and need.
3.  **Enhance Safety & Efficiency:** Leverage **AI-assisted image analysis** to instantly assess the type, freshness, and deliverability of donated food, improving safety and routing.
4.  **Provide Transparency:** Offer role-specific dashboards to show active donations, match history, and overall impact.

---

## 📂 Core Features

| Feature Category | Description | Key Files/Technologies |
| :--- | :--- | :--- |
| **Donor Posting Flow** | Donors create a post with details and photos of surplus food. This flow is designed to be quick and low-friction. | `post-surplus-food/`, `PostFoodDonation.jsx` |
| **AI Image Analysis** | When a photo is uploaded, the frontend calls a Python microservice to analyze food type, freshness, and deliverability using the **Gemini Vision Model**. | `PhotoUpload.jsx`, `backend/food.py` |
| **Intelligent Matching** | A spatial matching utility computes distances to rank and suggest the best local donation matches for recipients. | `nearestNeighborMatcher.js` |
| **User Dashboards** | Role-specific views showing active donations, recent matches, and quick actions. Features an AI matching score component. | `donor-dashboard/`, `recipient-dashboard/` |
| **Mapping & Routing** | Uses **Leaflet** and `react-leaflet` to display donation locations and provide route context for pickups. | `Leaflet`, `react-leaflet` |
| **Storage & DB** | Utilizes **Supabase** for user authentication, a **Postgres-backed database**, and object storage for all images. | `supabaseClient.js`, `@supabase/supabase-js` |

---

## 📂 Technology Stack

| Component | Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | **React (Vite)** | Single-Page Application (SPA) with lightning-fast tooling. |
| **Styling** | **Tailwind CSS** | Utility-first styling for responsive design. |
| **Backend API** | **Python + Flask** | Lightweight microservice for image analysis. |
| **Artificial Intelligence**| **Google Generative AI (Gemini)** | Used for multimodal vision analysis of food images. |
| **BaaS / DB** | **Supabase (Postgres)** | Hosted DB, Auth, and Object Storage. |
| **Mapping** | **Leaflet + react-leaflet** | Geospatial data visualization and mapping. |
| **State/UX** | **Redux Toolkit, Framer Motion, react-hook-form** | Advanced state management, animations, and efficient form handling. |

---

## 📂 Architecture & Data Flow

FoodBridge operates on a decoupled architecture, ensuring that the heavy lifting (like AI processing) is offloaded to a dedicated service, while the client remains fast and responsive.

### Data Flow for Donation Posting (Including AI Analysis)

1.  **Image Upload:** A Donor uses `PhotoUpload.jsx` to select an image.
2.  **AI Service Call:** The frontend sends the image to the **Flask Microservice** at `http://127.0.0.1:5001/analyze`.
3.  **AI Analysis:** The Flask service (`backend/food.py`) uses the **Gemini API** to analyze the image and return a structured JSON response describing `food_type`, `freshness`, and `deliverability`.
4.  **Database Storage:** The frontend compiles the donation details and saves the complete record to the **Postgres Database** via the Supabase client.

### Behavior & Fault Tolerance

* **Gemini Key:** The backend (`food.py`) checks for the `GEMINI_API_KEY`. If the key is missing, it returns safe, pre-defined demo results, enabling development without a live key.
* **Network Failure:** The frontend component `PhotoUpload.jsx` is coded to handle network errors (e.g., `ECONNREFUSED` or `Network Error`) gracefully by displaying local demo analysis data when the backend service is unavailable.

---

## 📂 Project Structure

```
react_app/
├── public/             # Static assets
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components
│   ├── styles/         # Global styles and Tailwind configuration
│   ├── App.jsx         # Main application component
│   ├── Routes.jsx      # Application routes
│   └── index.jsx       # Application entry point
├── .env                # Environment variables
├── index.html          # HTML template
├── package.json        # Project dependencies and scripts
├── tailwind.config.js  # Tailwind CSS configuration
└── vite.config.js      # Vite configuration
```
---

## 📂 Getting Started

To run the full-stack application, you must start both the React client and the Python backend simultaneously.

### Prerequisites

* **Node.js** & npm
* **Python 3** & pip
* A **Supabase Project** (required for DB/Auth/Storage)
* A **Gemini API Key** (required for real AI analysis)

### 1. Run the Backend (AI Service)

```bash
# 1. Navigate to the backend folder
cd backend
# 2. Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate
# 3. Install dependencies
pip install -r requirements.txt
# 4. Environment Variables: Create a .env file in the backend/ directory and add your key:
GEMINI_API_KEY=your_real_key_here
# 5. Run the Service:
python food.py
# The service listens on port 5001
```

### 2. Run the Frontend (React Client)

```bash
# 1. Navigate back to the project root
cd .. 
# 2. Install dependencies
npm install
# 3. Start the development server
npm run dev 
# Frontend runs via Vite, usually on http://localhost:5173/
```
---

## 📂 Key Files & Where To Look

| Component | Key File | Purpose / Logic |
| :--- | :--- | :--- |
| **AI Backend** | `backend/food.py` | Python Flask server; uses **`google-generativeai`** and Pillow for vision processing. |
| **Image Upload** | `src/pages/post-surplus-food/components/PhotoUpload.jsx` | Client-side component handling image state, submission to Flask, and result display. |
| **Database Client** | `src/supabaseClient.js` | Configuration and setup for Supabase (Auth, DB, Storage). |
| **Matching** | `src/utils/nearestNeighborMatcher.js` | Geospatial logic for distance calculation and matching. |

---

## 📂 Roadmap & Future Scope

* **Advanced Matching:** Implement multi-stop route optimization (TSP-style algorithms) for drivers and batch matching based on capacity constraints.
* **Async Processing:** Implement background processing for image analysis (upload to Supabase Storage first, then trigger AI analysis in an async worker) to make the posting flow non-blocking.
* **Security Focus:** Integrate robust auditing, automated moderation, and stronger data access controls via Supabase RLS (Row-Level Security).
