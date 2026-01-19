read and implment as a previewable app here that can connect to you so i can add diverse content and generate slide carousels for linkedin 



Got it — you want a **complete feature inventory + PRD-style breakdown** so an **AI agent can rebuild this app as a previewable GPT app**, including **editor, typography, AI content generation, and export**. I’ll be precise, systematic, and implementation-ready.

Below is a **clean PRD + feature spec**, structured so you can hand it directly to an AI coding agent.

---

# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Product Name (Working)

**AI Carousel / Slide Editor**

## Product Type

Web-based, previewable slide & carousel editor with AI-assisted content generation

## Primary Use Case

Create **social media carousels / slides** with:

* Strong typography
* Minimal layouts
* AI-generated content
* Export-ready formats (PDF / images)

---

## 1. CORE APPLICATION FEATURES

### 1.1 Canvas & Workspace

* Horizontal **slide strip** (carousel layout)
* Each slide is:

  * Fixed aspect ratio (e.g. 1:1, 4:5, 9:16 optional)
  * Independently editable
* Zoom controls (e.g. 30%, 60%, 100%)
* Slide selection with visual highlight
* Add / duplicate / delete slides
* Drag to reorder slides

---

## 2. SLIDE STRUCTURE

Each slide contains **elements**:

### 2.1 Element Types

* Text
* Image
* Emoji
* Background (color or image)
* Footer (signature, arrows, pagination)

Each element has:

* Position
* Size
* Z-index
* Visibility toggle

---

## 3. TEXT FEATURES (CRITICAL)

### 3.1 Text Blocks

* Multiple text blocks per slide
* Independent styling per block

### 3.2 Typography Controls

* Font family selector

  * Example: Geist Sans
* Font size (px)
* Font weight (Light → Bold)
* Line height (%)
* Letter spacing (optional)
* Text color (hex picker)
* Background color (for text highlight blocks)
* Text opacity (%)

### 3.3 Text Layout

* Alignment:

  * Left
  * Center
  * Right
* Auto text wrapping
* Dynamic height adjustment
* Manual width control

### 3.4 Advanced Text Behavior

* Vertical rhythm preserved when resizing
* Large title + body hierarchy
* Ability to intentionally overflow / stack text
* Support for **broken-word layouts** (artistic typography)

---

## 4. EMOJI SUPPORT

* Emoji picker
* Emoji treated as text or icon
* Adjustable:

  * Size
  * Position
  * Opacity
* Emoji inline with text OR standalone

---

## 5. IMAGE FEATURES

### 5.1 Image Sources

* Upload local image
* AI-generated image (prompt-based)
* External image sources (optional):

  * Unsplash
  * Giphy

### 5.2 Image Controls

* Resize
* Crop
* Aspect lock
* Opacity
* Background placement
* Cover / contain modes

---

## 6. BACKGROUND SYSTEM

### 6.1 Background Types

* Solid color (hex)
* Image background

### 6.2 Background Controls

* Per-slide background override
* Global background default
* Background opacity
* Gradient support (optional / later)

---

## 7. FOOTER & BRANDING

### 7.1 Footer Elements

* Author avatar
* Author name
* Handle / username
* Arrow indicator (→ ↓)
* Page number

### 7.2 Footer Controls

* Toggle:

  * Show signature
  * Show arrows
  * Show page numbers
* Per-slide override
* Global defaults

---

## 8. BRAND SETTINGS (GLOBAL)

* Default font family
* Default background color
* Default footer visibility
* Default author identity
* Template style selection

---

## 9. TEMPLATES SYSTEM

### 9.1 Template Styles

* Predefined layout styles:

  * Script slides
  * Editorial
  * Minimal
* Templates define:

  * Font hierarchy
  * Margins
  * Default element positions

---

## 10. AI INTEGRATION (KEY)

### 10.1 AI Connection (You / GPT)

The app must connect to **you (ChatGPT / OpenAI API)** to generate content.

### 10.2 AI Capabilities

AI can:

* Generate slide titles
* Generate body text
* Rewrite text for carousel format
* Split long content across slides
* Adjust tone (educational, poetic, sharp, minimal)
* Suggest emoji usage
* Suggest typography hierarchy

---

## 11. AI INPUT TYPES (VERY IMPORTANT)

The AI agent must accept structured input:

### 11.1 Supported Inputs

* Plain text (post, article)
* PDF document
* Image (with OCR + vision)
* Mixed inputs (text + image)

### 11.2 AI Processing Flow

1. Parse input
2. Detect structure (headings, sections)
3. Map content → slide schema
4. Generate:

   * Slide count
   * Text per slide
   * Recommended layout
   * Emoji suggestions

---

## 12. SLIDE DATA MODEL (FOR AI)

Each slide receives structured data:

```json
{
  "slide_type": "title | body | quote | CTA",
  "title": "string",
  "body": "string",
  "emoji": "✨",
  "importance": "high | medium | low",
  "tone": "educational | poetic | minimal",
  "background": {
    "type": "color | image",
    "value": "#000012"
  }
}
```

AI must generate content **based on this schema**.

---

## 13. INSPECTOR / SIDEBAR

### 13.1 Context-Sensitive Inspector

* Shows properties of selected element
* Typography panel
* Position & size panel
* Color panel
* Background panel

---

## 14. EXPORT FEATURES

### 14.1 Export Formats

* PDF (multi-page)
* PNG (per slide)
* JPG (per slide)

### 14.2 Export Options

* Resolution scaling (1x, 2x, 3x)
* Transparent background (optional)
* Naming convention

---

## 15. PREVIEW & PLAYBACK

* Slide-by-slide preview
* Keyboard navigation
* Social-preview mode (Instagram-like)

---

## 16. TECHNICAL REQUIREMENTS (FOR GPT APP)

### 16.1 Frontend

* Canvas-based or DOM-based rendering
* Real-time preview
* Drag & resize interactions

### 16.2 Backend

* Slide schema storage (JSON)
* AI request orchestration
* File parsing (PDF, image OCR)

### 16.3 AI Agent Responsibilities

* Content generation
* Layout suggestions
* Typography hierarchy
* Slide splitting logic

---

## 17. NON-GOALS (FOR V1)

* Video export
* Animations
* Real-time collaboration

---

## 18. MVP DEFINITION

MVP includes:

* Slides
* Text + typography
* Backgrounds
* Emojis
* AI-generated content
* PDF export

---

## 19. WHY THIS IS AI-NATIVE

* Slides are **data-driven**
* Layout is **semantic**, not static
* AI reasons about:

  * Meaning
  * Hierarchy
  * Visual rhythm

see screenshot for visual reference

---

## Parked TODOs
- Avatar export: avoid embedding avatar `data:` URLs in project/template JSON; use references or opt-in.
