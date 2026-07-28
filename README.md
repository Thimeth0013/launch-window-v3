# Launch Window V3

## Overview
Launch Window V3 is a comprehensive, next-generation spaceflight tracking and mission telemetry platform. Evolving from its predecessors, this robust application offers space enthusiasts and professionals real-time updates on rocket launches, satellite tracking, and global spaceflight news. The platform leverages a modern architecture to deliver a seamless, high-performance user experience, complete with dynamic, scroll-driven frontend animations and real-time telemetry.

## Features
- **Real-Time Launch Tracking**: Up-to-date schedules, mission telemetry, and an interactive timeline engine for global space launches.
- **3D Satellite Tracking**: Interactive, real-time satellite positions rendered in a dynamic 3D environment.
- **Automated Scrub Detection**: Background schedulers that monitor and detect launch scrubs to ensure statuses remain accurate in real-time.
- **Spaceflight News Feed**: Aggregated news articles and updates from across the aerospace industry.
- **Live Streams Integration**: Direct embedding of official YouTube live streams for upcoming and live rocket launches.
- **Advanced Caching Architecture**: Sophisticated server-side caching strategies that guarantee fast, responsive interactions while minimizing rate-limiting from public endpoints.
- **Premium User Interface**: Modern corporate and space-themed aesthetic featuring bento-grid layouts, scroll-driven animations, and glassmorphism elements.

## Tech Stack

### Frontend
The frontend is engineered for maximum visual impact, utilizing high-quality animations and modern frameworks to create a premium, dynamic user experience:
- **Core Framework**: Next.js 16 (App Router) & React 19
- **Styling**: Tailwind CSS v4 and Tailwind Merge for dynamic utility classes.
- **High-Quality Animations & Graphics**:
  - **GSAP (`@gsap/react`)**: Powering complex, robust, and highly choreographed scroll-driven micro-animations throughout the platform.
  - **Lenis**: Providing buttery smooth, native-feeling scroll experiences.
  - **Three.js & OGL**: Rendering dynamic, lightweight 3D scenes for the interactive satellite tracker.
- **Icons**: Lucide React

### Backend
- **Database**: MongoDB with Mongoose 9 for flexible and scalable data modeling.
- **Architecture**: Next.js API Routes layered with dedicated service modules and automated background tasks (e.g., telemetry polling, scrub detection).
- **Data Fetching**: Axios and native Fetch API.

## Public APIs Used
Launch Window V3 aggregates data from authoritative aerospace sources to provide comprehensive telemetry and news:
- **The Space Devs API (Launch Library 2)**: The primary source for detailed rocket launch schedules, vehicle metadata, and mission details.
- **Spaceflight News API**: Fetches the latest articles, blogs, and reports from the space industry.
- **N2YO API**: Supplies real-time orbital data and telemetry for satellite tracking.
- **NASA API**: Provides access to official NASA imagery, reports, and mission data.
- **YouTube Data API**: Used to query and securely embed official launch coverage and live streams.

## Getting Started

First, install the dependencies and run the development server:

```bash
npm install
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. You can start editing the application by modifying `app/page.tsx`.
