# Handoff plan: finish reel theme music + merged reels for scheduling

On approval: this plan is saved as `docs/reel-music-handoff.md` in the repo, committed and pushed to main,
so other AI agents can pick it up. Audience: coding agents with shell + ffmpeg, new to this repo.

---

## Context
- Repo: `tedwin-Main/8Ball_Studio` (Vite + React site, `npm test`, `npm run build`, deploys from `main`).
- Done (commit `5fcad92`): runtime theme music on Services reels.
  - `src/features/reel-sound/` plays one looping theme per service under the playing reel.
  - Sound on by default, starts on first click/key, tap reel or speaker badge to mute (saved).
  - `src/config/site-content.js` gives each service `theme: theme('<slug>')` from `src/audio/<slug>-theme.m4a`.
  - Wired in `services-index.jsx` (default layout) and `services-drum.jsx` (`?services=drum-*`).
- Missing: `src/audio/` is empty, so the site is silent and the speaker badge is hidden.
- Requested next: download tracks, merge them into the reels, push reels to a scheduler.

## Hard rules
- Never use Nintendo / Wii audio. Aero *style* only, royalty-free.
- Never bypass bot checks, Cloudflare or captchas (Pixabay blocks scripted downloads). If a download is blocked, stop and ask the human.
- Licence for every track recorded in `docs/service-media-sources.json`.
- Never commit raw downloads; only the cut loops in `src/audio/`.
- Line 1 of any new code file: one-line header comment saying what the file does.

## Gates the human must answer first
1. **Tracks**: the human downloads the six Pixabay mp3s into one folder (the agent cannot download them), OR approves the Mixkit fallback (direct downloads work, but the style is mallets and bells, not aero).
2. **Scheduler**: which tool posts the merged reels? Claude `/schedule` cannot post to Instagram. Expected answer: Meta Business Suite, Later, Buffer, Metricool, or another tool. No posting until answered.
3. **Merged reel source**: site reels are 6 s, 640x640 placeholders, too small for Instagram (1080x1920, 9:16). Use the original Mixkit clips (URLs in `docs/service-media-sources.json`) or the studio's own footage?

## Track list (Pixabay "frutiger aero", Pixabay Content License)
| Slug | Service | Track | Page |
|---|---|---|---|
| video | Video production | Aqua (Frutiger Aero Chillwave) | pixabay.com/music/ambient-aqua-frutiger-aero-chillwave-532669/ |
| design | Graphic design | Petal (Frutiger Aero Ambient) | pixabay.com/music/ambient-petal-frutiger-aero-ambient-587794/ |
| marketing | Performance marketing | Future Office (Chill Nostalgic) | pixabay.com/music/ambient-future-office-frutiger-aero-chill-nostalgic-624710/ |
| social | Social media management | Ocean Bubbles (Frutiger Aqua Game) | pixabay.com/music/ambient-ocean-bubbles-frutiger-aqua-game-550245/ |
| web | Web design | Water Gloss (Frutiger Aero) | pixabay.com/music/synthwave-water-gloss-frutiger-aero-553723/ |
| ai | AI generated content | Dreamy Glass (Aerowave) | pixabay.com/music/ambient-dreamy-glass-aerowave-556871/ |

Backups: Green Horizon (630491), White Space (600046), Aquatic Ambience (519609).
Mixkit fallback (direct mp3 at `https://assets.mixkit.co/music/<id>/<id>.mp3`): 24 Smooth Like Jazz, 10 Playful, 5 Feeling Happy, 1076 Smile, 529 Walking in the Park, 749 Relaxation 05. Check each title on its Mixkit page before use.

---

## Task A: site theme loops (after gate 1)
1. Input folder holds `video.mp3 design.mp3 marketing.mp3 social.mp3 web.mp3 ai.mp3`.
2. Cut 30 s loops (pick a start second per track by listening, default 10):
   ```sh
   out=src/audio; mkdir -p "$out"
   for slug in video design marketing social web ai; do
     ffmpeg -v error -y -ss 10 -t 30 -i "$IN/$slug.mp3" \
       -af "afade=t=in:d=0.4,afade=t=out:st=29.2:d=0.8,loudnorm=I=-20:TP=-2" \
       -ac 2 -c:a aac -b:a 96k -movflags +faststart "$out/$slug-theme.m4a"
   done
   ```
   The volume is set in the file (`loudnorm`) because iOS ignores `audio.volume`. Target about 360 KB per file.
3. In `docs/service-media-sources.json`, add `"<slug>-theme.m4a": "<track page URL>"` for each track, plus a note: Pixabay Content License `https://pixabay.com/service/license-summary/`, 30 s cut, loudnorm -20 LUFS, AAC 96k.
4. `npm test && npm run build`. The build output must list 6 distinct `*-theme-*.m4a` assets.
5. Commit `feat(reel-sound): add service theme loops` and push to main.

## Task B: merged reels for posting (after gates 1 and 3)
1. Output to `exports/reels/` (add to `.gitignore`, never commit). One file per service: `<slug>-reel.mp4`.
2. Source clip: the higher-resolution original from gate 3, not `src/images/*-reel.mp4`.
3. Mux the full-length track (not the 30 s loop), cut to the clip length:
   ```sh
   ffmpeg -y -i "$CLIP" -i "$IN/$slug.mp3" \
     -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30" \
     -af "afade=t=out:st=$((DUR-1)):d=1,loudnorm=I=-14:TP=-1" \
     -map 0:v -map 1:a -shortest -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p \
     -c:a aac -b:a 192k -movflags +faststart "exports/reels/$slug-reel.mp4"
   ```
   `DUR` is the clip length in seconds (`ffprobe -v error -show_entries format=duration -of csv=p=0 "$CLIP"`). Instagram reels: 9:16, 3–90 s, -14 LUFS.
4. Check: `ffprobe` shows one h264 + one aac stream, 1080x1920, matching duration. Play each once.

## Task C: push to scheduler (after gate 2)
- Use only the tool the human names, through its official connector/API or a human upload. Never through a credential form the agent fills in.
- Default plan per reel: caption = service `detail` from `site-content.js`, one post per service, times set by the human.
- Before scheduling, show the human the reel list, captions and post times; schedule only after a yes.
- Report a table: service, file, scheduled time, post link/ID.

## Verification (site)
- `npm run dev`, default layout: open a service row, its theme plays. Open another, the track switches. Close or scroll away, it pauses.
- Tap the reel: it mutes, the icon flips, and the mute survives a reload.
- `?services=drum-media`: click once, the theme plays. Scrolling pauses it; the new track starts once the scroll settles.
- Phone + iOS Safari: the first tap starts sound.
