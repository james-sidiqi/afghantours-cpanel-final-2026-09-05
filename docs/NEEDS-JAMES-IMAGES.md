# Needs James — Images

Last updated: 2026-09-25 (Asia/Kabul) — Phase 2 `fix/asset-integrity`

## Active public pages — unresolved missing assets
**0** (image audit `missing_count=0` after auto-fixes).

## Auto-fixed (no James decision required)
| Issue | Resolution |
|-------|------------|
| `ground_transport.csv` `gallery_folder` used non-existent `/transport/vehicles/…` | Remapped to existing `/transport/{budget,standard,premium,luxury}/…` (budget van → `van-old`) |
| `hotel_rooms.csv` `gallery_folder` pointed at non-existent typed subdirs (`rooms/suite/`, etc.) | Cleared dead folder refs; all `hero_image` files already exist. `buildRelations` now matches sibling room files by `room_type` keywords in the parent `rooms/` dir |
| `page_assets.csv` semicolon delimiter caused audit false positives (`path.webp;Alt`) | Files already existed; `audit-images.mjs` now truncates at `;` |
| Inactive tour `trek-the-wakhan-corridor` `image_folder_path` → missing `custom-tours/…` | Pointed at existing `featured-tours/trek-the-wakhan-corridor/` (`is_active` unchanged = 0) |

## Still open for James (optional / future)
- Dedicated per-room gallery subfolders were never created; rooms share flat `rooms/` files. If James wants typed subfolders later, supply assets and we can reintroduce `gallery_folder` paths.
- Any new product imagery not yet in repo should be listed here before inventing placeholders.
