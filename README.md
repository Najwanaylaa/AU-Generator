# AU Story Slide Generator

Create Instagram / TikTok story slides (1080×1920) from your text and background images. Built with **Next.js 15**, **React**, and **Tailwind CSS**.

## Features

- Paste a story → auto-split into one slide per sentence
- Upload multiple background images; pick image per slide
- Edit slide text, order (drag thumbnails), duplicate / delete / add slides
- Text styling: fonts, colors, alignment, text box overlay
- Style templates (Minimal, Bold, Romance AU, …)
- Background filters per slide (brightness, contrast, saturation)
- Watermark (@username) on all slides
- **Undo / redo** (Ctrl+Z · Ctrl+Shift+Z)
- **Fullscreen preview** (story aspect ratio)
- Export: PNG ZIP, single slide PNG, MP4 slideshow
- Export **progress bar** for long jobs
- Text length warnings on preview
- Auto-save project to browser storage

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

## Project structure

| Path | Description |
|------|-------------|
| `app/` | Next.js App Router (`page.tsx`, layout, styles) |
| `components/` | UI (form, carousel, editors, export) |
| `hooks/` | Undo/redo, story state |
| `lib/` | Story parser, export, fonts, storage |
| `types/` | TypeScript types |

## Export notes

- **PNG ZIP**: High-res 1080×1920 (2× pixel ratio). Best compatibility.
- **MP4**: Requires a modern browser with WebCodecs (Chrome, Edge, Safari 16.4+). Configure seconds per slide under Project settings.
- Large projects may hit browser storage limits when auto-saving; export regularly.

## Tips

- Keep slide text under **160 characters** when possible (warnings appear after that).
- Use **Apply to all slides** after styling one slide.
- Use **Fullscreen preview** to check readability before export.

## License

Private project — AU Story Slide Generator.
