import sys
import json
import urllib.request
import re
from html.parser import HTMLParser

# Try importing scrapling
try:
    # pyrefly: ignore [missing-import]
    from scrapling import Fetcher
    HAS_SCRAPLING = True
except ImportError:
    HAS_SCRAPLING = False

class SimpleHTMLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.reset()
        self.strict = False
        self.convert_charrefs = True
        self.text = []
        self.title = ""
        self.in_title = False
        self.in_script_or_style = False

    def handle_starttag(self, tag, attrs):
        if tag in ["script", "style"]:
            self.in_script_or_style = True
        elif tag == "title":
            self.in_title = True

    def handle_endtag(self, tag):
        if tag in ["script", "style"]:
            self.in_script_or_style = False
        elif tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_script_or_style:
            return
        if self.in_title:
            self.title += data
        else:
            self.text.append(data)

    def get_data(self):
        return "".join(self.text)

def scrape_fallback(url):
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8', errors='ignore')
            
        parser = SimpleHTMLStripper()
        parser.feed(html)
        
        # Clean text
        text = parser.get_data()
        # Remove extra whitespace and clean formatting
        text = re.sub(r'\s+', ' ', text).strip()
        
        return {
            "title": parser.title.strip() or "Untitled Page (Fallback)",
            "content": text[:30000],  # Keep reasonable size
            "url": url,
            "method": "fallback"
        }
    except Exception as e:
        return {"error": f"Fallback scrape failed: {str(e)}"}

def scrape_scrapling(url):
    try:
        fetcher = Fetcher()
        response = fetcher.get(url)
        title = response.css('title::text').get() or 'Untitled Page'
        title = title.strip()
        
        # Extract paragraph tags
        paragraphs = response.css('p::text').getall()
        clean_paras = [p.strip() for p in paragraphs if p.strip()]
        content = "\n\n".join(clean_paras)
        
        if not content:
            # Fallback to general text extraction
            content = response.css('body::text').get() or ''
            content = content.strip()
            
        return {
            "title": title,
            "content": content,
            "url": url,
            "method": "scrapling"
        }
    except Exception as e:
        # If scrapling fails, fallback to simple HTTP
        return scrape_fallback(url)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No URL provided"}))
        sys.exit(1)
        
    url = sys.argv[1]
    if HAS_SCRAPLING:
        result = scrape_scrapling(url)
    else:
        result = scrape_fallback(url)
        
    print(json.dumps(result, ensure_ascii=False))
