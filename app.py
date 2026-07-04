from flask import Flask, render_template, jsonify
import urllib.request
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import os

app = Flask(__name__)

# Config
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    try:
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response:
            xml_data = response.read()
        
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        entries = root.findall('atom:entry', ns)
        
        updates = []
        for index, entry in enumerate(entries):
            date_str = entry.find('atom:title', ns).text
            updated_str = entry.find('atom:updated', ns).text
            
            link_element = entry.find('atom:link[@rel="alternate"]', ns)
            link_href = link_element.attrib['href'] if link_element is not None else ''
            
            content_element = entry.find('atom:content', ns)
            content_html = content_element.text if content_element is not None else ''
            
            # Parse HTML content
            soup = BeautifulSoup(content_html, 'html.parser')
            
            current_update = None
            for element in soup.contents:
                if element.name == 'h3':
                    if current_update:
                        updates.append(current_update)
                    
                    update_type = element.get_text().strip()
                    current_update = {
                        'id': f"update-{index}-{len(updates)}",
                        'date': date_str,
                        'raw_date': updated_str,
                        'type': update_type,
                        'description_html': '',
                        'link': link_href
                    }
                elif current_update is not None:
                    current_update['description_html'] += str(element)
            
            if current_update:
                updates.append(current_update)
                
        return updates, None
    except Exception as e:
        return None, str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    updates, error = fetch_and_parse_feed()
    if error:
        return jsonify({'success': False, 'error': error}), 500
    return jsonify({'success': True, 'updates': updates})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
