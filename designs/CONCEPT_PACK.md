# Music Streaming Concept Pack (6 Variants)

Each concept card uses the same schema for direct comparison and later HTML/CSS implementation.

## Locked Direction Mapping
- `Concrete Static` -> Brutalist / anti-design
- `Tape Cathedral` -> Retro skeuomorphic (70s-90s hardware)
- `Quiet Grain` -> Minimal Japanese / wabi-sabi
- `Neon District OS` -> Cyberpunk / neon dark
- `Moss & Thread` -> Cottagecore / organic handcrafted
- `Memphis Delirium Suite` -> Corporate Memphis gone wrong / surrealist

## Card 01
`style_name`: Concrete Static  
`visual_aesthetic`: Raw grayscale foundation (`#111111`, `#EDEDED`, `#C8C8C8`) with hazard accents (`#FF4D00`, `#F3D400`), oversized condensed grotesk headlines, and a broken masonry layout with misaligned modules and hard 2px borders.  
`ui_metaphor`: Playlist wall of printed flyers.  
`target_audience`: Indie tastemakers, zine-culture listeners, and design-forward music nerds who want personality over polish.  
`signature_ui_details`:
1. Draggable sticker tags: Genre stickers look like torn paper labels; dragging one onto any playlist card pins it as a global filter and reorders discovery results instantly.
2. Clipped card edges: Every major card has one intentionally cut corner; clicking that corner unfolds a hidden utility flap with `Save`, `Queue`, and `Share`.
3. Hard-cut hover states: Cards switch state with zero easing (instant invert + 2px jump); double-click stamps a rough "LIKED" mark in red ink.
`mood_vibe_sentence`: It feels like browsing a rebellious street poster wall that shouts at you to press play.

## Card 02
`style_name`: Tape Cathedral  
`visual_aesthetic`: Brushed aluminum panels, walnut side trims, amber LED accents (`#FFB347`), engraved labels, and dense control clusters with tactile depth and shadowed hardware layering.  
`ui_metaphor`: Vintage hi-fi rack.  
`target_audience`: Analog enthusiasts, album-first listeners, and users who enjoy ritualized listening sessions.  
`signature_ui_details`:
1. VU-meter playback progress: Dual analog needles represent left/right channel energy; clicking any point on the meter seeks to that song timestamp.
2. Tactile toggle switches: Filter controls are physical-style metal toggles (`Mood`, `Era`, `Instrumental`); flipping a switch updates playlist chips and lights an amber status lamp.
3. Cassette-label playlist headers: Playlist titles sit on ruled cassette labels; clicking the label opens inline typewriter-style edit mode with fixed-width character spacing.
`mood_vibe_sentence`: It feels warm, mechanical, and ceremonial, like loading the perfect tape before a long night drive.

## Card 03
`style_name`: Quiet Grain  
`visual_aesthetic`: Off-white paper tones (`#F7F4EE`), charcoal text (`#2E2C2A`), muted clay accents (`#B88C72`), restrained serif/sans pairing, and calm asymmetric spacing with generous negative space.  
`ui_metaphor`: Listening journal.  
`target_audience`: Focus listeners, minimalist productivity users, and people who want low-noise interfaces for long sessions.  
`signature_ui_details`:
1. Vertical reading-rhythm track list: Tracks flow like editorial paragraphs in one column; wheel or touch scroll snaps each row to a centered "reading line."
2. Ink-brush progress strokes: Song progress appears as a soft-edged brush stroke; dragging the brush tip scrubs playback while preserving the organic stroke shape.
3. Imperfection texture layers: Each panel gets a subtle paper grain variation; toggling `Focus Mode` fades all texture overlays for distraction-free listening.
`mood_vibe_sentence`: It feels calm and intentional, like writing notes in a quiet studio with music in the background.

## Card 04
`style_name`: Neon District OS  
`visual_aesthetic`: Near-black base (`#06070B`) with cyan/magenta acid highlights (`#00E5FF`, `#FF2BD6`) and terminal-style mono UI accents, arranged in modular high-contrast panes with glow edges.  
`ui_metaphor`: Music command terminal.  
`target_audience`: Gamers, night users, and electronic-genre fans who want energy, speed, and high visual feedback.  
`signature_ui_details`:
1. Modular signal cards: Discovery and playlist modules are draggable cards on an 8px grid; dropping a card in a new zone rewires the dashboard priority order.
2. Animated waveform rails: Primary navigation is a live waveform rail; clicking a wave peak jumps to its section and shifts accent glow based on section type.
3. Hover-reveal metadata panes: Hovering a track opens a side pane with BPM, key, and energy graph; clicking pins the pane so users can compare multiple tracks.
`mood_vibe_sentence`: It feels electric and slightly dangerous, like piloting your library from a neon-lit control deck.

## Card 05
`style_name`: Moss & Thread  
`visual_aesthetic`: Botanical greens (`#5E7A56`), linen cream (`#F3ECDD`), terracotta accents (`#C8784D`), hand-drawn dividers, and scrapbook-like layered blocks with soft shadows and paper texture.  
`ui_metaphor`: Handmade mixtape scrapbook.  
`target_audience`: Singer-songwriter listeners, cozy-curation communities, and users who value warmth and emotional storytelling in music apps.  
`signature_ui_details`:
1. Stitched-edge playlist chips: Playlist chips use faux stitched borders; dragging a chip to the "basket ribbon" adds it to a session mix queue.
2. Pressed-flower album placeholders: Album cards display pressed-flower overlays by genre; hovering flips to a back side with handwritten-style track annotations.
3. Handwritten recommendation notes: Discovery suggestions appear as pinned note cards; pulling the lower-right corner "tears off" the card into saved library notes.
`mood_vibe_sentence`: It feels intimate and earthy, like a friend built your music space from paper, thread, and memory.

## Card 06
`style_name`: Memphis Delirium Suite  
`visual_aesthetic`: Conflicting pastels (`#FFC6E8`, `#A8F0FF`) against warning primaries (`#FF3B30`, `#FFD60A`, `#0066FF`), cartoon-geometric forms, and intentionally unstable compositions with surreal perspective shifts.  
`ui_metaphor`: Office dashboard from an absurd dream.  
`target_audience`: Trend-driven Gen Z explorers, social playlist sharers, and users who love playful chaos and novelty loops.  
`signature_ui_details`:
1. Floating blob navigation: Navigation tabs are animated blobs that drift and collide; dragging a blob into first position reprioritizes the entire homepage feed.
2. Impossible-perspective cards: Playlist cards render with exaggerated skew and false depth; hover rotates the card to reveal a hidden face with quick actions.
3. Playful UI error prompts: Intentional fake system errors (for example, "Signal lost in Funk Sector") appear as toasts; clicking the toast opens a surprise discovery lane.
`mood_vibe_sentence`: It feels playful, chaotic, and intentionally uncanny, like a music app designed inside a lucid daydream.

## Validation Checklist
- Exactly 6 cards are present.
- Every card includes all required fields: `style_name`, `visual_aesthetic`, `ui_metaphor`, `target_audience`, `signature_ui_details` (3), `mood_vibe_sentence`.
- Style-direction mapping is one-to-one with no duplicates.
- Signature details are concrete UI elements with explicit interaction behavior.


