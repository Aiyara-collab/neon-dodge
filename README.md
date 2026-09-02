# Neon Dodge

เกมอาร์เคดหน้าเดียว: เลื่อนซ้ายขวาใน 3 ช่อง หลบสิ่งกีดขวาง และเก็บดาวให้ได้มากที่สุดภายใน 60 วินาที

- คีย์บอร์ด: ลูกศรซ้าย/ขวา หรือ A/D
- มือถือ: ปุ่มซ้าย/ขวา หรือปัดนิ้วในสนาม
- Space: พัก/เล่นต่อ; R: เริ่มรอบใหม่
- ดาว +50 คะแนน และอยู่รอด +10 คะแนน/วินาที
- ชนเสีย 1 ชีวิต มีเกราะชั่วคราว 1.2 วินาที มีทั้งหมด 3 ชีวิต
- ความเร็วเพิ่มทุก 15 วินาที
- คะแนนสูงสุดเก็บบนอุปกรณ์นี้เท่านั้น ไม่ใช้ฐานข้อมูลหรือ API

## Development

Requires Node.js 22.13+ and Yarn Classic. Install with `yarn install`, run with `yarn dev`, build with `yarn build`.
If a Windows shell does not resolve package scripts, the equivalent commands are `node node_modules/vinext/dist/cli.js dev` and `node node_modules/vinext/dist/cli.js build`.

Run all 18 unit/regression tests with Node.js 24: `node --test tests/*.test.mjs`.

## Revision notes

Five AI-led review/fix rounds were completed under the user's single request, not five separate user prompts:

1. Keep elapsed game time accurate for ordinary slow frames; pause stalls longer than 250 ms.
2. Stop processing collectibles after a fatal obstacle in the same frame.
3. Leave modified browser shortcuts, composition, and text input alone.
4. Track one swipe pointer, ignore unrelated pointer endings, and clear gestures on pause/restart.
5. Reject invalid saved scores and disclose when records can only last for the current visit.

The regression checks are automated unit tests, including simulated keyboard/pointer/storage inputs. They do not claim visual browser QA or testing on a physical phone.

The optional WebMCP surface exposes read state, start a new round, and move/pause/resume using the same game transitions as the interface. Browsers without WebMCP still support normal play.

Production uses a trusted `SITE_URL` environment variable for social-preview image URLs. Do not use untrusted forwarded host headers.
