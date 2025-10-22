# Design Guidelines: PDF 表格识别工具

## Design Approach

**Selected Approach:** Design System (Material Design 3) with Custom Refinements

**Justification:**
- Utility-focused application prioritizing efficiency and clarity
- Information-dense interface (displaying extracted tables, processing states)
- Standard UI patterns sufficient for upload/display/export workflows
- Material Design provides excellent Chinese typography support and established data display patterns
- Function-differentiated tool where performance and usability are primary differentiators

**Key Design Principles:**
1. **Clarity First:** Every element serves a clear functional purpose
2. **Progressive Disclosure:** Show complexity only when needed
3. **Immediate Feedback:** Clear visual responses to all user actions
4. **Data Integrity:** Present extracted tables with maximum readability
5. **Bilingual Support:** Seamless Chinese interface with potential English toggle

---

## Color Palette

### Dark Mode (Primary)
- **Background:** 220 15% 12% (deep slate)
- **Surface:** 220 15% 16% (elevated slate)
- **Surface Variant:** 220 12% 20% (card backgrounds)
- **Primary:** 210 100% 58% (bright blue - trust, technology)
- **Primary Container:** 210 100% 20% (subtle blue background)
- **Secondary:** 180 40% 55% (muted teal - accents)
- **Success:** 142 70% 45% (table recognition complete)
- **Warning:** 38 92% 50% (processing states)
- **Error:** 0 72% 51% (recognition failures)
- **On-Background:** 220 15% 95% (primary text)
- **On-Surface:** 220 10% 88% (secondary text)
- **On-Surface-Variant:** 220 8% 65% (tertiary text)

### Light Mode (Secondary)
- **Background:** 0 0% 98%
- **Surface:** 0 0% 100%
- **Surface Variant:** 220 20% 96%
- **Primary:** 210 100% 45%
- **On-Background:** 220 15% 15%
- **On-Surface:** 220 10% 25%

---

## Typography

### Font Families
- **Primary (Chinese/Latin):** 'Noto Sans SC' (Google Fonts) - excellent CJK support, professional
- **Monospace (Table Data):** 'JetBrains Mono' (Google Fonts) - for CSV/code displays
- **Fallback Stack:** system-ui, -apple-system, sans-serif

### Type Scale
- **Display (Hero):** text-4xl md:text-5xl, font-bold, tracking-tight
- **H1 (Page Titles):** text-3xl md:text-4xl, font-bold
- **H2 (Section Headers):** text-2xl, font-semibold
- **H3 (Card Titles):** text-xl, font-semibold
- **Body Large:** text-base md:text-lg, font-normal
- **Body:** text-sm md:text-base, font-normal
- **Caption:** text-xs md:text-sm, font-normal, opacity-70
- **Button Text:** text-sm md:text-base, font-medium, tracking-wide

---

## Layout System

### Spacing Primitives
**Consistent spacing using Tailwind units: 2, 4, 6, 8, 12, 16, 20, 24**

- **Micro spacing (within components):** p-2, gap-2, space-y-2
- **Component padding:** p-4, p-6, p-8
- **Section spacing:** py-12, py-16, py-20
- **Container margins:** mx-4, mx-6, mx-auto
- **Gap between elements:** gap-4, gap-6, gap-8

### Grid System
- **Main Container:** max-w-7xl mx-auto px-4 md:px-6 lg:px-8
- **Content Width:** max-w-4xl (for single column content)
- **Wide Content:** max-w-6xl (for table displays)
- **Grid Layouts:** grid-cols-1 md:grid-cols-2 gap-6

### Responsive Breakpoints
- Mobile: < 768px (single column, stacked)
- Tablet: 768px - 1024px (2-column where appropriate)
- Desktop: > 1024px (full multi-column layouts)

---

## Component Library

### A. Upload Zone
- **Style:** Large dashed border (border-2 border-dashed), rounded-2xl
- **States:**
  - Default: border-on-surface-variant/30, hover:border-primary/50
  - Dragging: border-primary, bg-primary-container/20
  - Processing: border-warning with pulse animation
- **Content:** Centered icon (upload cloud, 64px), primary text, secondary helper text
- **Dimensions:** min-h-64, full width within container

### B. Processing Indicators
- **Linear Progress Bar:** h-1, rounded-full, primary color with animated gradient
- **Spinner:** Circular, 40px, primary color with smooth rotation
- **Status Pills:** Rounded-full badges with icon + text
  - Processing: bg-warning/20, text-warning
  - Success: bg-success/20, text-success
  - Error: bg-error/20, text-error

### C. Table Display
- **Container:** bg-surface-variant, rounded-xl, overflow-auto
- **Table Styling:**
  - Headers: bg-surface, font-semibold, text-sm, uppercase tracking-wide, py-3 px-4
  - Rows: border-b border-on-surface/10, hover:bg-surface/50
  - Cells: py-3 px-4, text-sm, font-mono (for data)
- **Max Height:** max-h-96 md:max-h-[600px] with scroll
- **Zebra Striping:** Optional even:bg-surface/30

### D. Buttons
- **Primary (CTAs):** bg-primary, text-white, px-6 py-3, rounded-lg, font-medium, shadow-lg, hover:bg-primary/90
- **Secondary:** border-2 border-primary, text-primary, px-6 py-3, rounded-lg, hover:bg-primary/10
- **Icon Buttons:** p-2, rounded-full, hover:bg-surface-variant
- **Export Buttons:** flex items-center gap-2, icon + text

### E. Cards
- **Standard Card:** bg-surface-variant, rounded-xl, p-6, shadow-sm
- **Interactive Card:** hover:shadow-md, transition-shadow, cursor-pointer
- **Result Cards:** border-l-4 border-primary/secondary/success based on state

### F. Navigation
- **Top Bar:** bg-surface, border-b border-on-surface/10, h-16, sticky top-0, backdrop-blur-md
- **Logo/Title:** text-xl font-bold, flex items-center gap-2
- **Nav Items:** text-sm, hover:text-primary, px-4 py-2, rounded-md

### G. Modals/Overlays
- **Backdrop:** bg-black/60, backdrop-blur-sm
- **Modal:** bg-surface, rounded-2xl, p-8, max-w-2xl, shadow-2xl
- **Close Button:** Absolute top-4 right-4, p-2, hover:bg-surface-variant

---

## Animations

**Use sparingly - only for feedback and transitions:**

1. **Upload Zone Pulse:** Subtle scale(1.02) on drag-over
2. **Progress Bar:** Linear gradient animation left-to-right
3. **Success Checkmark:** Scale-in animation (scale 0 to 1, 0.3s ease-out)
4. **Table Fade-In:** Opacity 0 to 1, 0.4s ease
5. **Button Press:** Scale 0.98 on active state
6. **Page Transitions:** Fade in/out, 0.2s

**No:**
- Auto-playing animations
- Scroll-triggered effects
- Decorative animations
- Parallax effects

---

## Images

### Icon Usage
- **Library:** Heroicons (outline for UI, solid for emphasis)
- **CDN:** Via unpkg or jsDelivr
- **Key Icons Needed:**
  - CloudArrowUp (upload)
  - DocumentText (PDF)
  - Table (table recognition)
  - CheckCircle (success)
  - XCircle (error)
  - ArrowDownTray (download)
  - Cog (settings)

### No Photographic Images Required
- This is a utility tool - no hero images needed
- Focus on clear iconography and data visualization
- Optional: Abstract geometric pattern as subtle background texture (very low opacity)

---

## Page Layout Structure

### Main Application Layout (Single Page)

1. **Header Section** (h-16, sticky)
   - Logo/Title: "PDF 表格识别工具"
   - Language toggle (if bilingual)
   - Dark/Light mode toggle

2. **Upload Section** (py-12)
   - Large upload zone (centered, max-w-3xl)
   - Supported formats text
   - File size limit indicator

3. **Processing Status** (conditional, py-8)
   - Progress bar
   - Current step indicator
   - Time estimate

4. **Results Section** (py-12, conditional)
   - Recognition summary (tables found, confidence)
   - Tabbed interface for multiple tables
   - Table preview with scroll
   - Export buttons (CSV, Excel, JSON)

5. **Footer** (py-8, text-center)
   - Powered by TableStructureRec
   - Documentation link
   - Version info

---

## Accessibility & Internationalization

- **Language Files:** Separate zh-CN and en-US JSON
- **Font Loading:** Preload Noto Sans SC for Chinese
- **Focus States:** 2px ring-primary ring-offset-2
- **Keyboard Navigation:** Full support for upload/download/navigation
- **ARIA Labels:** Comprehensive labels in Chinese
- **Screen Reader:** Announce processing status changes
- **Color Contrast:** WCAG AAA compliance (7:1 ratio for body text)

---

## Key Differentiators

1. **Data-First Design:** Table display optimized for readability and comparison
2. **Processing Transparency:** Clear multi-step feedback during recognition
3. **Export Flexibility:** Multiple format options with preview
4. **Chinese Typography:** Optimized spacing and line-height for CJK characters
5. **Professional Polish:** Enterprise-grade UI for a technical tool

This design creates a clean, efficient, and trustworthy interface for PDF table extraction - prioritizing usability and data clarity over decorative elements.