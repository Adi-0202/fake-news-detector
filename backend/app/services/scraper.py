import requests
import trafilatura

def extract_article_text(url: str) -> str:
    headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Cache-Control": "max-age=0",
        }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status() # Crashes here if the website is down or URL is wrong

        extracted_text=trafilatura.extract(response.text)
        return extracted_text.strip() if extracted_text else ""
    except Exception as e:
        print(f"Scraper Engine Fault on target '{url}': {e}")
        return ""
