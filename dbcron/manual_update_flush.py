from datetime import datetime


if __name__ == "__main__":
    print(f"[{datetime.utcnow().isoformat()}] dbcron bootstrap disabled: Redis/Sheets sync jobs are retired.")
