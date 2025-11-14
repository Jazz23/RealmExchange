// Scrape current rotmg data from realmeye.com

const baseUrl = "https://www.realmeye.com/";

export async function scrapeCurrentOffers(): Promise<string[]> {
    try {
        const response = await fetch(`${baseUrl}current-offers`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();

        // Extract item titles from span elements with class "item"
        const titles: string[] = [];
        const itemRegex = /<span[^>]*class="item"[^>]*title="([^"]*)"[^>]*>/g;
        let match;

        while ((match = itemRegex.exec(html)) !== null) {
            const title = match[1];
            if (title && !titles.includes(title)) {
                titles.push(title);
            }
        }

        return titles;
    } catch (error) {
        console.error('Failed to scrape items:', error);
        return [];
    }
}