from sqlalchemy import text

from database.connection import engine


def main() -> None:
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT version();"))
            print("✅ Database connected!")
            print(result.fetchone()[0])
    except Exception as exc:
        print("❌ Database connection failed:")
        print(exc)


if __name__ == "__main__":
    main()