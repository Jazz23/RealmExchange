// Scrape current rotmg data from realmeye.com

import { JSDOM } from 'jsdom';

const baseUrl = "https://www.realmeye.com/";

export async function scrapeCurrentOffers(): Promise<string[]> {
    const response = await fetch(`${baseUrl}current-offers`);
    const html = await response.text();

    // Parse HTML using jsdom
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Find all elements with class "item" and extract their title attributes
    const itemElements = document.querySelectorAll('.item');
    const titles: string[] = [];

    itemElements.forEach(element => {
        const title = element.getAttribute('title');
        if (title) {
            titles.push(title);
        }
    });

    return titles;
}