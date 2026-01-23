# Docker Container Rebuild

After modifying files in `frontend/` or `api/`, **Kiro must automatically rebuild** the respective container(s).

## Commands

| Change Location | Rebuild Command |
|-----------------|-----------------|
| `frontend/**` | `docker compose up -d --build frontend` |
| `api/**` | `docker compose up -d --build api` |
| Both | `docker compose up -d --build` |
| `.env` only | `docker compose up -d` (no rebuild needed) |

## Rules

- ✅ **Kiro executes the rebuild command automatically** after code changes
- ✅ Always rebuild after code changes
- ✅ Use `--build` flag to ensure fresh image
- ✅ Use `-d` for detached mode
- ❌ Don't assume hot-reload works in Docker
- ❌ Don't ask the user to run the rebuild command - do it yourself
