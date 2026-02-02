---
trigger: always_on
---

# TripTogether - Project Context Documentation

## Project Overview

**TripTogether** is a group travel planning and expense management web application designed to simplify collaborative trip organization. It combines trip planning, democratic decision-making, expense tracking, and photo sharing into a single platform with a distinctive "Clean 80s Retro" aesthetic inspired by vintage computer terminals.

**Core Value Proposition:** Enable groups to plan trips together, vote on destinations and dates, track shared expenses, split costs fairly, and create lasting memories through a shared photo gallery.

----

## Core Features & User Flows

### 1. Group Management

**Creating a Group:**
- User clicks "Create New Group" from home page
- Dialog prompts for group name
- New group is created with current user as admin
- Redirects to group dashboard

**Inviting Members:**
- Click "Invite Friends" button
- Generate shareable invite link
- Copy link to clipboard
- Members join via link

### 2. Trip Setup Wizard (6 Phases)

The setup wizard guides users through trip planning with democratic decision-making:

#### Phase 0: Welcome
- User identity collection (name)
- Feature overview cards
- Group info display

#### Phase 1: Trip Context
- Trip name input
- Cover photo upload
- Trip status selection (Planning Mode vs Booked & Ready)

#### Phase 2: Decision Polls
- **Date Poll:** Admin creates date options, members vote
  - Supports single-day and multi-day trips
  - Time-of-day selection for single-day trips
  - Admin confirms final date
- **Destination Poll:** Vote on proposed destinations
- **Budget Poll:** Choose tier (Budget/Comfort/Premium)
- **Itinerary Method:** Manual vs AI-generated

#### Phase 3: Ideas & Scheduling
- Add activity ideas via link scraping or manual entry
- "Idea Bucket" for unscheduled activities
- Schedule items by day/time slot
- Heart/favorite system
- Conflict detection (overcrowding, travel time warnings)

#### Phase 4: Logistics
- **Packing List:** Personal and shared items
- **QR Code Upload:** Payment QR for expense settlement

#### Phase 5: Ready Dashboard
- Trip summary card (destination, dates, activities, packing progress)
- WiFi credentials
- Accommodation details
- Emergency contacts
- Member readiness status

**Navigation:**
- Progress bar showing completion percentage
- Phase indicator circles (completed/current/future)
- Back/Next buttons with phase-appropriate text

### 3. Expense Tracking & Settlement

**Expense Management:**
- Create expenses with description, amount, category
- Select who paid and who to split between
- Automatic per-person calculation
- Category icons (Food, Transport, Accommodation, etc.)
- Receipt scanning capability

**Debt Simplification:**
- Smart algorithm minimizes number of transactions
- Shows simplified debts: "A owes B $X"
- Real-time balance calculation
- Net balance display (you owe vs you're owed)

**Settlement Flow:**
- Select debt to settle
- View payee's QR code
- Scan with payment app
- Mark as paid
- Pixel confetti animation on completion

**Views:**
- **Settle Tab:** Simplified debts with QR codes
- **Expenses Tab:** Chronological expense list
- **History Tab:** Completed settlements

### 4. Photo Gallery

**Instagram-Style Feed:**
- Grid layout of photos
- Like and comment functionality
- Location tags
- Uploader info with timestamp
- Typewriter animation for captions
- Polaroid frame effect on hover

**Upload Flow:**
- Click "Add Photo" button
- Select image from device
- Add caption and location
- Post to group gallery

### 5. Group Dashboard

**Components:**
- Trip timeline (expenses, photos, moments)
- Trip highlights reel
- Destination voting module
- Date voting module
- Trip badges (achievements)
- Planning board
- Packing list preview
- Weather forecast
- Trip itinerary

**Tabs:**
- **Overview:** Timeline and highlights
- **Plan:** Voting and itinerary
- **Pack:** Packing list management

---

## User Flows

### Complete Trip Planning Flow

1. **Start:** User creates group from home page
2. **Invite:** Share link with friends
3. **Setup:** Admin navigates to `/group/[id]/setup`
4. **Phase 0:** Members enter their names
5. **Phase 1:** Admin sets trip name, photo, status
6. **Phase 2:** 
   - Admin creates date options
   - Members vote on dates
   - Admin confirms final date
   - Group votes on destination
   - Group selects budget tier
   - Choose itinerary method (manual/AI)
7. **Phase 3:**
   - Members add activity ideas
   - Schedule activities by day/time
   - Heart favorite activities
8. **Phase 4:**
   - Fill personal packing list
   - Claim shared items
   - Upload payment QR code
9. **Phase 5:** Review trip summary
10. **Dashboard:** Navigate to group dashboard
11. **During Trip:**
    - Add expenses to wallet
    - Upload photos to galler